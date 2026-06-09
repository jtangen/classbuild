/**
 * Project file save / restore.
 *
 * A `.classbuild.json` file is a portable snapshot of the course store, so a
 * course survives cleared browser storage or moving machines. It carries the
 * same slice of state as the persisted IndexedDB snapshot (mirroring
 * courseStore's `partialize`, re-implemented here so nothing private leaks
 * across module boundaries): chapters are included, but the heavyweight
 * rendered binaries are stripped — in-session blob URLs (dead after reload
 * anyway), the infographic JPEG, and the rendered 4K slide images (their
 * prompts are kept so decks re-render). The size-capped `audioDataUri` stays.
 *
 * API keys are NEVER part of a project file.
 */

import { useCourseStore } from '../store/courseStore';
import type {
  CourseSetup,
  CurriculumMap,
  GeneratedChapter,
  ResearchDossier,
  StageId,
  Syllabus,
} from '../types/course';

const PROJECT_FILE_FORMAT = 'classbuild-project';
const PROJECT_FILE_VERSION = 1;

/** The slice of course state carried in a project file. */
export interface ProjectFileState {
  currentStage: StageId;
  completedStages: StageId[];
  setup: CourseSetup;
  syllabus: Syllabus | null;
  syllabusConversation: Array<{ role: 'user' | 'assistant'; content: string }>;
  researchDossiers: ResearchDossier[];
  curriculumMap: CurriculumMap | null;
  chapters: GeneratedChapter[];
}

export type ProjectFileParseResult =
  | { ok: true; state: ProjectFileState; savedAt: string | null }
  | { ok: false; error: string };

function isStageId(value: unknown): value is StageId {
  return (
    value === 'landing' ||
    value === 'setup' ||
    value === 'syllabus' ||
    value === 'research' ||
    value === 'build' ||
    value === 'export'
  );
}

/**
 * Serialize the current course into project-file JSON. Chapters are stripped
 * exactly like the persisted snapshot: blob URLs and rendered binaries out,
 * everything regenerable-from or small stays in. `JSON.stringify` drops the
 * `undefined` fields from the output.
 */
export function buildProjectFile(): string {
  const s = useCourseStore.getState();
  const state: ProjectFileState = {
    currentStage: s.currentStage,
    completedStages: s.completedStages,
    setup: s.setup,
    syllabus: s.syllabus,
    syllabusConversation: s.syllabusConversation,
    researchDossiers: s.researchDossiers,
    curriculumMap: s.curriculumMap,
    chapters: s.chapters.map((c) => ({
      ...c,
      audioUrl: undefined,
      pptxUrl: undefined,
      infographicDataUri: undefined,
      slidesJson: c.slidesJson?.map((slide) => ({ ...slide, imageDataUri: undefined })),
    })),
  };
  return JSON.stringify(
    {
      format: PROJECT_FILE_FORMAT,
      version: PROJECT_FILE_VERSION,
      savedAt: new Date().toISOString(),
      state,
    },
    null,
    2,
  );
}

/**
 * Parse and validate project-file text. Validation is structural — enough to
 * guarantee the store won't be handed something unusable — with the deep
 * shapes typed loosely from the course types.
 */
export function parseProjectFile(text: string): ProjectFileParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Not a ClassBuild project file (the file is not valid JSON).' };
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'Not a ClassBuild project file.' };
  }

  const envelope = raw as Record<string, unknown>;
  if (envelope.format !== PROJECT_FILE_FORMAT) {
    return { ok: false, error: 'Not a ClassBuild project file.' };
  }
  if (typeof envelope.version !== 'number') {
    return { ok: false, error: 'Not a ClassBuild project file (missing version).' };
  }
  if (envelope.version > PROJECT_FILE_VERSION) {
    return {
      ok: false,
      error: 'Saved by a newer version of ClassBuild — update this app to open it.',
    };
  }

  const stateRaw = envelope.state;
  if (typeof stateRaw !== 'object' || stateRaw === null || Array.isArray(stateRaw)) {
    return { ok: false, error: 'The project file is damaged — its course data is missing.' };
  }
  const candidate = stateRaw as Record<string, unknown>;

  const setupRaw = candidate.setup;
  if (
    typeof setupRaw !== 'object' ||
    setupRaw === null ||
    Array.isArray(setupRaw) ||
    typeof (setupRaw as Record<string, unknown>).topic !== 'string'
  ) {
    return { ok: false, error: 'The project file is damaged — no course setup found.' };
  }

  if (!Array.isArray(candidate.chapters)) {
    return { ok: false, error: 'The project file is damaged — its chapters are missing.' };
  }

  const syllabusRaw = candidate.syllabus ?? null;
  if (syllabusRaw !== null) {
    if (
      typeof syllabusRaw !== 'object' ||
      Array.isArray(syllabusRaw) ||
      !Array.isArray((syllabusRaw as Record<string, unknown>).chapters)
    ) {
      return { ok: false, error: 'The project file is damaged — its syllabus is malformed.' };
    }
  }

  const state: ProjectFileState = {
    currentStage: isStageId(candidate.currentStage) ? candidate.currentStage : 'setup',
    completedStages: Array.isArray(candidate.completedStages)
      ? (candidate.completedStages as unknown[]).filter(isStageId)
      : [],
    setup: setupRaw as CourseSetup,
    syllabus: syllabusRaw as Syllabus | null,
    syllabusConversation: Array.isArray(candidate.syllabusConversation)
      ? (candidate.syllabusConversation as ProjectFileState['syllabusConversation'])
      : [],
    researchDossiers: Array.isArray(candidate.researchDossiers)
      ? (candidate.researchDossiers as ResearchDossier[])
      : [],
    curriculumMap: (candidate.curriculumMap ?? null) as CurriculumMap | null,
    chapters: candidate.chapters as GeneratedChapter[],
  };

  const savedAt = typeof envelope.savedAt === 'string' ? envelope.savedAt : null;
  return { ok: true, state, savedAt };
}

/**
 * Write a validated project-file state into the course store. Zustand's
 * `setState` merges at the top level, so the store's actions stay intact;
 * persistence middleware then writes the restored course to IndexedDB.
 */
export function applyProjectFile(state: ProjectFileState): void {
  useCourseStore.setState({
    currentStage: state.currentStage,
    completedStages: state.completedStages,
    setup: state.setup,
    syllabus: state.syllabus,
    syllabusConversation: state.syllabusConversation,
    researchDossiers: state.researchDossiers,
    curriculumMap: state.curriculumMap,
    chapters: state.chapters,
  });
}
