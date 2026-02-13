import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCourseStore } from '../store/courseStore';
import { useApiStore } from '../store/apiStore';
import { useUiStore } from '../store/uiStore';
import { streamMessage } from '../services/claude/streaming';
import { MODELS } from '../services/claude/client';
import { buildSyllabusPrompt, parseSyllabusResponse, parsePartialChapters } from '../prompts/syllabus';
import { Button } from '../components/shared/Button';
import { SyllabusTimeline } from '../components/syllabus/SyllabusTimeline';
import { ScienceOverlay } from '../components/syllabus/ScienceOverlay';
import { CurriculumMapPanel } from '../components/syllabus/CurriculumMapPanel';
import { InlineFeedback } from '../components/syllabus/InlineFeedback';
import type { ChapterSyllabus } from '../types/course';

export function SyllabusPage() {
  const navigate = useNavigate();
  const { setup, syllabus, setSyllabus, syllabusConversation, addSyllabusMessage, setStage, completeStage } = useCourseStore();
  const { claudeApiKey } = useApiStore();
  const { isGenerating, setIsGenerating, showScienceOverlay, toggleScienceOverlay, error, setError } = useUiStore();
  const [isRefining, setIsRefining] = useState(false);
  const [showCurriculumMap, setShowCurriculumMap] = useState(false);
  const [showFullOverview, setShowFullOverview] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const [partialChapters, setPartialChapters] = useState<ChapterSyllabus[]>([]);
  const [partialTitle, setPartialTitle] = useState('');
  const [partialOverview, setPartialOverview] = useState('');
  const fullTextRef = useRef('');
  const generationStarted = useRef(false);

  const generateSyllabus = useCallback(async (feedbackText?: string) => {
    setIsGenerating(true);
    setIsThinking(true);
    setThinkingText('');
    setPartialChapters([]);
    setPartialTitle('');
    setPartialOverview('');
    setError(null);
    fullTextRef.current = '';

    try {
      const { systemPrompt, userMessage } = buildSyllabusPrompt(setup, feedbackText, syllabusConversation);

      if (feedbackText) {
        addSyllabusMessage('user', feedbackText);
      }

      const messages = feedbackText && syllabusConversation.length > 0
        ? [
            ...syllabusConversation.map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
            { role: 'user' as const, content: userMessage },
          ]
        : [{ role: 'user' as const, content: userMessage }];

      const fullText = await streamMessage(
        {
          apiKey: claudeApiKey,
          model: MODELS.opus,
          system: systemPrompt,
          messages,
          thinkingBudget: feedbackText ? 'high' : 'max',
          maxTokens: 16000,
        },
        {
          onText: (text) => {
            setIsThinking(false);
            fullTextRef.current += text;

            // Try progressive parsing
            const partial = parsePartialChapters(fullTextRef.current);
            if (partial.title) setPartialTitle(partial.title);
            if (partial.overview) setPartialOverview(partial.overview);
            if (partial.chapters.length > partialChapters.length) {
              setPartialChapters(partial.chapters);
            }
          },
          onThinking: (text) => {
            setThinkingText(prev => prev + text);
          },
          onError: (err) => setError(err.message),
        }
      );

      addSyllabusMessage('assistant', fullText);
      const parsed = parseSyllabusResponse(fullText);
      if (parsed) {
        setSyllabus(parsed);
        setPartialChapters([]);
      } else {
        setError('Failed to parse syllabus. The model may have returned malformed JSON. Try regenerating.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
      setIsThinking(false);
    }
  }, [setup, claudeApiKey, syllabusConversation, addSyllabusMessage, setSyllabus, setIsGenerating, setError, partialChapters.length]);

  useEffect(() => {
    if (!syllabus && !isGenerating && claudeApiKey && !generationStarted.current) {
      generationStarted.current = true;
      generateSyllabus();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefine = (feedback: string) => {
    setIsRefining(true);
    generateSyllabus(feedback).finally(() => setIsRefining(false));
  };

  const handleProceed = () => {
    completeStage('syllabus');
    setStage('research');
    navigate('/research');
  };

  const displayChapters = syllabus?.chapters || partialChapters;
  const displayTitle = syllabus?.courseTitle || partialTitle;
  const displayOverview = syllabus?.courseOverview || partialOverview;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto py-8"
    >
      {/* Header */}
      <div className="mb-8">
        <AnimatePresence mode="wait">
          <motion.h1
            key={displayTitle || 'loading'}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold mb-2"
          >
            {displayTitle || (isThinking ? 'Thinking...' : 'Generating Syllabus...')}
          </motion.h1>
        </AnimatePresence>
        {displayOverview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 max-w-3xl"
          >
            <p className="text-text-secondary text-sm leading-relaxed">
              {showFullOverview
                ? displayOverview
                : displayOverview.split(/(?<=\.)\s+/).slice(0, 3).join(' ')}
              {!showFullOverview && displayOverview.split(/(?<=\.)\s+/).length > 3 && (
                <button
                  onClick={() => setShowFullOverview(true)}
                  className="ml-1 text-violet-400 hover:text-violet-300 cursor-pointer bg-transparent border-0 p-0 text-sm"
                >
                  Read more
                </button>
              )}
              {showFullOverview && displayOverview.split(/(?<=\.)\s+/).length > 3 && (
                <button
                  onClick={() => setShowFullOverview(false)}
                  className="ml-1 text-violet-400 hover:text-violet-300 cursor-pointer bg-transparent border-0 p-0 text-sm"
                >
                  Show less
                </button>
              )}
            </p>
          </motion.div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant={showScienceOverlay ? 'primary' : 'secondary'}
              size="sm"
              onClick={toggleScienceOverlay}
              disabled={displayChapters.length === 0}
            >
              <svg className="mr-1.5 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Show the Science
            </Button>
            <Button
              variant={showCurriculumMap ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setShowCurriculumMap(!showCurriculumMap)}
              disabled={displayChapters.length === 0 || isGenerating}
              title={isGenerating ? 'Wait for the syllabus to finish generating' : undefined}
            >
              <svg className="mr-1.5 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              Curriculum Map
            </Button>
          </div>
          <Button
            size="sm"
            disabled={!syllabus || isGenerating}
            onClick={handleProceed}
          >
            Continue to Research
            <svg className="ml-1.5 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-lg bg-error/10 border border-error/20 text-error text-sm"
        >
          {error}
          <button
            onClick={() => { setError(null); generateSyllabus(); }}
            className="ml-3 underline hover:no-underline cursor-pointer"
          >
            Try again
          </button>
        </motion.div>
      )}

      {/* Thinking state */}
      <AnimatePresence>
        {isThinking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-8"
          >
            <div className="bg-bg-card border border-violet-500/15 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="w-3 h-3 rounded-full bg-violet-500" />
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-violet-500 animate-ping" />
                </div>
                <span className="text-sm font-medium text-violet-400">
                  Extended thinking — designing your course architecture...
                </span>
              </div>
              {thinkingText && (
                <div className="relative">
                  <div className="text-xs text-text-muted/60 font-mono leading-relaxed max-h-32 overflow-hidden">
                    {thinkingText.slice(-500)}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-bg-card to-transparent" />
                </div>
              )}
              {!thinkingText && (
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-violet-500/40"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Streaming progress */}
      {isGenerating && !isThinking && !syllabus && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 flex items-center gap-3"
        >
          <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          <span className="text-sm text-text-secondary">
            Building syllabus... {partialChapters.length > 0 ? `${partialChapters.length} chapters so far` : 'parsing response'}
          </span>
        </motion.div>
      )}

      {/* Timeline */}
      <AnimatePresence>
        {displayChapters.length > 0 && (
          <SyllabusTimeline
            chapters={displayChapters}
            showScience={showScienceOverlay}
          />
        )}
      </AnimatePresence>

      {/* Science overlay */}
      <AnimatePresence>
        {showScienceOverlay && displayChapters.length > 0 && (
          <ScienceOverlay chapters={displayChapters} />
        )}
      </AnimatePresence>

      {/* Curriculum map */}
      <AnimatePresence>
        {showCurriculumMap && syllabus && (
          <CurriculumMapPanel />
        )}
      </AnimatePresence>

      {/* Refinement */}
      {syllabus && (
        <div className="mt-8">
          <InlineFeedback
            onSubmit={handleRefine}
            isLoading={isRefining}
          />
        </div>
      )}
    </motion.div>
  );
}
