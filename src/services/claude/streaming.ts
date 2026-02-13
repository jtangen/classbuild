import type Anthropic from '@anthropic-ai/sdk';
import { getClient, getThinkingTokens, MODELS, type ThinkingBudget } from './client';

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
    model = MODELS.sonnet,
    system,
    messages,
    thinkingBudget,
    tools,
    maxTokens = 16000,
  } = options;

  const client = getClient(apiKey);
  let fullText = '';

  try {
    const params: Anthropic.MessageCreateParams = {
      model,
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

    if (tools && tools.length > 0) {
      params.tools = tools;
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

    callbacks.onDone?.(fullText);
    return fullText;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    callbacks.onError?.(err);
    throw err;
  }
}

// Non-streaming version for simpler calls
export async function sendMessage(
  options: Omit<StreamOptions, 'maxTokens'> & { maxTokens?: number }
): Promise<Anthropic.Message> {
  const {
    apiKey,
    model = MODELS.sonnet,
    system,
    messages,
    thinkingBudget,
    tools,
    maxTokens = 16000,
  } = options;

  const client = getClient(apiKey);

  const params: Anthropic.MessageCreateParams = {
    model,
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

  if (tools && tools.length > 0) {
    params.tools = tools;
  }

  return client.messages.create(params);
}
