import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  themeId: 'midnight',
  voiceId: 'ZF6FPAbjXT4488VcRRnw',
};

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
      version: 2,
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
        // Persist chapters but strip blob URLs (they don't survive page reload)
        chapters: state.chapters.map((c) => ({
          ...c,
          audioUrl: undefined,
          pptxUrl: undefined,
        })),
      }),
    }
  )
);
