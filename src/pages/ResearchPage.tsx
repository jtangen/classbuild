import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCourseStore } from '../store/courseStore';
import { useApiStore } from '../store/apiStore';
import { useUiStore } from '../store/uiStore';
import { streamMessage } from '../services/claude/streaming';
import type { WebSearchResult } from '../services/claude/streaming';
import { Button } from '../components/shared/Button';
import type { ResearchSource, ResearchDossier } from '../types/course';
import { validateDois } from '../utils/doiValidator';

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

const RESEARCH_SYSTEM_PROMPT = `You are a research assistant building a research dossier for a university course chapter. Your job is to find real, verifiable academic sources using web search.

PROCESS:
1. Search for key academic sources related to the chapter topic
2. Search for seminal papers, textbooks, and authoritative reviews
3. Synthesize findings into a structured dossier

After completing your research, output your dossier as JSON:
{
  "sources": [
    {
      "title": "Full paper/book title",
      "authors": "Author names",
      "year": "Publication year",
      "url": "URL if found",
      "doi": "DOI if available",
      "summary": "Brief summary of key findings relevant to the chapter",
      "relevance": "How this source supports the chapter content",
      "isVerified": true
    }
  ],
  "synthesisNotes": "How these sources collectively inform the chapter content and key pedagogical takeaways"
}

Find 5-8 high-quality sources per chapter. Prefer peer-reviewed journal articles, seminal textbooks, and authoritative reviews. Output ONLY the JSON dossier.`;

function buildResearchUserPrompt(chapterTitle: string, chapterNarrative: string, keyConcepts: string[]) {
  return `Research the following chapter topic and build a dossier of real academic sources.

**Chapter**: "${chapterTitle}"
**Description**: ${chapterNarrative}
**Key concepts**: ${keyConcepts.join(', ')}

Search for real academic sources. Find 5-8 high-quality references.`;
}

function parseResearchResponse(text: string, chapterNumber: number): ResearchDossier | null {
  try {
    let jsonStr = text;
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) jsonStr = codeBlockMatch[1];

    // Try to extract JSON object from text
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);

    const raw = JSON.parse(jsonStr);
    return {
      chapterNumber,
      sources: (raw.sources || []).map((s: Record<string, unknown>): ResearchSource => ({
        title: (s.title as string) || '',
        authors: (s.authors as string) || '',
        year: (s.year as string) || '',
        url: s.url as string | undefined,
        doi: s.doi as string | undefined,
        summary: (s.summary as string) || '',
        relevance: (s.relevance as string) || '',
        isVerified: (s.isVerified as boolean) ?? false,
      })),
      synthesisNotes: (raw.synthesisNotes as string) || '',
    };
  } catch {
    return null;
  }
}

type ResearchPhase = 'idle' | 'thinking' | 'searching' | 'compiling' | 'validating';

interface ChapterResearchState {
  phase: ResearchPhase;
  searchQueries: string[];
  webResults: WebSearchResult[];
  synthesisText: string;
  doiResults: { valid: number; invalid: number } | null;
  latestSource: WebSearchResult | null;
  error: string;
}

const emptyResearchState: ChapterResearchState = {
  phase: 'idle',
  searchQueries: [],
  webResults: [],
  synthesisText: '',
  doiResults: null,
  latestSource: null,
  error: '',
};

