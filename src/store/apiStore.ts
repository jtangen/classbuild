import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Provider } from '../services/claude/client';

interface ApiState {
  claudeApiKey: string;
  openrouterApiKey: string;
  geminiApiKey: string;
  claudeKeyValid: boolean | null;
  openrouterKeyValid: boolean | null;
  geminiKeyValid: boolean | null;
  isValidatingClaude: boolean;
  isValidatingOpenrouter: boolean;
  isValidatingGemini: boolean;
  llmProvider: Provider;

  setClaudeApiKey: (key: string) => void;
  setOpenrouterApiKey: (key: string) => void;
  setGeminiApiKey: (key: string) => void;
  setClaudeKeyValid: (valid: boolean | null) => void;
  setOpenrouterKeyValid: (valid: boolean | null) => void;
  setGeminiKeyValid: (valid: boolean | null) => void;
  setIsValidatingClaude: (v: boolean) => void;
  setIsValidatingOpenrouter: (v: boolean) => void;
  setIsValidatingGemini: (v: boolean) => void;
  setLlmProvider: (p: Provider) => void;
}

export const useApiStore = create<ApiState>()(
  persist(
    (set) => ({
      claudeApiKey: '',
      openrouterApiKey: '',
      geminiApiKey: '',
      claudeKeyValid: null,
      openrouterKeyValid: null,
      geminiKeyValid: null,
      isValidatingClaude: false,
      isValidatingOpenrouter: false,
      isValidatingGemini: false,
      llmProvider: 'anthropic',

      setClaudeApiKey: (key) => set({ claudeApiKey: key, claudeKeyValid: null }),
      setOpenrouterApiKey: (key) => set({ openrouterApiKey: key, openrouterKeyValid: null }),
      setGeminiApiKey: (key) => set({ geminiApiKey: key, geminiKeyValid: null }),
      setClaudeKeyValid: (valid) => set({ claudeKeyValid: valid }),
      setOpenrouterKeyValid: (valid) => set({ openrouterKeyValid: valid }),
      setGeminiKeyValid: (valid) => set({ geminiKeyValid: valid }),
      setIsValidatingClaude: (v) => set({ isValidatingClaude: v }),
      setIsValidatingOpenrouter: (v) => set({ isValidatingOpenrouter: v }),
      setIsValidatingGemini: (v) => set({ isValidatingGemini: v }),
      setLlmProvider: (p) => set({ llmProvider: p }),
    }),
    {
      name: 'classbuild-api-keys',
      version: 2,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<ApiState>;
        return {
          claudeApiKey: state.claudeApiKey ?? '',
          openrouterApiKey: state.openrouterApiKey ?? '',
          geminiApiKey: state.geminiApiKey ?? '',
          llmProvider: state.llmProvider ?? 'anthropic',
        };
      },
      partialize: (state) => ({
        claudeApiKey: state.claudeApiKey,
        openrouterApiKey: state.openrouterApiKey,
        geminiApiKey: state.geminiApiKey,
        llmProvider: state.llmProvider,
      }),
    }
  )
);
