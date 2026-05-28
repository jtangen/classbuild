import { useEffect, useState, useCallback, useRef } from 'react';
import { downloadFile } from '../utils/download';
import { normalizeActivityDetail } from '../utils/activityDetail';
import { KeyMissingBanner } from '../components/build/artifactHelpers';
import { QuizTab } from '../components/build/tabs/QuizTab';
import { WeeklyChallengeTab } from '../components/build/tabs/WeeklyChallengeTab';
import { InClassQuizTab } from '../components/build/tabs/InClassQuizTab';
import { DiscussionTab } from '../components/build/tabs/DiscussionTab';
import { ActivitiesTab } from '../components/build/tabs/ActivitiesTab';
import { AudioTab } from '../components/build/tabs/AudioTab';
import { ReadingTab } from '../components/build/tabs/ReadingTab';
import { SlidesTab } from '../components/build/tabs/SlidesTab';
import { useChapterMaterials } from '../components/build/useChapterMaterials';
import { ChapterImageRefineDrawer } from '../components/build/ChapterImageRefineDrawer';
import { ShortcutsHelpOverlay } from '../components/build/ShortcutsHelpOverlay';
import { TransientToast } from '../components/build/TransientToast';
import {
  CHAPTER_ASPECT_TO_SIZE,
  getChapterImageSrc,
  swapChapterImage,
  chapterHasRefinableImages,
} from '../components/build/chapterImageHelpers';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCourseStore } from '../store/courseStore';
import { useApiStore } from '../store/apiStore';
import { useUiStore } from '../store/uiStore';
import { streamMessage, streamWithRetry } from '../services/claude/streaming';
import { MODELS } from '../services/claude/client';
import { buildChapterPrompt, buildChapterUserPrompt } from '../prompts/chapter';
import { buildPracticeQuizPrompt, buildPracticeQuizUserPrompt } from '../prompts/practiceQuiz';
import { buildDiscussionPrompt, buildDiscussionUserPrompt } from '../prompts/discussion';
import { buildActivitiesPrompt, buildActivitiesUserPrompt } from '../prompts/activities';
import { buildInClassQuizPrompt, buildInClassQuizUserPrompt } from '../prompts/inClassQuiz';
import { buildAudioTranscriptPrompt, buildAudioTranscriptUserPrompt } from '../prompts/audioTranscript';
import { buildSlidesPrompt, buildSlidesUserPrompt } from '../prompts/slides';
import { CodexButton as Button } from '../components/codex';
import { ChapterSidebar } from '../components/build/ChapterSidebar';
import { ResearchPanel } from '../components/build/ResearchPanel';
import type { SlideData, InClassQuizQuestion, WeeklyChallengeData } from '../types/course';
import { getVoiceOption } from '../themes';
import { slugify, extractHtml, parseJson } from '../utils/format';
import { friendlyError } from '../utils/errors';

interface DiscussionPrompt {
  prompt: string;
  hook: string;
}

interface Activity {
  title: string;
  duration: string;
  description: string;
  materials: string;
  learningGoal: string;
  scalingNotes: string;
}

// downloadFile moved to src/utils/download.ts (imported below).

// formatElapsed moved to ReadingTab (only place it was used).
// slugify, extractHtml, parseJson moved to src/utils/format.ts

async function replaceAiPlaceholders(html: string, apiKey: string): Promise<string> {
  const { replaceAiImagePlaceholders } = await import('../services/openai/imagePlacer');
  return replaceAiImagePlaceholders(html, apiKey);
}

// Chapter image helpers moved to src/components/build/chapterImageHelpers.ts

/** One-time-hint state, persisted to localStorage so it stays dismissed
 *  across sessions per-browser. */
const LS_HINT_PREFIX = 'cb:ui:hintSeen:';
function readHintSeen(key: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(LS_HINT_PREFIX + key) === '1';
  } catch {
    return true;
  }
}
function writeHintSeen(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_HINT_PREFIX + key, '1');
  } catch { /* ignore */ }
}

