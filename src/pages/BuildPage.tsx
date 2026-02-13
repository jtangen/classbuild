import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCourseStore } from '../store/courseStore';
import { useApiStore } from '../store/apiStore';
import { useUiStore } from '../store/uiStore';
import { streamMessage } from '../services/claude/streaming';
import { MODELS } from '../services/claude/client';
import { buildChapterPrompt, buildChapterUserPrompt } from '../prompts/chapter';
import { buildPracticeQuizPrompt, buildPracticeQuizUserPrompt } from '../prompts/practiceQuiz';
import { buildDiscussionPrompt, buildDiscussionUserPrompt } from '../prompts/discussion';
import { buildActivitiesPrompt, buildActivitiesUserPrompt, buildActivityDetailPrompt, buildActivityDetailUserPrompt } from '../prompts/activities';
import { buildInClassQuizPrompt, buildInClassQuizUserPrompt } from '../prompts/inClassQuiz';
import { buildAudioTranscriptPrompt, buildAudioTranscriptUserPrompt } from '../prompts/audioTranscript';
import { buildSlidesPrompt, buildSlidesUserPrompt } from '../prompts/slides';
import { Button } from '../components/shared/Button';
import { ChapterSidebar } from '../components/build/ChapterSidebar';
import { ResearchPanel } from '../components/build/ResearchPanel';
import type { SlideData, InClassQuizQuestion, ActivityDetail } from '../types/course';

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

function downloadFile(content: string | Blob, filename: string, type = 'text/html') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function extractHtml(text: string): string {
  const htmlMatch = text.match(/```html\s*\n?([\s\S]*?)\n?```/);
  if (htmlMatch) return htmlMatch[1];
  const trimmed = text.trim();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) return trimmed;
  const docIdx = text.indexOf('<!DOCTYPE');
  const htmlIdx = text.indexOf('<html');
  const startIdx = docIdx !== -1 ? docIdx : htmlIdx;
  if (startIdx !== -1) {
    const endIdx = text.lastIndexOf('</html>');
    if (endIdx !== -1) return text.slice(startIdx, endIdx + 7);
    return text.slice(startIdx);
  }
  return text;
}

function parseJson(text: string, wrapType: '[' | '{' = '['): unknown {
  let jsonStr = text;
  const match = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (match) jsonStr = match[1];
  const open = wrapType;
  const close = wrapType === '[' ? ']' : '}';
  const first = jsonStr.indexOf(open);
  const last = jsonStr.lastIndexOf(close);
  if (first !== -1 && last !== -1) jsonStr = jsonStr.slice(first, last + 1);
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      if (e instanceof SyntaxError) {
        const posMatch = e.message.match(/position (\d+)/);
        if (posMatch) {
          const pos = parseInt(posMatch[1]);
          if (pos > 0 && pos < jsonStr.length && jsonStr[pos] === '"') {
            jsonStr = jsonStr.slice(0, pos) + '\\"' + jsonStr.slice(pos + 1);
            continue;
          }
        }
      }
      throw e;
    }
  }
  return JSON.parse(jsonStr);
}

async function streamWithRetry(
  options: Parameters<typeof streamMessage>[0],
  callbacks: Parameters<typeof streamMessage>[1],
  maxRetries = 3,
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await streamMessage(options, callbacks);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = msg.includes('429') || msg.toLowerCase().includes('rate');
      if (isRateLimit && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 1500));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

async function replaceGeminiPlaceholders(html: string, apiKey: string): Promise<string> {
  const { replaceGeminiImagePlaceholders } = await import('../services/gemini/imagePlacer');
  return replaceGeminiImagePlaceholders(html, apiKey);
}

