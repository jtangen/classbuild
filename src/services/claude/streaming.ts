import type Anthropic from '@anthropic-ai/sdk';
import { getClient, getThinkingTokens, MODELS, resolveModel, type Provider, type ThinkingBudget } from './client';

const WEB_SEARCH_TOOL_TYPE = 'web_search_20250305';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wantsWebSearch(tools: any[] | undefined): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Array.isArray(tools) && tools.some((t: any) => t?.type === WEB_SEARCH_TOOL_TYPE);
}

/**
 * OpenRouter rejects Anthropic's `web_search_20250305` server tool — it
 * exposes web search via the `:online` model suffix instead (powered by Exa).
 * When the caller asks for web_search on OpenRouter, we:
 *   1. Drop the unsupported tool from the array.
 *   2. Append `:online` to the resolved model ID.
 * Other tools (if any) are forwarded unchanged.
 */
function applyOnlineBridge(
  provider: Provider,
  resolvedModel: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: any[] | undefined,
): {
  model: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: any[] | undefined;
  usedOnline: boolean;
} {
  if (provider !== 'openrouter' || !wantsWebSearch(tools)) {
    return { model: resolvedModel, tools, usedOnline: false };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const forwarded = tools!.filter((t: any) => t?.type !== WEB_SEARCH_TOOL_TYPE);
  return {
    model: `${resolvedModel}:online`,
    tools: forwarded.length > 0 ? forwarded : undefined,
    usedOnline: true,
  };
}

/**
 * OpenRouter's `:online` returns citations inline in the model's text output,
 * not in a structured field. We catch both forms in practice:
 *   1. Markdown links: `[label](https://...)`
 *   2. Bare URLs: `https://example.com/path`
 * Dedupe by URL; for bare URLs, the hostname is used as the title.
 */
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
const BARE_URL_RE = /https?:\/\/[^\s<>"')\]]+[^\s<>"')\].,;:!?]/g;

function extractInlineCitations(text: string): WebSearchResult[] {
  const seen = new Set<string>();
  const out: WebSearchResult[] = [];

  let m: RegExpExecArray | null;
  while ((m = MARKDOWN_LINK_RE.exec(text)) !== null) {
    const url = m[2];
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ title: m[1].trim(), url, pageAge: null });
  }
  while ((m = BARE_URL_RE.exec(text)) !== null) {
    const url = m[0];
    if (seen.has(url)) continue;
    seen.add(url);
    let title = url;
    try {
      title = new URL(url).hostname.replace(/^www\./, '');
    } catch { /* keep url as title */ }
    out.push({ title, url, pageAge: null });
  }
  return out;
}

export interface WebSearchResult {
  title: string;
  url: string;
  pageAge?: string | null;
}

