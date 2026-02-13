import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ApiState {
  claudeApiKey: string;
  elevenLabsApiKey: string;
  geminiApiKey: string;
  claudeKeyValid: boolean | null;
  elevenLabsKeyValid: boolean | null;
  geminiKeyValid: boolean | null;
  isValidatingClaude: boolean;
  isValidatingElevenLabs: boolean;
  isValidatingGemini: boolean;

  setClaudeApiKey: (key: string) => void;
  setElevenLabsApiKey: (key: string) => void;
  setGeminiApiKey: (key: string) => void;
  setClaudeKeyValid: (valid: boolean | null) => void;
  setElevenLabsKeyValid: (valid: boolean | null) => void;
  setGeminiKeyValid: (valid: boolean | null) => void;
  setIsValidatingClaude: (v: boolean) => void;
  setIsValidatingElevenLabs: (v: boolean) => void;
  setIsValidatingGemini: (v: boolean) => void;
}

export const useApiStore = create<ApiState>()(
  persist(
    (set) => ({
      claudeApiKey: '',
      elevenLabsApiKey: '',
      geminiApiKey: '',
      claudeKeyValid: null,
      elevenLabsKeyValid: null,
      geminiKeyValid: null,
      isValidatingClaude: false,
      isValidatingElevenLabs: false,
      isValidatingGemini: false,

      setClaudeApiKey: (key) => set({ claudeApiKey: key, claudeKeyValid: null }),
      setElevenLabsApiKey: (key) => set({ elevenLabsApiKey: key, elevenLabsKeyValid: null }),
      setGeminiApiKey: (key) => set({ geminiApiKey: key, geminiKeyValid: null }),
      setClaudeKeyValid: (valid) => set({ claudeKeyValid: valid }),
      setElevenLabsKeyValid: (valid) => set({ elevenLabsKeyValid: valid }),
      setGeminiKeyValid: (valid) => set({ geminiKeyValid: valid }),
      setIsValidatingClaude: (v) => set({ isValidatingClaude: v }),
      setIsValidatingElevenLabs: (v) => set({ isValidatingElevenLabs: v }),
      setIsValidatingGemini: (v) => set({ isValidatingGemini: v }),
    }),
    {
      name: 'classbuild-api-keys',
      partialize: (state) => ({
        claudeApiKey: state.claudeApiKey,
        elevenLabsApiKey: state.elevenLabsApiKey,
        geminiApiKey: state.geminiApiKey,
      }),
    }
  )
);