export function BuildPage() {
  const navigate = useNavigate();
  const { syllabus, researchDossiers, chapters, addChapter, updateChapter, setup, setStage, completeStage } = useCourseStore();
  const { claudeApiKey, elevenLabsApiKey, geminiApiKey } = useApiStore();
  const { isGenerating, setIsGenerating, streamingText, setStreamingText, appendStreamingText, error, setError, activeTab, setActiveTab, batchGenerating, batchCurrentChapter, batchPhase, setBatchGenerating, setBatchCurrentChapter, setBatchPhase } = useUiStore();

  const [selectedChapterNum, setSelectedChapterNum] = useState(1);
  const [chapterHtml, setChapterHtml] = useState('');
  const [quizHtml, setQuizHtml] = useState('');
  const [discussions, setDiscussions] = useState<DiscussionPrompt[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [inClassQuizData, setInClassQuizData] = useState<InClassQuizQuestion[]>([]);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [generatingInClassQuiz, setGeneratingInClassQuiz] = useState(false);
  const [generatingDiscussion, setGeneratingDiscussion] = useState(false);
  const [generatingActivities, setGeneratingActivities] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [generatingSlides, setGeneratingSlides] = useState(false);
  const [audioTranscript, setAudioTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioPhase, setAudioPhase] = useState<'transcript' | 'synthesizing' | null>(null);
  const [audioError, setAudioError] = useState('');
  const [audioChunkProgress, setAudioChunkProgress] = useState<{ current: number; total: number } | null>(null);
  const [slidesData, setSlidesData] = useState<SlideData[]>([]);
  const [thinkingText, setThinkingText] = useState('');
  const [refineFeedback, setRefineFeedback] = useState('');
  const [showRefineConfirm, setShowRefineConfirm] = useState(false);
  const [expandedActivities, setExpandedActivities] = useState<Record<number, ActivityDetail>>({});
  const [expandedSlideNotes, setExpandedSlideNotes] = useState<Set<number>>(new Set());
  const [expandingActivity, setExpandingActivity] = useState<number | null>(null);
  const [copiedLabel, setCopiedLabel] = useState('');
  const [infographicDataUri, setInfographicDataUri] = useState('');
  const [generatingInfographic, setGeneratingInfographic] = useState(false);
  const [tabErrors, setTabErrors] = useState<Record<string, string>>({});
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);
  const autoGenStarted = useRef(false);

  // Derived state
  const currentChapter = chapters.find(c => c.number === selectedChapterNum);
  const syllabusChapter = syllabus?.chapters.find(c => c.number === selectedChapterNum);
  const anyLocalGenerating = generatingQuiz || generatingInClassQuiz || generatingDiscussion || generatingActivities || generatingAudio || generatingSlides || generatingInfographic;
  const anyBusy = isGenerating || anyLocalGenerating || batchGenerating;

  const tabGenerating: Record<string, boolean> = {
    quiz: generatingQuiz,
    inclassquiz: generatingInClassQuiz,
    discussion: generatingDiscussion,
    activities: generatingActivities,
    audio: generatingAudio,
    slides: generatingSlides,
    infographic: generatingInfographic,
  };

  const setTabError = useCallback((tab: string, msg: string) => {
    setTabErrors(prev => ({ ...prev, [tab]: msg }));
  }, []);

  const clearTabError = useCallback((tab: string) => {
    setTabErrors(prev => {
      if (!prev[tab]) return prev;
      const next = { ...prev };
      delete next[tab];
      return next;
    });
  }, []);

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

      const detail = expandedActivities[i];
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

  // Restore local state when switching chapters or when chapter data appears
  useEffect(() => {
    setChapterHtml('');
    setQuizHtml('');
    setInClassQuizData([]);
    setDiscussions([]);
    setActivities([]);
    setAudioTranscript('');
    setAudioUrl('');
    setSlidesData([]);
    setInfographicDataUri('');
    setThinkingText('');
    setRefineFeedback('');
    setShowRefineConfirm(false);
    setExpandedActivities({});
    setExpandingActivity(null);
    setAudioChunkProgress(null);
    setAudioError('');
    setTabErrors({});

    const ch = chapters.find(c => c.number === selectedChapterNum);
    if (ch) {
      setChapterHtml(ch.htmlContent);
      if (ch.inClassQuizData && ch.inClassQuizData.length > 0) setInClassQuizData(ch.inClassQuizData);
      if (ch.discussionData && ch.discussionData.length > 0) setDiscussions(ch.discussionData);
      if (ch.activityData && ch.activityData.length > 0) setActivities(ch.activityData);
      if (ch.activityDetails) setExpandedActivities(ch.activityDetails);
      if (ch.audioTranscript) setAudioTranscript(ch.audioTranscript);
      if (ch.audioUrl) setAudioUrl(ch.audioUrl);
      if (ch.slidesJson && ch.slidesJson.length > 0) setSlidesData(ch.slidesJson);
      if (ch.infographicDataUri) setInfographicDataUri(ch.infographicDataUri);
      if (ch.practiceQuizData && syllabus) {
        const syllCh = syllabus.chapters.find(sc => sc.number === selectedChapterNum);
        (async () => {
          try {
            const { buildQuizHtml } = await import('../templates/quizTemplate');
            const html = buildQuizHtml(
              `${syllCh?.title || ch.title} — Practice Quiz`,
              ch.practiceQuizData!,
              syllabus.courseTitle,
              setup.themeId,
            );
            setQuizHtml(html);
          } catch {
            // Quiz template failed to load
          }
        })();
      }
    }
  }, [selectedChapterNum, chapters, syllabus]);

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

      const hasGemini = !!geminiApiKey;
      const fullText = await streamMessage(
        {
          apiKey: claudeApiKey,
          model: MODELS.opus,
          system: buildChapterPrompt(setup.themeId, hasGemini),
          messages: [{
            role: 'user',
            content: buildChapterUserPrompt(
              syllabus.courseTitle,
              ch,
              setup.chapterLength,
              researchSources,
              hasGemini,
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
      if (hasGemini) {
        html = await replaceGeminiPlaceholders(html, geminiApiKey);
      }

      setChapterHtml(html);
      addChapter({
        number: chapterNum,
        title: ch.title,
        htmlContent: html,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chapter generation failed');
    } finally {
      setIsGenerating(false);
      setThinkingText('');
    }
  }, [syllabus, claudeApiKey, geminiApiKey, researchDossiers, setup.chapterLength, addChapter, setIsGenerating, setStreamingText, appendStreamingText, setError]);

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
    setQuizHtml('');
    setInClassQuizData([]);
    setDiscussions([]);
    setActivities([]);
    setAudioTranscript('');
    setAudioUrl('');
    setSlidesData([]);
    setExpandedActivities({});
    setRefineFeedback('');
    setShowRefineConfirm(false);

    setIsGenerating(true);
    setStreamingText('');
    setThinkingText('');

    try {
      const dossier = researchDossiers.find(d => d.chapterNumber === selectedChapterNum);
      const researchSources = dossier?.sources.map(s => ({
        title: s.title, authors: s.authors, year: s.year,
        summary: s.summary, url: s.url, doi: s.doi,
      }));

      const hasGemini = !!geminiApiKey;
      const fullText = await streamMessage(
        {
          apiKey: claudeApiKey,
          model: MODELS.opus,
          system: buildChapterPrompt(setup.themeId, hasGemini),
          messages: [
            {
              role: 'user',
              content: buildChapterUserPrompt(
                syllabus.courseTitle,
                syllabusChapter,
                setup.chapterLength,
                researchSources,
                hasGemini,
              ),
            },
            {
              role: 'assistant',
              content: currentChapter.htmlContent,
            },
            {
              role: 'user',
              content: `Please revise this chapter based on the following feedback. Maintain the same HTML structure, design system, and interactive widgets. Output ONLY the complete revised HTML.\n\nFeedback: "${feedback}"`,
            },
          ],
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
      if (hasGemini) {
        html = await replaceGeminiPlaceholders(html, geminiApiKey);
      }
      setChapterHtml(html);
      updateChapter(selectedChapterNum, { htmlContent: html });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chapter refinement failed');
    } finally {
      setIsGenerating(false);
      setThinkingText('');
    }
  }, [syllabus, currentChapter, syllabusChapter, selectedChapterNum, claudeApiKey, geminiApiKey, researchDossiers, setup.chapterLength, updateChapter, setIsGenerating, setStreamingText, appendStreamingText, setError]);

  const generateQuiz = useCallback(async () => {
    if (!syllabus || !currentChapter || !syllabusChapter) return;
    setGeneratingQuiz(true);
    clearTabError('quiz');

    try {
      const fullText = await streamWithRetry(
        {
          apiKey: claudeApiKey,
          model: MODELS.opus,
          system: buildPracticeQuizPrompt(),
          messages: [{
            role: 'user',
            content: buildPracticeQuizUserPrompt(syllabusChapter.title, syllabusChapter.narrative, syllabusChapter.keyConcepts, currentChapter.htmlContent?.slice(0, 3000)),
          }],
          thinkingBudget: 'max',
          maxTokens: 8000,
        },
        {}
      );

      // Balance answer lengths (silent post-processing)
      const { balancePracticeQuiz } = await import('../services/quiz/answerBalancer');
      const balancedText = await balancePracticeQuiz(fullText, claudeApiKey);

      updateChapter(selectedChapterNum, { practiceQuizData: balancedText });

      try {
        const { buildQuizHtml } = await import('../templates/quizTemplate');
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
    } catch (err) {
      setTabError('quiz', err instanceof Error ? err.message : 'Quiz generation failed');
    } finally {
      setGeneratingQuiz(false);
    }
  }, [syllabus, currentChapter, syllabusChapter, selectedChapterNum, claudeApiKey, updateChapter, setTabError, clearTabError]);

  const generateInClassQuiz = useCallback(async () => {
    if (!syllabus || !currentChapter || !syllabusChapter) return;
    setGeneratingInClassQuiz(true);
    clearTabError('inclassquiz');

    try {
      const fullText = await streamWithRetry(
        {
          apiKey: claudeApiKey,
          model: MODELS.opus,
          system: buildInClassQuizPrompt(),
          messages: [{
            role: 'user',
            content: buildInClassQuizUserPrompt(syllabusChapter.title, syllabusChapter.narrative, syllabusChapter.keyConcepts, currentChapter.htmlContent?.slice(0, 3000)),
          }],
          thinkingBudget: 'max',
          maxTokens: 8000,
        },
        {}
      );

      try {
        const parsed = parseJson(fullText) as InClassQuizQuestion[];
        const { balanceInClassQuiz } = await import('../services/quiz/answerBalancer');
        const balanced = await balanceInClassQuiz(parsed, claudeApiKey);
        setInClassQuizData(balanced);
        updateChapter(selectedChapterNum, { inClassQuizData: balanced });
      } catch {
        setTabError('inclassquiz', 'Failed to parse in-class quiz data');
      }
    } catch (err) {
      setTabError('inclassquiz', err instanceof Error ? err.message : 'In-class quiz generation failed');
    } finally {
      setGeneratingInClassQuiz(false);
    }
  }, [syllabus, currentChapter, syllabusChapter, selectedChapterNum, claudeApiKey, updateChapter, setTabError, clearTabError]);

  const generateDiscussion = useCallback(async () => {
    if (!syllabus || !syllabusChapter) return;
    setGeneratingDiscussion(true);
    clearTabError('discussion');

    try {
      const fullText = await streamWithRetry(
        {
          apiKey: claudeApiKey,
          system: buildDiscussionPrompt(),
          messages: [{
            role: 'user',
            content: buildDiscussionUserPrompt(syllabusChapter.title, syllabusChapter.keyConcepts, setup.cohortSize, setup.teachingEnvironment),
          }],
          thinkingBudget: 'medium',
          maxTokens: 4000,
        },
        {}
      );

      try {
        const parsed = parseJson(fullText) as DiscussionPrompt[];
        setDiscussions(parsed);
        updateChapter(selectedChapterNum, { discussionData: parsed });
      } catch {
        setTabError('discussion', 'Failed to parse discussion prompts');
      }
    } catch (err) {
      setTabError('discussion', err instanceof Error ? err.message : 'Discussion generation failed');
    } finally {
      setGeneratingDiscussion(false);
    }
  }, [syllabus, syllabusChapter, selectedChapterNum, claudeApiKey, setup.cohortSize, setup.teachingEnvironment, updateChapter, setTabError, clearTabError]);

  const generateActivities = useCallback(async () => {
    if (!syllabus || !syllabusChapter) return;
    setGeneratingActivities(true);
    clearTabError('activities');

    try {
      const fullText = await streamWithRetry(
        {
          apiKey: claudeApiKey,
          system: buildActivitiesPrompt(),
          messages: [{
            role: 'user',
            content: buildActivitiesUserPrompt(syllabusChapter.title, syllabusChapter.keyConcepts, setup.cohortSize, setup.teachingEnvironment, setup.environmentNotes),
          }],
          thinkingBudget: 'medium',
          maxTokens: 4000,
        },
        {}
      );

      try {
        const parsed = parseJson(fullText) as Activity[];
        setActivities(parsed);
        updateChapter(selectedChapterNum, { activityData: parsed });
      } catch {
        setTabError('activities', 'Failed to parse activities');
      }
    } catch (err) {
      setTabError('activities', err instanceof Error ? err.message : 'Activities generation failed');
    } finally {
      setGeneratingActivities(false);
    }
  }, [syllabus, syllabusChapter, selectedChapterNum, claudeApiKey, setup.cohortSize, setup.teachingEnvironment, setup.environmentNotes, updateChapter, setTabError, clearTabError]);

  const fleshOutActivity = useCallback(async (index: number) => {
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
          messages: [{
            role: 'user',
            content: buildActivityDetailUserPrompt(activity, syllabusChapter.title, setup.cohortSize, setup.teachingEnvironment, setup.environmentNotes),
          }],
          thinkingBudget: 'low',
          maxTokens: 8000,
        },
        {}
      );

      try {
        const parsed = parseJson(fullText, '{') as ActivityDetail;
        setExpandedActivities(prev => {
          const updated = { ...prev, [index]: parsed };
          updateChapter(selectedChapterNum, { activityDetails: updated });
          return updated;
        });
      } catch (parseErr) {
        setError(`Failed to parse activity details: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activity detail generation failed');
    } finally {
      setExpandingActivity(null);
    }
  }, [activities, syllabusChapter, claudeApiKey, setup.cohortSize, setup.teachingEnvironment, setup.environmentNotes, expandingActivity, setError]);

  const generateAudio = useCallback(async () => {
    if (!currentChapter || !syllabus) return;
    setGeneratingAudio(true);
    clearTabError('audio');
    setAudioPhase('transcript');
    setAudioError('');

    try {
      const transcript = await streamWithRetry(
        {
          apiKey: claudeApiKey,
          system: buildAudioTranscriptPrompt(),
          messages: [{
            role: 'user',
            content: buildAudioTranscriptUserPrompt(currentChapter.title, currentChapter.htmlContent),
          }],
          thinkingBudget: 'medium',
          maxTokens: 8000,
        },
        {}
      );

      setAudioTranscript(transcript);
      updateChapter(selectedChapterNum, { audioTranscript: transcript });

      if (elevenLabsApiKey) {
        setAudioPhase('synthesizing');
        setAudioChunkProgress(null);
        try {
          const { generateAudiobook } = await import('../services/elevenlabs/tts');
          const blob = await generateAudiobook(transcript, elevenLabsApiKey, {
            voiceId: setup.voiceId,
            onProgress: (current, total) => setAudioChunkProgress({ current, total }),
          });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          updateChapter(selectedChapterNum, { audioUrl: url });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('ElevenLabs TTS failed:', err);
          setAudioError(msg);
        }
      }
    } catch (err) {
      setTabError('audio', err instanceof Error ? err.message : 'Audio transcript generation failed');
    } finally {
      setGeneratingAudio(false);
      setAudioPhase(null);
      setAudioChunkProgress(null);
    }
  }, [currentChapter, syllabus, selectedChapterNum, claudeApiKey, elevenLabsApiKey, updateChapter, setTabError, clearTabError]);

  const retryAudio = useCallback(async () => {
    if (!audioTranscript || !elevenLabsApiKey) return;
    setGeneratingAudio(true);
    setAudioPhase('synthesizing');
    setAudioError('');
    setAudioChunkProgress(null);

    try {
      const { generateAudiobook } = await import('../services/elevenlabs/tts');
      const blob = await generateAudiobook(audioTranscript, elevenLabsApiKey, {
        voiceId: setup.voiceId,
        onProgress: (current, total) => setAudioChunkProgress({ current, total }),
      });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      updateChapter(selectedChapterNum, { audioUrl: url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('ElevenLabs TTS retry failed:', err);
      setAudioError(msg);
    } finally {
      setGeneratingAudio(false);
      setAudioPhase(null);
      setAudioChunkProgress(null);
    }
  }, [audioTranscript, elevenLabsApiKey, selectedChapterNum, updateChapter]);

  const generateSlides = useCallback(async () => {
    if (!currentChapter || !syllabus || !syllabusChapter) return;
    setGeneratingSlides(true);
    clearTabError('slides');

    try {
      const fullText = await streamWithRetry(
        {
          apiKey: claudeApiKey,
          system: buildSlidesPrompt(),
          messages: [{
            role: 'user',
            content: buildSlidesUserPrompt(syllabusChapter.title, syllabusChapter.keyConcepts, currentChapter.htmlContent),
          }],
          thinkingBudget: 'medium',
          maxTokens: 4000,
        },
        {}
      );

      try {
        const parsed = parseJson(fullText) as SlideData[];
        setSlidesData(parsed);
        updateChapter(selectedChapterNum, { slidesJson: parsed });
      } catch {
        setTabError('slides', 'Failed to parse slide data from response');
      }
    } catch (err) {
      setTabError('slides', err instanceof Error ? err.message : 'Slides generation failed');
    } finally {
      setGeneratingSlides(false);
    }
  }, [currentChapter, syllabus, syllabusChapter, selectedChapterNum, claudeApiKey, updateChapter, setTabError, clearTabError]);

  const generateInfographic = useCallback(async () => {
    if (!currentChapter || !syllabusChapter || !geminiApiKey) return;
    setGeneratingInfographic(true);
    setInfographicDataUri('');
    clearTabError('infographic');

    try {
      const { buildInfographicMetaPrompt, buildInfographicMetaUserPrompt } = await import('../prompts/infographic');
      const promptText = await streamWithRetry(
        {
          apiKey: claudeApiKey,
          model: MODELS.opus,
          system: buildInfographicMetaPrompt(setup.themeId),
          messages: [{
            role: 'user',
            content: buildInfographicMetaUserPrompt(syllabusChapter.title, syllabusChapter.keyConcepts, currentChapter.htmlContent),
          }],
          thinkingBudget: 'medium',
          maxTokens: 2000,
        },
        {}
      );

      updateChapter(selectedChapterNum, { infographicPrompt: promptText });

      const { generateInfographic: genImg } = await import('../services/gemini/imageGen');
      const dataUri = await genImg(promptText, geminiApiKey);

      setInfographicDataUri(dataUri);
      updateChapter(selectedChapterNum, { infographicDataUri: dataUri });
    } catch (err) {
      setTabError('infographic', err instanceof Error ? err.message : 'Infographic generation failed');
    } finally {
      setGeneratingInfographic(false);
    }
  }, [currentChapter, syllabusChapter, selectedChapterNum, claudeApiKey, geminiApiKey, setup.themeId, updateChapter, setTabError, clearTabError]);

  // Generate all outputs for the currently selected chapter
  const generateAllOutputs = useCallback(async () => {
    if (!currentChapter || !syllabusChapter || !syllabus) return;
    const tasks: Promise<void>[] = [];
    if (!quizHtml) tasks.push(generateQuiz().catch(() => {}));
    if (inClassQuizData.length === 0) tasks.push(generateInClassQuiz().catch(() => {}));
    if (discussions.length === 0) tasks.push(generateDiscussion().catch(() => {}));
    if (activities.length === 0) tasks.push(generateActivities().catch(() => {}));
    if (slidesData.length === 0) tasks.push(generateSlides().catch(() => {}));
    if (!audioTranscript) tasks.push(generateAudio().catch(() => {}));
    if (geminiApiKey && !infographicDataUri) tasks.push(generateInfographic().catch(() => {}));
    await Promise.allSettled(tasks);
  }, [currentChapter, syllabusChapter, syllabus, quizHtml, inClassQuizData, discussions, activities, slidesData, audioTranscript, infographicDataUri, geminiApiKey, generateQuiz, generateInClassQuiz, generateDiscussion, generateActivities, generateSlides, generateAudio, generateInfographic]);

  // ─── Batch generation (from GeneratePage) ───
  const generateAllClasses = useCallback(async () => {
    if (!syllabus) return;
    setBatchGenerating(true);

    const chaptersToGenerate = syllabus.chapters.filter(
      ch => !chapters.find(c => c.number === ch.number)
        && researchDossiers.some(d => d.chapterNumber === ch.number && d.sources.length > 0)
    );

    for (const ch of chaptersToGenerate) {
      setBatchCurrentChapter(ch.number);
      setBatchPhase('thinking');

      try {
        const dossier = researchDossiers.find(d => d.chapterNumber === ch.number);
        const researchSources = dossier?.sources.map(s => ({
          title: s.title, authors: s.authors, year: s.year,
          summary: s.summary, url: s.url, doi: s.doi,
        }));

        const hasGemini = !!geminiApiKey;
        const fullText = await streamMessage(
          {
            apiKey: claudeApiKey,
            model: MODELS.opus,
            system: buildChapterPrompt(setup.themeId, hasGemini),
            messages: [{
              role: 'user',
              content: buildChapterUserPrompt(
                syllabus.courseTitle, ch, setup.chapterLength, researchSources, hasGemini,
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
        if (hasGemini) {
          setBatchPhase('writing');
          html = await replaceGeminiPlaceholders(html, geminiApiKey);
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
      } catch (err) {
        setError(`Failed to generate Class ${ch.number}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    setBatchCurrentChapter(null);
    setBatchPhase(null);
    setBatchGenerating(false);
  }, [syllabus, chapters, claudeApiKey, geminiApiKey, researchDossiers, setup.chapterLength, setup.themeId, addChapter, updateChapter, setError, setBatchGenerating, setBatchCurrentChapter, setBatchPhase]);

  const handleProceed = () => {
    completeStage('build');
    setStage('export');
    navigate('/export');
  };

  if (!syllabus) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary">No syllabus available. Please complete earlier stages.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/syllabus')}>
          Back to Syllabus
        </Button>
      </div>
    );
  }

  const totalChapters = syllabus.chapters.length;
  const generatedCount = chapters.length;
  const overallProgress = totalChapters > 0 ? (generatedCount / totalChapters) * 100 : 0;

  const tabs = [
    { id: 'chapter', label: 'Reading', ready: !!chapterHtml },
    { id: 'quiz', label: 'Practice Quiz', ready: !!quizHtml },
    { id: 'inclassquiz', label: 'In-Class Quiz', ready: inClassQuizData.length > 0 },
    { id: 'discussion', label: 'Discussion', ready: discussions.length > 0 },
    { id: 'activities', label: 'Activities', ready: activities.length > 0 },
    { id: 'audio', label: 'Audiobook', ready: !!audioTranscript },
    { id: 'slides', label: 'Slides', ready: slidesData.length > 0 },
    ...(geminiApiKey ? [{ id: 'infographic', label: 'Infographic', ready: !!infographicDataUri }] : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-[1400px] mx-auto py-4"
    >
      {/* ─── Sticky header ─── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Build</h1>
          <div className="flex items-center gap-3">
            <div className="w-32 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full"
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-xs text-text-muted tabular-nums">{generatedCount}/{totalChapters} classes</span>
          </div>
        </div>
        <div className="flex gap-2">
          {!batchGenerating && generatedCount < totalChapters && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowBatchConfirm(true)}
              disabled={anyBusy}
            >
              {generatedCount > 0 ? 'Generate Remaining Classes' : 'Generate All Classes'}
            </Button>
          )}
          {batchGenerating && (
            <span className="flex items-center gap-2 text-xs text-violet-400">
              <motion.div
                className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              Batch generating...
            </span>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={handleProceed}
            disabled={chapters.length === 0 || anyBusy}
          >
            Go to Export
            <svg className="ml-1.5 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Button>
        </div>
      </div>

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
            >
              <div className="p-5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <h3 className="text-sm font-semibold text-amber-400 mb-2">
                  Generate {researched} class{researched !== 1 ? 'es' : ''} at once?
                </h3>
                <p className="text-sm text-text-secondary mb-3 leading-relaxed">
                  Each class requires three separate AI generations, so this will take a while
                  {researched >= 6 ? ' — possibly 30 minutes or more' : researched >= 3 ? ' — possibly 10-15 minutes' : ''}.
                  It will also use a meaningful amount of your API key balance.
                </p>
                <p className="text-xs text-text-muted mb-4 leading-relaxed">
                  For each class, this creates the <span className="text-text-secondary">Reading</span>, <span className="text-text-secondary">Practice Quiz</span>, and <span className="text-text-secondary">In-Class Quiz</span>.
                  You can add other materials (slides, activities, audiobook, etc.) individually afterwards.
                </p>
                {unresearched > 0 && (
                  <p className="text-xs text-amber-400/80 mb-4 leading-relaxed">
                    {unresearched} class{unresearched !== 1 ? 'es' : ''} without research will be skipped. Go to Research to add them.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { setShowBatchConfirm(false); generateAllClasses(); }} disabled={researched === 0}>
                    Generate {researched} Class{researched !== 1 ? 'es' : ''}
                  </Button>
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
        <div className="mb-4 p-4 rounded-lg bg-error/10 border border-error/20 text-error text-sm">{error}</div>
      )}

      {/* ─── Two-panel layout ─── */}
      <div className="flex gap-0" style={{ height: 'calc(100vh - 180px)' }}>
        {/* Left: Chapter Sidebar */}
        <ChapterSidebar
          selectedChapterNum={selectedChapterNum}
          onSelectChapter={(num) => !anyBusy && setSelectedChapterNum(num)}
          disabled={anyBusy}
          batchCurrentChapter={batchCurrentChapter}
        />

        {/* Right: Content area */}
        <div className="flex-1 overflow-y-auto pl-4">
          {/* Batch progress panel — shown during batch mode */}
          {batchGenerating && (
            <div className="mb-4 bg-bg-card border border-violet-500/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-violet-400">Batch Generation</h3>
                <span className="text-xs text-text-muted">
                  {generatedCount} of {totalChapters} complete
                </span>
              </div>
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-violet-500/30 via-violet-500/10 to-transparent" />
                <div className="space-y-1">
                  {syllabus.chapters.map((ch) => {
                    const generated = chapters.find(c => c.number === ch.number);
                    const isCurrent = batchCurrentChapter === ch.number;
                    return (
                      <div key={ch.number} className="relative flex items-center gap-4 pl-0">
                        <div className="relative z-10 shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all duration-300 ${
                            generated
                              ? 'bg-success/10 border-success/30 text-success'
                              : isCurrent
                              ? 'bg-violet-500/20 border-violet-500/50 text-violet-400'
                              : 'bg-bg-card border-violet-500/10 text-text-muted'
                          }`}>
                            {generated ? (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                            ) : isCurrent ? (
                              <motion.div
                                className="w-3 h-3 rounded-full bg-violet-500"
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                              />
                            ) : (
                              ch.number
                            )}
                          </div>
                        </div>
                        <div className={`flex-1 py-2 px-3 rounded-xl transition-all ${
                          isCurrent ? 'bg-violet-500/5 border border-violet-500/20' : generated ? 'bg-bg-card/50' : ''
                        }`}>
                          <div className="text-sm font-medium truncate">{ch.title}</div>
                          <div className="text-xs text-text-muted mt-0.5">
                            {generated
                              ? 'Class + Quizzes generated'
                              : isCurrent
                              ? batchPhase === 'thinking' ? 'Thinking...' : 'Writing...'
                              : 'Pending'}
                          </div>
                        </div>
                        {isCurrent && (
                          <motion.div
                            className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full shrink-0"
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
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-violet-400 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Generate all outputs
              </button>
              {anyLocalGenerating && (
                <span className="text-xs text-text-muted">
                  Generating... rate limits may cause automatic retries
                </span>
              )}
            </div>
          )}

          {/* Generate chapter button when chapter not yet generated */}
          {!batchGenerating && !currentChapter && !isGenerating && (() => {
            const hasResearch = researchDossiers.some(d => d.chapterNumber === selectedChapterNum && d.sources.length > 0);
            return (
              <div className="bg-bg-card border border-violet-500/10 rounded-xl p-8 text-center mb-4">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <p className="text-text-secondary mb-1">Class {selectedChapterNum}: {syllabusChapter?.title}</p>
                {hasResearch ? (
                  <>
                    <p className="text-text-muted text-xs mb-4">This class hasn't been generated yet.</p>
                    <Button onClick={() => generateChapter(selectedChapterNum)}>
                      Generate This Class
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-amber-400/80 text-xs mb-2">No research has been conducted for this class.</p>
                    <p className="text-text-muted text-xs mb-4">Generating without research may include made-up references that don't exist.</p>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={() => navigate('/research')}>Go to Research</Button>
                      <Button variant="ghost" onClick={() => generateChapter(selectedChapterNum)}>Generate Anyway</Button>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* Tabs — only show when chapter exists or is generating */}
          {!batchGenerating && (currentChapter || isGenerating) && (
            <>
              <div className="flex gap-1 mb-4 p-1 bg-bg-card rounded-lg border border-violet-500/10 w-fit">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-sm rounded-md transition-all cursor-pointer flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'bg-violet-500 text-white'
                        : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {tab.label}
                    {tabGenerating[tab.id] ? (
                      <motion.span
                        className="w-1.5 h-1.5 rounded-full bg-violet-400"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    ) : tabErrors[tab.id] ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-error" />
                    ) : tab.ready ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    ) : null}
                  </button>
                ))}
              </div>

              {/* Per-tab error */}
              {tabErrors[activeTab] && (
                <div className="mb-4 p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm flex items-center justify-between">
                  <span>{tabErrors[activeTab]}</span>
                  <button onClick={() => clearTabError(activeTab)} className="text-xs text-error/60 hover:text-error ml-3 shrink-0 cursor-pointer">Dismiss</button>
                </div>
              )}

              {/* Content */}
              <AnimatePresence mode="wait">
                {activeTab === 'chapter' && (
                  <motion.div
                    key="chapter"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-bg-card border border-violet-500/10 rounded-xl overflow-hidden"
                  >
                    {isGenerating && !chapterHtml ? (
                      <div className="p-6">
                        {thinkingText && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex gap-1">
                                {[0, 1, 2].map(i => (
                                  <motion.div
                                    key={i}
                                    className="w-1.5 h-1.5 rounded-full bg-violet-500"
                                    animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                                    transition={{ duration: 0.8, delay: i * 0.12, repeat: Infinity }}
                                  />
                                ))}
                              </div>
                              <span className="text-violet-400 text-xs font-medium">Thinking...</span>
                            </div>
                            <div className="relative max-h-24 overflow-hidden">
                              <pre className="text-xs text-text-muted/50 whitespace-pre-wrap font-mono leading-relaxed">
                                {thinkingText.slice(-400)}
                              </pre>
                              <div className="absolute inset-0 bg-gradient-to-b from-bg-card via-transparent to-bg-card pointer-events-none" />
                            </div>
                          </div>
                        )}
                        {streamingText && (
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-3 h-3 rounded-full bg-violet-500 animate-pulse" />
                            <span className="text-text-secondary text-sm">Writing Class {selectedChapterNum}... ({Math.round(streamingText.split(/\s+/).length).toLocaleString()} words so far)</span>
                          </div>
                        )}
                        {!streamingText && !thinkingText && (
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-violet-500 animate-pulse" />
                            <span className="text-text-secondary text-sm">Generating Class {selectedChapterNum}...</span>
                          </div>
                        )}
                      </div>
                    ) : chapterHtml ? (
                      <>
                        <div className="flex items-center justify-between px-5 py-3 border-b border-violet-500/10">
                          <p className="text-xs text-text-muted">Class {selectedChapterNum} reading</p>
                          <Button
                            size="sm"
                            onClick={() => downloadFile(chapterHtml, `chapter-${selectedChapterNum}-${slugify(syllabusChapter?.title || 'chapter')}.html`)}
                          >
                            <svg className="mr-1.5 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download .html
                          </Button>
                        </div>
                        <iframe
                          srcDoc={chapterHtml}
                          className="w-full border-0"
                          style={{ height: '80vh' }}
                          title={`Class ${selectedChapterNum} Reading`}
                          sandbox="allow-scripts allow-same-origin"
                        />
                        {/* Refine chapter section */}
                        {!isGenerating && (
                          <div className="border-t border-violet-500/10 p-5">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <textarea
                                  value={refineFeedback}
                                  onChange={(e) => setRefineFeedback(e.target.value)}
                                  placeholder="Describe what you'd like changed (e.g., 'Expand the section on X', 'Simplify the introduction', 'Add more examples for Y')..."
                                  className="w-full bg-bg-elevated border border-violet-500/10 rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none focus:border-violet-500/30 transition-colors"
                                  rows={2}
                                />
                              </div>
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={!refineFeedback.trim()}
                                onClick={() => setShowRefineConfirm(true)}
                              >
                                Refine
                              </Button>
                            </div>

                            <AnimatePresence>
                              {showRefineConfirm && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20"
                                >
                                  <p className="text-sm text-amber-400 font-medium mb-2">This will clear all dependent content:</p>
                                  <ul className="text-xs text-text-muted space-y-1 mb-3">
                                    {quizHtml && <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-amber-400" />Practice Quiz</li>}
                                    {inClassQuizData.length > 0 && <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-amber-400" />In-Class Quiz</li>}
                                    {discussions.length > 0 && <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-amber-400" />Discussion Prompts</li>}
                                    {activities.length > 0 && <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-amber-400" />Activities</li>}
                                    {audioTranscript && <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-amber-400" />Audiobook</li>}
                                    {slidesData.length > 0 && <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-amber-400" />Slides</li>}
                                    {!quizHtml && inClassQuizData.length === 0 && discussions.length === 0 && activities.length === 0 && !audioTranscript && slidesData.length === 0 && (
                                      <li className="text-text-muted italic">No dependent content to clear</li>
                                    )}
                                  </ul>
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => refineChapter(refineFeedback)}>
                                      Refine Reading
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setShowRefineConfirm(false)}>
                                      Cancel
                                    </Button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </>
                    ) : null}
                  </motion.div>
                )}

                {activeTab === 'quiz' && (
                  <motion.div
                    key="quiz"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {quizHtml ? (
                      <div className="bg-bg-card border border-violet-500/10 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-violet-500/10">
                          <p className="text-xs text-text-muted">Gamified practice quiz with calibration scoring</p>
                          <Button
                            size="sm"
                            onClick={() => downloadFile(quizHtml, `quiz-${selectedChapterNum}-${slugify(syllabusChapter?.title || 'chapter')}.html`)}
                          >
                            <svg className="mr-1.5 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download .html
                          </Button>
                        </div>
                        <iframe
                          srcDoc={quizHtml}
                          className="w-full border-0"
                          style={{ height: '80vh' }}
                          title="Practice Quiz Preview"
                          sandbox="allow-scripts allow-same-origin"
                        />
                      </div>
                    ) : (
                      <div className="bg-bg-card border border-violet-500/10 rounded-xl p-8 text-center">
                        {generatingQuiz ? (
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => (
                                <motion.div
                                  key={i}
                                  className="w-2 h-2 rounded-full bg-violet-500"
                                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                                  transition={{ duration: 0.8, delay: i * 0.12, repeat: Infinity }}
                                />
                              ))}
                            </div>
                            <span className="text-text-secondary text-sm">Generating gamified practice quiz with extended thinking...</span>
                            <p className="text-xs text-text-muted mt-1">This uses maximum thinking for psychometric quality. May take a minute.</p>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-violet-500/10 flex items-center justify-center">
                              <svg className="w-6 h-6 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 11l3 3L22 4" />
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                              </svg>
                            </div>
                            <p className="text-text-secondary mb-1">Gamified Practice Quiz</p>
                            <p className="text-text-muted text-xs mb-4">12 questions with calibration scoring, achievements, and confetti</p>
                            <Button onClick={generateQuiz} disabled={!currentChapter || generatingQuiz}>
                              Generate Practice Quiz
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'inclassquiz' && (
                  <motion.div
                    key="inclassquiz"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {inClassQuizData.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-text-muted">
                            {inClassQuizData.length} questions — 5 shuffled versions (A-E) + answer key
                          </p>
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                const { generateQuizDocPackage } = await import('../services/export/quizDocExporter');
                                const blob = await generateQuizDocPackage(
                                  inClassQuizData,
                                  syllabus!.courseTitle,
                                  syllabusChapter!.title,
                                );
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `quiz-${syllabusChapter!.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.zip`;
                                a.click();
                                URL.revokeObjectURL(url);
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'Quiz export failed');
                              }
                            }}
                          >
                            <svg className="mr-1.5 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download Quiz Pack (.zip)
                          </Button>
                        </div>
                        {inClassQuizData.map((q, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-bg-card border border-violet-500/10 rounded-xl p-5"
                          >
                            <div className="flex items-start gap-3 mb-3">
                              <span className="shrink-0 w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center text-xs font-bold text-violet-400">
                                {i + 1}
                              </span>
                              <p className="text-sm font-medium leading-relaxed">{q.question}</p>
                            </div>
                            <div className="ml-10 space-y-1.5">
                              <div className="flex items-start gap-2 text-sm">
                                <span className="text-success text-xs font-medium mt-0.5 shrink-0">a)</span>
                                <span className="text-success">{q.correctAnswer}</span>
                              </div>
                              {q.distractors.map((d, j) => (
                                <div key={j} className="flex items-start gap-2 text-sm">
                                  <span className="text-text-muted text-xs font-medium mt-0.5 shrink-0">{String.fromCharCode(98 + j)})</span>
                                  <span className="text-text-secondary">{d.text}</span>
                                </div>
                              ))}
                            </div>
                            <div className="ml-10 mt-3 pt-3 border-t border-violet-500/5">
                              <p className="text-xs text-success/80 mb-1.5">
                                <span className="font-medium">Correct:</span> {q.correctFeedback}
                              </p>
                              {q.distractors.map((d, j) => (
                                <p key={j} className="text-xs text-text-muted mb-1">
                                  <span className="font-medium text-error/60">"{d.text}":</span> {d.feedback}
                                </p>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-bg-card border border-violet-500/10 rounded-xl p-8 text-center">
                        {generatingInClassQuiz ? (
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => (
                                <motion.div
                                  key={i}
                                  className="w-2 h-2 rounded-full bg-violet-500"
                                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                                  transition={{ duration: 0.8, delay: i * 0.12, repeat: Infinity }}
                                />
                              ))}
                            </div>
                            <span className="text-text-secondary text-sm">Generating in-class quiz with extended thinking...</span>
                            <p className="text-xs text-text-muted mt-1">10 rigorous questions with detailed feedback. May take a minute.</p>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-violet-500/10 flex items-center justify-center">
                              <svg className="w-6 h-6 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                              </svg>
                            </div>
                            <p className="text-text-secondary mb-1">In-Class Quiz</p>
                            <p className="text-text-muted text-xs mb-4">10 questions exported as 5 shuffled Word doc versions (A-E) + answer key</p>
                            <Button onClick={generateInClassQuiz} disabled={!currentChapter || generatingInClassQuiz}>
                              Generate In-Class Quiz
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'discussion' && (
                  <motion.div
                    key="discussion"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {discussions.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-text-muted">Display these on a slide as students arrive. Designed to spark conversation, not test knowledge.</p>
                          <button
                            onClick={() => copyToClipboard(formatDiscussionsText(), 'discussions')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors cursor-pointer shrink-0"
                          >
                            {copiedLabel === 'discussions' ? (
                              <>
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                                Copied!
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                                Copy All
                              </>
                            )}
                          </button>
                        </div>
                        {discussions.map((d, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="bg-bg-card border border-violet-500/10 rounded-xl p-6"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <span className="text-xs px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-400 font-medium inline-block mb-3">
                                  {d.hook}
                                </span>
                                <p className="text-base text-text-primary leading-relaxed">{d.prompt}</p>
                              </div>
                              <button
                                onClick={() => copyToClipboard(d.prompt, `discussion-${i}`)}
                                className="shrink-0 p-1.5 rounded-md text-text-muted hover:text-violet-400 hover:bg-violet-500/10 transition-colors cursor-pointer"
                                title="Copy prompt"
                              >
                                {copiedLabel === `discussion-${i}` ? (
                                  <svg className="w-4 h-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                                ) : (
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-bg-card border border-violet-500/10 rounded-xl p-8 text-center">
                        {generatingDiscussion ? (
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => (
                                <motion.div
                                  key={i}
                                  className="w-2 h-2 rounded-full bg-violet-500"
                                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                                  transition={{ duration: 0.8, delay: i * 0.12, repeat: Infinity }}
                                />
                              ))}
                            </div>
                            <span className="text-text-secondary text-sm">Generating conversation starters...</span>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-violet-500/10 flex items-center justify-center">
                              <svg className="w-6 h-6 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                              </svg>
                            </div>
                            <p className="text-text-secondary mb-1">Conversation Starters</p>
                            <p className="text-text-muted text-xs mb-4">5-6 provocative prompts to display on a slide as students arrive</p>
                            <Button onClick={generateDiscussion} disabled={!currentChapter || generatingDiscussion}>
                              Generate Conversation Starters
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'activities' && (
                  <motion.div
                    key="activities"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {activities.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => copyToClipboard(formatActivitiesText(), 'activities')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors cursor-pointer"
                          >
                            {copiedLabel === 'activities' ? (
                              <>
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                                Copied!
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                                Copy All
                              </>
                            )}
                          </button>
                        </div>
                        {activities.map((a, i) => {
                          const detail = expandedActivities[i];
                          const isExpanding = expandingActivity === i;
                          const isExpanded = !!detail;

                          return (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.08 }}
                              className="bg-bg-card border border-violet-500/10 rounded-xl overflow-hidden"
                            >
                              <div className="p-5">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <h3 className="text-base font-semibold">{a.title}</h3>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      onClick={() => {
                                        const d = expandedActivities[i];
                                        let text = `${a.title}  (${a.duration})\n\n${a.description}\n\nMaterials: ${a.materials}\nLearning Goal: ${a.learningGoal}\nScaling: ${a.scalingNotes}`;
                                        if (d) {
                                          text += '\n\nStep-by-Step Guide:\n' + d.steps.map(s => `  [${s.timing}] ${s.instruction}${s.studentAction ? `\n    → Students: ${s.studentAction}` : ''}`).join('\n');
                                          if (d.facilitationTips.length) text += '\n\nFacilitation Tips:\n' + d.facilitationTips.map(t => `  • ${t}`).join('\n');
                                          if (d.commonPitfalls.length) text += '\n\nCommon Pitfalls:\n' + d.commonPitfalls.map(p => `  • ${p}`).join('\n');
                                          text += `\n\nDebrief Guide:\n  ${d.debriefGuide}`;
                                          if (d.variations.length) text += '\n\nVariations:\n' + d.variations.map(v => `  • ${v}`).join('\n');
                                          if (d.assessmentIdeas) text += `\n\nAssessment Ideas:\n  ${d.assessmentIdeas}`;
                                        }
                                        copyToClipboard(text, `activity-${i}`);
                                      }}
                                      className="p-1.5 rounded-md text-text-muted hover:text-violet-400 hover:bg-violet-500/10 transition-colors cursor-pointer"
                                      title="Copy activity"
                                    >
                                      {copiedLabel === `activity-${i}` ? (
                                        <svg className="w-3.5 h-3.5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                                      ) : (
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                        </svg>
                                      )}
                                    </button>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                                      {a.duration}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-sm text-text-secondary mb-3 leading-relaxed">{a.description}</p>
                                <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                                  <div>
                                    <span className="text-text-muted font-medium block mb-0.5">Materials</span>
                                    <span className="text-text-secondary">{a.materials}</span>
                                  </div>
                                  <div>
                                    <span className="text-text-muted font-medium block mb-0.5">Learning Goal</span>
                                    <span className="text-text-secondary">{a.learningGoal}</span>
                                  </div>
                                  <div>
                                    <span className="text-text-muted font-medium block mb-0.5">Scaling</span>
                                    <span className="text-text-secondary">{a.scalingNotes}</span>
                                  </div>
                                </div>

                                {!isExpanded && !isExpanding && (
                                  <button
                                    onClick={() => fleshOutActivity(i)}
                                    disabled={expandingActivity !== null}
                                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-default"
                                  >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <circle cx="12" cy="12" r="10" />
                                      <line x1="12" y1="8" x2="12" y2="16" />
                                      <line x1="8" y1="12" x2="16" y2="12" />
                                    </svg>
                                    Expand to full guide
                                  </button>
                                )}
                                {isExpanding && (
                                  <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                      {[0, 1, 2].map(j => (
                                        <motion.div
                                          key={j}
                                          className="w-1.5 h-1.5 rounded-full bg-violet-500"
                                          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                                          transition={{ duration: 0.8, delay: j * 0.12, repeat: Infinity }}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-xs text-violet-400">Expanding guide...</span>
                                  </div>
                                )}
                                {isExpanded && (
                                  <button
                                    onClick={() => setExpandedActivities(prev => { const next = { ...prev }; delete next[i]; return next; })}
                                    className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <circle cx="12" cy="12" r="10" />
                                      <line x1="8" y1="12" x2="16" y2="12" />
                                    </svg>
                                    Collapse
                                  </button>
                                )}
                              </div>

                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="border-t border-violet-500/10"
                                  >
                                    <div className="p-5 space-y-5 bg-violet-500/[0.02]">
                                      <div>
                                        <h4 className="text-sm font-semibold text-violet-400 mb-3 flex items-center gap-2">
                                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                          </svg>
                                          Step-by-Step Guide
                                        </h4>
                                        <div className="space-y-3">
                                          {detail.steps.map((s) => (
                                            <div key={s.step} className="flex gap-3">
                                              <div className="shrink-0 w-16 text-xs text-amber-400 font-mono pt-0.5">{s.timing}</div>
                                              <div className="flex-1 border-l-2 border-violet-500/20 pl-3">
                                                <p className="text-sm text-text-primary">{s.instruction}</p>
                                                {s.studentAction && (
                                                  <p className="text-xs text-text-muted mt-1 italic">Students: {s.studentAction}</p>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-bg-card rounded-lg p-4 border border-violet-500/10">
                                          <h4 className="text-xs font-semibold text-success mb-2">Facilitation Tips</h4>
                                          <ul className="space-y-1.5">
                                            {detail.facilitationTips.map((tip, j) => (
                                              <li key={j} className="text-xs text-text-secondary flex items-start gap-2">
                                                <span className="w-1 h-1 rounded-full bg-success shrink-0 mt-1.5" />
                                                {tip}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                        <div className="bg-bg-card rounded-lg p-4 border border-violet-500/10">
                                          <h4 className="text-xs font-semibold text-amber-400 mb-2">Common Pitfalls</h4>
                                          <ul className="space-y-1.5">
                                            {detail.commonPitfalls.map((pitfall, j) => (
                                              <li key={j} className="text-xs text-text-secondary flex items-start gap-2">
                                                <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                                                {pitfall}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      </div>

                                      <div className="bg-bg-card rounded-lg p-4 border border-violet-500/10">
                                        <h4 className="text-xs font-semibold text-violet-400 mb-2">Debrief Guide</h4>
                                        <p className="text-xs text-text-secondary leading-relaxed">{detail.debriefGuide}</p>
                                      </div>

                                      {detail.variations.length > 0 && (
                                        <div>
                                          <h4 className="text-xs font-semibold text-text-muted mb-2">Variations</h4>
                                          <ul className="space-y-1.5">
                                            {detail.variations.map((v, j) => (
                                              <li key={j} className="text-xs text-text-secondary flex items-start gap-2">
                                                <span className="w-1 h-1 rounded-full bg-violet-500/50 shrink-0 mt-1.5" />
                                                {v}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {detail.assessmentIdeas && (
                                        <div className="bg-bg-card rounded-lg p-4 border border-violet-500/10">
                                          <h4 className="text-xs font-semibold text-text-muted mb-2">Assessment Ideas</h4>
                                          <p className="text-xs text-text-secondary leading-relaxed">{detail.assessmentIdeas}</p>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-bg-card border border-violet-500/10 rounded-xl p-8 text-center">
                        {generatingActivities ? (
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => (
                                <motion.div
                                  key={i}
                                  className="w-2 h-2 rounded-full bg-violet-500"
                                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                                  transition={{ duration: 0.8, delay: i * 0.12, repeat: Infinity }}
                                />
                              ))}
                            </div>
                            <span className="text-text-secondary text-sm">Generating activity suggestions...</span>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-violet-500/10 flex items-center justify-center">
                              <svg className="w-6 h-6 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polygon points="10 8 16 12 10 16 10 8" />
                              </svg>
                            </div>
                            <p className="text-text-secondary mb-1">In-Class Activities</p>
                            <p className="text-text-muted text-xs mb-4">4-6 dynamic activities with timing and scaling notes</p>
                            <Button onClick={generateActivities} disabled={!currentChapter || generatingActivities}>
                              Generate Activities
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'audio' && (
                  <motion.div
                    key="audio"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {audioTranscript ? (
                      <div className="space-y-4">
                        {audioUrl && (
                          <div className="bg-bg-card border border-violet-500/10 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                                <svg className="w-5 h-5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">Class Audiobook</p>
                                <p className="text-xs text-text-muted">Generated with ElevenLabs v3</p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => {
                                  const a = document.createElement('a');
                                  a.href = audioUrl;
                                  a.download = `audio-${selectedChapterNum}-${slugify(syllabusChapter?.title || 'chapter')}.mp3`;
                                  a.click();
                                }}
                              >
                                <svg className="mr-1.5 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Download .mp3
                              </Button>
                            </div>
                            <audio controls className="w-full" src={audioUrl}>
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        )}
                        {!audioUrl && elevenLabsApiKey && audioError && (
                          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                            <p className="text-amber-400 text-sm mb-1">
                              Audio synthesis failed: {audioError}
                            </p>
                            <Button size="sm" variant="secondary" className="mt-2" onClick={retryAudio} disabled={generatingAudio}>
                              Retry Audio
                            </Button>
                          </div>
                        )}
                        {!audioUrl && elevenLabsApiKey && !audioError && (
                          <div className="bg-bg-card border border-violet-500/10 rounded-xl p-4 text-center">
                            {generatingAudio ? (
                              <div className="flex flex-col items-center gap-3">
                                <div className="flex gap-1">
                                  {[0, 1, 2].map(i => (
                                    <motion.div
                                      key={i}
                                      className="w-2 h-2 rounded-full bg-violet-500"
                                      animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                                      transition={{ duration: 0.8, delay: i * 0.12, repeat: Infinity }}
                                    />
                                  ))}
                                </div>
                                <span className="text-text-secondary text-sm">
                                  {audioChunkProgress
                                    ? `Synthesizing audio: chunk ${audioChunkProgress.current} of ${audioChunkProgress.total}...`
                                    : 'Synthesizing audio...'}
                                </span>
                                {audioChunkProgress && (
                                  <div className="w-48">
                                    <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-violet-500 rounded-full transition-all duration-500"
                                        style={{ width: `${(audioChunkProgress.current / audioChunkProgress.total) * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <>
                                <p className="text-text-secondary text-sm mb-1">Transcript ready — click below to generate audio.</p>
                                <Button size="sm" variant="secondary" className="mt-2" onClick={retryAudio} disabled={generatingAudio}>
                                  Generate Audio
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                        {!audioUrl && !elevenLabsApiKey && (
                          <div className="bg-bg-card border border-violet-500/10 rounded-xl p-4 text-center">
                            <p className="text-text-secondary text-sm">Transcript ready — add an ElevenLabs API key in Setup to generate audio.</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-bg-card border border-violet-500/10 rounded-xl p-8 text-center">
                        {generatingAudio ? (
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => (
                                <motion.div
                                  key={i}
                                  className="w-2 h-2 rounded-full bg-violet-500"
                                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                                  transition={{ duration: 0.8, delay: i * 0.12, repeat: Infinity }}
                                />
                              ))}
                            </div>
                            <span className="text-text-secondary text-sm">
                              {audioPhase === 'transcript'
                                ? 'Adapting chapter for spoken delivery...'
                                : audioChunkProgress
                                ? `Synthesizing audio: chunk ${audioChunkProgress.current} of ${audioChunkProgress.total}...`
                                : 'Preparing audio synthesis...'}
                            </span>
                            {audioPhase === 'synthesizing' && audioChunkProgress && (
                              <div className="w-48 mt-2">
                                <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-violet-500 rounded-full transition-all duration-500"
                                    style={{ width: `${(audioChunkProgress.current / audioChunkProgress.total) * 100}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-violet-500/10 flex items-center justify-center">
                              <svg className="w-6 h-6 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                              </svg>
                            </div>
                            <p className="text-text-secondary mb-1">Class Audiobook</p>
                            <p className="text-text-muted text-xs mb-4">
                              {elevenLabsApiKey
                                ? 'AI-adapted transcript + ElevenLabs v3 audio synthesis'
                                : 'Generate a spoken-word transcript (add ElevenLabs key in Setup for audio)'}
                            </p>
                            <Button onClick={generateAudio} disabled={!currentChapter || generatingAudio}>
                              Generate Audiobook
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'slides' && (
                  <motion.div
                    key="slides"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {slidesData.length > 0 ? (
                      <div className="space-y-4">
                        <div className="bg-bg-card border border-violet-500/20 rounded-xl p-6 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                              <svg className="w-6 h-6 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{slidesData.length} slides with speaker notes</p>
                              <p className="text-xs text-text-muted mt-0.5">Dark-themed PowerPoint deck, ready to teach</p>
                            </div>
                          </div>
                          <Button
                            onClick={async () => {
                              try {
                                const { generatePptx } = await import('../services/export/pptxExporter');
                                const blob = await generatePptx(slidesData, syllabus!.courseTitle, syllabusChapter!.title, setup.themeId);
                                downloadFile(blob, `slides-${selectedChapterNum}-${slugify(syllabusChapter?.title || 'chapter')}.pptx`);
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'Slides export failed');
                              }
                            }}
                          >
                            <svg className="mr-1.5 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download .pptx
                          </Button>
                        </div>

                        <div>
                          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Speaker Notes</h3>
                          <div className="space-y-1">
                            {slidesData.map((slide, i) => {
                              const isExpanded = expandedSlideNotes.has(i);
                              const hasNotes = !!slide.speakerNotes;
                              return (
                                <div key={i} className="border border-violet-500/10 rounded-lg overflow-hidden">
                                  <button
                                    onClick={() => {
                                      if (!hasNotes) return;
                                      setExpandedSlideNotes(prev => {
                                        const next = new Set(prev);
                                        if (next.has(i)) next.delete(i);
                                        else next.add(i);
                                        return next;
                                      });
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left bg-transparent border-0 transition-colors ${
                                      hasNotes ? 'cursor-pointer hover:bg-violet-500/5' : 'cursor-default opacity-60'
                                    }`}
                                  >
                                    <span className="text-xs text-text-muted font-mono w-5 shrink-0 text-right">{i + 1}</span>
                                    <span className="text-sm text-text-primary truncate flex-1">{slide.title}</span>
                                    {slide.layout && slide.layout !== 'content' && (
                                      <span className="text-[10px] text-text-muted uppercase tracking-wider shrink-0">{slide.layout}</span>
                                    )}
                                    {hasNotes && (
                                      <svg
                                        className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                      >
                                        <polyline points="6 9 12 15 18 9" />
                                      </svg>
                                    )}
                                  </button>
                                  <AnimatePresence>
                                    {isExpanded && hasNotes && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="px-4 pb-4 pl-12">
                                          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">{slide.speakerNotes}</p>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-bg-card border border-violet-500/10 rounded-xl p-8 text-center">
                        {generatingSlides ? (
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => (
                                <motion.div
                                  key={i}
                                  className="w-2 h-2 rounded-full bg-violet-500"
                                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                                  transition={{ duration: 0.8, delay: i * 0.12, repeat: Infinity }}
                                />
                              ))}
                            </div>
                            <span className="text-text-secondary text-sm">Generating lecture slides with speaker notes...</span>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-violet-500/10 flex items-center justify-center">
                              <svg className="w-6 h-6 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                              </svg>
                            </div>
                            <p className="text-text-secondary mb-1">Lecture Slides</p>
                            <p className="text-text-muted text-xs mb-4">8-12 themed PowerPoint slides with speaker notes</p>
                            <Button onClick={generateSlides} disabled={!currentChapter || generatingSlides}>
                              Generate Slides
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'infographic' && (
                  <motion.div
                    key="infographic"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="space-y-4"
                  >
                    {infographicDataUri ? (
                      <div className="space-y-4">
                        <div className="bg-bg-card border border-violet-500/10 rounded-xl overflow-hidden">
                          <img
                            src={infographicDataUri}
                            alt={`Infographic for ${syllabusChapter?.title || 'class'}`}
                            className="w-full h-auto"
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = infographicDataUri;
                              a.download = `infographic-${selectedChapterNum}-${slugify(syllabusChapter?.title || 'class')}.jpg`;
                              a.click();
                            }}
                          >
                            <svg className="mr-1.5 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download .jpg
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={generateInfographic}
                            disabled={generatingInfographic}
                          >
                            Regenerate
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-bg-card border border-violet-500/10 rounded-xl p-8 text-center">
                        {generatingInfographic ? (
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => (
                                <motion.div
                                  key={i}
                                  className="w-2 h-2 rounded-full bg-violet-500"
                                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                                  transition={{ duration: 0.8, delay: i * 0.12, repeat: Infinity }}
                                />
                              ))}
                            </div>
                            <span className="text-text-secondary text-sm">Generating infographic with Gemini...</span>
                            <span className="text-text-muted text-xs">Claude writes the prompt, then Gemini creates the image</span>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-violet-500/10 flex items-center justify-center">
                              <svg className="w-6 h-6 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                              </svg>
                            </div>
                            <p className="text-text-secondary mb-1">Educational Infographic</p>
                            <p className="text-text-muted text-xs mb-4">AI-generated visual summary of key concepts</p>
                            <Button onClick={generateInfographic} disabled={!currentChapter || generatingInfographic}>
                              Generate Infographic
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
