import { useCallback, useEffect, useState } from 'react';
import type React from 'react';
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
import { friendlyError } from '../../utils/errors';
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
 * Wrap the common begin/end pattern shared by all seven generators:
 *
 *   setGenerating(chapterNum)
 *   clearTabError(kind)
 *   try { await run() }
 *   catch (err) { setTabError(kind, friendlyError(...)) }
 *   finally { setGenerating(null) }
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
  setTabError: (kind: string, msg: string) => void;
  clearTabError: (kind: string) => void;
  errorPrefix: string;
  run: () => Promise<void>;
}): Promise<void> {
  setGenerating(chapterNum);
  clearTabError(kind);
  try {
    await run();
  } catch (err) {
    setTabError(kind, friendlyError(err, errorPrefix));
  } finally {
    setGenerating(null);
  }
}

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
  const [audioPhase, setAudioPhase] = useState<'transcript' | 'synthesizing' | null>(null);
  const [audioChunkProgress, setAudioChunkProgress] = useState<{ current: number; total: number } | null>(null);
  const [slidesData, setSlidesData] = useState<SlideData[]>([]);
  const [expandedActivities, setExpandedActivities] = useState<Record<number, ActivityDetail>>({});
  const [expandingActivity, setExpandingActivity] = useState<number | null>(null);
  const [tabErrors, setTabErrors] = useState<Record<string, string>>({});

  // ── Tab error helpers ──────────────────────────────────────────────
  const setTabError = useCallback((tab: string, msg: string) => {
    setTabErrors((prev) => ({ ...prev, [tab]: msg }));
  }, []);

  const clearTabError = useCallback((tab: string) => {
    setTabErrors((prev) => {
      if (!prev[tab]) return prev;
      const next = { ...prev };
      delete next[tab];
      return next;
    });
  }, []);

  // ── Chapter-switch reset + rehydrate ───────────────────────────────
  // When the user switches chapters (or the persisted chapter appears
  // from courseStore), reset all per-material state and re-hydrate from
  // the new chapter if it has prior data.
  useEffect(() => {
    setQuizHtml('');
    setInClassQuizData([]);
    setDiscussions([]);
    setActivities([]);
    setAudioTranscript('');
    setAudioUrl('');
    setSlidesData([]);
    setWeeklyChallengeHtml('');
    setExpandedActivities({});
    setExpandingActivity(null);
    setAudioChunkProgress(null);
    setAudioError('');
    setTabErrors({});

    if (!currentChapter) return;
    const ch = currentChapter;
    if (ch.inClassQuizData && ch.inClassQuizData.length > 0) setInClassQuizData(ch.inClassQuizData);
    if (ch.discussionData && ch.discussionData.length > 0) setDiscussions(ch.discussionData);
    if (ch.activityData && ch.activityData.length > 0) setActivities(ch.activityData);
    if (ch.activityDetails) setExpandedActivities(ch.activityDetails);
    if (ch.audioTranscript) setAudioTranscript(ch.audioTranscript);
    const audioSrc = ch.audioUrl ?? ch.audioDataUri;
    if (audioSrc) setAudioUrl(audioSrc);
    if (ch.slidesJson && ch.slidesJson.length > 0) setSlidesData(ch.slidesJson);
    if (ch.practiceQuizData && syllabus) {
      const syllCh = syllabus.chapters.find((sc) => sc.number === selectedChapterNum);
      (async () => {
        try {
          const { buildQuizHtml } = await import('../../templates/quizTemplate');
          const html = buildQuizHtml(
            `${syllCh?.title || ch.title} — Practice Quiz`,
            ch.practiceQuizData!,
            syllabus.courseTitle,
            setup.themeId,
          );
          setQuizHtml(html);
        } catch {
          /* template failed */
        }
      })();
    }
    if (ch.weeklyChallengeData && syllabus) {
      const syllCh = syllabus.chapters.find((sc) => sc.number === selectedChapterNum);
      (async () => {
        try {
          const { buildWeeklyChallengeHtml } = await import('../../templates/weeklyChallengeTemplate');
          const html = buildWeeklyChallengeHtml(
            `Week ${selectedChapterNum} Challenge — ${syllCh?.title || ch.title}`,
            ch.weeklyChallengeData!,
            syllabus.courseTitle,
            setup.themeId,
          );
          setWeeklyChallengeHtml(html);
        } catch {
          /* template failed */
        }
      })();
    }
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
      setTabError,
      clearTabError,
      errorPrefix: 'Quiz generation failed.',
      run: async () => {
        const fullText = await streamWithRetry(
          {
            apiKey: claudeApiKey,
            model: MODELS.opus,
            system: buildPracticeQuizPrompt(),
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
        const balancedText = await balancePracticeQuiz(fullText, claudeApiKey);
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
    setTabError,
    clearTabError,
  ]);

  const generateInClassQuiz = useCallback(async () => {
    if (!syllabus || !currentChapter || !syllabusChapter) return;
    const chapterNum = selectedChapterNum;
    await runGenerationLifecycle({
      kind: 'inclassquiz',
      chapterNum,
      setGenerating: setGeneratingInClassQuiz,
      setTabError,
      clearTabError,
      errorPrefix: 'In-class quiz generation failed.',
      run: async () => {
        const fullText = await streamWithRetry(
          {
            apiKey: claudeApiKey,
            model: MODELS.opus,
            system: buildInClassQuizPrompt(),
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

        try {
          const parsed = parseJson(fullText) as InClassQuizQuestion[];
          const { balanceInClassQuiz } = await import('../../services/quiz/answerBalancer');
          const balanced = await balanceInClassQuiz(parsed, claudeApiKey);
          if (selectedChapterRef.current === chapterNum) setInClassQuizData(balanced);
          updateChapter(chapterNum, { inClassQuizData: balanced });
        } catch {
          setTabError('inclassquiz', 'Failed to parse in-class quiz data');
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
    updateChapter,
    setGeneratingInClassQuiz,
    setTabError,
    clearTabError,
  ]);

  const generateWeeklyChallenge = useCallback(async () => {
    if (!syllabus || !currentChapter || !syllabusChapter) return;
    const chapterNum = selectedChapterNum;
    await runGenerationLifecycle({
      kind: 'weeklychallenge',
      chapterNum,
      setGenerating: setGeneratingWeeklyChallenge,
      setTabError,
      clearTabError,
      errorPrefix: 'Weekly challenge generation failed.',
      run: async () => {
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
              setTabError(
                'weeklychallenge',
                `Challenge generated, but rendering the preview failed: ${
                  templateErr instanceof Error ? templateErr.message : String(templateErr)
                }`,
              );
            }
          }
        } catch {
          setTabError('weeklychallenge', 'Failed to parse weekly challenge data');
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
    setTabError,
    clearTabError,
  ]);

  const generateDiscussion = useCallback(async () => {
    if (!syllabus || !syllabusChapter) return;
    const chapterNum = selectedChapterNum;
    await runGenerationLifecycle({
      kind: 'discussion',
      chapterNum,
      setGenerating: setGeneratingDiscussion,
      setTabError,
      clearTabError,
      errorPrefix: 'Discussion generation failed.',
      run: async () => {
        const fullText = await streamWithRetry(
          {
            apiKey: claudeApiKey,
            system: buildDiscussionPrompt(),
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
          const parsed = parseJson(fullText) as DiscussionPrompt[];
          if (selectedChapterRef.current === chapterNum) setDiscussions(parsed);
          updateChapter(chapterNum, { discussionData: parsed });
        } catch {
          setTabError('discussion', 'Failed to parse discussion prompts');
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
    setTabError,
    clearTabError,
  ]);

  const generateActivities = useCallback(async () => {
    if (!syllabus || !syllabusChapter) return;
    const chapterNum = selectedChapterNum;
    await runGenerationLifecycle({
      kind: 'activities',
      chapterNum,
      setGenerating: setGeneratingActivities,
      setTabError,
      clearTabError,
      errorPrefix: 'Activities generation failed.',
      run: async () => {
        const fullText = await streamWithRetry(
          {
            apiKey: claudeApiKey,
            system: buildActivitiesPrompt(),
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
          const parsed = parseJson(fullText) as Activity[];
          if (selectedChapterRef.current === chapterNum) setActivities(parsed);
          updateChapter(chapterNum, { activityData: parsed });
        } catch {
          setTabError('activities', 'Failed to parse activities');
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
    setTabError,
    clearTabError,
  ]);

  const fleshOutActivity = useCallback(
    async (index: number) => {
      if (!syllabusChapter || expandingActivity !== null) return;
      const activity = activities[index];
      if (!activity) return;

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
            setExpandedActivities((prev) => {
              const updated = { ...prev, [index]: parsed };
              updateChapter(selectedChapterNum, { activityDetails: updated });
              return updated;
            });
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
        setExpandingActivity(null);
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
      setTabError,
      clearTabError,
      errorPrefix: 'Audio transcript generation failed.',
      run: async () => {
        setAudioPhase('transcript');
        setAudioError('');

        const transcript = await streamWithRetry(
          {
            apiKey: claudeApiKey,
            system: buildAudioTranscriptPrompt(),
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
              onProgress: (current, total) => setAudioChunkProgress({ current, total }),
            });
            const url = URL.createObjectURL(blob);
            if (selectedChapterRef.current === chapterNum) setAudioUrl(url);
            // Persist a (size-capped) data URI too — the blob URL above is
            // stripped on save and dies on reload; the data URI survives.
            const audioDataUri = await persistableAudioDataUri(blob);
            updateChapter(chapterNum, { audioUrl: url, audioDataUri });
          } catch (err) {
            const msg = ttsErrorMessage(err);
            console.error('ElevenLabs TTS failed:', err);
            if (selectedChapterRef.current === chapterNum) setAudioError(msg);
          }
        }
        setAudioPhase(null);
        setAudioChunkProgress(null);
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
    setTabError,
    clearTabError,
  ]);

  const retryAudio = useCallback(async () => {
    if (!audioTranscript || !elevenLabsApiKey) return;
    setGeneratingAudio(selectedChapterNum);
    setAudioPhase('synthesizing');
    setAudioError('');
    setAudioChunkProgress(null);

    try {
      const { generateAudiobook } = await import('../../services/elevenLabs/tts');
      const voice = getVoiceOption(setup.voiceId);
      const blob = await generateAudiobook(audioTranscript, elevenLabsApiKey, {
        voiceId: voice.id,
        onProgress: (current, total) => setAudioChunkProgress({ current, total }),
      });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      const audioDataUri = await persistableAudioDataUri(blob);
      updateChapter(selectedChapterNum, { audioUrl: url, audioDataUri });
    } catch (err) {
      const msg = ttsErrorMessage(err);
      console.error('ElevenLabs TTS retry failed:', err);
      setAudioError(msg);
    } finally {
      setGeneratingAudio(null);
      setAudioPhase(null);
      setAudioChunkProgress(null);
    }
  }, [
    audioTranscript,
    elevenLabsApiKey,
    selectedChapterNum,
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
      setTabError,
      clearTabError,
      errorPrefix: 'Slides generation failed.',
      run: async () => {
        const fullText = await streamWithRetry(
          {
            apiKey: claudeApiKey,
            system: buildSlidesPrompt(setup.themeId),
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
            maxTokens: 4000,
          },
          {},
        );

        try {
          const parsed = parseJson(fullText) as SlideData[];
          if (selectedChapterRef.current === chapterNum) setSlidesData(parsed);
          updateChapter(chapterNum, { slidesJson: parsed });
        } catch {
          setTabError('slides', 'Failed to parse slide data from response');
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
    setTabError,
    clearTabError,
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
