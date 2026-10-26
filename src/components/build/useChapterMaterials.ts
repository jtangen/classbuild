import { useCallback, useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { useCourseStore } from '../../store/courseStore';
import { streamWithRetry } from '../../services/claude/streaming';
import { MODELS } from '../../services/claude/client';
import { buildPracticeQuizPrompt, buildPracticeQuizUserPrompt } from '../../prompts/practiceQuiz';
import { buildInClassQuizPrompt, buildInClassQuizUserPrompt } from '../../prompts/inClassQuiz';
import { buildDiscussionPrompt, buildDiscussionUserPrompt } from '../../prompts/discussion';
import {
  buildActivitiesPrompt,
  buildActivitiesUserPrompt,
  buildActivityDetailPrompt,
  buildActivityDetailUserPrompt,
} from '../../prompts/activities';
import {
  buildAudioTranscriptPrompt,
  buildAudioTranscriptUserPrompt,
} from '../../prompts/audioTranscript';
import { buildSlidesPrompt, buildSlidesUserPrompt } from '../../prompts/slides';
import { friendlyError, isAbortError } from '../../utils/errors';
import { beginAbortable, endAbortable, materialAbortKey } from '../../services/abortRegistry';
import { parseJson } from '../../utils/format';
import { normalizeActivityDetail } from '../../utils/activityDetail';
import { persistableAudioDataUri } from '../../utils/audio';
import { getVoiceOption } from '../../themes';
import type {
  Syllabus,
  ChapterSyllabus,
  GeneratedChapter,
  CourseSetup,
  InClassQuizQuestion,
  SlideData,
  ActivityDetail,
  WeeklyChallengeData,
} from '../../types/course';

/**
 * useChapterMaterials — single hook that owns every piece of per-chapter
 * material state on BuildPage, plus the seven generation handlers and the
 * two adjacent helpers (retryAudio, fleshOutActivity).
 *
 * Why this exists:
 *
 *   - BuildPage had ~700 lines of generation logic that all followed the
 *     same shape (begin → stream → parse → updateChapter → finish).
 *     Inlining seven copies of that pattern made the page hard to scan and
 *     hard to change in one place. This hook centralises the lifecycle
 *     (`runGenerationLifecycle`) and reads as seven small recipes.
 *   - The per-chapter local state (quizHtml, slidesData, audioUrl, …) was
 *     scattered across the page and reset by a single sprawling useEffect.
 *     Co-locating state, reset, and generators here means a future change
 *     to "what does the Audio tab know about itself" lives in one file.
 *
 * BuildPage still owns: the chapter HTML itself (chapterHtml), refine
 * flows, batch generation, image refine drawer, navigation, layout.
 * Anything that's about a *single material's lifecycle* lives here.
 */

export type DiscussionPrompt = { prompt: string; hook: string };
export type Activity = {
  title: string;
  duration: string;
  description: string;
  materials: string;
  learningGoal: string;
  scalingNotes: string;
};

export interface UseChapterMaterialsParams {
  syllabus: Syllabus | null;
  currentChapter: GeneratedChapter | undefined;
  syllabusChapter: ChapterSyllabus | undefined;
  selectedChapterNum: number;
  /** Ref to the live selectedChapterNum so async completions can verify the
   *  user hasn't switched to a different chapter before committing local state. */
  selectedChapterRef: React.RefObject<number>;
  claudeApiKey: string;
  elevenLabsApiKey: string;
  setup: CourseSetup;
  updateChapter: (num: number, updates: Partial<GeneratedChapter>) => void;
  /** Global error toast — used by fleshOutActivity (it has no tab-error slot). */
  setError: (msg: string) => void;
  // uiStore in-flight setters, mirrored so the cross-page Header chips
  // and the in-tab "drafting…" states stay in sync.
  setGeneratingQuiz: (n: number | null) => void;
  setGeneratingInClassQuiz: (n: number | null) => void;
  setGeneratingWeeklyChallenge: (n: number | null) => void;
  setGeneratingDiscussion: (n: number | null) => void;
  setGeneratingActivities: (n: number | null) => void;
  setGeneratingAudio: (n: number | null) => void;
  setGeneratingSlides: (n: number | null) => void;
}

export interface UseChapterMaterialsResult {
  quizHtml: string;
  inClassQuizData: InClassQuizQuestion[];
  weeklyChallengeHtml: string;
  discussions: DiscussionPrompt[];
  activities: Activity[];
  audioTranscript: string;
  audioUrl: string;
  audioError: string;
  /** Non-error notice: synthesized audio exceeded the persistable size cap. */
  audioPersistNote: string;
  audioPhase: 'transcript' | 'synthesizing' | null;
  audioChunkProgress: { current: number; total: number } | null;
  slidesData: SlideData[];
  setSlidesData: React.Dispatch<React.SetStateAction<SlideData[]>>;
  expandedActivities: Record<number, ActivityDetail>;
  setExpandedActivities: React.Dispatch<React.SetStateAction<Record<number, ActivityDetail>>>;
  expandingActivity: number | null;
  tabErrors: Record<string, string>;
  setTabError: (kind: string, msg: string) => void;
  clearTabError: (kind: string) => void;

  generateQuiz: () => Promise<void>;
  generateInClassQuiz: () => Promise<void>;
  generateWeeklyChallenge: () => Promise<void>;
  generateDiscussion: () => Promise<void>;
  generateActivities: () => Promise<void>;
  generateAudio: () => Promise<void>;
  generateSlides: () => Promise<void>;
  retryAudio: () => Promise<void>;
  fleshOutActivity: (index: number) => Promise<void>;
}

/**
 * Which run owns each kind's single uiStore in-flight slot. A run that was
 * superseded (a re-generate aborts it via beginAbortable, or the same kind was
 * started on another chapter) must not clear the slot, i.e. the spinner, Stop
 * button and disabled CTAs, out from under the run that replaced it.
 */
const inFlightOwner = new Map<string, AbortController>();

function claimInFlight(
  kind: string,
  controller: AbortController,
  chapterNum: number,
  setGenerating: (n: number | null) => void,
): void {
  inFlightOwner.set(kind, controller);
  setGenerating(chapterNum);
}

function releaseInFlight(
  kind: string,
  controller: AbortController,
  setGenerating: (n: number | null) => void,
): void {
  if (inFlightOwner.get(kind) !== controller) return;
  inFlightOwner.delete(kind);
  setGenerating(null);
}

/**
 * Wrap the common begin/end pattern shared by all seven generators:
 *
 *   claim the in-flight slot (setGenerating(chapterNum))
 *   clearTabError(kind, chapterNum)
 *   try { await run() }
 *   catch (err) { setTabError(kind, chapterNum, friendlyError(...)) }
 *   finally { release the slot if this run still owns it }
 *
 * Each generator just provides its own `run` with the prompt + side effects.
 */
async function runGenerationLifecycle({
  kind,
  chapterNum,
  setGenerating,
  setTabError,
  clearTabError,
  errorPrefix,
  run,
}: {
  kind: string;
  chapterNum: number;
  setGenerating: (n: number | null) => void;
  setTabError: (kind: string, chapterNum: number, msg: string) => void;
  clearTabError: (kind: string, chapterNum: number) => void;
  errorPrefix: string;
  run: (signal: AbortSignal) => Promise<void>;
}): Promise<void> {
  // Register an AbortController so a Stop button anywhere in the app can
  // cancel this generation (abortInFlight(materialAbortKey(kind, chapter))).
  const abortKey = materialAbortKey(kind, chapterNum);
  const controller = beginAbortable(abortKey);
  claimInFlight(kind, controller, chapterNum, setGenerating);
  clearTabError(kind, chapterNum);
  try {
    await run(controller.signal);
  } catch (err) {
    // A user-initiated Stop is a silent cancel, never an error banner.
    if (!isAbortError(err) && !controller.signal.aborted) {
      setTabError(kind, chapterNum, friendlyError(err, errorPrefix));
    }
  } finally {
    endAbortable(abortKey, controller);
    releaseInFlight(kind, controller, setGenerating);
  }
}

/** Shown when a synthesized narration exceeds the persistable size cap — it
 *  plays fine now, but won't survive a reload, and silence about that read as
 *  data loss. */
const AUDIO_OVER_CAP_NOTE =
  'This narration is too large to keep across sessions — it plays now, but after a ' +
  'reload you’ll need to re-narrate it from the transcript (which is kept).';

// An ElevenLabsTtsError with no HTTP status = the request never reached the API
// (the local-block / rejected-fetch path in tts.ts); its message is already
// actionable, so surface it verbatim. Errors carrying a status (401/429/5xx)
// still go through friendlyError for the mapped copy ("API key rejected", etc.).
function ttsErrorMessage(err: unknown): string {
  if (
    err instanceof Error &&
    err.name === 'ElevenLabsTtsError' &&
    (err as { status?: number }).status == null
  ) {
    return err.message;
  }
  return friendlyError(err, 'Audio synthesis failed.');
}

/**
 * Keep only well-formed in-class quiz questions, with the text fields the tab
 * and the DOCX export read coerced to strings. A schema-drifted reply (say, an
 * entry without `distractors`) would otherwise persist and crash the tab.
 */
export function wellFormedInClassQuiz(raw: unknown): InClassQuizQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (q) =>
        !!q &&
        typeof q.question === 'string' &&
        typeof q.correctAnswer === 'string' &&
        Array.isArray(q.distractors) &&
        q.distractors.every((d: unknown) => typeof (d as { text?: unknown } | null)?.text === 'string'),
    )
    .map((q) => ({
      question: q.question,
      correctAnswer: q.correctAnswer,
      correctFeedback: String(q.correctFeedback ?? ''),
      distractors: q.distractors.map((d: { text: string; feedback?: unknown }) => ({
        text: d.text,
        feedback: String(d.feedback ?? ''),
      })),
    }));
}

