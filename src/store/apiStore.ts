import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ApiState {
  claudeApiKey: string;
  openaiApiKey: string;
  elevenLabsApiKey: string;
  claudeKeyValid: boolean | null;
  openaiKeyValid: boolean | null;
  elevenLabsKeyValid: boolean | null;
  isValidatingClaude: boolean;
  isValidatingOpenai: boolean;
  isValidatingElevenLabs: boolean;

  setClaudeApiKey: (key: string) => void;
  setOpenaiApiKey: (key: string) => void;
  setElevenLabsApiKey: (key: string) => void;
  setClaudeKeyValid: (valid: boolean | null) => void;
  setOpenaiKeyValid: (valid: boolean | null) => void;
  setElevenLabsKeyValid: (valid: boolean | null) => void;
  setIsValidatingClaude: (v: boolean) => void;
  setIsValidatingOpenai: (v: boolean) => void;
  setIsValidatingElevenLabs: (v: boolean) => void;
}

export const useApiStore = create<ApiState>()(
  persist(
    (set) => ({
      claudeApiKey: '',
      openaiApiKey: '',
      elevenLabsApiKey: '',
      claudeKeyValid: null,
      openaiKeyValid: null,
      elevenLabsKeyValid: null,
      isValidatingClaude: false,
      isValidatingOpenai: false,
      isValidatingElevenLabs: false,

      setClaudeApiKey: (key) => set({ claudeApiKey: key, claudeKeyValid: null }),
      setOpenaiApiKey: (key) => set({ openaiApiKey: key, openaiKeyValid: null }),
      setElevenLabsApiKey: (key) =>
        set({ elevenLabsApiKey: key, elevenLabsKeyValid: null }),
      setClaudeKeyValid: (valid) => set({ claudeKeyValid: valid }),
      setOpenaiKeyValid: (valid) => set({ openaiKeyValid: valid }),
      setElevenLabsKeyValid: (valid) => set({ elevenLabsKeyValid: valid }),
      setIsValidatingClaude: (v) => set({ isValidatingClaude: v }),
      setIsValidatingOpenai: (v) => set({ isValidatingOpenai: v }),
      setIsValidatingElevenLabs: (v) => set({ isValidatingElevenLabs: v }),
    }),
    {
      name: 'classbuild-api-keys',
      version: 4,
      migrate(persisted, version) {
        const state = persisted as Record<string, unknown>;
        // v0/v1 → v2: drop the retired geminiApiKey.
        if (version === undefined || version < 2) {
          delete state.geminiApiKey;
          delete state.geminiKeyValid;
          delete state.isValidatingGemini;
          if (typeof state.openaiApiKey !== 'string') state.openaiApiKey = '';
          if (typeof state.elevenLabsApiKey !== 'string') {
            state.elevenLabsApiKey = '';
          }
        }
        // v3 introduced addedVoiceIds for shared-library voices; v4 retires it
        // (we now use premade-only voices that don't require an add step).
        if (version === undefined || version < 4) {
          delete state.addedVoiceIds;
        }
        return state;
      },
      partialize: (state) => ({
        claudeApiKey: state.claudeApiKey,
        openaiApiKey: state.openaiApiKey,
        elevenLabsApiKey: state.elevenLabsApiKey,
      }),
    }
  )
);
