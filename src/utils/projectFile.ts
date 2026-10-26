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

import { defaultSetup, useCourseStore } from '../store/courseStore';
import { abortAll } from '../services/abortRegistry';
import { normalizeSyllabus } from '../prompts/syllabus';
import { isSafeMediaUrl } from './url';
import type {
  AlignmentLevel,
  BloomLevel,
  CourseSetup,
  CurriculumMap,
  GeneratedChapter,
  LearningObjective,
  ResearchDossier,
  SlideData,
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

// ─── Import sanitizing ─────────────────────────────────────────────────────
//
// A project file is untrusted input — shared by email, hand-edited, written
// by an older build. Everything below makes sure the store only receives
// shapes later stages can render, and nothing a real export never contains.

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);
const asText = (v: unknown): string => (typeof v === 'string' ? v : '');
const optionalText = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const recordList = (v: unknown): Array<Record<string, unknown>> =>
  Array.isArray(v) ? v.filter(isRecord) : [];

/** Missing or wrong-typed setup fields fall back to the defaults — prompts
 *  call string methods on them (e.g. educationLevel.replace). */
function sanitizeSetup(raw: Record<string, unknown>): CourseSetup {
  const setup = { ...defaultSetup, ...raw } as unknown as Record<string, unknown>;
  for (const [key, fallback] of Object.entries(defaultSetup)) {
    if (typeof setup[key] !== typeof fallback) setup[key] = fallback;
  }
  for (const key of [
    'specificTopics',
    'avoidTopics',
    'textbookReference',
    'learnerNotes',
    'environmentNotes',
    'chapterLengthBrief',
  ]) {
    if (setup[key] !== undefined && typeof setup[key] !== 'string') setup[key] = undefined;
  }
  return setup as unknown as CourseSetup;
}

/**
 * A generated chapter from the file. The binaries a real export strips
 * (blob URLs, the infographic, rendered slide images) are dropped again — a
 * crafted file could otherwise plant e.g. `audioUrl: "javascript:…"` for a
 * download button to click — and the one binary it may carry, the narration,
 * must be an actual base64 audio data URI. Fields later stages map over are
 * kept only when they have the right shape.
 */
function sanitizeChapter(raw: Record<string, unknown>): GeneratedChapter {
  const chapter = { ...raw } as unknown as GeneratedChapter;
  chapter.title = asText(raw.title) || `Chapter ${raw.number}`;
  chapter.htmlContent = asText(raw.htmlContent);
  chapter.audioUrl = undefined;
  chapter.pptxUrl = undefined;
  chapter.infographicDataUri = undefined;
  chapter.audioDataUri = isSafeMediaUrl(raw.audioDataUri, 'audio') ? raw.audioDataUri : undefined;
  chapter.practiceQuizData = optionalText(raw.practiceQuizData);
  chapter.audioTranscript = optionalText(raw.audioTranscript);
  chapter.infographicPrompt = optionalText(raw.infographicPrompt);
  chapter.slidesJson = Array.isArray(raw.slidesJson)
    ? recordList(raw.slidesJson).map((s) => ({
        ...(s as unknown as SlideData),
        title: asText(s.title),
        speakerNotes: asText(s.speakerNotes),
        imageDataUri: undefined,
      }))
    : undefined;
  for (const key of ['inClassQuizData', 'discussionData', 'activityData'] as const) {
    const list = raw[key];
    // Each entry is an object the tabs read fields from; anything else would
    // crash their .map().
    (chapter as unknown as Record<string, unknown>)[key] = Array.isArray(list)
      ? list.filter(isRecord)
      : undefined;
  }
  if (!isRecord(raw.activityDetails)) chapter.activityDetails = undefined;
  if (!isRecord(raw.weeklyChallengeData) || !Array.isArray(raw.weeklyChallengeData.questions)) {
    chapter.weeklyChallengeData = undefined;
  }
  return chapter;
}