export function ResearchPage() {
  const navigate = useNavigate();
  const { syllabus, researchDossiers, addResearchDossier, setStage, completeStage } = useCourseStore();
  const { claudeApiKey } = useApiStore();
  const { setActiveTab } = useUiStore();
  const [currentChapter, setCurrentChapter] = useState(0);
  const [researchingSet, setResearchingSet] = useState<Set<number>>(new Set());
  const [chapterStates, setChapterStates] = useState<Record<number, ChapterResearchState>>({});
  const researchStarted = useRef(false);

  const isResearching = researchingSet.size > 0;

  const updateChapterState = useCallback((chapterNum: number, updater: (prev: ChapterResearchState) => ChapterResearchState) => {
    setChapterStates(prev => ({
      ...prev,
      [chapterNum]: updater(prev[chapterNum] || { ...emptyResearchState }),
    }));
  }, []);

  const researchChapter = useCallback(async (chapterIndex: number) => {
    if (!syllabus) return;
    const chapter = syllabus.chapters[chapterIndex];
    const chapterNum = chapter.number;

    // Don't start if already researching this chapter or already has dossier
    if (researchingSet.has(chapterNum)) return;
    if (researchDossiers.some(d => d.chapterNumber === chapterNum)) return;

    setResearchingSet(prev => new Set(prev).add(chapterNum));
    updateChapterState(chapterNum, () => ({ ...emptyResearchState, phase: 'thinking' }));

    // Track web results locally for fallback dossier
    let localWebResults: WebSearchResult[] = [];

    try {
      const fullText = await streamWithRetry(
        {
          apiKey: claudeApiKey,
          system: RESEARCH_SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: buildResearchUserPrompt(chapter.title, chapter.narrative, chapter.keyConcepts),
          }],
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          maxTokens: 16000,
        },
        {
          onThinking: () => updateChapterState(chapterNum, s => ({ ...s, phase: 'thinking' })),
          onText: (text) => updateChapterState(chapterNum, s => ({
            ...s,
            phase: 'compiling',
            synthesisText: s.synthesisText + text,
          })),
          onWebSearch: (query) => updateChapterState(chapterNum, s => ({
            ...s,
            phase: 'searching',
            searchQueries: [...s.searchQueries, query],
          })),
          onWebSearchResults: (results) => {
            updateChapterState(chapterNum, s => {
              const newResults = results.filter(
                r => !s.webResults.some(existing => existing.url === r.url)
              );
              localWebResults = [...s.webResults, ...newResults];
              return {
                ...s,
                webResults: localWebResults,
                latestSource: newResults.length > 0 ? newResults[newResults.length - 1] : s.latestSource,
              };
            });
          },
          onError: (err) => updateChapterState(chapterNum, s => ({ ...s, error: err.message })),
        }
      );

      let dossier = parseResearchResponse(fullText, chapterNum);
      if (!dossier) {
        dossier = {
          chapterNumber: chapterNum,
          sources: localWebResults.map(r => ({
            title: r.title,
            authors: '',
            year: '',
            url: r.url,
            summary: '',
            relevance: '',
            isVerified: true,
          })),
          synthesisNotes: fullText.slice(0, 500),
        };
      }

      // Validate DOIs before storing
      const doisToCheck = dossier.sources.map(s => s.doi).filter((d): d is string => !!d);
      if (doisToCheck.length > 0) {
        updateChapterState(chapterNum, s => ({ ...s, phase: 'validating' }));
        try {
          const validity = await validateDois(doisToCheck);
          let validCount = 0;
          let invalidCount = 0;
          dossier.sources = dossier.sources.map(s => {
            if (s.doi && validity.has(s.doi)) {
              if (validity.get(s.doi)) {
                validCount++;
                return s;
              } else {
                invalidCount++;
                return { ...s, doi: undefined };
              }
            }
            return s;
          });
          updateChapterState(chapterNum, s => ({ ...s, doiResults: { valid: validCount, invalid: invalidCount } }));
        } catch {
          // Validation failed — keep DOIs as-is
        }
      }

      addResearchDossier(dossier);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Research failed';
      updateChapterState(chapterNum, s => ({ ...s, error: message }));

      if (message.includes('web_search') || message.includes('tool')) {
        const fallbackDossier: ResearchDossier = {
          chapterNumber: chapterNum,
          sources: [],
          synthesisNotes: 'Web search unavailable. Chapter will be generated from model knowledge. Citations should be independently verified.',
        };
        addResearchDossier(fallbackDossier);
      }
    } finally {
      setResearchingSet(prev => {
        const next = new Set(prev);
        next.delete(chapterNum);
        return next;
      });
      updateChapterState(chapterNum, s => ({ ...s, phase: 'idle' }));
    }
  }, [syllabus, claudeApiKey, addResearchDossier, updateChapterState, researchingSet, researchDossiers]);

  // Auto-start first chapter research
  useEffect(() => {
    if (syllabus && researchDossiers.length === 0 && !isResearching && !researchStarted.current) {
      researchStarted.current = true;
      researchChapter(0);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const researchAll = useCallback(async () => {
    if (!syllabus) return;
    const tasks: Promise<void>[] = [];
    for (let i = 0; i < syllabus.chapters.length; i++) {
      const ch = syllabus.chapters[i];
      const hasDossier = researchDossiers.some(d => d.chapterNumber === ch.number);
      const isActive = researchingSet.has(ch.number);
      if (!hasDossier && !isActive) {
        tasks.push(researchChapter(i).catch(() => {}));
      }
    }
    await Promise.allSettled(tasks);
  }, [syllabus, researchDossiers, researchingSet, researchChapter]);

  const handleNext = () => {
    if (!syllabus) return;
    if (currentChapter < syllabus.chapters.length - 1) {
      const next = currentChapter + 1;
      setCurrentChapter(next);
      const hasDossier = researchDossiers.some(d => d.chapterNumber === syllabus.chapters[next].number);
      const isActive = researchingSet.has(syllabus.chapters[next].number);
      if (!hasDossier && !isActive) {
        researchChapter(next);
      }
    }
  };

  const handleProceed = () => {
    completeStage('research');
    setStage('build');
    setActiveTab('chapter');
    navigate('/build');
  };

  const handleSkip = () => {
    completeStage('research');
    setStage('build');
    setActiveTab('chapter');
    navigate('/build');
  };

  if (!syllabus) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary">No syllabus generated yet. Please go back to the syllabus stage.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/syllabus')}>
          Back to Syllabus
        </Button>
      </div>
    );
  }

  const currentChapterNum = syllabus.chapters[currentChapter]?.number;
  const currentDossier = researchDossiers.find(
    d => d.chapterNumber === currentChapterNum
  );
  const currentState = chapterStates[currentChapterNum] || emptyResearchState;
  const isCurrentResearching = researchingSet.has(currentChapterNum);

  const { phase, searchQueries, webResults, synthesisText, latestSource, doiResults, error: chapterError } = currentState;

  const phaseLabel =
    phase === 'thinking' ? 'Planning research strategy...' :
    phase === 'searching' ? `Searching academic databases... (${webResults.length} sources found)` :
    phase === 'compiling' ? 'Compiling research dossier...' :
    phase === 'validating' ? 'Verifying DOIs against doi.org...' :
    '';

  // Build the streaming window content based on phase
  let streamContent = '';
  if (phase === 'thinking') {
    streamContent = '';
  } else if (phase === 'searching') {
    const recentQueries = searchQueries.slice(-3);
    const lines: string[] = [];
    for (const q of recentQueries) {
      lines.push(`> search: ${q}`);
    }
    if (latestSource) {
      lines.push('');
      lines.push(`  ${latestSource.title}`);
      lines.push(`  ${latestSource.url}`);
    }
    streamContent = lines.join('\n');
  } else if (phase === 'compiling') {
    streamContent = synthesisText;
  }

  const unresearchedCount = syllabus.chapters.filter(ch =>
    !researchDossiers.some(d => d.chapterNumber === ch.number) && !researchingSet.has(ch.number)
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto py-8"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Research Dossiers</h1>
          <p className="text-text-secondary">
            Building research foundations with real academic sources.
          </p>
          <p className="text-xs text-text-muted mt-1">
            Research is optional — you can proceed after one class or research all {syllabus.chapters.length}. Each takes ~60 seconds.
          </p>
        </div>
        <div className="flex gap-3">
          {researchingSet.size === 0 && researchDossiers.length === 0 && (
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip Research
            </Button>
          )}
          <Button size="sm" onClick={handleProceed} disabled={researchDossiers.length === 0 && researchingSet.size > 0}>
            Continue to Build
            <svg className="ml-1.5 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Button>
        </div>
      </div>

      {chapterError && (
        <div className="mb-6 p-4 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
          {chapterError}
          {chapterError.includes('web_search') && (
            <p className="mt-2 text-text-muted">Falling back to AI-generated research. Sources should be independently verified.</p>
          )}
        </div>
      )}

      {/* Chapter selector */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs text-text-muted">
          {researchDossiers.length} of {syllabus.chapters.length} classes researched
        </span>
        {unresearchedCount > 0 && !isResearching && (
          <span className="text-xs text-violet-400">— click a class tab to research it</span>
        )}
        {unresearchedCount > 1 && (
          <button
            onClick={researchAll}
            className="text-xs text-text-muted hover:text-violet-400 transition cursor-pointer bg-transparent border-0 underline underline-offset-2"
          >
            Research all remaining
          </button>
        )}
      </div>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {syllabus.chapters.map((ch, i) => {
          const hasDossier = researchDossiers.some(d => d.chapterNumber === ch.number);
          const isActive = researchingSet.has(ch.number);
          return (
            <button
              key={ch.number}
              onClick={() => {
                setCurrentChapter(i);
                if (!hasDossier && !isActive) researchChapter(i);
              }}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg shrink-0 transition-all cursor-pointer ${
                i === currentChapter
                  ? 'bg-violet-500 text-white'
                  : hasDossier
                  ? 'bg-violet-500/15 text-violet-400'
                  : 'bg-bg-elevated text-text-muted hover:text-text-secondary'
              }`}
            >
              {isActive && (
                <motion.span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${i === currentChapter ? 'bg-white' : 'bg-violet-500'}`}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              )}
              {hasDossier && !isActive && (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${i === currentChapter ? 'bg-white' : 'bg-emerald-400'}`} />
              )}
              Class {ch.number}
            </button>
          );
        })}
      </div>

      {/* Current chapter research */}
      <div className="bg-bg-card border border-violet-500/10 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-1">
          Class {syllabus.chapters[currentChapter].number}: {syllabus.chapters[currentChapter].title}
        </h2>
        <p className="text-sm text-text-muted mb-6">
          {syllabus.chapters[currentChapter].narrative.slice(0, 200)}...
        </p>

        {/* Streaming preview window — visible during all active phases */}
        <AnimatePresence>
          {isCurrentResearching && !currentDossier && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="mb-6 overflow-hidden"
            >
              <div className="bg-bg-elevated/50 border border-violet-500/15 rounded-xl p-5">
                {/* Phase indicator */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                      <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-violet-500 animate-ping" />
                    </div>
                    <span className="text-sm font-medium text-violet-400">
                      {phaseLabel}
                    </span>
                  </div>
                  {phase === 'searching' && webResults.length > 0 && (
                    <span className="text-xs text-text-muted tabular-nums">
                      {webResults.length} sources
                    </span>
                  )}
                </div>

                {/* Stream content window */}
                {(streamContent || phase === 'thinking') && (
                  <div className="relative">
                    <div className="text-xs text-text-muted/60 font-mono leading-relaxed max-h-32 overflow-hidden whitespace-pre-wrap">
                      {phase === 'thinking' ? '' : streamContent.slice(-600)}
                    </div>
                    {streamContent && (
                      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-bg-elevated/50 to-transparent" />
                    )}
                  </div>
                )}

                {/* Search queries ticker */}
                {phase === 'searching' && searchQueries.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-violet-500/10">
                    <div className="flex items-center gap-2.5 text-sm">
                      <svg className="w-3.5 h-3.5 text-violet-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <span className="text-violet-400 text-xs truncate">
                        {searchQueries[searchQueries.length - 1]}
                      </span>
                    </div>
                    {searchQueries.length > 1 && (
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                        {searchQueries.slice(0, -1).map((q, i) => (
                          <span key={i} className="text-[11px] text-text-muted/50 truncate max-w-[250px]">
                            {q}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DOI validation status — shown briefly after streaming window collapses */}
        <AnimatePresence>
          {phase === 'validating' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-4 flex items-center gap-2.5 p-3 rounded-lg bg-violet-500/5 border border-violet-500/10"
            >
              <motion.div
                className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full shrink-0"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <span className="text-xs text-violet-400">Verifying DOIs against doi.org...</span>
            </motion.div>
          )}
        </AnimatePresence>
        {doiResults && phase !== 'validating' && currentDossier && (
          <div className="mb-4 p-3 rounded-lg bg-bg-card border border-violet-500/10 text-xs text-text-muted">
            DOI verification: {doiResults.valid} valid{doiResults.invalid > 0 && (
              <>, <span className="text-amber-400">{doiResults.invalid} invalid (removed)</span></>
            )}
          </div>
        )}

        {/* Completed dossier — clean source cards */}
        <AnimatePresence>
          {currentDossier && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="space-y-3">
                {currentDossier.sources.map((source, i) => (
                  <motion.div
                    key={source.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-bg-elevated rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-text-primary">{source.title}</h4>
                        {source.authors && (
                          <p className="text-xs text-text-muted mt-0.5">
                            {source.authors} ({source.year})
                          </p>
                        )}
                        {source.summary && (
                          <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">{source.summary}</p>
                        )}
                        {source.relevance && (
                          <p className="text-xs text-violet-400/70 mt-1 italic">{source.relevance}</p>
                        )}
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 text-xs rounded-full ${
                        source.isVerified
                          ? 'bg-success/10 text-success'
                          : 'bg-warning/10 text-warning'
                      }`}>
                        {source.isVerified ? 'Verified' : 'Verify'}
                      </span>
                    </div>
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-violet-400 hover:underline mt-2 block truncate"
                      >
                        {source.url}
                      </a>
                    )}
                    {source.doi && (
                      <p className="text-xs text-text-muted mt-0.5">DOI: {source.doi}</p>
                    )}
                  </motion.div>
                ))}
              </div>

              {currentDossier.synthesisNotes && (
                <div className="mt-6 pt-4 border-t border-violet-500/10">
                  <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                    Synthesis
                  </h4>
                  <p className="text-sm text-text-secondary leading-relaxed">{currentDossier.synthesisNotes}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state when no research yet and not researching */}
        {!isCurrentResearching && !currentDossier && webResults.length === 0 && (
          <div className="text-center py-8">
            <p className="text-text-muted mb-4">No research yet for this class.</p>
            <Button size="sm" onClick={() => researchChapter(currentChapter)}>
              Start Research
            </Button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-violet-500/10">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentChapter === 0}
            onClick={() => setCurrentChapter(prev => prev - 1)}
          >
            Previous Class
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={currentChapter >= syllabus.chapters.length - 1}
            onClick={handleNext}
          >
            Research Next Class
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
