import { create } from 'zustand';

export interface SlidesRenderState {
  /** Which chapter's deck is currently being rendered. */
  chapterNum: number;
  /** Slides rendered so far (incremented per finished image). */
  current: number;
  /** Total slides to render. */
  total: number;
  /** Pipeline phase — 'rendering' = gpt-image-2 calls; 'packing' = pptxgenjs. */
  phase: 'rendering' | 'packing';
}

/**
 * Per-artifact "currently generating" state keyed by chapter number. Lifted
 * from BuildPage component-local useState so the in-flight indicator and
 * button disable survive route navigation (clicking to Setup and back).
 */
export type MaterialKind =
  | 'quiz'
  | 'inclassquiz'
  | 'weeklychallenge'
  | 'discussion'
  | 'activities'
  | 'audio'
  | 'slides';

interface UiState {
  showScienceOverlay: boolean;
  isGenerating: boolean;
  streamingText: string;
  error: string | null;
  activeTab: string;
  /** Persists across reload so users land where they left. */
  selectedChapterNum: number;
  batchGenerating: boolean;
  batchCurrentChapter: number | null;
  batchPhase: 'thinking' | 'writing' | null;
  batchMaterial: string | null;
  persistError: string | null;
  /**
   * Single-mutex slide-deck render. Survives tab switches so the in-flight
   * render keeps progressing in the background, the button stays disabled
   * across the app, and the user can return to see live progress.
   */
  slidesRender: SlidesRenderState | null;
  /**
   * Each per-artifact generation that's mid-flight keyed by chapter number.
   * Lives in the store (not BuildPage component state) so navigating to
   * Setup and back preserves the "drafting…" UI and disabled CTA.
   */
  inFlight: Partial<Record<MaterialKind, number>>;
  /**
   * Set from any page to request that the API keys modal auto-opens on the
   * next visit to /setup. Lets BuildPage etc. surface "Add OpenAI key →"
   * CTAs without having to globally render the modal.
   */
  openKeysOnNextSetupVisit: boolean;
  /** Timestamp (ms) of the most recent successful IndexedDB persist. Updated
   *  by idbStorage on every write; rendered as "Saved · Xs ago" in Header. */
  lastSavedAt: number | null;

  toggleScienceOverlay: () => void;
  setIsGenerating: (v: boolean) => void;
  setStreamingText: (text: string) => void;
  appendStreamingText: (text: string) => void;
  setError: (error: string | null) => void;
  setActiveTab: (tab: string) => void;
  setSelectedChapterNum: (n: number) => void;
  clearError: () => void;
  setBatchGenerating: (v: boolean) => void;
  setBatchCurrentChapter: (v: number | null) => void;
  setBatchPhase: (v: 'thinking' | 'writing' | null) => void;
  setBatchMaterial: (v: string | null) => void;
  setPersistError: (msg: string | null) => void;
  setSlidesRender: (v: SlidesRenderState | null) => void;
  setInFlight: (kind: MaterialKind, chapterNum: number | null) => void;
  setOpenKeysOnNextSetupVisit: (v: boolean) => void;
  setLastSavedAt: (t: number | null) => void;
}

// Lightweight localStorage helpers for the two UI keys that should outlive a
// page reload — the active artefact tab and the currently selected chapter.
// We don't run the full zustand persist middleware here because everything
// else in uiStore is intentionally transient (in-flight, batch state, etc.).
const LS_ACTIVE_TAB = 'cb:ui:activeTab';
const LS_SELECTED_CHAPTER = 'cb:ui:selectedChapterNum';

function readLs(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeLs(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore — SecurityError in private mode etc. */
  }
}

export const useUiStore = create<UiState>((set) => ({
  showScienceOverlay: false,
  isGenerating: false,
  streamingText: '',
  error: null,
  activeTab: readLs(LS_ACTIVE_TAB, 'chapter'),
  selectedChapterNum: Number(readLs(LS_SELECTED_CHAPTER, '1')) || 1,
  batchGenerating: false,
  batchCurrentChapter: null,
  batchPhase: null,
  batchMaterial: null,
  persistError: null,
  slidesRender: null,
  inFlight: {},
  openKeysOnNextSetupVisit: false,
  lastSavedAt: null,

  toggleScienceOverlay: () =>
    set((state) => ({ showScienceOverlay: !state.showScienceOverlay })),
  setIsGenerating: (v) => set({ isGenerating: v }),
  setStreamingText: (text) => set({ streamingText: text }),
  appendStreamingText: (text) =>
    set((state) => ({ streamingText: state.streamingText + text })),
  setError: (error) => set({ error }),
  setActiveTab: (tab) => {
    writeLs(LS_ACTIVE_TAB, tab);
    set({ activeTab: tab });
  },
  setSelectedChapterNum: (n) => {
    writeLs(LS_SELECTED_CHAPTER, String(n));
    set({ selectedChapterNum: n });
  },
  clearError: () => set({ error: null }),
  setBatchGenerating: (v) => set({ batchGenerating: v }),
  setBatchCurrentChapter: (v) => set({ batchCurrentChapter: v }),
  setBatchPhase: (v) => set({ batchPhase: v }),
  setBatchMaterial: (v) => set({ batchMaterial: v }),
  setPersistError: (msg) => set({ persistError: msg }),
  setSlidesRender: (v) => set({ slidesRender: v }),
  setInFlight: (kind, chapterNum) =>
    set((state) => {
      const next = { ...state.inFlight };
      if (chapterNum === null) delete next[kind];
      else next[kind] = chapterNum;
      return { inFlight: next };
    }),
  setOpenKeysOnNextSetupVisit: (v) => set({ openKeysOnNextSetupVisit: v }),
  setLastSavedAt: (t) => set({ lastSavedAt: t }),
}));
