import Anthropic from '@anthropic-ai/sdk';

let clientInstance: Anthropic | null = null;
let currentKey = '';

export function getClient(apiKey: string): Anthropic {
  if (clientInstance && currentKey === apiKey) return clientInstance;
  currentKey = apiKey;
  clientInstance = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
  return clientInstance;
}

export const MODELS = {
  opus: 'claude-opus-4-6',
  sonnet: 'claude-sonnet-4-5-20250929',
  haiku: 'claude-haiku-4-5-20251001',
} as const;

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
