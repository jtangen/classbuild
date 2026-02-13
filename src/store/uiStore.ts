import { create } from 'zustand';

interface UiState {
  showScienceOverlay: boolean;
  isGenerating: boolean;
  streamingText: string;
  error: string | null;
  activeTab: string;
  batchGenerating: boolean;
  batchCurrentChapter: number | null;
  batchPhase: 'thinking' | 'writing' | null;
  batchMaterial: string | null;

  toggleScienceOverlay: () => void;
  setIsGenerating: (v: boolean) => void;
  setStreamingText: (text: string) => void;
  appendStreamingText: (text: string) => void;
  setError: (error: string | null) => void;
  setActiveTab: (tab: string) => void;
  clearError: () => void;
  setBatchGenerating: (v: boolean) => void;
  setBatchCurrentChapter: (v: number | null) => void;
  setBatchPhase: (v: 'thinking' | 'writing' | null) => void;
  setBatchMaterial: (v: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  showScienceOverlay: false,
  isGenerating: false,
  streamingText: '',
  error: null,
  activeTab: 'chapter',
  batchGenerating: false,
  batchCurrentChapter: null,
  batchPhase: null,
  batchMaterial: null,

  toggleScienceOverlay: () =>
    set((state) => ({ showScienceOverlay: !state.showScienceOverlay })),
  setIsGenerating: (v) => set({ isGenerating: v }),
  setStreamingText: (text) => set({ streamingText: text }),
  appendStreamingText: (text) =>
    set((state) => ({ streamingText: state.streamingText + text })),
  setError: (error) => set({ error }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  clearError: () => set({ error: null }),
  setBatchGenerating: (v) => set({ batchGenerating: v }),
  setBatchCurrentChapter: (v) => set({ batchCurrentChapter: v }),
  setBatchPhase: (v) => set({ batchPhase: v }),
  setBatchMaterial: (v) => set({ batchMaterial: v }),
}));
