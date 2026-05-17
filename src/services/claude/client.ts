import Anthropic from '@anthropic-ai/sdk';

export type Provider = 'anthropic' | 'openrouter';

// The Anthropic SDK appends `/v1/messages` to baseURL, so do NOT include `/v1` here —
// otherwise requests hit `/api/v1/v1/messages`.
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api';

// OpenRouter's CORS allowlist is narrow — it rejects Anthropic-specific headers like
// `anthropic-version`, `anthropic-dangerous-direct-browser-access`, and the SDK's
// `X-Stainless-*` platform headers. This fetch wrapper strips every header that
// isn't on OpenRouter's accept list before the request goes out.
const OPENROUTER_ALLOWED_HEADERS = new Set([
  'accept',
  'authorization',
  'content-type',
  'http-referer',
  'x-api-key',
  'x-title',
]);

const openrouterFetch: typeof fetch = (input, init) => {
  if (!init?.headers) return fetch(input, init);
  const filtered = new Headers();
  new Headers(init.headers).forEach((value, key) => {
    if (OPENROUTER_ALLOWED_HEADERS.has(key.toLowerCase())) {
      filtered.set(key, value);
    }
  });
  return fetch(input, { ...init, headers: filtered });
};

export const MODELS = {
  opus: 'claude-opus-4-6',
  sonnet: 'claude-sonnet-4-6',
  haiku: 'claude-haiku-4-5-20251001',
} as const;

const OPENROUTER_MODEL_MAP: Record<string, string> = {
  'claude-opus-4-6': 'anthropic/claude-opus-4.6',
  'claude-sonnet-4-6': 'anthropic/claude-sonnet-4.6',
  'claude-haiku-4-5-20251001': 'anthropic/claude-haiku-4.5',
};

export function resolveModel(model: string, provider: Provider): string {
  if (provider === 'openrouter') {
    return OPENROUTER_MODEL_MAP[model] ?? model;
  }
  return model;
}

const clientCache = new Map<string, Anthropic>();

export function getClient(apiKey: string, provider: Provider = 'anthropic'): Anthropic {
  const cacheKey = `${provider}:${apiKey}`;
  const cached = clientCache.get(cacheKey);
  if (cached) return cached;

  let client: Anthropic;
  if (provider === 'openrouter') {
    client = new Anthropic({
      apiKey,
      baseURL: OPENROUTER_BASE_URL,
      dangerouslyAllowBrowser: true,
      fetch: openrouterFetch,
      defaultHeaders: {
        'HTTP-Referer': 'https://classbuild.app',
        'X-Title': 'ClassBuild',
      },
    });
  } else {
    client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
  }
  clientCache.set(cacheKey, client);
  return client;
}

export type ThinkingBudget = 'max' | 'high' | 'medium' | 'low';

const BUDGET_TOKENS: Record<ThinkingBudget, number> = {
  max: 32000,
  high: 16000,
  medium: 8000,
  low: 4000,
};

export function getThinkingTokens(budget: ThinkingBudget): number {
  return BUDGET_TOKENS[budget];
}