function sanitizeDossier(raw: Record<string, unknown>): ResearchDossier {
  return {
    chapterNumber: raw.chapterNumber as number,
    sources: recordList(raw.sources).map((s) => ({
      title: asText(s.title),
      authors: asText(s.authors),
      year: typeof s.year === 'number' ? String(s.year) : asText(s.year),
      url: optionalText(s.url),
      doi: optionalText(s.doi),
      summary: asText(s.summary),
      relevance: asText(s.relevance),
      isVerified: s.isVerified === true,
    })),
    synthesisNotes: asText(raw.synthesisNotes),
  };
}

const BLOOM_LEVELS = new Set<string>(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']);
const ALIGNMENT_LEVELS = new Set<string>(['introduced', 'developed', 'mastered']);

/** Null unless it carries usable objectives. The outcomes table indexes its
 *  palette by bloomLevel and reads every alignment as a level, so anything
 *  else would throw on Export. */
function sanitizeCurriculumMap(raw: unknown): CurriculumMap | null {
  if (!isRecord(raw)) return null;
  const objectives: LearningObjective[] = [];
  for (const o of recordList(raw.objectives)) {
    if (typeof o.text !== 'string' || typeof o.bloomLevel !== 'string') continue;
    if (!BLOOM_LEVELS.has(o.bloomLevel) || !isRecord(o.alignments)) continue;
    const alignments: LearningObjective['alignments'] = {};
    for (const [key, level] of Object.entries(o.alignments)) {
      const chapterNum = Number(key);
      if (Number.isFinite(chapterNum) && typeof level === 'string' && ALIGNMENT_LEVELS.has(level)) {
        alignments[chapterNum] = level as AlignmentLevel;
      }
    }
    objectives.push({
      id: isFiniteNumber(o.id) ? o.id : objectives.length + 1,
      text: o.text,
      bloomLevel: o.bloomLevel as BloomLevel,
      alignments,
    });
  }
  if (objectives.length === 0) return null;
  return {
    objectives,
    generatedAt: asText(raw.generatedAt),
    syllabusHash: optionalText(raw.syllabusHash),
  };
}

/**
 * Parse and validate project-file text. Every nested shape later stages read
 * is checked or coerced, and the binaries a real export never contains are
 * dropped (see sanitizeChapter).
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
  let syllabus: Syllabus | null = null;
  if (syllabusRaw !== null) {
    // Coerces every chapter (missing arrays, non-string titles) the same way
    // a fresh model response is; no usable chapters means a damaged file.
    syllabus = normalizeSyllabus(syllabusRaw);
    if (!syllabus) {
      return { ok: false, error: 'The project file is damaged — its syllabus is malformed.' };
    }
  }

  // Keyed by chapter number everywhere downstream — drop anything without one,
  // and keep one dossier per chapter (older builds could save duplicates).
  const dossiers = new Map<number, ResearchDossier>();
  for (const d of recordList(candidate.researchDossiers)) {
    if (isFiniteNumber(d.chapterNumber)) dossiers.set(d.chapterNumber, sanitizeDossier(d));
  }

  const state: ProjectFileState = {
    currentStage: isStageId(candidate.currentStage) ? candidate.currentStage : 'setup',
    completedStages: Array.isArray(candidate.completedStages)
      ? (candidate.completedStages as unknown[]).filter(isStageId)
      : [],
    setup: sanitizeSetup(setupRaw as Record<string, unknown>),
    syllabus,
    syllabusConversation: recordList(candidate.syllabusConversation)
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content as string })),
    researchDossiers: [...dossiers.values()],
    curriculumMap: sanitizeCurriculumMap(candidate.curriculumMap),
    chapters: recordList(candidate.chapters)
      .filter((c) => isFiniteNumber(c.number))
      .map(sanitizeChapter),
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
  // A stream still running for the course being replaced would otherwise
  // write its result into the restored one.
  abortAll();
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