export interface StreamCallbacks {
  onText?: (text: string) => void;
  onThinking?: (text: string) => void;
  onToolUse?: (name: string, input: Record<string, unknown>) => void;
  onWebSearch?: (query: string) => void;
  onWebSearchResults?: (results: WebSearchResult[]) => void;
  onDone?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export interface StreamOptions {
  apiKey: string;
  provider?: Provider;
  model?: string;
  system?: string;
  messages: Anthropic.MessageParam[];
  thinkingBudget?: ThinkingBudget;
  // Accepts custom tools and server-side tools (web_search, etc.)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools?: any[];
  maxTokens?: number;
}

export async function streamMessage(
  options: StreamOptions,
  callbacks: StreamCallbacks
): Promise<string> {
  const {
    apiKey,
    provider = 'anthropic',
    model = MODELS.sonnet,
    system,
    messages,
    thinkingBudget,
    tools,
    maxTokens = 16000,
  } = options;

  const client = getClient(apiKey, provider);
  const baseModel = resolveModel(model, provider);
  const { model: finalModel, tools: effectiveTools, usedOnline } =
    applyOnlineBridge(provider, baseModel, tools);
  let fullText = '';

  try {
    const params: Anthropic.MessageCreateParams = {
      model: finalModel,
      max_tokens: maxTokens,
      messages,
      stream: true,
    };

    if (system) {
      params.system = system;
    }

    if (thinkingBudget) {
      params.thinking = {
        type: 'enabled',
        budget_tokens: getThinkingTokens(thinkingBudget),
      };
      params.max_tokens = Math.max(maxTokens, getThinkingTokens(thinkingBudget) + maxTokens);
    }

    if (effectiveTools && effectiveTools.length > 0) {
      params.tools = effectiveTools;
    }

    const stream = await client.messages.stream(params);

    // Track server tool use blocks to capture search queries from deltas
    const serverToolInputs = new Map<number, string>();

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        const block = event.content_block;
        if (block.type === 'server_tool_use') {
          // Server-side tool use (e.g., web_search)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const input = (block as any).input;
          if (input?.query) {
            callbacks.onWebSearch?.(input.query);
          } else {
            // Input might stream via deltas
            serverToolInputs.set(event.index, '');
          }
        } else if (block.type === 'web_search_tool_result') {
          // Web search results returned from server
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const content = (block as any).content;
          if (Array.isArray(content)) {
            const results: WebSearchResult[] = content
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .filter((r: any) => r.type === 'web_search_result')
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((r: any) => ({
                title: r.title || '',
                url: r.url || '',
                pageAge: r.page_age,
              }));
            if (results.length > 0) {
              callbacks.onWebSearchResults?.(results);
            }
          }
        } else if (block.type === 'tool_use') {
          callbacks.onToolUse?.(block.name, {} as Record<string, unknown>);
        }
      } else if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta && delta.text) {
          fullText += delta.text;
          callbacks.onText?.(delta.text);
        } else if ('thinking' in delta && delta.thinking) {
          callbacks.onThinking?.(delta.thinking);
        } else if ('partial_json' in delta) {
          // Accumulate server tool input from deltas
          const existing = serverToolInputs.get(event.index);
          if (existing !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            serverToolInputs.set(event.index, existing + (delta as any).partial_json);
          }
        }
      } else if (event.type === 'content_block_stop') {
        // Check for accumulated server tool input
        const accumulatedInput = serverToolInputs.get(event.index);
        if (accumulatedInput) {
          try {
            const parsed = JSON.parse(accumulatedInput);
            if (parsed.query) {
              callbacks.onWebSearch?.(parsed.query);
            }
          } catch { /* partial JSON, ignore */ }
          serverToolInputs.delete(event.index);
        }
      }
    }

    // Process final message for complete tool use blocks
    const finalMessage = await stream.finalMessage();
    for (const block of finalMessage.content) {
      if (block.type === 'tool_use') {
        callbacks.onToolUse?.(block.name, block.input as Record<string, unknown>);
      }
    }

    // OpenRouter's `:online` doesn't emit per-search events during streaming;
    // citations arrive as inline markdown links in the final text. Extract
    // them once at the end so the UI's source list still populates.
    if (usedOnline) {
      callbacks.onWebSearchResults?.(extractInlineCitations(fullText));
    }

    callbacks.onDone?.(fullText);
    return fullText;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    callbacks.onError?.(err);
    throw err;
  }
}

export async function streamWithRetry(
  options: StreamOptions,
  callbacks: StreamCallbacks,
  maxRetries = 3,
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await streamMessage(options, callbacks);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = msg.includes('429') || msg.toLowerCase().includes('rate');
      if (isRateLimit && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 1500));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

// Non-streaming version for simpler calls
export async function sendMessage(
  options: Omit<StreamOptions, 'maxTokens'> & { maxTokens?: number }
): Promise<Anthropic.Message> {
  const {
    apiKey,
    provider = 'anthropic',
    model = MODELS.sonnet,
    system,
    messages,
    thinkingBudget,
    tools,
    maxTokens = 16000,
  } = options;

  const client = getClient(apiKey, provider);
  const baseModel = resolveModel(model, provider);
  const { model: finalModel, tools: effectiveTools } =
    applyOnlineBridge(provider, baseModel, tools);

  const params: Anthropic.MessageCreateParams = {
    model: finalModel,
    max_tokens: maxTokens,
    messages,
  };

  if (system) {
    params.system = system;
  }

  if (thinkingBudget) {
    params.thinking = {
      type: 'enabled',
      budget_tokens: getThinkingTokens(thinkingBudget),
    };
    params.max_tokens = Math.max(maxTokens, getThinkingTokens(thinkingBudget) + maxTokens);
  }

  if (effectiveTools && effectiveTools.length > 0) {
    params.tools = effectiveTools;
  }

  return client.messages.create(params);
}