export function BuildPage() {
  const navigate = useNavigate();
  const { syllabus, researchDossiers, chapters, addChapter, updateChapter, setSlideImage, updateSlide, setup, setStage, completeStage } = useCourseStore();
  const { claudeApiKey, openaiApiKey, elevenLabsApiKey } = useApiStore();
  const { isGenerating, setIsGenerating, streamingText, setStreamingText, appendStreamingText, error, setError, activeTab, setActiveTab, selectedChapterNum, setSelectedChapterNum, batchGenerating, batchCurrentChapter, batchPhase, batchMaterial, setBatchGenerating, setBatchCurrentChapter, setBatchPhase, setBatchMaterial, slidesRender, setSlidesRender, inFlight, setInFlight, setOpenKeysOnNextSetupVisit } = useUiStore();

  // Navigate to /setup with the keys modal auto-opening. Used by inline
  // "Add OpenAI key →" / "Add ElevenLabs key →" CTAs on the Slides and Audio
  // tabs when the relevant key is missing.
  const openKeysModal = useCallback(() => {
    setOpenKeysOnNextSetupVisit(true);
    navigate('/setup');
  }, [navigate, setOpenKeysOnNextSetupVisit]);

  // selectedChapterNum now lives in uiStore so it survives reload.
  const [chapterHtml, setChapterHtml] = useState('');
  // Per-artifact "currently generating" state — mirrored from uiStore so
  // navigating away from /build and back keeps the drafting UI and disabled
  // CTAs accurate, and the cross-page Header chips stay live.
  const generatingQuiz = inFlight.quiz ?? null;
  const generatingInClassQuiz = inFlight.inclassquiz ?? null;
  const generatingDiscussion = inFlight.discussion ?? null;
  const generatingActivities = inFlight.activities ?? null;
  const generatingAudio = inFlight.audio ?? null;
  const generatingSlides = inFlight.slides ?? null;
  const generatingWeeklyChallenge = inFlight.weeklychallenge ?? null;
  const setGeneratingQuiz = useCallback((v: number | null) => setInFlight('quiz', v), [setInFlight]);
  const setGeneratingInClassQuiz = useCallback((v: number | null) => setInFlight('inclassquiz', v), [setInFlight]);
  const setGeneratingDiscussion = useCallback((v: number | null) => setInFlight('discussion', v), [setInFlight]);
  const setGeneratingActivities = useCallback((v: number | null) => setInFlight('activities', v), [setInFlight]);
  const setGeneratingAudio = useCallback((v: number | null) => setInFlight('audio', v), [setInFlight]);
  const setGeneratingSlides = useCallback((v: number | null) => setInFlight('slides', v), [setInFlight]);
  const setGeneratingWeeklyChallenge = useCallback((v: number | null) => setInFlight('weeklychallenge', v), [setInFlight]);

  const [thinkingText, setThinkingText] = useState('');
  const [refineFeedback, setRefineFeedback] = useState('');
  const [showRefineConfirm, setShowRefineConfirm] = useState(false);
  /** Which chapter (if any) is currently in the chapter-drafting pipeline.
   *  Distinct from uiStore.isGenerating (which is global). Lets ReadingTab
   *  show the drafting UI ONLY on the chapter that's actually being drafted,
   *  not whichever chapter the user has clicked to. */
  const [chapterDraftingFor, setChapterDraftingFor] = useState<number | null>(null);
  /** True while a refine is in flight — drives the streaming UI to show
   *  "Refining…" feedback instead of the old iframe. */
  const [isRefining, setIsRefining] = useState(false);
  /** Confirm-panel checkbox: when a refine clears dependent materials,
   *  should we automatically regenerate them once the new reading lands? */
  const [refineAutoRegen, setRefineAutoRegen] = useState(true);
  /** Ref to the latest generateAllOutputs callback so refineChapter can
   *  schedule a post-refine regen using the *new* chapter content (the
   *  callback recreates after updateChapter fires). */
  const generateAllOutputsRef = useRef<() => Promise<void>>(() => Promise.resolve());
  // Per-slide image refine state. Edited prompts live here until the user
  // either regenerates (commits) or hits Reset. `refiningSlideIdx` is the
  // index currently being rendered through gpt-image-2.
  const [editedSlidePrompts, setEditedSlidePrompts] = useState<Record<number, string>>({});
  const [refiningSlideIdx, setRefiningSlideIdx] = useState<number | null>(null);
  const [slideRefineError, setSlideRefineError] = useState<string | null>(null);

  // Per-image chapter refine. When the user clicks an image inside the chapter
  // iframe, the shim postMessages here and we open a drawer with the original
  // prompt + the rendered image. Edits commit only when Regenerate succeeds.
  const [chapterImageRefine, setChapterImageRefine] = useState<
    { idx: number; prompt: string; aspect: string; src: string } | null
  >(null);
  const [chapterImageDraft, setChapterImageDraft] = useState('');
  const [chapterImageRefining, setChapterImageRefining] = useState(false);
  const [chapterImageRefineError, setChapterImageRefineError] = useState<string | null>(null);
  // One-time discoverability hints — surfaced inline until the user dismisses
  // or auto-dismissed after 12s once the relevant artifact has rendered.
  const [showChapterImageHint, setShowChapterImageHint] = useState<boolean>(() => !readHintSeen('chapter-image-refine'));
  const [showSlideImageHint, setShowSlideImageHint] = useState<boolean>(() => !readHintSeen('slide-image-refine'));
  const [copiedLabel, setCopiedLabel] = useState('');
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const autoGenStarted = useRef(false);
  const selectedChapterRef = useRef(selectedChapterNum);
  const batchCancelRef = useRef(false);

  // Derived: the chapter currently in view from courseStore.
  const currentChapterEarly = chapters.find((c) => c.number === selectedChapterNum);
  const syllabusChapterEarly = syllabus?.chapters.find((c) => c.number === selectedChapterNum);

  // ── All per-chapter material state + generation handlers ─────────────
  // Quiz, in-class quiz, weekly challenge, discussion, activities, audio,
  // slides — plus retryAudio + fleshOutActivity — all live in a single
  // hook. BuildPage gets the read-only state values back and wires them
  // into the tab components.
  const materials = useChapterMaterials({
    syllabus,
    currentChapter: currentChapterEarly,
    syllabusChapter: syllabusChapterEarly,
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
  });
  const {
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
    clearTabError,
    generateQuiz,
    generateInClassQuiz,
    generateWeeklyChallenge: generateWeeklyChallengeContent,
    generateDiscussion,
    generateActivities,
    generateAudio,
    generateSlides,
    retryAudio,
    fleshOutActivity,
  } = materials;

  // Clamp the persisted selectedChapterNum if the new syllabus is shorter
  // than the chapter index we last saved (e.g. user starts a smaller course).
  useEffect(() => {
    if (!syllabus) return;
    const max = syllabus.chapters.length;
    if (selectedChapterNum < 1 || selectedChapterNum > max) {
      setSelectedChapterNum(1);
    }
  }, [syllabus, selectedChapterNum, setSelectedChapterNum]);

  // Auto-dismiss the chapter-image hint 12s after it becomes relevant.
  useEffect(() => {
    if (!showChapterImageHint) return;
    if (!chapterHtml || !chapterHasRefinableImages(chapterHtml)) return;
    const id = setTimeout(() => {
      setShowChapterImageHint(false);
      writeHintSeen('chapter-image-refine');
    }, 12000);
    return () => clearTimeout(id);
  }, [showChapterImageHint, chapterHtml]);

  // Dismiss the chapter-image hint as soon as the user opens the refine drawer.
  useEffect(() => {
    if (chapterImageRefine && showChapterImageHint) {
      setShowChapterImageHint(false);
      writeHintSeen('chapter-image-refine');
    }
  }, [chapterImageRefine, showChapterImageHint]);

  // Auto-dismiss the slide-image hint after 12s of slidesData being populated.
  useEffect(() => {
    if (!showSlideImageHint) return;
    if (slidesData.length === 0) return;
    const id = setTimeout(() => {
      setShowSlideImageHint(false);
      writeHintSeen('slide-image-refine');
    }, 12000);
    return () => clearTimeout(id);
  }, [showSlideImageHint, slidesData.length]);

  // Dismiss the slide-image hint as soon as the user starts a refine.
  useEffect(() => {
    if (refiningSlideIdx !== null && showSlideImageHint) {
      setShowSlideImageHint(false);
      writeHintSeen('slide-image-refine');
    }
  }, [refiningSlideIdx, showSlideImageHint]);

  const dismissChapterImageHint = useCallback(() => {
    setShowChapterImageHint(false);
    writeHintSeen('chapter-image-refine');
  }, []);
  const dismissSlideImageHint = useCallback(() => {
    setShowSlideImageHint(false);
    writeHintSeen('slide-image-refine');
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────────────────────
  //
  // Bound to the document so they fire from anywhere on the Build page,
  // except when the user is typing in an input/textarea. Skipped entirely
  // while batch generation is running so accidental keystrokes can't
  // disrupt a multi-chapter run.
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [transientToast, setTransientToast] = useState<string | null>(null);
  useEffect(() => {
    if (!transientToast) return;
    const id = setTimeout(() => setTransientToast(null), 2400);
    return () => clearTimeout(id);
  }, [transientToast]);

  // Static list of tab IDs in display order — drives the 1..8 shortcut.
  // Note: this stays in sync with the `tabs` array assembled inside the JSX.
  const SHORTCUT_TAB_IDS = [
    'chapter', 'quiz', 'inclassquiz', 'weeklychallenge',
    'discussion', 'activities', 'audio', 'slides',
  ];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      // Don't intercept while the user is typing.
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return;
      }
      // Don't intercept during batch — keystrokes could derail a multi-min run.
      if (batchGenerating) return;

      // Cmd/Ctrl + S → catch the save instinct with a reassurance toast.
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        setTransientToast('No need to save — every change is auto-saved to this browser.');
        return;
      }
      // ? → toggle the help overlay.
      if (e.key === '?') {
        e.preventDefault();
        setShortcutsHelpOpen((v) => !v);
        return;
      }

      // No other modifier-required shortcuts.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // 1..8 → switch tab.
      if (/^[1-8]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        if (SHORTCUT_TAB_IDS[idx]) {
          e.preventDefault();
          setActiveTab(SHORTCUT_TAB_IDS[idx]);
        }
        return;
      }
      // J / K → next / previous chapter.
      if (e.key === 'j' || e.key === 'J') {
        if (syllabus && selectedChapterNum < syllabus.chapters.length) {
          e.preventDefault();
          setSelectedChapterNum(selectedChapterNum + 1);
        }
        return;
      }
      if (e.key === 'k' || e.key === 'K') {
        if (selectedChapterNum > 1) {
          e.preventDefault();
          setSelectedChapterNum(selectedChapterNum - 1);
        }
        return;
      }
      // G → generate all materials for the current chapter.
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        void generateAllOutputsRef.current();
        return;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchGenerating, syllabus, selectedChapterNum, setActiveTab, setSelectedChapterNum]);

  // Tick elapsed seconds while a single-chapter generation is running so the
  // "Thinking..." phase (~30-90s on Opus) shows observable progress.
  useEffect(() => {
    if (!isGenerating) {
      setElapsedSec(0);
      return;
    }
    const t0 = Date.now();
    setElapsedSec(0);
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - t0) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [isGenerating]);

  // Close the batch-confirm modal on Escape.
  useEffect(() => {
    if (!showBatchConfirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowBatchConfirm(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showBatchConfirm]);

  // Keep ref in sync for generation callbacks
  selectedChapterRef.current = selectedChapterNum;

  // Derived state
  const currentChapter = chapters.find(c => c.number === selectedChapterNum);
  const syllabusChapter = syllabus?.chapters.find(c => c.number === selectedChapterNum);
  const anyLocalGenerating = !!(generatingQuiz || generatingInClassQuiz || generatingDiscussion || generatingActivities || generatingAudio || generatingSlides || generatingWeeklyChallenge);
  const anyBusy = isGenerating || anyLocalGenerating || batchGenerating;

  const tabGenerating: Record<string, boolean> = {
    quiz: generatingQuiz === selectedChapterNum,
    inclassquiz: generatingInClassQuiz === selectedChapterNum,
    discussion: generatingDiscussion === selectedChapterNum,
    activities: generatingActivities === selectedChapterNum,
    audio: generatingAudio === selectedChapterNum,
    slides: generatingSlides === selectedChapterNum,
    weeklychallenge: generatingWeeklyChallenge === selectedChapterNum,
  };

  // setTabError + clearTabError moved into useChapterMaterials.

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(''), 2000);
  }, []);

  const formatDiscussionsText = useCallback(() => {
    const lines = [`Conversation Starters — ${syllabusChapter?.title || ''}`, ''];
    discussions.forEach((d, i) => {
      lines.push(`${i + 1}. [${d.hook}] ${d.prompt}`);
      lines.push('');
    });
    return lines.join('\n');
  }, [discussions, syllabusChapter]);

  const formatActivitiesText = useCallback(() => {
    const lines = [`In-Class Activities — ${syllabusChapter?.title || ''}`, ''];
    activities.forEach((a, i) => {
      lines.push(`${'='.repeat(60)}`);
      lines.push(`${i + 1}. ${a.title}  (${a.duration})`);
      lines.push(`${'='.repeat(60)}`);
      lines.push('');
      lines.push(a.description);
      lines.push('');
      lines.push(`Materials: ${a.materials}`);
      lines.push(`Learning Goal: ${a.learningGoal}`);
      lines.push(`Scaling: ${a.scalingNotes}`);

      const detail = normalizeActivityDetail(expandedActivities[i]);
      if (detail) {
        lines.push('');
        lines.push(`--- Step-by-Step Guide ---`);
        detail.steps.forEach(s => {
          lines.push(`  [${s.timing}] ${s.instruction}`);
          if (s.studentAction) lines.push(`    → Students: ${s.studentAction}`);
        });
        if (detail.facilitationTips.length > 0) {
          lines.push('');
          lines.push('--- Facilitation Tips ---');
          detail.facilitationTips.forEach(t => lines.push(`  • ${t}`));
        }
        if (detail.commonPitfalls.length > 0) {
          lines.push('');
          lines.push('--- Common Pitfalls ---');
          detail.commonPitfalls.forEach(p => lines.push(`  • ${p}`));
        }
        lines.push('');
        lines.push(`--- Debrief Guide ---`);
        lines.push(`  ${detail.debriefGuide}`);
        if (detail.variations.length > 0) {
          lines.push('');
          lines.push('--- Variations ---');
          detail.variations.forEach(v => lines.push(`  • ${v}`));
        }
        if (detail.assessmentIdeas) {
          lines.push('');
          lines.push(`--- Assessment Ideas ---`);
          lines.push(`  ${detail.assessmentIdeas}`);
        }
      }
      lines.push('');
    });
    return lines.join('\n');
  }, [activities, expandedActivities, syllabusChapter]);

  // Reset BuildPage-owned local state on chapter switch, then hydrate
  // chapterHtml from the courseStore-persisted chapter (if any). All material
  // state (quiz/discussion/audio/slides/etc.) is managed inside
  // useChapterMaterials; its own effect handles reset + rehydrate.
  useEffect(() => {
    setChapterHtml('');
    setThinkingText('');
    setRefineFeedback('');
    setShowRefineConfirm(false);
    const ch = chapters.find((c) => c.number === selectedChapterNum);
    if (ch) setChapterHtml(ch.htmlContent);
  }, [selectedChapterNum, chapters]);

  // Auto-generate chapter 1 on first mount if not already generated and has research
  useEffect(() => {
    const ch1 = chapters.find(c => c.number === 1);
    const hasResearch = researchDossiers.some(d => d.chapterNumber === 1 && d.sources.length > 0);
    if (!ch1 && syllabus && !isGenerating && !autoGenStarted.current && hasResearch) {
      autoGenStarted.current = true;
      generateChapter(1);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const generateChapter = useCallback(async (chapterNum: number) => {
    if (!syllabus) return;
    const ch = syllabus.chapters.find(c => c.number === chapterNum);
    if (!ch) return;

    setIsGenerating(true);
    setChapterDraftingFor(chapterNum);
    setStreamingText('');
    setThinkingText('');

    try {
      const dossier = researchDossiers.find(d => d.chapterNumber === chapterNum);
      const researchSources = dossier?.sources.map(s => ({
        title: s.title,
        authors: s.authors,
        year: s.year,
        summary: s.summary,
        url: s.url,
        doi: s.doi,
      }));

      const hasImageGen = !!openaiApiKey;
      const fullText = await streamMessage(
        {
          apiKey: claudeApiKey,
          model: MODELS.opus,
          system: buildChapterPrompt(setup.themeId, hasImageGen),
          messages: [{
            role: 'user',
            content: buildChapterUserPrompt(
              syllabus.courseTitle,
              ch,
              setup.chapterLength,
              { educationLevel: setup.educationLevel, priorKnowledge: setup.priorKnowledge, learnerNotes: setup.learnerNotes },
              researchSources,
              hasImageGen,
              setup.chapterLengthBrief,
            ),
          }],
          thinkingBudget: 'high',
          maxTokens: 16000,
        },
        {
          onThinking: (text) => setThinkingText(prev => prev + text),
          onText: (text) => appendStreamingText(text),
          onError: (err) => setError(err.message),
        }
      );

      let html = extractHtml(fullText);
      if (hasImageGen) {
        html = await replaceAiPlaceholders(html, openaiApiKey);
      }

      if (selectedChapterRef.current === chapterNum) setChapterHtml(html);
      addChapter({
        number: chapterNum,
        title: ch.title,
        htmlContent: html,
      });
    } catch (err) {
      setError(friendlyError(err, 'Chapter generation failed.'));
    } finally {
      setIsGenerating(false);
      setChapterDraftingFor(null);
      setThinkingText('');
    }
  }, [syllabus, claudeApiKey, openaiApiKey, researchDossiers, setup.chapterLength, addChapter, setIsGenerating, setStreamingText, appendStreamingText, setError]);

  const refineChapter = useCallback(async (feedback: string) => {
    if (!syllabus || !currentChapter || !syllabusChapter) return;

    updateChapter(selectedChapterNum, {
      practiceQuizData: undefined,
      inClassQuizData: undefined,
      discussionData: undefined,
      activityData: undefined,
      activityDetails: undefined,
      audioTranscript: undefined,
      audioUrl: undefined,
      slidesJson: undefined,
    });
    // updateChapter above cleared dependent materials in courseStore;
    // useChapterMaterials' reset effect will wipe the local mirrors.
    setRefineFeedback('');
    setShowRefineConfirm(false);

    setIsRefining(true);
    setIsGenerating(true);
    setChapterDraftingFor(selectedChapterNum);
    setStreamingText('');
    setThinkingText('');

    try {
      const dossier = researchDossiers.find(d => d.chapterNumber === selectedChapterNum);
      const researchSources = dossier?.sources.map(s => ({
        title: s.title, authors: s.authors, year: s.year,
        summary: s.summary, url: s.url, doi: s.doi,
      }));

      const hasImageGen = !!openaiApiKey;
      // Single-turn refine. Folding the existing chapter into the user message
      // (rather than replaying it as a prior assistant turn) keeps the request
      // compatible with extended thinking, which otherwise requires every
      // prior assistant turn to carry its original thinking block.
      //
      // Strip inline image base64 — each rendered <img src="data:..."> can be
      // 100K+ tokens, and a chapter with two or three of them blows past
      // Claude's 1M context window. The model doesn't need the pixels to
      // revise prose; it just needs to see where the figures sit.
      const sanitizedHtml = currentChapter.htmlContent
        .replace(/src="data:[^;]+;base64,[^"]+"/gi, 'src="[ai-generated-image]"')
        .replace(/src='data:[^;]+;base64,[^']+'/gi, "src='[ai-generated-image]'");

      const originalPrompt = buildChapterUserPrompt(
        syllabus.courseTitle,
        syllabusChapter,
        setup.chapterLength,
        { educationLevel: setup.educationLevel, priorKnowledge: setup.priorKnowledge, learnerNotes: setup.learnerNotes },
        researchSources,
        hasImageGen,
        setup.chapterLengthBrief,
      );
      const refinePrompt = `${originalPrompt}

A draft of this chapter already exists. Revise it to address the feedback below — keep the same \`<article class="ch">…</article>\` markup contract, the same class names, and the same interactive widgets. Re-emit \`<figure class="ai-image" data-prompt="…" data-aspect="…">\` placeholders for any images (don't try to reproduce existing image bytes — they were stripped from the input to save context). Output ONLY the revised article (plus any widget \`<script>\` tags), exactly as the contract specifies.

Existing draft to revise (image bytes stripped to \`[ai-generated-image]\`):
\`\`\`html
${sanitizedHtml}
\`\`\`

Teacher feedback: "${feedback}"`;

      const fullText = await streamMessage(
        {
          apiKey: claudeApiKey,
          model: MODELS.opus,
          system: buildChapterPrompt(setup.themeId, hasImageGen),
          messages: [{ role: 'user', content: refinePrompt }],
          thinkingBudget: 'high',
          maxTokens: 16000,
        },
        {
          onThinking: (text) => setThinkingText(prev => prev + text),
          onText: (text) => appendStreamingText(text),
          onError: (err) => setError(err.message),
        }
      );

      let html = extractHtml(fullText);
      if (hasImageGen) {
        html = await replaceAiPlaceholders(html, openaiApiKey);
      }
      setChapterHtml(html);
      updateChapter(selectedChapterNum, { htmlContent: html });

      // If the user opted in, automatically rebuild quizzes/discussion/etc.
      // against the new reading. The setTimeout lets React flush the chapter
      // state update so the refreshed generateAllOutputs callback reads from
      // the new content, not the pre-refine snapshot.
      if (refineAutoRegen) {
        setTimeout(() => {
          void generateAllOutputsRef.current();
        }, 250);
      }
    } catch (err) {
      // Surface the raw API error to the console so we can diagnose what
      // Anthropic actually rejected. The user-visible toast stays friendly.
      console.error('Chapter refinement failed:', err);
      if (err && typeof err === 'object') {
        const anyErr = err as { status?: number; message?: string; error?: unknown };
        if (anyErr.status !== undefined) console.error('  status:', anyErr.status);
        if (anyErr.error) console.error('  error body:', anyErr.error);
      }
      setError(friendlyError(err, 'Chapter refinement failed.'));
    } finally {
      setIsGenerating(false);
      setIsRefining(false);
      setChapterDraftingFor(null);
      setThinkingText('');
    }
  }, [syllabus, currentChapter, syllabusChapter, selectedChapterNum, claudeApiKey, openaiApiKey, researchDossiers, setup.chapterLength, updateChapter, setIsGenerating, setStreamingText, appendStreamingText, setError]);

  // 7 generators + retryAudio + fleshOutActivity moved to useChapterMaterials hook.


  // ── Per-slide image refine ──────────────────────────────────────────
  //
  // Refine one slide's image without disturbing the rest of the deck.
  // The user edits the imagePrompt textarea in-place; on Regenerate we call
  // gpt-image-2 with the new prompt, atomically update slidesJson[i] in
  // courseStore (both prompt and image), and mirror the change into the
  // local slidesData state so the row's "rendered" chip and any later deck
  // download pick up the new render.
  const refineSlideImage = useCallback(
    async (idx: number) => {
      if (!openaiApiKey || refiningSlideIdx !== null) return;
      const slide = slidesData[idx];
      if (!slide) return;
      const draft = editedSlidePrompts[idx];
      const newPrompt = (draft ?? slide.imagePrompt ?? '').trim();
      if (!newPrompt) {
        setSlideRefineError('Image prompt is empty.');
        return;
      }
      setRefiningSlideIdx(idx);
      setSlideRefineError(null);
      try {
        const [{ generateImageWithRetry }, { withSafetyClause }] = await Promise.all([
          import('../services/openai/imageGen'),
          import('../services/openai/safetyClause'),
        ]);
        const dataUri = await generateImageWithRetry(
          withSafetyClause(newPrompt),
          openaiApiKey,
          { size: '3840x2160', quality: 'high', compression: 88 },
        );
        // Mirror to local state so the row immediately reflects the new render.
        setSlidesData((prev) =>
          prev.map((s, i) =>
            i === idx ? { ...s, imagePrompt: newPrompt, imageDataUri: dataUri } : s,
          ),
        );
        // Persist atomically — both prompt and image — so a tab-switch /
        // refresh never loses the edited prompt.
        updateSlide(selectedChapterNum, idx, {
          imagePrompt: newPrompt,
          imageDataUri: dataUri,
        });
        // Clear this slide's draft now that it's committed.
        setEditedSlidePrompts((prev) => {
          const next = { ...prev };
          delete next[idx];
          return next;
        });
      } catch (err) {
        setSlideRefineError(friendlyError(err, 'Slide image regeneration failed.'));
      } finally {
        setRefiningSlideIdx(null);
      }
    },
    [
      openaiApiKey,
      refiningSlideIdx,
      slidesData,
      editedSlidePrompts,
      updateSlide,
      selectedChapterNum,
    ],
  );

  // ── Slide deck render + download ────────────────────────────────────
  // Renders any unrendered slide images through gpt-image-2 (with bounded
  // concurrency) and packs the lot into a .pptx. Tracks progress through
  // uiStore.slidesRender so a tab switch keeps the in-flight render visible.
  const downloadSlideDeck = useCallback(async () => {
    if (slidesRender) return; // already in flight
    if (!openaiApiKey) {
      setError('Add an OpenAI API key in Setup to render the slide images.');
      return;
    }
    if (!syllabus || !syllabusChapter) return;

    setSlidesRender({
      chapterNum: selectedChapterNum,
      current: 0,
      total: slidesData.length,
      phase: 'rendering',
    });
    try {
      const { generatePptx } = await import('../services/export/pptxExporter');
      const { blob } = await generatePptx(
        slidesData,
        syllabus.courseTitle,
        syllabusChapter.title,
        setup.themeId,
        openaiApiKey,
        {
          imageQuality: 'high',
          imageSize: '3840x2160',
          onProgress: (current, total, phase) =>
            setSlidesRender({
              chapterNum: selectedChapterNum,
              current,
              total,
              phase,
            }),
          onSlideRendered: (i, dataUri) => {
            // Atomic write to courseStore — safe even with parallel workers.
            setSlideImage(selectedChapterNum, i, dataUri);
            // Mirror to local state so the "rendered" chip updates live.
            setSlidesData((prev) =>
              prev.map((s, idx) => (idx === i ? { ...s, imageDataUri: dataUri } : s)),
            );
          },
          preRendered: Object.fromEntries(
            slidesData
              .map((s, i) =>
                s.imageDataUri ? ([i, s.imageDataUri] as [number, string]) : null,
              )
              .filter((x): x is [number, string] => x !== null),
          ),
        },
      );
      downloadFile(
        blob,
        `slides-${selectedChapterNum}-${slugify(syllabusChapter.title || 'chapter')}.pptx`,
      );
    } catch (err) {
      setError(friendlyError(err, 'Slides export failed.'));
    } finally {
      setSlidesRender(null);
    }
  }, [
    slidesRender,
    openaiApiKey,
    syllabus,
    syllabusChapter,
    selectedChapterNum,
    slidesData,
    setup.themeId,
    setSlidesRender,
    setSlideImage,
    setError,
  ]);

  // ── Per-image chapter refine: iframe shim + message listener ─────────
  //
  // The chapter iframe srcdoc gets a tiny click-handler shim appended so that
  // clicks on rendered images bubble out to the parent as postMessages. The
  // parent (this page) opens an ImageRefineDrawer with the original prompt.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e?.data as { __cbImageClick?: number; idx?: number; prompt?: string; aspect?: string } | undefined;
      if (!data || data.__cbImageClick !== 1) return;
      if (typeof data.idx !== 'number') return;
      const src = getChapterImageSrc(chapterHtml, data.idx);
      if (!src) return;
      setChapterImageRefine({
        idx: data.idx,
        prompt: data.prompt ?? '',
        aspect: data.aspect ?? 'landscape',
        src,
      });
      setChapterImageDraft(data.prompt ?? '');
      setChapterImageRefineError(null);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [chapterHtml]);

  const closeChapterImageRefine = useCallback(() => {
    // Closing during a render is fine — the async swap-in keeps running
    // and the new image lands in the iframe when complete. We just hide
    // the drawer so the user can interact with the rest of the page.
    setChapterImageRefine(null);
    setChapterImageRefineError(null);
  }, []);

  const refineChapterImage = useCallback(async () => {
    if (!chapterImageRefine || !openaiApiKey || chapterImageRefining) return;
    const newPrompt = chapterImageDraft.trim();
    if (!newPrompt) {
      setChapterImageRefineError('Image prompt is empty.');
      return;
    }
    setChapterImageRefining(true);
    setChapterImageRefineError(null);
    try {
      const [{ generateImageWithRetry }, { withSafetyClause }] = await Promise.all([
        import('../services/openai/imageGen'),
        import('../services/openai/safetyClause'),
      ]);
      const size =
        CHAPTER_ASPECT_TO_SIZE[chapterImageRefine.aspect] ?? CHAPTER_ASPECT_TO_SIZE.landscape;
      const newDataUri = await generateImageWithRetry(
        withSafetyClause(newPrompt),
        openaiApiKey,
        { size, quality: 'high' },
      );
      const updatedHtml = swapChapterImage(
        chapterHtml,
        chapterImageRefine.idx,
        newPrompt,
        newDataUri,
      );
      setChapterHtml(updatedHtml);
      if (currentChapter) {
        updateChapter(selectedChapterNum, { htmlContent: updatedHtml });
      }
      setChapterImageRefine(null);
    } catch (err) {
      setChapterImageRefineError(friendlyError(err, 'Chapter image regeneration failed.'));
    } finally {
      setChapterImageRefining(false);
    }
  }, [
    chapterImageRefine,
    openaiApiKey,
    chapterImageRefining,
    chapterImageDraft,
    chapterHtml,
    currentChapter,
    selectedChapterNum,
    updateChapter,
  ]);

  // Generate all outputs for the currently selected chapter.
  // Each generate* already sets tab errors internally; this outer catch only
  // prevents unhandled-rejection noise when one sibling fails, and logs for
  // ops visibility.
  const generateAllOutputs = useCallback(async () => {
    if (!currentChapter || !syllabusChapter || !syllabus) return;
    const logFailure = (kind: string) => (err: unknown) =>
      console.error(`[generateAllOutputs] ${kind} failed:`, err);
    const tasks: Promise<void>[] = [];
    if (!quizHtml) tasks.push(generateQuiz().catch(logFailure('quiz')));
    if (inClassQuizData.length === 0) tasks.push(generateInClassQuiz().catch(logFailure('inclass-quiz')));
    if (discussions.length === 0) tasks.push(generateDiscussion().catch(logFailure('discussion')));
    if (activities.length === 0) tasks.push(generateActivities().catch(logFailure('activities')));
    if (slidesData.length === 0) tasks.push(generateSlides().catch(logFailure('slides')));
    if (!audioTranscript) tasks.push(generateAudio().catch(logFailure('audio')));
    await Promise.allSettled(tasks);
  }, [currentChapter, syllabusChapter, syllabus, quizHtml, inClassQuizData, discussions, activities, slidesData, audioTranscript, generateQuiz, generateInClassQuiz, generateDiscussion, generateActivities, generateSlides, generateAudio]);

  // Keep the ref pointing at the latest generateAllOutputs so refineChapter
  // can fire a post-refine regen *after* the new chapter content has been
  // committed (closures captured at refine-call-time would otherwise point
  // at the stale callback).
  useEffect(() => {
    generateAllOutputsRef.current = generateAllOutputs;
  }, [generateAllOutputs]);

  // ─── Batch generation (from GeneratePage) ───
  const generateAllClasses = useCallback(async () => {
    if (!syllabus) return;
    setBatchGenerating(true);
    batchCancelRef.current = false;

    try {
    const chaptersToGenerate = syllabus.chapters.filter(
      ch => !chapters.find(c => c.number === ch.number)
        && researchDossiers.some(d => d.chapterNumber === ch.number && d.sources.length > 0)
    );

    for (const ch of chaptersToGenerate) {
      if (batchCancelRef.current) break;
      setBatchCurrentChapter(ch.number);
      setBatchPhase('thinking');

      try {
        const dossier = researchDossiers.find(d => d.chapterNumber === ch.number);
        const researchSources = dossier?.sources.map(s => ({
          title: s.title, authors: s.authors, year: s.year,
          summary: s.summary, url: s.url, doi: s.doi,
        }));

        const hasImageGen = !!openaiApiKey;
        const fullText = await streamMessage(
          {
            apiKey: claudeApiKey,
            model: MODELS.opus,
            system: buildChapterPrompt(setup.themeId, hasImageGen),
            messages: [{
              role: 'user',
              content: buildChapterUserPrompt(
                syllabus.courseTitle, ch, setup.chapterLength,
                { educationLevel: setup.educationLevel, priorKnowledge: setup.priorKnowledge, learnerNotes: setup.learnerNotes },
                researchSources, hasImageGen, setup.chapterLengthBrief,
              ),
            }],
            thinkingBudget: 'high',
            maxTokens: 16000,
          },
          {
            onThinking: () => setBatchPhase('thinking'),
            onText: () => setBatchPhase('writing'),
            onError: (err) => setError(err.message),
          }
        );

        let html = extractHtml(fullText);
        if (hasImageGen) {
          setBatchPhase('writing');
          html = await replaceAiPlaceholders(html, openaiApiKey);
        }
        addChapter({ number: ch.number, title: ch.title, htmlContent: html });

        // Generate practice quiz
        setBatchPhase('thinking');
        try {
          const quizText = await streamMessage(
            {
              apiKey: claudeApiKey,
              model: MODELS.opus,
              system: buildPracticeQuizPrompt(),
              messages: [{
                role: 'user',
                content: buildPracticeQuizUserPrompt(ch.title, ch.narrative, ch.keyConcepts, html.slice(0, 3000)),
              }],
              thinkingBudget: 'high',
              maxTokens: 8000,
            },
            { onError: (err) => setError(err.message) }
          );
          const { balancePracticeQuiz } = await import('../services/quiz/answerBalancer');
          const balancedQuiz = await balancePracticeQuiz(quizText, claudeApiKey);
          updateChapter(ch.number, { practiceQuizData: balancedQuiz });
        } catch {
          // Quiz generation failed, continue
        }

        // Generate in-class quiz
        try {
          const inClassText = await streamMessage(
            {
              apiKey: claudeApiKey,
              model: MODELS.opus,
              system: buildInClassQuizPrompt(),
              messages: [{
                role: 'user',
                content: buildInClassQuizUserPrompt(ch.title, ch.narrative, ch.keyConcepts, html.slice(0, 3000)),
              }],
              thinkingBudget: 'high',
              maxTokens: 8000,
            },
            { onError: (err) => setError(err.message) }
          );
          try {
            const parsed = parseJson(inClassText) as InClassQuizQuestion[];
            const { balanceInClassQuiz } = await import('../services/quiz/answerBalancer');
            const balanced = await balanceInClassQuiz(parsed, claudeApiKey);
            if (balanced) updateChapter(ch.number, { inClassQuizData: balanced });
          } catch {
            // Parse failed, continue
          }
        } catch {
          // In-class quiz generation failed, continue
        }

        // Generate weekly challenge
        try {
          const priorChapters = (ch.spacingConnections || [])
            .map(n => syllabus.chapters.find(sc => sc.number === n))
            .filter((sc): sc is NonNullable<typeof sc> => !!sc)
            .map(sc => ({ number: sc.number, title: sc.title, keyConcepts: sc.keyConcepts }));
          const { buildWeeklyChallengePrompt, buildWeeklyChallengeUserPrompt } = await import('../prompts/weeklyChallenge');
          const challengeText = await streamMessage(
            {
              apiKey: claudeApiKey,
              model: MODELS.opus,
              system: buildWeeklyChallengePrompt(),
              messages: [{
                role: 'user',
                content: buildWeeklyChallengeUserPrompt(ch.title, ch.narrative, ch.keyConcepts, html.slice(0, 3000), ch.number, priorChapters),
              }],
              thinkingBudget: 'high',
              maxTokens: 10000,
            },
            { onError: (err) => setError(err.message) }
          );
          try {
            const parsed = parseJson(challengeText, '{') as WeeklyChallengeData;
            updateChapter(ch.number, { weeklyChallengeData: parsed });
          } catch {
            // Parse failed, continue
          }
        } catch {
          // Weekly challenge generation failed, continue
        }
      } catch (err) {
        setError(`Class ${ch.number}: ${friendlyError(err, 'generation failed.')}`);
      }
    }

    } finally {
      setBatchCurrentChapter(null);
      setBatchPhase(null);
      setBatchGenerating(false);
    }
  }, [syllabus, chapters, claudeApiKey, openaiApiKey, researchDossiers, setup.chapterLength, setup.themeId, addChapter, updateChapter, setError, setBatchGenerating, setBatchCurrentChapter, setBatchPhase]);

  // ─── Full batch generation (all materials for all chapters) ───
  const generateEverything = useCallback(async () => {
    if (!syllabus) return;
    setBatchGenerating(true);
    batchCancelRef.current = false;

    try {
    const chaptersWithResearch = syllabus.chapters.filter(
      ch => researchDossiers.some(d => d.chapterNumber === ch.number && d.sources.length > 0)
    );

    for (const ch of chaptersWithResearch) {
      if (batchCancelRef.current) break;
      setBatchCurrentChapter(ch.number);

      // Fresh read — chapter may already exist from a previous partial run
      let existing = useCourseStore.getState().chapters.find(c => c.number === ch.number);

      // ─── Phase 1: Sequential Opus calls ───
      // 1a. Chapter HTML
      if (!existing?.htmlContent) {
        setBatchMaterial('Reading');
        setBatchPhase('thinking');
        try {
          const dossier = researchDossiers.find(d => d.chapterNumber === ch.number);
          const researchSources = dossier?.sources.map(s => ({
            title: s.title, authors: s.authors, year: s.year,
            summary: s.summary, url: s.url, doi: s.doi,
          }));
          const hasImageGen = !!openaiApiKey;
          const fullText = await streamMessage(
            {
              apiKey: claudeApiKey,
              model: MODELS.opus,
              system: buildChapterPrompt(setup.themeId, hasImageGen),
              messages: [{
                role: 'user',
                content: buildChapterUserPrompt(
                  syllabus.courseTitle, ch, setup.chapterLength,
                  { educationLevel: setup.educationLevel, priorKnowledge: setup.priorKnowledge, learnerNotes: setup.learnerNotes },
                  researchSources, hasImageGen, setup.chapterLengthBrief,
                ),
              }],
              thinkingBudget: 'high',
              maxTokens: 16000,
            },
            {
              onThinking: () => setBatchPhase('thinking'),
              onText: () => setBatchPhase('writing'),
              onError: (err) => setError(err.message),
            }
          );
          let html = extractHtml(fullText);
          if (hasImageGen) {
            setBatchPhase('writing');
            html = await replaceAiPlaceholders(html, openaiApiKey);
          }
          addChapter({ number: ch.number, title: ch.title, htmlContent: html });
        } catch (err) {
          setError(`Class ${ch.number}: ${friendlyError(err, 'generation failed.')}`);
          continue; // Skip entire chapter if reading fails
        }
      }

      // Re-read after possible addChapter
      existing = useCourseStore.getState().chapters.find(c => c.number === ch.number);
      if (!existing?.htmlContent) continue;
      const html = existing.htmlContent;

      // 1b. Practice Quiz
      if (!existing.practiceQuizData) {
        setBatchMaterial('Practice Quiz');
        setBatchPhase('thinking');
        try {
          const quizText = await streamMessage(
            {
              apiKey: claudeApiKey,
              model: MODELS.opus,
              system: buildPracticeQuizPrompt(),
              messages: [{
                role: 'user',
                content: buildPracticeQuizUserPrompt(ch.title, ch.narrative, ch.keyConcepts, html.slice(0, 3000)),
              }],
              thinkingBudget: 'high',
              maxTokens: 8000,
            },
            { onError: (err) => setError(err.message) }
          );
          const { balancePracticeQuiz } = await import('../services/quiz/answerBalancer');
          const balancedQuiz = await balancePracticeQuiz(quizText, claudeApiKey);
          updateChapter(ch.number, { practiceQuizData: balancedQuiz });
        } catch {
          // Quiz failed, continue
        }
      }

      // 1c. In-Class Quiz
      existing = useCourseStore.getState().chapters.find(c => c.number === ch.number);
      if (!existing?.inClassQuizData || existing.inClassQuizData.length === 0) {
        setBatchMaterial('In-Class Quiz');
        setBatchPhase('thinking');
        try {
          const inClassText = await streamMessage(
            {
              apiKey: claudeApiKey,
              model: MODELS.opus,
              system: buildInClassQuizPrompt(),
              messages: [{
                role: 'user',
                content: buildInClassQuizUserPrompt(ch.title, ch.narrative, ch.keyConcepts, html.slice(0, 3000)),
              }],
              thinkingBudget: 'high',
              maxTokens: 8000,
            },
            { onError: (err) => setError(err.message) }
          );
          try {
            const parsed = parseJson(inClassText) as InClassQuizQuestion[];
            const { balanceInClassQuiz } = await import('../services/quiz/answerBalancer');
            const balanced = await balanceInClassQuiz(parsed, claudeApiKey);
            if (balanced) updateChapter(ch.number, { inClassQuizData: balanced });
          } catch {
            // Parse failed
          }
        } catch {
          // In-class quiz failed, continue
        }
      }

      // 1d. Weekly Challenge
      existing = useCourseStore.getState().chapters.find(c => c.number === ch.number);
      if (!existing?.weeklyChallengeData) {
        setBatchMaterial('Weekly Challenge');
        setBatchPhase('thinking');
        try {
          const priorChapters = (ch.spacingConnections || [])
            .map(n => syllabus.chapters.find(sc => sc.number === n))
            .filter((sc): sc is NonNullable<typeof sc> => !!sc)
            .map(sc => ({ number: sc.number, title: sc.title, keyConcepts: sc.keyConcepts }));

          const { buildWeeklyChallengePrompt, buildWeeklyChallengeUserPrompt } = await import('../prompts/weeklyChallenge');
          const challengeText = await streamMessage(
            {
              apiKey: claudeApiKey,
              model: MODELS.opus,
              system: buildWeeklyChallengePrompt(),
              messages: [{
                role: 'user',
                content: buildWeeklyChallengeUserPrompt(ch.title, ch.narrative, ch.keyConcepts, html.slice(0, 3000), ch.number, priorChapters),
              }],
              thinkingBudget: 'high',
              maxTokens: 10000,
            },
            { onError: (err) => setError(err.message) }
          );
          try {
            const parsed = parseJson(challengeText, '{') as WeeklyChallengeData;
            updateChapter(ch.number, { weeklyChallengeData: parsed });
          } catch {
            // Parse failed
          }
        } catch {
          // Weekly challenge generation failed, continue
        }
      }

      // ─── Phase 2: Parallel Haiku/OpenAI calls ───
      setBatchMaterial('Extras');
      setBatchPhase('writing');
      existing = useCourseStore.getState().chapters.find(c => c.number === ch.number);

      const parallelTasks: Promise<void>[] = [];

      // Discussion
      if (!existing?.discussionData || existing.discussionData.length === 0) {
        parallelTasks.push((async () => {
          try {
            const fullText = await streamWithRetry(
              {
                apiKey: claudeApiKey,
                system: buildDiscussionPrompt(),
                messages: [{
                  role: 'user',
                  content: buildDiscussionUserPrompt(ch.title, ch.keyConcepts, setup.cohortSize, setup.teachingEnvironment),
                }],
                thinkingBudget: 'medium',
                maxTokens: 4000,
              },
              {}
            );
            const parsed = parseJson(fullText) as DiscussionPrompt[];
            updateChapter(ch.number, { discussionData: parsed });
          } catch { /* continue */ }
        })());
      }

      // Activities
      if (!existing?.activityData || existing.activityData.length === 0) {
        parallelTasks.push((async () => {
          try {
            const fullText = await streamWithRetry(
              {
                apiKey: claudeApiKey,
                system: buildActivitiesPrompt(),
                messages: [{
                  role: 'user',
                  content: buildActivitiesUserPrompt(ch.title, ch.keyConcepts, setup.cohortSize, setup.teachingEnvironment, setup.environmentNotes),
                }],
                thinkingBudget: 'medium',
                maxTokens: 4000,
              },
              {}
            );
            const parsed = parseJson(fullText) as Activity[];
            updateChapter(ch.number, { activityData: parsed });
          } catch { /* continue */ }
        })());
      }

      // Audio transcript (+TTS)
      if (!existing?.audioTranscript) {
        parallelTasks.push((async () => {
          try {
            const transcript = await streamWithRetry(
              {
                apiKey: claudeApiKey,
                system: buildAudioTranscriptPrompt(),
                messages: [{
                  role: 'user',
                  content: buildAudioTranscriptUserPrompt(ch.title, html),
                }],
                thinkingBudget: 'medium',
                maxTokens: 8000,
              },
              {}
            );
            updateChapter(ch.number, { audioTranscript: transcript });

            if (elevenLabsApiKey) {
              try {
                const { generateAudiobook } = await import('../services/elevenLabs/tts');
                const batchVoice = getVoiceOption(setup.voiceId);
                const blob = await generateAudiobook(transcript, elevenLabsApiKey, { voiceId: batchVoice.id });
                const url = URL.createObjectURL(blob);
                updateChapter(ch.number, { audioUrl: url });
              } catch {
                // TTS failed, transcript is still saved
              }
            }
          } catch { /* continue */ }
        })());
      }

      // Slides
      if (!existing?.slidesJson || existing.slidesJson.length === 0) {
        parallelTasks.push((async () => {
          try {
            const fullText = await streamWithRetry(
              {
                apiKey: claudeApiKey,
                system: buildSlidesPrompt(setup.themeId),
                messages: [{
                  role: 'user',
                  content: buildSlidesUserPrompt(ch.title, ch.keyConcepts, html),
                }],
                thinkingBudget: 'medium',
                maxTokens: 4000,
              },
              {}
            );
            const parsed = parseJson(fullText) as SlideData[];
            updateChapter(ch.number, { slidesJson: parsed });
          } catch { /* continue */ }
        })());
      }

      if (parallelTasks.length > 0) {
        await Promise.allSettled(parallelTasks);
      }
    }

    } finally {
      setBatchCurrentChapter(null);
      setBatchPhase(null);
      setBatchMaterial(null);
      setBatchGenerating(false);
    }
  }, [syllabus, claudeApiKey, openaiApiKey, elevenLabsApiKey, researchDossiers, setup, addChapter, updateChapter, setError, setBatchGenerating, setBatchCurrentChapter, setBatchPhase, setBatchMaterial]);

  const handleProceed = () => {
    if (anyBusy) {
      if (!window.confirm('Generation is still in progress. You can export what\'s available so far. Continue?')) return;
    }
    completeStage('build');
    setStage('export');
    navigate('/export');
  };

  if (!syllabus) {
    return (
      <div
        style={{
          fontFamily: 'var(--font-cb-serif)',
          padding: '64px 0',
          textAlign: 'center',
          color: 'var(--cb-text-default)',
        }}
      >
        <p
          className="cb-italic"
          style={{
            fontSize: 16,
            color: 'var(--cb-text-muted)',
            marginBottom: 18,
          }}
        >
          No syllabus generated yet. Step back to the syllabus stage to start.
        </p>
        <Button variant="secondary" onClick={() => navigate('/syllabus')}>
          ← Back to syllabus
        </Button>
      </div>
    );
  }

  const totalChapters = syllabus.chapters.length;
  const generatedCount = chapters.length;

  const tabs = [
    { id: 'chapter', label: 'Reading', ready: !!chapterHtml },
    { id: 'quiz', label: 'Practice', ready: !!quizHtml },
    { id: 'inclassquiz', label: 'Quizzes', ready: inClassQuizData.length > 0 },
    { id: 'weeklychallenge', label: 'Challenge', ready: !!weeklyChallengeHtml },
    { id: 'discussion', label: 'Discussion', ready: discussions.length > 0 },
    { id: 'activities', label: 'Activities', ready: activities.length > 0 },
    { id: 'audio', label: 'Audio', ready: !!audioTranscript },
    { id: 'slides', label: 'Slides', ready: slidesData.length > 0 },
  ];

  return (
    <div
      style={{
        fontFamily: 'var(--font-cb-serif)',
        color: 'var(--cb-text-default)',
        padding: '24px 0 32px',
      }}
    >
      {/* ─── Codex slim banner ─── */}
      <header
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 24,
          alignItems: 'flex-end',
          paddingBottom: 14,
          marginBottom: 18,
          borderBottom: '0.5px solid var(--cb-border-rule)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            className="cb-sc"
            style={{
              fontSize: 13,
              color: 'var(--cb-accent-emphasis)',
              letterSpacing: '0.16em',
            }}
          >
            Building the course
          </div>
          <h1
            style={{
              margin: '4px 0 6px',
              fontSize: 26,
              lineHeight: 1.25,
              fontWeight: 500,
              fontVariationSettings: '"opsz" 22',
              letterSpacing: '-0.005em',
              color: 'var(--cb-text-default)',
            }}
          >
            {syllabus?.courseTitle || 'Build'}
          </h1>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              fontSize: 14.5,
              lineHeight: 1.5,
              color: 'var(--cb-text-muted)',
            }}
          >
            {batchGenerating && (
              <span
                aria-hidden
                style={{
                  display: 'inline-block',
                  width: 48,
                  height: 1,
                  background: 'var(--cb-border-default)',
                  position: 'relative',
                  overflow: 'hidden',
                  verticalAlign: 'middle',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'var(--cb-accent-emphasis)',
                    animation:
                      'cb-pen 1.4s cubic-bezier(0.32,0.04,0.32,1) infinite',
                  }}
                />
              </span>
            )}
            <span className="cb-italic">
              {batchGenerating
                ? batchMaterial
                  ? `Drafting ${batchMaterial.toLowerCase()} for chapter ${batchCurrentChapter}…`
                  : `Drafting chapter ${batchCurrentChapter}…`
                : generatedCount === totalChapters && totalChapters > 0
                ? `— ${totalChapters} ${totalChapters === 1 ? 'chapter' : 'chapters'} built.`
                : `${generatedCount} of ${totalChapters} ${totalChapters === 1 ? 'chapter' : 'chapters'} built.`}
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexShrink: 0,
            alignItems: 'baseline',
          }}
        >
          {batchGenerating ? (
            <button
              type="button"
              onClick={() => {
                batchCancelRef.current = true;
              }}
              className="cb-focus"
              style={{
                background: 'transparent',
                border: 0,
                padding: 0,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 13,
                fontStyle: 'italic',
                color: 'var(--cb-status-warning)',
                textDecoration: 'underline',
                textDecorationThickness: '0.5px',
                textUnderlineOffset: 3,
              }}
            >
              Stop after current
            </button>
          ) : (
            generatedCount < totalChapters && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowBatchConfirm(true)}
                disabled={anyBusy}
              >
                {generatedCount > 0 ? 'Draft remaining chapters' : 'Draft all chapters'}
              </Button>
            )
          )}
          <Button
            size="sm"
            onClick={handleProceed}
            disabled={chapters.length === 0}
          >
            Go to Export →
          </Button>
        </div>
      </header>

      {/* Batch generation confirmation dialog */}
      <AnimatePresence>
        {showBatchConfirm && (() => {
          const remaining = totalChapters - generatedCount;
          const researched = syllabus.chapters.filter(
            ch => !chapters.find(c => c.number === ch.number)
              && researchDossiers.some(d => d.chapterNumber === ch.number && d.sources.length > 0)
          ).length;
          const unresearched = remaining - researched;
          return (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="batch-confirm-title"
            >
              <div className="p-5 rounded-xl bg-cb-status-warning border border-cb-status-warning">
                <h3 id="batch-confirm-title" className="text-sm font-semibold text-cb-status-warning mb-2">
                  Generate {researched} class{researched !== 1 ? 'es' : ''} at once?
                </h3>
                <p className="text-sm text-cb-text-default mb-3 leading-relaxed">
                  This will use a meaningful amount of your API key balance.
                </p>
                {unresearched > 0 && (
                  <p className="text-xs text-cb-status-warning mb-3 leading-relaxed">
                    {unresearched} class{unresearched !== 1 ? 'es' : ''} without research will be skipped. Go to Research to add them.
                  </p>
                )}
                <div className="grid gap-2 sm:grid-cols-2 mb-3">
                  <button
                    onClick={() => { setShowBatchConfirm(false); generateEverything(); }}
                    disabled={researched === 0}
                    className="p-3 rounded-lg border border-cb-border-strong bg-cb-accent-emphasis-quiet hover:bg-cb-accent-emphasis-quiet transition-colors text-left disabled:opacity-40 disabled:cursor-default cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-cb-accent-emphasis mb-1">Build Everything</div>
                    <p className="text-xs text-cb-text-muted leading-relaxed">
                      All materials — reading, quizzes, weekly challenge, discussion, activities, audiobook, slides.
                      {researched >= 6 ? ' Possibly 1-2 hours.' : researched >= 3 ? ' Possibly 30-60 min.' : ' Takes a while.'}
                    </p>
                  </button>
                  <button
                    onClick={() => { setShowBatchConfirm(false); generateAllClasses(); }}
                    disabled={researched === 0}
                    className="p-3 rounded-lg border border-cb-border-default bg-cb-surface-sunken hover:bg-cb-ground-page transition-colors text-left disabled:opacity-40 disabled:cursor-default cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-cb-text-default mb-1">Classes + Quizzes Only</div>
                    <p className="text-xs text-cb-text-muted leading-relaxed">
                      Reading, Practice Quiz, and In-Class Quiz for each class.
                      {researched >= 6 ? ' Possibly 30+ min.' : researched >= 3 ? ' Possibly 10-15 min.' : ''}
                    </p>
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setShowBatchConfirm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {error && (
        <div
          style={{
            marginBottom: 20,
            padding: '12px 14px',
            background: 'var(--cb-status-danger-bg)',
            borderLeft: '2px solid var(--cb-status-danger)',
            fontSize: 14,
            lineHeight: 1.55,
            color: 'var(--cb-text-default)',
          }}
        >
          {error}
        </div>
      )}

      {/* ─── Codex two-panel layout — sidebar + content ─── */}
      <div
        className="cb-build-layout"
        style={{
          display: 'flex',
          gap: 0,
          height: 'calc(100vh - 220px)',
          border: '1px solid var(--cb-border-default)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {/* Left: Chapter Sidebar */}
        <ChapterSidebar
          selectedChapterNum={selectedChapterNum}
          onSelectChapter={setSelectedChapterNum}
          disabled={batchGenerating}
          batchCurrentChapter={batchCurrentChapter}
        />

        {/* Right: Content area */}
        <div
          className="cb-build-content"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '22px 28px',
            background: 'var(--cb-ground-page)',
          }}
        >
          {/* Batch progress panel — shown during batch mode */}
          {batchGenerating && (
            <div className="mb-4 bg-cb-ground-page border border-cb-border-default rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-cb-accent-emphasis">Batch Generation</h3>
                <span className="text-xs text-cb-text-muted">
                  {generatedCount} of {totalChapters} complete
                </span>
              </div>
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-px bg-cb-border-default" />
                <div className="space-y-1">
                  {syllabus.chapters.map((ch) => {
                    const generated = chapters.find(c => c.number === ch.number);
                    const isCurrent = batchCurrentChapter === ch.number;
                    // Count completed materials for this chapter
                    let matCount = 0;
                    const maxMat = 7;
                    if (generated) {
                      if (generated.htmlContent) matCount++;
                      if (generated.practiceQuizData) matCount++;
                      if (generated.inClassQuizData && generated.inClassQuizData.length > 0) matCount++;
                      if (generated.discussionData && generated.discussionData.length > 0) matCount++;
                      if (generated.activityData && generated.activityData.length > 0) matCount++;
                      if (generated.audioTranscript) matCount++;
                      if (generated.slidesJson && generated.slidesJson.length > 0) matCount++;
                    }
                    return (
                      <div key={ch.number} className="relative flex items-center gap-4 pl-0">
                        <div className="relative z-10 shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all duration-300 ${
                            generated && matCount === maxMat
                              ? 'bg-cb-status-success border-cb-status-success text-cb-status-success'
                              : generated
                              ? 'bg-cb-accent-emphasis-quiet border-cb-border-strong text-cb-accent-emphasis'
                              : isCurrent
                              ? 'bg-cb-accent-emphasis-quiet border-cb-border-strong text-cb-accent-emphasis'
                              : 'bg-cb-ground-page border-cb-border-default text-cb-text-muted'
                          }`}>
                            {generated && matCount === maxMat ? (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                            ) : isCurrent ? (
                              <motion.div
                                className="w-3 h-3 rounded-full bg-cb-accent-emphasis"
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                              />
                            ) : (
                              ch.number
                            )}
                          </div>
                        </div>
                        <div className={`flex-1 py-2 px-3 rounded-xl transition-all ${
                          isCurrent ? 'bg-cb-accent-emphasis-quiet border border-cb-border-default' : generated ? 'bg-cb-ground-page/50' : ''
                        }`}>
                          <div className="text-sm font-medium truncate">{ch.title}</div>
                          <div className="text-xs text-cb-text-muted mt-0.5">
                            {generated
                              ? `${matCount}/${maxMat} materials`
                              : isCurrent
                              ? batchMaterial
                                ? `${batchMaterial}${batchPhase === 'thinking' ? ' — thinking...' : ' — writing...'}`
                                : batchPhase === 'thinking' ? 'Thinking...' : 'Writing...'
                              : 'Pending'}
                          </div>
                        </div>
                        {isCurrent && (
                          <motion.div
                            className="w-5 h-5 border-2 border-cb-accent-emphasis border-t-transparent rounded-full shrink-0"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Research panel */}
          {!batchGenerating && (
            <ResearchPanel chapterNum={selectedChapterNum} />
          )}

          {/* Generate all outputs for current class */}
          {!batchGenerating && currentChapter && !isGenerating && (
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={generateAllOutputs}
                disabled={anyLocalGenerating}
                className="flex items-center gap-1.5 text-xs text-cb-text-muted hover:text-cb-accent-emphasis transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Generate all materials for this chapter
              </button>
              {anyLocalGenerating && (
                <span className="text-xs text-cb-text-muted">
                  Generating... rate limits may cause automatic retries
                </span>
              )}
            </div>
          )}

          {/* Generate chapter button when chapter not yet generated */}
          {!batchGenerating && !currentChapter && !isGenerating && (() => {
            const hasResearch = researchDossiers.some(d => d.chapterNumber === selectedChapterNum && d.sources.length > 0);
            const romanIdx = selectedChapterNum - 1;
            const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'][romanIdx] ?? String(selectedChapterNum);
            return (
              <section
                style={{
                  padding: '32px 28px',
                  background: 'var(--cb-ground-page)',
                  border: '1px solid var(--cb-border-default)',
                  borderRadius: 2,
                  marginBottom: 20,
                }}
              >
                <div
                  className="cb-sc"
                  style={{
                    fontSize: 11,
                    color: 'var(--cb-text-muted)',
                    letterSpacing: '0.14em',
                  }}
                >
                  Chapter dossier
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 16,
                    marginTop: 6,
                    marginBottom: 14,
                  }}
                >
                  <span
                    className="cb-italic"
                    style={{
                      fontSize: 28,
                      color: 'var(--cb-accent-emphasis)',
                      lineHeight: 1,
                    }}
                  >
                    {roman}
                  </span>
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 500,
                      fontVariationSettings: '"opsz" 20',
                      color: 'var(--cb-text-default)',
                      lineHeight: 1.25,
                    }}
                  >
                    {syllabusChapter?.title}
                  </span>
                </div>
                {hasResearch ? (
                  <>
                    <p
                      className="cb-italic"
                      style={{
                        margin: '0 0 18px',
                        fontSize: 14.5,
                        color: 'var(--cb-text-muted)',
                        lineHeight: 1.55,
                        maxWidth: '72ch',
                      }}
                    >
                      Research is in. Drafting a chapter takes several minutes — Claude
                      reasons through the dossier, writes the prose, and weaves in
                      citations. Settle in or grab a coffee; we'll keep going in the
                      background if you click away.
                    </p>
                    {!openaiApiKey && (
                      <div style={{ marginBottom: 18, maxWidth: '72ch' }}>
                        <KeyMissingBanner
                          tone="recommended"
                          text={
                            <>
                              <strong>Heads up.</strong> Without an OpenAI key, this chapter
                              will draft as text-only — no editorial figures inside the
                              reading, and the slide deck for this chapter will be locked
                              when you reach the slides tab.
                            </>
                          }
                          ctaLabel="Add OpenAI key →"
                          onCta={openKeysModal}
                        />
                      </div>
                    )}
                    <Button onClick={() => generateChapter(selectedChapterNum)}>
                      Draft this chapter →
                    </Button>
                  </>
                ) : (
                  <>
                    <p
                      className="cb-italic"
                      style={{
                        margin: '0 0 6px',
                        fontSize: 14.5,
                        color: 'var(--cb-status-warning)',
                        lineHeight: 1.55,
                      }}
                    >
                      No research yet for this chapter.
                    </p>
                    <p
                      className="cb-italic"
                      style={{
                        margin: '0 0 18px',
                        fontSize: 13.5,
                        color: 'var(--cb-text-muted)',
                        lineHeight: 1.55,
                        maxWidth: '72ch',
                      }}
                    >
                      Drafting without research may include unverified references. Better
                      to go back and research first; or proceed anyway and verify by hand.
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <Button onClick={() => navigate('/research')}>
                        Go to Research
                      </Button>
                      <Button variant="ghost" onClick={() => generateChapter(selectedChapterNum)}>
                        Draft anyway
                      </Button>
                    </div>
                  </>
                )}
              </section>
            );
          })()}

          {/* Tabs — only show when chapter exists or is generating */}
          {!batchGenerating && (currentChapter || isGenerating) && (
            <>
              <div
                style={{
                  display: 'flex',
                  gap: 0,
                  marginBottom: 24,
                  borderBottom: '0.5px solid var(--cb-border-rule)',
                  fontFamily: 'var(--font-cb-serif)',
                }}
              >
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className="cb-focus"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        borderBottom: isActive
                          ? '2px solid var(--cb-accent-emphasis)'
                          : '2px solid transparent',
                        marginBottom: -0.5,
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: 15,
                        lineHeight: 1,
                        fontWeight: isActive ? 500 : 400,
                        color: isActive
                          ? 'var(--cb-text-default)'
                          : 'var(--cb-text-muted)',
                        transition:
                          'color 200ms cubic-bezier(0.32,0.04,0.32,1), border-color 200ms',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.color = 'var(--cb-text-default)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.color = 'var(--cb-text-muted)';
                        }
                      }}
                    >
                      {tab.label}
                      {tabGenerating[tab.id] ? (
                        <span
                          aria-hidden
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 999,
                            background: 'var(--cb-accent-emphasis)',
                            animation: 'cb-pen 1.2s ease-in-out infinite',
                          }}
                        />
                      ) : tabErrors[tab.id] ? (
                        <span
                          aria-hidden
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 999,
                            background: 'var(--cb-status-danger)',
                          }}
                        />
                      ) : tab.ready ? (
                        <span
                          aria-hidden
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 999,
                            background: 'var(--cb-status-success)',
                          }}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {/* Per-tab error */}
              {tabErrors[activeTab] && (
                <div
                  style={{
                    marginBottom: 20,
                    padding: '12px 14px',
                    background: 'var(--cb-status-danger-bg)',
                    borderLeft: '2px solid var(--cb-status-danger)',
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: 'var(--cb-text-default)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 16,
                  }}
                >
                  <span>{tabErrors[activeTab]}</span>
                  <button
                    onClick={() => clearTabError(activeTab)}
                    className="cb-focus"
                    style={{
                      background: 'transparent',
                      border: 0,
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontStyle: 'italic',
                      color: 'var(--cb-accent-link)',
                      textDecoration: 'underline',
                      textDecorationThickness: '0.5px',
                      textUnderlineOffset: 3,
                      whiteSpace: 'nowrap',
                      fontFamily: 'inherit',
                    }}
                  >
                    dismiss
                  </button>
                </div>
              )}

              {/* Content */}
              <AnimatePresence mode="wait">
                {activeTab === 'chapter' && (
                  <ReadingTab
                    chapterHtml={chapterHtml}
                    chapterNum={selectedChapterNum}
                    chapterTitle={syllabusChapter?.title ?? ''}
                    themeId={setup.themeId}
                    isGenerating={isGenerating && chapterDraftingFor === selectedChapterNum}
                    isRefining={isRefining}
                    streamingText={streamingText}
                    thinkingText={thinkingText}
                    elapsedSec={elapsedSec}
                    showImageHint={showChapterImageHint}
                    onDismissImageHint={dismissChapterImageHint}
                    refineFeedback={refineFeedback}
                    onRefineFeedbackChange={setRefineFeedback}
                    showRefineConfirm={showRefineConfirm}
                    onShowRefineConfirm={setShowRefineConfirm}
                    refineAutoRegen={refineAutoRegen}
                    onRefineAutoRegenChange={setRefineAutoRegen}
                    onRefine={refineChapter}
                    dependents={(() => {
                      const d: string[] = [];
                      if (quizHtml) d.push('Practice quiz');
                      if (inClassQuizData.length > 0) d.push('In-class quiz');
                      if (weeklyChallengeHtml) d.push('Mastery challenge');
                      if (discussions.length > 0) d.push('Discussion prompts');
                      if (activities.length > 0) d.push('In-class activities');
                      if (audioTranscript) d.push('Narrated audio');
                      if (slidesData.length > 0) d.push('Slides');
                      return d;
                    })()}
                  />
                )}

                {activeTab === 'quiz' && (
                  <div key="quiz">
                    <QuizTab
                      quizHtml={quizHtml}
                      chapterNum={selectedChapterNum}
                      chapterTitle={syllabusChapter?.title ?? ''}
                      isGenerating={generatingQuiz === selectedChapterNum}
                      canGenerate={!!currentChapter && !generatingQuiz}
                      onGenerate={generateQuiz}
                    />
                  </div>
                )}

                {activeTab === 'inclassquiz' && (
                  <motion.div
                    key="inclassquiz"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <InClassQuizTab
                      questions={inClassQuizData}
                      courseTitle={syllabus?.courseTitle ?? ''}
                      chapterTitle={syllabusChapter?.title ?? ''}
                      isGenerating={generatingInClassQuiz === selectedChapterNum}
                      canGenerate={!!currentChapter && !generatingInClassQuiz}
                      onGenerate={generateInClassQuiz}
                      onError={(msg) => setError(friendlyError(msg, 'Quiz export failed.'))}
                    />
                  </motion.div>
                )}

                {activeTab === 'weeklychallenge' && (
                  <motion.div
                    key="weeklychallenge"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <WeeklyChallengeTab
                      challengeHtml={weeklyChallengeHtml}
                      chapterNum={selectedChapterNum}
                      chapterTitle={syllabusChapter?.title ?? ''}
                      isGenerating={generatingWeeklyChallenge === selectedChapterNum}
                      canGenerate={!!currentChapter && !generatingWeeklyChallenge}
                      onGenerate={generateWeeklyChallengeContent}
                    />
                  </motion.div>
                )}

                {activeTab === 'discussion' && (
                  <motion.div
                    key="discussion"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <DiscussionTab
                      discussions={discussions}
                      isGenerating={generatingDiscussion === selectedChapterNum}
                      canGenerate={!!currentChapter && !generatingDiscussion}
                      onGenerate={generateDiscussion}
                      onCopy={copyToClipboard}
                      copiedLabel={copiedLabel}
                      formatDiscussionsText={formatDiscussionsText}
                    />
                  </motion.div>
                )}

                {activeTab === 'activities' && (
                  <motion.div
                    key="activities"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <ActivitiesTab
                      activities={activities}
                      expandedActivities={expandedActivities}
                      expandingActivity={expandingActivity}
                      copiedLabel={copiedLabel}
                      isGenerating={generatingActivities === selectedChapterNum}
                      canGenerate={!!currentChapter && !generatingActivities}
                      onGenerate={generateActivities}
                      onCopy={copyToClipboard}
                      onFleshOut={fleshOutActivity}
                      onCollapse={(i) =>
                        setExpandedActivities((prev) => {
                          const next = { ...prev };
                          delete next[i];
                          return next;
                        })
                      }
                      formatActivitiesText={formatActivitiesText}
                    />
                  </motion.div>
                )}

                {activeTab === 'audio' && (
                  <motion.div
                    key="audio"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <AudioTab
                      audioTranscript={audioTranscript}
                      audioUrl={audioUrl}
                      audioError={audioError}
                      audioPhase={audioPhase}
                      audioChunkProgress={audioChunkProgress}
                      chapterNum={selectedChapterNum}
                      chapterTitle={syllabusChapter?.title ?? ''}
                      isGenerating={generatingAudio === selectedChapterNum}
                      canGenerate={!!currentChapter && !generatingAudio}
                      hasElevenLabsKey={!!elevenLabsApiKey}
                      onGenerate={generateAudio}
                      onRetry={retryAudio}
                      onAddKey={openKeysModal}
                    />
                  </motion.div>
                )}

                {activeTab === 'slides' && (
                  <motion.div
                    key="slides"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <SlidesTab
                      slides={slidesData}
                      chapterNum={selectedChapterNum}
                      isGenerating={generatingSlides === selectedChapterNum}
                      canGenerate={!!currentChapter && !generatingSlides}
                      hasOpenAiKey={!!openaiApiKey}
                      showImageHint={showSlideImageHint}
                      onDismissImageHint={dismissSlideImageHint}
                      onGenerate={generateSlides}
                      onDownloadDeck={downloadSlideDeck}
                      onAddKey={openKeysModal}
                      slidesRender={slidesRender}
                      editedSlidePrompts={editedSlidePrompts}
                      onSlidePromptDraftChange={(i, text) =>
                        setEditedSlidePrompts((prev) => ({ ...prev, [i]: text }))
                      }
                      onSlidePromptDraftReset={(i) =>
                        setEditedSlidePrompts((prev) => {
                          const next = { ...prev };
                          delete next[i];
                          return next;
                        })
                      }
                      refiningSlideIdx={refiningSlideIdx}
                      slideRefineError={slideRefineError}
                      onRefineSlide={refineSlideImage}
                    />
                  </motion.div>
                )}

              </AnimatePresence>
            </>
          )}
        </div>
      </div>

      {/* Chapter image refine drawer — overlays from the right when the user
          clicks any rendered image inside the chapter iframe. */}
      <ChapterImageRefineDrawer
        state={chapterImageRefine}
        draft={chapterImageDraft}
        onDraftChange={setChapterImageDraft}
        onClose={closeChapterImageRefine}
        onRefine={() => void refineChapterImage()}
        isRefining={chapterImageRefining}
        hasOpenAiKey={!!openaiApiKey}
        error={chapterImageRefineError}
        onAddKey={openKeysModal}
      />

      {/* Shortcuts help — toggled by ? */}
      <ShortcutsHelpOverlay
        open={shortcutsHelpOpen}
        onClose={() => setShortcutsHelpOpen(false)}
      />

      {/* Discoverability affordance for the keyboard shortcuts. */}
      {!batchGenerating && !chapterImageRefining && !shortcutsHelpOpen && (
        <button
          type="button"
          onClick={() => setShortcutsHelpOpen(true)}
          aria-label="Show keyboard shortcuts"
          title="Show keyboard shortcuts (?)"
          className="cb-mono"
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 30,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px 7px',
            background: 'var(--cb-ground-page)',
            border: '0.5px solid var(--cb-border-default)',
            borderRadius: 2,
            fontSize: 10.5,
            letterSpacing: '0.08em',
            color: 'var(--cb-text-muted)',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(20,17,13,0.06)',
            transition: 'color 160ms ease, border-color 160ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--cb-accent-emphasis)';
            e.currentTarget.style.borderColor = 'var(--cb-accent-emphasis)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--cb-text-muted)';
            e.currentTarget.style.borderColor = 'var(--cb-border-default)';
          }}
        >
          shortcuts <span style={{ opacity: 0.7 }}>·</span> ?
        </button>
      )}

      {/* Transient toast — used by Cmd/Ctrl+S "you don't need to save" feedback */}
      <TransientToast message={transientToast} />
    </div>
  );
}


