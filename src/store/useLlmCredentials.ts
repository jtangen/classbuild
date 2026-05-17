import { useApiStore } from './apiStore';
import type { Provider } from '../services/claude/client';

export interface LlmCredentials {
  apiKey: string;
  provider: Provider;
}

/**
 * Returns the API key and provider for the currently-selected LLM.
 * Use this in every call site that talks to streamMessage/streamWithRetry/sendMessage.
 */
export function useLlmCredentials(): LlmCredentials {
  const { llmProvider, claudeApiKey, openrouterApiKey } = useApiStore();
  return {
    apiKey: llmProvider === 'openrouter' ? openrouterApiKey : claudeApiKey,
    provider: llmProvider,
  };
}