/**
 * Parsed rows whose `required` fields are strings (the tabs render them as
 * text, and an object there throws). Filter before persisting only, never on
 * rehydrate: slides and activities are addressed by index.
 */
export function wellFormedRows<T>(raw: unknown, required: readonly string[]): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (r) => !!r && typeof r === 'object' && required.every((f) => typeof r[f] === 'string'),
  ) as T[];
}

/**
 * A narration's blob: URL is held only by its chapter's store entry and this
 * hook's mirror of the chapter in view, so once a new narration replaces it (or
 * a refine clears it) nothing can still play it. Revoke it so the MP3 bytes
 * aren't pinned in memory for the rest of the session.
 */
export function revokeNarrationUrl(url: string | undefined): void {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

const storedAudioUrl = (chapterNum: number): string | undefined =>
  useCourseStore.getState().chapters.find((c) => c.number === chapterNum)?.audioUrl;

export function useChapterMaterials(params: UseChapterMaterialsParams): UseChapterMaterialsResult {
  const {
    syllabus,
    currentChapter,
    syllabusChapter,
    selectedChapterNum,
    selectedChapterRef,
    claudeApiKey,
    elevenLabsApiKey,
    setup,
    updateChapter,
    setError,
    setGeneratingQuiz,
    setGeneratingInClassQuiz,
    setGeneratingWeeklyChallenge,
    setGeneratingDiscussion,
    setGeneratingActivities,
    setGeneratingAudio,
    setGeneratingSlides,
  } = params;

  // ── State ──────────────────────────────────────────────────────────
  const [quizHtml, setQuizHtml] = useState('');
  const [inClassQuizData, setInClassQuizData] = useState<InClassQuizQuestion[]>([]);
  const [weeklyChallengeHtml, setWeeklyChallengeHtml] = useState('');
  const [discussions, setDiscussions] = useState<DiscussionPrompt[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [audioTranscript, setAudioTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioError, setAudioError] = useState('');
  const [audioPersistNote, setAudioPersistNote] = useState('');
  const [audioPhase, setAudioPhase] = useState<'transcript' | 'synthesizing' | null>(null);
  const [audioChunkProgress, setAudioChunkProgress] = useState<{ current: number; total: number } | null>(null);
  const [slidesData, setSlidesData] = useState<SlideData[]>([]);
  const [expandedActivities, setExpandedActivities] = useState<Record<number, ActivityDetail>>({});
  const [expandingActivity, setExpandingActivity] = useState<number | null>(null);
  // Keyed `${kind}:${chapter}`: a background run that fails after the user
  // switched chapters reports on its own chapter, not the one in view.
  const [tabErrorsByKey, setTabErrorsByKey] = useState<Record<string, string>>({});

  // ── Tab error helpers ──────────────────────────────────────────────
  const setChapterTabError = useCallback((tab: string, chapterNum: number, msg: string) => {
    setTabErrorsByKey((prev) => ({ ...prev, [materialAbortKey(tab, chapterNum)]: msg }));
  }, []);

  const clearChapterTabError = useCallback((tab: string, chapterNum: number) => {
    const key = materialAbortKey(tab, chapterNum);
    setTabErrorsByKey((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // The selected chapter's errors, keyed by tab — the shape BuildPage reads.
  const tabErrors = useMemo(() => {
    const suffix = materialAbortKey('', selectedChapterNum);
    const out: Record<string, string> = {};
    for (const [key, msg] of Object.entries(tabErrorsByKey)) {
      if (key.endsWith(suffix)) out[key.slice(0, -suffix.length)] = msg;
    }
    return out;
  }, [tabErrorsByKey, selectedChapterNum]);

  const setTabError = useCallback(
    (tab: string, msg: string) => setChapterTabError(tab, selectedChapterNum, msg),
    [setChapterTabError, selectedChapterNum],
  );

  const clearTabError = useCallback(
    (tab: string) => clearChapterTabError(tab, selectedChapterNum),
    [clearChapterTabError, selectedChapterNum],
  );

  // ── Chapter switch: reset ──────────────────────────────────────────
  // Per-run UI state (an activity expansion, audio progress and errors)
  // belongs to the chapter it started on. The two async-built previews are
  // cleared here so the old chapter's quiz never shows under the new one;
  // everything else is re-derived by the rehydrate effect below.
  useEffect(() => {
    setQuizHtml('');
    setWeeklyChallengeHtml('');
    setExpandingActivity(null);
    setAudioChunkProgress(null);
    setAudioError('');
    setAudioPersistNote('');
  }, [selectedChapterNum]);

  // ── Rehydrate from the store ───────────────────────────────────────
  // Runs on a chapter switch and whenever the selected chapter's store entry
  // changes (a material landing, a slide image rendering). It only mirrors
  // data, so a sibling material landing no longer wipes tab errors, an
  // in-progress activity expansion or audio progress.
  useEffect(() => {
    const ch = currentChapter;
    setInClassQuizData(wellFormedInClassQuiz(ch?.inClassQuizData));
    setDiscussions(ch?.discussionData ?? []);
    setActivities(ch?.activityData ?? []);
    setExpandedActivities(ch?.activityDetails ?? {});
    setAudioTranscript(ch?.audioTranscript ?? '');
    setAudioUrl(ch?.audioUrl ?? ch?.audioDataUri ?? '');
    setSlidesData(ch?.slidesJson ?? []);

    // The template builds are async (code-split chunks). A newer run of this
    // effect (another chapter, or fresher data) cancels a stale one, which
    // could otherwise land the previous chapter's quiz under this chapter.
    let cancelled = false;
    const syllCh = syllabus?.chapters.find((sc) => sc.number === selectedChapterNum);
    const practiceQuizData = ch?.practiceQuizData;
    if (ch && practiceQuizData && syllabus) {
      (async () => {
        try {
          const { buildQuizHtml } = await import('../../templates/quizTemplate');
          if (cancelled) return;
          const html = buildQuizHtml(
            `${syllCh?.title || ch.title} — Practice Quiz`,
            practiceQuizData,
            syllabus.courseTitle,
            setup.themeId,
          );
          setQuizHtml(html);
        } catch {
          /* template failed */
        }
      })();
    } else {
      setQuizHtml('');
    }
    const weeklyChallengeData = ch?.weeklyChallengeData;
    if (ch && weeklyChallengeData && syllabus) {
      (async () => {
        try {
          const { buildWeeklyChallengeHtml } = await import('../../templates/weeklyChallengeTemplate');
          if (cancelled) return;
          const html = buildWeeklyChallengeHtml(
            `Week ${selectedChapterNum} Challenge — ${syllCh?.title || ch.title}`,
            weeklyChallengeData,
            syllabus.courseTitle,
            setup.themeId,
          );
          setWeeklyChallengeHtml(html);
        } catch {
          /* template failed */
        }
      })();
    } else {
      setWeeklyChallengeHtml('');
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChapterNum, currentChapter]);

  // ── Generators ─────────────────────────────────────────────────────

  const generateQuiz = useCallback(async () => {
    if (!syllabus || !currentChapter || !syllabusChapter) return;
    const chapterNum = selectedChapterNum;
    await runGenerationLifecycle({
      kind: 'quiz',
      chapterNum,
      setGenerating: setGeneratingQuiz,
      setTabError: setChapterTabError,
      clearTabError: clearChapterTabError,
      errorPrefix: 'Quiz generation failed.',
      run: async (signal) => {
        const fullText = await streamWithRetry(
          {
            apiKey: claudeApiKey,
            model: MODELS.opus,
            system: buildPracticeQuizPrompt(),
            signal,
            messages: [
              {
                role: 'user',
                content: buildPracticeQuizUserPrompt(
                  syllabusChapter.title,
                  syllabusChapter.narrative,
                  syllabusChapter.keyConcepts,
                  currentChapter.htmlContent?.slice(0, 3000),
                ),
              },
            ],
            thinkingBudget: 'high',
            maxTokens: 8000,
          },
          {},
        );

        const { balancePracticeQuiz } = await import('../../services/quiz/answerBalancer');
        const balancedText = await balancePracticeQuiz(fullText, claudeApiKey, signal);
        // A Stop after the stream (during balancing) still means "discard".
        signal.throwIfAborted();
        updateChapter(chapterNum, { practiceQuizData: balancedText });

        if (selectedChapterRef.current === chapterNum) {
          try {
            const { buildQuizHtml } = await import('../../templates/quizTemplate');
            const html = buildQuizHtml(
              `${syllabusChapter.title} — Practice Quiz`,
              balancedText,
              syllabus.courseTitle,
              setup.themeId,
            );
            setQuizHtml(html);
          } catch {
            const fallbackHtml = `<!DOCTYPE html><html><head><style>
              body { background: #0f0f1a; color: #f1f5f9; font-family: system-ui; padding: 2rem; line-height: 1.8; }
              strong { color: #a78bfa; }
              hr { border-color: #252540; margin: 1.5rem 0; }
            </style></head><body><pre style="white-space:pre-wrap">${fullText.replace(/</g, '&lt;')}</pre></body></html>`;
            setQuizHtml(fallbackHtml);
          }
        }
      },
    });
  }, [
    syllabus,
    currentChapter,
    syllabusChapter,
    selectedChapterNum,
    selectedChapterRef,
    claudeApiKey,
    setup.themeId,
    updateChapter,
    setGeneratingQuiz,
    setChapterTabError,
    clearChapterTabError,
  ]);

  const generateInClassQuiz = useCallback(async () => {
    if (!syllabus || !currentChapter || !syllabusChapter) return;
    const chapterNum = selectedChapterNum;
    await runGenerationLifecycle({
      kind: 'inclassquiz',
      chapterNum,
      setGenerating: setGeneratingInClassQuiz,
      setTabError: setChapterTabError,
      clearTabError: clearChapterTabError,
      errorPrefix: 'In-class quiz generation failed.',
      run: async (signal) => {
        const fullText = await streamWithRetry(
          {
            apiKey: claudeApiKey,
            model: MODELS.opus,
            system: buildInClassQuizPrompt(),
            signal,
            messages: [
              {
                role: 'user',
                content: buildInClassQuizUserPrompt(
                  syllabusChapter.title,
                  syllabusChapter.narrative,
                  syllabusChapter.keyConcepts,
                  currentChapter.htmlContent?.slice(0, 3000),
                ),
              },
            ],
            thinkingBudget: 'high',
            maxTokens: 8000,
          },
          {},
        );

        let parsed: InClassQuizQuestion[];
        try {
          parsed = wellFormedInClassQuiz(parseJson(fullText));
          if (parsed.length === 0) throw new Error('No usable in-class quiz questions.');
        } catch {
          setChapterTabError('inclassquiz', chapterNum, 'Failed to parse in-class quiz data');
          return;
        }
        // Outside the parse guard: an abort during balancing must stay an abort.
        const { balanceInClassQuiz } = await import('../../services/quiz/answerBalancer');
        const balanced = await balanceInClassQuiz(parsed, claudeApiKey, signal);
        signal.throwIfAborted();
        if (selectedChapterRef.current === chapterNum) setInClassQuizData(balanced);
        updateChapter(chapterNum, { inClassQuizData: balanced });
      },
    });
  }, [
    syllabus,
    currentChapter,
    syllabusChapter,
    selectedChapterNum,
    selectedChapterRef,
    claudeApiKey,
    updateChapter,
    setGeneratingInClassQuiz,
    setChapterTabError,
    clearChapterTabError,
  ]);

  const generateWeeklyChallenge = useCallback(async () => {
    if (!syllabus || !currentChapter || !syllabusChapter) return;
    const chapterNum = selectedChapterNum;
    await runGenerationLifecycle({
      kind: 'weeklychallenge',
      chapterNum,
      setGenerating: setGeneratingWeeklyChallenge,
      setTabError: setChapterTabError,
      clearTabError: clearChapterTabError,
      errorPrefix: 'Weekly challenge generation failed.',
      run: async (signal) => {
        const priorChapters = (syllabusChapter.spacingConnections || [])
          .map((n) => syllabus.chapters.find((c) => c.number === n))
          .filter((c): c is NonNullable<typeof c> => !!c)
          .map((c) => ({ number: c.number, title: c.title, keyConcepts: c.keyConcepts }));

        const { buildWeeklyChallengePrompt, buildWeeklyChallengeUserPrompt } = await import(
          '../../prompts/weeklyChallenge'
        );

        const fullText = await streamWithRetry(
          {
            apiKey: claudeApiKey,
            model: MODELS.opus,
            system: buildWeeklyChallengePrompt(),
            signal,
            messages: [
              {
                role: 'user',
                content: buildWeeklyChallengeUserPrompt(
                  syllabusChapter.title,
                  syllabusChapter.narrative,
                  syllabusChapter.keyConcepts,
                  currentChapter.htmlContent?.slice(0, 3000),
                  syllabusChapter.number,
                  priorChapters,
                ),
              },
            ],
            thinkingBudget: 'high',
            maxTokens: 10000,
          },
          {},
        );

        try {
          const parsed = parseJson(fullText, '{') as WeeklyChallengeData;
          updateChapter(chapterNum, { weeklyChallengeData: parsed });

          if (selectedChapterRef.current === chapterNum) {
            try {
              const { buildWeeklyChallengeHtml } = await import('../../templates/weeklyChallengeTemplate');
              const html = buildWeeklyChallengeHtml(
                `Week ${chapterNum} Challenge — ${syllabusChapter.title}`,
                parsed,
                syllabus.courseTitle,
                setup.themeId,
              );
              setWeeklyChallengeHtml(html);
            } catch (templateErr) {
              // Surface (don't swallow) — a swallowed throw here is exactly why
              // the challenge silently reverted to the button for so long.
              setChapterTabError(
                'weeklychallenge',
                chapterNum,
                `Challenge generated, but rendering the preview failed: ${
                  templateErr instanceof Error ? templateErr.message : String(templateErr)
                }`,
              );
            }
          }
        } catch {
          setChapterTabError('weeklychallenge', chapterNum, 'Failed to parse weekly challenge data');
        }
      },
    });
  }, [
    syllabus,
    currentChapter,
    syllabusChapter,
    selectedChapterNum,
    selectedChapterRef,
    claudeApiKey,
    setup.themeId,
    updateChapter,
    setGeneratingWeeklyChallenge,
    setChapterTabError,
    clearChapterTabError,
  ]);

  const generateDiscussion = useCallback(async () => {
    if (!syllabus || !syllabusChapter) return;
    const chapterNum = selectedChapterNum;
    await runGenerationLifecycle({
      kind: 'discussion',
      chapterNum,
      setGenerating: setGeneratingDiscussion,
      setTabError: setChapterTabError,
      clearTabError: clearChapterTabError,
      errorPrefix: 'Discussion generation failed.',
      run: async (signal) => {
        const fullText = await streamWithRetry(
          {
            apiKey: claudeApiKey,
            system: buildDiscussionPrompt(),
            signal,
            messages: [
              {
                role: 'user',
                content: buildDiscussionUserPrompt(
                  syllabusChapter.title,
                  syllabusChapter.keyConcepts,
                  setup.cohortSize,
                  setup.teachingEnvironment,
                ),
              },
            ],
            thinkingBudget: 'medium',
            maxTokens: 4000,
          },
          {},
        );

        try {
          const parsed = wellFormedRows<DiscussionPrompt>(parseJson(fullText), ['prompt']);
          if (parsed.length === 0) throw new Error('No usable discussion prompts.');
          if (selectedChapterRef.current === chapterNum) setDiscussions(parsed);
          updateChapter(chapterNum, { discussionData: parsed });
        } catch {
          setChapterTabError('discussion', chapterNum, 'Failed to parse discussion prompts');
        }
      },
    });
  }, [
    syllabus,
    syllabusChapter,
    selectedChapterNum,
    selectedChapterRef,
    claudeApiKey,
    setup.cohortSize,
    setup.teachingEnvironment,
    updateChapter,
    setGeneratingDiscussion,
    setChapterTabError,
    clearChapterTabError,
  ]);

  const generateActivities = useCallback(async () => {
    if (!syllabus || !syllabusChapter) return;
    const chapterNum = selectedChapterNum;
    await runGenerationLifecycle({
      kind: 'activities',
      chapterNum,
      setGenerating: setGeneratingActivities,
      setTabError: setChapterTabError,
      clearTabError: clearChapterTabError,
      errorPrefix: 'Activities generation failed.',
      run: async (signal) => {
        const fullText = await streamWithRetry(
          {
            apiKey: claudeApiKey,
            system: buildActivitiesPrompt(),
            signal,
            messages: [
              {
                role: 'user',
                content: buildActivitiesUserPrompt(
                  syllabusChapter.title,
                  syllabusChapter.keyConcepts,
                  setup.cohortSize,
                  setup.teachingEnvironment,
                  setup.environmentNotes,
                ),
              },
            ],
            thinkingBudget: 'medium',
            maxTokens: 4000,
          },
          {},
        );

        try {
          const parsed = wellFormedRows<Activity>(parseJson(fullText), ['title']);
          if (parsed.length === 0) throw new Error('No usable activities.');
          if (selectedChapterRef.current === chapterNum) setActivities(parsed);
          updateChapter(chapterNum, { activityData: parsed });
        } catch {
          setChapterTabError('activities', chapterNum, 'Failed to parse activities');
        }
      },
    });
  }, [
    syllabus,
    syllabusChapter,
    selectedChapterNum,
    selectedChapterRef,
    claudeApiKey,
    setup.cohortSize,
    setup.teachingEnvironment,
    setup.environmentNotes,
    updateChapter,
    setGeneratingActivities,
    setChapterTabError,
    clearChapterTabError,
  ]);

  const fleshOutActivity = useCallback(
    async (index: number) => {
      if (!syllabusChapter || expandingActivity !== null) return;
      const activity = activities[index];
      if (!activity) return;
      // Captured: the user may switch chapters while the guide is written.
      const chapterNum = selectedChapterNum;

      setExpandingActivity(index);
      try {
        const fullText = await streamWithRetry(
          {
            apiKey: claudeApiKey,
            model: MODELS.haiku,
            system: buildActivityDetailPrompt(),
            messages: [
              {
                role: 'user',
                content: buildActivityDetailUserPrompt(
                  activity,
                  syllabusChapter.title,
                  setup.cohortSize,
                  setup.teachingEnvironment,
                  setup.environmentNotes,
                ),
              },
            ],
            thinkingBudget: 'low',
            maxTokens: 8000,
          },
          {},
        );

        try {
          const parsed = normalizeActivityDetail(
            parseJson(fullText, '{') as Partial<ActivityDetail>,
          );
          if (parsed) {
            // Merge into the store's copy for *this* chapter. The local map may
            // already hold another chapter's details by now.
            const stored = useCourseStore
              .getState()
              .chapters.find((c) => c.number === chapterNum)?.activityDetails;
            updateChapter(chapterNum, { activityDetails: { ...stored, [index]: parsed } });
            if (selectedChapterRef.current === chapterNum) {
              setExpandedActivities((prev) => ({ ...prev, [index]: parsed }));
            }
          }
        } catch (parseErr) {
          setError(
            `Failed to parse activity details: ${
              parseErr instanceof Error ? parseErr.message : String(parseErr)
            }`,
          );
        }
      } catch (err) {
        setError(friendlyError(err, 'Activity detail generation failed.'));
      } finally {
        // A chapter switch already reset this; don't clear a newer expansion.
        if (selectedChapterRef.current === chapterNum) setExpandingActivity(null);
      }
    },
    [
      activities,
      syllabusChapter,
      claudeApiKey,
      setup.cohortSize,
      setup.teachingEnvironment,
      setup.environmentNotes,
      expandingActivity,
      setError,
      selectedChapterNum,
      selectedChapterRef,
      updateChapter,
    ],
  );

  const generateAudio = useCallback(async () => {
    if (!currentChapter || !syllabus) return;
    const chapterNum = selectedChapterNum;
    await runGenerationLifecycle({
      kind: 'audio',
      chapterNum,
      setGenerating: setGeneratingAudio,
      setTabError: setChapterTabError,
      clearTabError: clearChapterTabError,
      errorPrefix: 'Audio transcript generation failed.',
      run: async (signal) => {
        setAudioPhase('transcript');
        setAudioError('');
        try {
          const transcript = await streamWithRetry(
            {
              apiKey: claudeApiKey,
              system: buildAudioTranscriptPrompt(),
              signal,
              messages: [
                {
                  role: 'user',
                  content: buildAudioTranscriptUserPrompt(
                    currentChapter.title,
                    currentChapter.htmlContent,
                  ),
                },
              ],
              thinkingBudget: 'medium',
              maxTokens: 8000,
            },
            {},
          );

          if (selectedChapterRef.current === chapterNum) setAudioTranscript(transcript);
          updateChapter(chapterNum, { audioTranscript: transcript });

          if (elevenLabsApiKey) {
            setAudioPhase('synthesizing');
            setAudioChunkProgress(null);
            try {
              const { generateAudiobook } = await import('../../services/elevenLabs/tts');
              const voice = getVoiceOption(setup.voiceId);
              const blob = await generateAudiobook(transcript, elevenLabsApiKey, {
                voiceId: voice.id,
                signal,
                onProgress: (current, total) => setAudioChunkProgress({ current, total }),
              });
              // Persist a (size-capped) data URI too — the blob URL below is
              // stripped on save and dies on reload; the data URI survives.
              const audioDataUri = await persistableAudioDataUri(blob);
              signal.throwIfAborted();
              const url = URL.createObjectURL(blob);
              if (selectedChapterRef.current === chapterNum) {
                setAudioUrl(url);
                setAudioPersistNote(audioDataUri ? '' : AUDIO_OVER_CAP_NOTE);
              }
              const prevUrl = storedAudioUrl(chapterNum);
              updateChapter(chapterNum, { audioUrl: url, audioDataUri });
              if (prevUrl !== url) revokeNarrationUrl(prevUrl);
            } catch (err) {
              if (isAbortError(err)) throw err;
              const msg = ttsErrorMessage(err);
              console.error('ElevenLabs TTS failed:', err);
              if (selectedChapterRef.current === chapterNum) setAudioError(msg);
            }
          }
        } finally {
          setAudioPhase(null);
          setAudioChunkProgress(null);
        }
      },
    });
  }, [
    currentChapter,
    syllabus,
    selectedChapterNum,
    selectedChapterRef,
    claudeApiKey,
    elevenLabsApiKey,
    setup.voiceId,
    updateChapter,
    setGeneratingAudio,
    setChapterTabError,
    clearChapterTabError,
  ]);

  const retryAudio = useCallback(async () => {
    if (!audioTranscript || !elevenLabsApiKey) return;
    // Captured: a multi-chunk synthesis can outlast a chapter switch, and the
    // local player/notice/error must not land on the chapter now in view.
    const chapterNum = selectedChapterNum;
    const transcript = audioTranscript;
    const abortKey = materialAbortKey('audio', chapterNum);
    const controller = beginAbortable(abortKey);
    claimInFlight('audio', controller, chapterNum, setGeneratingAudio);
    setAudioPhase('synthesizing');
    setAudioError('');
    setAudioChunkProgress(null);

    try {
      const { generateAudiobook } = await import('../../services/elevenLabs/tts');
      const voice = getVoiceOption(setup.voiceId);
      const blob = await generateAudiobook(transcript, elevenLabsApiKey, {
        voiceId: voice.id,
        signal: controller.signal,
        onProgress: (current, total) => setAudioChunkProgress({ current, total }),
      });
      const audioDataUri = await persistableAudioDataUri(blob);
      controller.signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      if (selectedChapterRef.current === chapterNum) {
        setAudioUrl(url);
        setAudioPersistNote(audioDataUri ? '' : AUDIO_OVER_CAP_NOTE);
      }
      const prevUrl = storedAudioUrl(chapterNum);
      updateChapter(chapterNum, { audioUrl: url, audioDataUri });
      if (prevUrl !== url) revokeNarrationUrl(prevUrl);
    } catch (err) {
      if (!isAbortError(err)) {
        const msg = ttsErrorMessage(err);
        console.error('ElevenLabs TTS retry failed:', err);
        if (selectedChapterRef.current === chapterNum) setAudioError(msg);
      }
    } finally {
      endAbortable(abortKey, controller);
      releaseInFlight('audio', controller, setGeneratingAudio);
      setAudioPhase(null);
      setAudioChunkProgress(null);
    }
  }, [
    audioTranscript,
    elevenLabsApiKey,
    selectedChapterNum,
    selectedChapterRef,
    setup.voiceId,
    updateChapter,
    setGeneratingAudio,
  ]);

  const generateSlides = useCallback(async () => {
    if (!currentChapter || !syllabus || !syllabusChapter) return;
    const chapterNum = selectedChapterNum;
    await runGenerationLifecycle({
      kind: 'slides',
      chapterNum,
      setGenerating: setGeneratingSlides,
      setTabError: setChapterTabError,
      clearTabError: clearChapterTabError,
      errorPrefix: 'Slides generation failed.',
      run: async (signal) => {
        const fullText = await streamWithRetry(
          {
            apiKey: claudeApiKey,
            system: buildSlidesPrompt(setup.themeId),
            signal,
            messages: [
              {
                role: 'user',
                content: buildSlidesUserPrompt(
                  syllabusChapter.title,
                  syllabusChapter.keyConcepts,
                  currentChapter.htmlContent,
                ),
              },
            ],
            thinkingBudget: 'medium',
            // 12–14 slides × 180–300-word imagePrompts is ~5–7k output tokens,
            // on top of up to 8k of thinking — 4000 truncated the JSON.
            maxTokens: 12000,
          },
          {},
        );

        try {
          const parsed = wellFormedRows<SlideData>(parseJson(fullText), ['title']);
          if (parsed.length === 0) throw new Error('No usable slides.');
          if (selectedChapterRef.current === chapterNum) setSlidesData(parsed);
          updateChapter(chapterNum, { slidesJson: parsed });
        } catch {
          setChapterTabError('slides', chapterNum, 'Failed to parse slide data from response');
        }
      },
    });
  }, [
    currentChapter,
    syllabus,
    syllabusChapter,
    selectedChapterNum,
    selectedChapterRef,
    claudeApiKey,
    setup.themeId,
    updateChapter,
    setGeneratingSlides,
    setChapterTabError,
    clearChapterTabError,
  ]);

  return {
    quizHtml,
    inClassQuizData,
    weeklyChallengeHtml,
    discussions,
    activities,
    audioTranscript,
    audioUrl,
    audioError,
    audioPersistNote,
    audioPhase,
    audioChunkProgress,
    slidesData,
    setSlidesData,
    expandedActivities,
    setExpandedActivities,
    expandingActivity,
    tabErrors,
    setTabError,
    clearTabError,
    generateQuiz,
    generateInClassQuiz,
    generateWeeklyChallenge,
    generateDiscussion,
    generateActivities,
    generateAudio,
    generateSlides,
    retryAudio,
    fleshOutActivity,
  };
}
