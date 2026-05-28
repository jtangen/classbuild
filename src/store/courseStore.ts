import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbStorage } from './idbStorage';
import type {
  CourseSetup,
  Syllabus,
  ResearchDossier,
  GeneratedChapter,
  StageId,
  CurriculumMap,
} from '../types/course';

interface CourseState {
  // Stage tracking
  currentStage: StageId;
  completedStages: StageId[];

  // Stage 1: Setup
  setup: CourseSetup;

  // Stage 2-3: Syllabus
  syllabus: Syllabus | null;
  syllabusConversation: Array<{ role: 'user' | 'assistant'; content: string }>;

  // Stage 4: Research
  researchDossiers: ResearchDossier[];

  // Stage 5+: Generated chapters
  chapters: GeneratedChapter[];

  // Curriculum map
  curriculumMap: CurriculumMap | null;

  // Actions
  setStage: (stage: StageId) => void;
  completeStage: (stage: StageId) => void;
  updateSetup: (updates: Partial<CourseSetup>) => void;
  setSyllabus: (syllabus: Syllabus) => void;
  setCurriculumMap: (map: CurriculumMap) => void;
  clearCurriculumMap: () => void;
  addSyllabusMessage: (role: 'user' | 'assistant', content: string) => void;
  clearSyllabusConversation: () => void;
  addResearchDossier: (dossier: ResearchDossier) => void;
  addChapter: (chapter: GeneratedChapter) => void;
  updateChapter: (number: number, updates: Partial<GeneratedChapter>) => void;
  /**
   * Atomically write a single slide's rendered image into a chapter's
   * slidesJson. Used by the slide-render flow so concurrent gpt-image-2
   * workers writing different slides don't clobber each other's progress.
   */
  setSlideImage: (chapterNum: number, slideIndex: number, dataUri: string) => void;
  /** Refine one slide (image prompt and/or rendered image) without disturbing
   *  the rest of the deck. Used by the per-slide "Regenerate image" flow. */
  updateSlide: (
    chapterNum: number,
    slideIndex: number,
    updates: Partial<import('../types/course').SlideData>,
  ) => void;
  resetDownstream: () => void;
  reset: () => void;
}

const defaultSetup: CourseSetup = {
  topic: '',
  educationLevel: 'advanced-undergrad',
  priorKnowledge: 'some',
  cohortSize: 65,
  teachingEnvironment: '',
  numChapters: 12,
  chapterLength: 'standard',
  widgetsPerChapter: 2,
  themeId: 'press',
  voiceId: 'Kore',
};

const LEGACY_THEME_IDS = new Set(['midnight', 'classic', 'ocean', 'warm']);

export const useCourseStore = create<CourseState>()(
  persist(
    (set) => ({
      currentStage: 'landing',
      completedStages: [],
      setup: defaultSetup,
      syllabus: null,
      syllabusConversation: [],
      researchDossiers: [],
      chapters: [],
      curriculumMap: null,

      setStage: (stage) => set({ currentStage: stage }),

      completeStage: (stage) =>
        set((state) => ({
          completedStages: state.completedStages.includes(stage)
            ? state.completedStages
            : [...state.completedStages, stage],
        })),

      updateSetup: (updates) =>
        set((state) => ({ setup: { ...state.setup, ...updates } })),

      setSyllabus: (syllabus) => set({ syllabus, curriculumMap: null }),

      setCurriculumMap: (map) => set({ curriculumMap: map }),

      clearCurriculumMap: () => set({ curriculumMap: null }),

      addSyllabusMessage: (role, content) =>
        set((state) => ({
          syllabusConversation: [...state.syllabusConversation, { role, content }],
        })),

      clearSyllabusConversation: () => set({ syllabusConversation: [] }),

      addResearchDossier: (dossier) =>
        set((state) => ({
          researchDossiers: [...state.researchDossiers, dossier],
        })),

      addChapter: (chapter) =>
        set((state) => ({
          chapters: [...state.chapters.filter((c) => c.number !== chapter.number), chapter],
        })),

      updateChapter: (number, updates) =>
        set((state) => ({
          chapters: state.chapters.map((c) =>
            c.number === number ? { ...c, ...updates } : c
          ),
        })),

      setSlideImage: (chapterNum, slideIndex, dataUri) =>
        set((state) => ({
          chapters: state.chapters.map((c) => {
            if (c.number !== chapterNum) return c;
            const slides = c.slidesJson ?? [];
            return {
              ...c,
              slidesJson: slides.map((s, i) =>
                i === slideIndex ? { ...s, imageDataUri: dataUri } : s,
              ),
            };
          }),
        })),

      updateSlide: (chapterNum, slideIndex, updates) =>
        set((state) => ({
          chapters: state.chapters.map((c) => {
            if (c.number !== chapterNum) return c;
            const slides = c.slidesJson ?? [];
            return {
              ...c,
              slidesJson: slides.map((s, i) =>
                i === slideIndex ? { ...s, ...updates } : s,
              ),
            };
          }),
        })),

      resetDownstream: () =>
        set({
          completedStages: [],
          syllabus: null,
          syllabusConversation: [],
          researchDossiers: [],
          chapters: [],
          curriculumMap: null,
        }),

      reset: () =>
        set({
          currentStage: 'landing',
          completedStages: [],
          setup: defaultSetup,
          syllabus: null,
          syllabusConversation: [],
          researchDossiers: [],
          chapters: [],
          curriculumMap: null,
        }),
    }),
    {
      name: 'classbuild-course',
      storage: idbStorage,
      version: 4,
      migrate(persisted, version) {
        const state = persisted as Record<string, unknown>;
        // v0→v1: migrate old preview/generate stages to build
        if (version === undefined || version < 1) {
          if (state.currentStage === 'preview' || state.currentStage === 'generate') {
            state.currentStage = 'build';
          }
          if (Array.isArray(state.completedStages)) {
            const hadOld = (state.completedStages as string[]).some(
              (s) => s === 'preview' || s === 'generate'
            );
            state.completedStages = (state.completedStages as string[])
              .filter((s) => s !== 'preview' && s !== 'generate')
              .concat(hadOld ? ['build'] : []);
          }
        }
        // v1→v2: add curriculumMap
        if (version === undefined || version < 2) {
          if (!('curriculumMap' in state)) state.curriculumMap = null;
        }
        // v2→v3: move to IndexedDB (no schema changes)
        // v3→v4: replace retired chapter themes (midnight / classic / ocean /
        // warm) with the new default 'press' — those CSS files no longer ship
        // and getTheme() falls back to 'press' anyway, but normalize so the
        // ExportPage picker shows the right selection on first render.
        if (version === undefined || version < 4) {
          const setupRecord = state.setup as Record<string, unknown> | undefined;
          if (setupRecord) {
            const stale = setupRecord.themeId;
            if (typeof stale === 'string' && LEGACY_THEME_IDS.has(stale)) {
              setupRecord.themeId = 'press';
            }
            if (!setupRecord.themeId) setupRecord.themeId = 'press';
          }
        }
        return state;
      },
      partialize: (state) => ({
        currentStage: state.currentStage,
        completedStages: state.completedStages,
        setup: state.setup,
        syllabus: state.syllabus,
        syllabusConversation: state.syllabusConversation,
        researchDossiers: state.researchDossiers,
        curriculumMap: state.curriculumMap,
        // Persist chapters but strip blob URLs and large data URIs
        chapters: state.chapters.map((c) => ({
          ...c,
          audioUrl: undefined,
          pptxUrl: undefined,
          infographicDataUri: undefined,
        })),
      }),
    }
  )
);
