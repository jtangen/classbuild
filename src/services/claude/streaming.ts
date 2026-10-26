import type Anthropic from '@anthropic-ai/sdk';
import { getClient, getThinkingTokens, MODELS, type ThinkingBudget } from './client';
import { ModelRefusalError } from '../../utils/errors';

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
  /** Optional cancellation. Aborting rejects the call with the SDK's abort
   *  error — call sites should treat that as a silent cancel, not a failure. */
  signal?: AbortSignal;
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
    signal,
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
      const budgetTokens = getThinkingTokens(thinkingBudget);
      if (model === MODELS.opus) {
        // Opus 5.5: thinking is always on — `budget_tokens` and `disabled` both
        // 400. Depth is steered only with `effort`, which defaults to `medium` on
        // 5.5, so always pass it explicitly. The thinking summary text is omitted
        // by default — `display: 'summarized'` restores the streamed reasoning
        // the UI shows via onThinking.
        // SDK 0.74.0 doesn't type `display` on the adaptive config yet; the
        // field is still sent through to the API, so cast.
        params.thinking = { type: 'adaptive', display: 'summarized' } as Anthropic.ThinkingConfigParam;
        params.output_config = { effort: thinkingBudget };
        // Adaptive thinking tokens count toward max_tokens. Reserve generous
        // headroom ABOVE the caller's intended output so a deep think can't eat
        // the output budget and truncate the answer — a truncated JSON material
        // (quiz, weekly challenge) then fails to parse and silently reverts.
        // Capped at the 128k output ceiling.
        params.max_tokens = Math.min(128000, maxTokens + budgetTokens * 2);
      } else {
        // Sonnet 4.6 / Haiku 4.5 still accept manual extended thinking, where
        // budget_tokens must fit inside max_tokens.
        params.thinking = { type: 'enabled', budget_tokens: budgetTokens };
        params.max_tokens = Math.max(maxTokens, budgetTokens + maxTokens);
      }
    }

    if (tools && tools.length > 0) {
      params.tools = tools;
    }

    const headers: Record<string, string> = {};
    if (model === MODELS.opus) {
      // Opus 5.5's safety classifiers can decline a request (stop_reason
      // 'refusal') — a real risk for courses on microbiology, security, etc.
      // The server-side fallback re-runs a declined request on a suitable
      // model inside the same stream, continuing from any partial text.
      // SDK 0.74.0 doesn't type `fallbacks`, so cast and send the beta header.
      (params as unknown as Record<string, unknown>).fallbacks = 'default';
      headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
    }

    const stream = await client.messages.stream(params, { headers, ...(signal ? { signal } : {}) });

    // Track server tool use blocks to capture search queries from deltas
    const serverToolInputs = new Map<number, string>();
    // The refusal category rides on message_delta; SDK 0.74.0's accumulator
    // drops fields it doesn't know, so it never reaches finalMessage().
    let refusalCategory: string | null = null;

    for await (const event of stream) {
      if (event.type === 'message_delta') {
        const details = (event.delta as { stop_details?: { category?: string | null } | null }).stop_details;
        if (details?.category) refusalCategory = details.category;
      } else if (event.type === 'content_block_start') {
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
    if (finalMessage.stop_reason === 'refusal') {
      // Every model in the chain declined (the Opus fallback included), so any
      // partial text is unusable — fail instead of returning it as a result.
      throw new ModelRefusalError(refusalCategory);
    }
    if (finalMessage.stop_reason === 'max_tokens') {
      console.warn(`Claude stopped at max_tokens (${params.max_tokens}); the response is truncated.`);
    }
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

/** Rate limits, overloads and 5xx. Errors that arrive mid-stream as SSE
 *  `error` events carry no HTTP status, only the error type in the message. */
function isTransientError(err: unknown): boolean {
  if (err instanceof ModelRefusalError || typeof err !== 'object' || err === null) return false;
  const status = (err as { status?: unknown }).status;
  if (typeof status === 'number') return status === 429 || status >= 500;
  const message = err instanceof Error ? err.message : String(err);
  return /\b(rate_limit_error|overloaded_error|api_error)\b/.test(message);
}

/**
 * streamMessage with retries on transient failures. The SDK already retries
 * the initial HTTP request; this layer catches failures once the stream is
 * open. An attempt is only retried if it hadn't streamed anything yet —
 * replaying after partial output would feed the same text to onText twice.
 * onError fires once, for the final failure, so a call that recovers on a
 * retry never flashes an error banner.
 */
export async function streamWithRetry(
  options: StreamOptions,
  callbacks: StreamCallbacks,
  maxRetries = 3,
): Promise<string> {
  const { onError, ...rest } = callbacks;
  for (let attempt = 0; ; attempt++) {
    let streamed = false;
    const attemptCallbacks: StreamCallbacks = {
      ...rest,
      onText: (text) => {
        streamed = true;
        rest.onText?.(text);
      },
      onThinking: (text) => {
        streamed = true;
        rest.onThinking?.(text);
      },
    };
    try {
      return await streamMessage(options, attemptCallbacks);
    } catch (err) {
      // Never retry a user-initiated cancel.
      const retry = !options.signal?.aborted && !streamed && attempt < maxRetries && isTransientError(err);
      if (retry) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 1500));
        continue;
      }
      onError?.(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }
}
