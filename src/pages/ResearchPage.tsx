import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourseStore } from '../store/courseStore';
import { useApiStore } from '../store/apiStore';
import { useUiStore } from '../store/uiStore';
import { streamWithRetry } from '../services/claude/streaming';
import type { WebSearchResult } from '../services/claude/streaming';
import type { ResearchDossier, ResearchSource } from '../types/course';
import { enrichDossier } from '../services/academic';
import type { EnrichmentStats } from '../services/academic';
import { isSafeHttpUrl } from '../utils/url';
import { friendlyError } from '../utils/errors';
import {
  RESEARCH_SYSTEM_PROMPT,
  buildResearchUserPrompt,
  parseResearchResponse,
} from '../prompts/research';
import { CodexButton, CodexBadge } from '../components/codex';

const ROMAN_UPPER = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
];
const ROMAN_LOWER = [
  'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x',
  'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx',
];

type ResearchPhase = 'idle' | 'thinking' | 'searching' | 'compiling' | 'verifying';

interface ChapterResearchState {
  phase: ResearchPhase;
  searchQueries: string[];
  webResults: WebSearchResult[];
  synthesisText: string;
  enrichment: EnrichmentStats | null;
  verifyProgress: { done: number; total: number } | null;
  latestSource: WebSearchResult | null;
  error: string;
}

const emptyResearchState: ChapterResearchState = {
  phase: 'idle',
  searchQueries: [],
  webResults: [],
  synthesisText: '',
  enrichment: null,
  verifyProgress: null,
  latestSource: null,
  error: '',
};

export function ResearchPage() {
  const navigate = useNavigate();
  const {
    syllabus,
    researchDossiers,
    addResearchDossier,
    setStage,
    completeStage,
  } = useCourseStore();
  const { claudeApiKey } = useApiStore();
  const { setActiveTab } = useUiStore();
  const [currentChapter, setCurrentChapter] = useState(0);
  const [researchingSet, setResearchingSet] = useState<Set<number>>(new Set());
  const [chapterStates, setChapterStates] = useState<
    Record<number, ChapterResearchState>
  >({});
  const researchStarted = useRef(false);

  const isResearching = researchingSet.size > 0;

  const updateChapterState = useCallback(
    (
      chapterNum: number,
      updater: (prev: ChapterResearchState) => ChapterResearchState,
    ) => {
      setChapterStates((prev) => ({
        ...prev,
        [chapterNum]: updater(prev[chapterNum] || { ...emptyResearchState }),
      }));
    },
    [],
  );

  const researchChapter = useCallback(
    async (chapterIndex: number) => {
      if (!syllabus) return;
      const chapter = syllabus.chapters[chapterIndex];
      const chapterNum = chapter.number;

      if (researchingSet.has(chapterNum)) return;
      if (researchDossiers.some((d) => d.chapterNumber === chapterNum)) return;

      setResearchingSet((prev) => new Set(prev).add(chapterNum));
      updateChapterState(chapterNum, () => ({
        ...emptyResearchState,
        phase: 'thinking',
      }));

      let localWebResults: WebSearchResult[] = [];

      try {
        const fullText = await streamWithRetry(
          {
            apiKey: claudeApiKey,
            system: RESEARCH_SYSTEM_PROMPT,
            messages: [
              {
                role: 'user',
                content: buildResearchUserPrompt(
                  chapter.title,
                  chapter.narrative,
                  chapter.keyConcepts,
                ),
              },
            ],
            tools: [{ type: 'web_search_20250305', name: 'web_search' }],
            maxTokens: 16000,
          },
          {
            onThinking: () =>
              updateChapterState(chapterNum, (s) => ({ ...s, phase: 'thinking' })),
            onText: (text) =>
              updateChapterState(chapterNum, (s) => ({
                ...s,
                phase: 'compiling',
                synthesisText: s.synthesisText + text,
              })),
            onWebSearch: (query) =>
              updateChapterState(chapterNum, (s) => ({
                ...s,
                phase: 'searching',
                searchQueries: [...s.searchQueries, query],
              })),
            onWebSearchResults: (results) => {
              updateChapterState(chapterNum, (s) => {
                const newResults = results.filter(
                  (r) => !s.webResults.some((existing) => existing.url === r.url),
                );
                localWebResults = [...s.webResults, ...newResults];
                return {
                  ...s,
                  webResults: localWebResults,
                  latestSource:
                    newResults.length > 0
                      ? newResults[newResults.length - 1]
                      : s.latestSource,
                };
              });
            },
            onError: (err) =>
              updateChapterState(chapterNum, (s) => ({ ...s, error: err.message })),
          },
        );

        let dossier = parseResearchResponse(fullText, chapterNum);
        if (!dossier) {
          dossier = {
            chapterNumber: chapterNum,
            sources: localWebResults.map((r) => ({
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

        if (dossier.sources.length > 0) {
          const totalSources = dossier.sources.length;
          updateChapterState(chapterNum, (s) => ({
            ...s,
            phase: 'verifying',
            verifyProgress: { done: 0, total: totalSources },
          }));
          try {
            const { dossier: enriched, stats } = await enrichDossier(dossier, {
              concurrency: 4,
              onProgress: (done, total) =>
                updateChapterState(chapterNum, (s) => ({
                  ...s,
                  verifyProgress: { done, total },
                })),
            });
            dossier = enriched;
            updateChapterState(chapterNum, (s) => ({
              ...s,
              enrichment: stats,
              verifyProgress: null,
            }));
          } catch {
            // Enrichment failed — keep dossier as-is.
            updateChapterState(chapterNum, (s) => ({
              ...s,
              verifyProgress: null,
            }));
          }
        }

        addResearchDossier(dossier);
      } catch (err) {
        const message = friendlyError(err, 'Research failed.');
        updateChapterState(chapterNum, (s) => ({ ...s, error: message }));

        if (message.includes('web_search') || message.includes('tool')) {
          const fallbackDossier: ResearchDossier = {
            chapterNumber: chapterNum,
            sources: [],
            synthesisNotes:
              'Web search unavailable. Chapter will be generated from model knowledge. Citations should be independently verified.',
          };
          addResearchDossier(fallbackDossier);
        }
      } finally {
        setResearchingSet((prev) => {
          const next = new Set(prev);
          next.delete(chapterNum);
          return next;
        });
        updateChapterState(chapterNum, (s) => ({ ...s, phase: 'idle' }));
      }
    },
    [
      syllabus,
      claudeApiKey,
      addResearchDossier,
      updateChapterState,
      researchingSet,
      researchDossiers,
    ],
  );

  // Auto-start first chapter research on mount.
  useEffect(() => {
    if (
      syllabus &&
      researchDossiers.length === 0 &&
      !isResearching &&
      !researchStarted.current
    ) {
      researchStarted.current = true;
      void researchChapter(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const researchAll = useCallback(async () => {
    if (!syllabus) return;
    const tasks: Promise<void>[] = [];
    for (let i = 0; i < syllabus.chapters.length; i++) {
      const ch = syllabus.chapters[i];
      const hasDossier = researchDossiers.some((d) => d.chapterNumber === ch.number);
      const isActive = researchingSet.has(ch.number);
      if (!hasDossier && !isActive) {
        tasks.push(researchChapter(i).catch(() => {}));
      }
    }
    await Promise.allSettled(tasks);
  }, [syllabus, researchDossiers, researchingSet, researchChapter]);

  const handleProceed = () => {
    completeStage('research');
    setStage('build');
    setActiveTab('chapter');
    navigate('/build');
  };

  const handleSelectChapter = (chapterIndex: number) => {
    if (!syllabus) return;
    setCurrentChapter(chapterIndex);
    const chapter = syllabus.chapters[chapterIndex];
    const hasDossier = researchDossiers.some(
      (d) => d.chapterNumber === chapter.number,
    );
    const isActive = researchingSet.has(chapter.number);
    if (!hasDossier && !isActive) {
      void researchChapter(chapterIndex);
    }
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
            fontSize: 17,
            color: 'var(--cb-text-muted)',
            marginBottom: 18,
          }}
        >
          No syllabus generated yet. Step back to the syllabus stage to start.
        </p>
        <CodexButton variant="secondary" onClick={() => navigate('/syllabus')}>
          ← Back to syllabus
        </CodexButton>
      </div>
    );
  }

  const totalChapters = syllabus.chapters.length;
  const completedCount = researchDossiers.length;
  const remainingCount = totalChapters - completedCount - researchingSet.size;
  const unresearchedCount = syllabus.chapters.filter(
    (ch) =>
      !researchDossiers.some((d) => d.chapterNumber === ch.number) &&
      !researchingSet.has(ch.number),
  ).length;

  const currentSyllabusChapter = syllabus.chapters[currentChapter];
  const currentChapterNum = currentSyllabusChapter?.number;
  const currentDossier = researchDossiers.find(
    (d) => d.chapterNumber === currentChapterNum,
  );
  const currentState =
    chapterStates[currentChapterNum] ?? emptyResearchState;
  const isCurrentResearching = researchingSet.has(currentChapterNum);

  return (
    <div
      style={{
        fontFamily: 'var(--font-cb-serif)',
        color: 'var(--cb-text-default)',
        padding: '32px 0 56px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <PageHeader
          completed={completedCount}
          total={totalChapters}
          isResearching={isResearching}
          onSkip={handleProceed}
          onResearchAll={() => void researchAll()}
          onProceed={handleProceed}
          canProceed={completedCount > 0 || (!isResearching && remainingCount > 0)}
          showSkip={completedCount === 0 && !isResearching}
          showResearchAll={unresearchedCount > 1}
        />

        <div
          className="cb-research-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '280px minmax(0, 1fr)',
            gap: 36,
            alignItems: 'start',
          }}
        >
          <DossierList
            chapters={syllabus.chapters.map((c, i) => ({
              index: i,
              number: c.number,
              title: c.title,
              dossier: researchDossiers.find((d) => d.chapterNumber === c.number),
              state:
                chapterStates[c.number] ?? emptyResearchState,
              isResearching: researchingSet.has(c.number),
            }))}
            currentIndex={currentChapter}
            onSelect={handleSelectChapter}
          />

          <DossierPanel
            chapterNumber={currentChapterNum}
            chapterTitle={currentSyllabusChapter?.title ?? ''}
            chapterNarrative={currentSyllabusChapter?.narrative ?? ''}
            dossier={currentDossier}
            state={currentState}
            isResearching={isCurrentResearching}
            onStart={() => void researchChapter(currentChapter)}
          />
        </div>

        {!isResearching && <div className="cb-folio">— 03 —</div>}
      </div>
    </div>
  );
}

// ─── PageHeader ──────────────────────────────────────────────────────────

function PageHeader({
  completed,
  total,
  isResearching,
  onSkip,
  onResearchAll,
  onProceed,
  canProceed,
  showSkip,
  showResearchAll,
}: {
  completed: number;
  total: number;
  isResearching: boolean;
  onSkip: () => void;
  onResearchAll: () => void;
  onProceed: () => void;
  canProceed: boolean;
  showSkip: boolean;
  showResearchAll: boolean;
}) {
  const progress = isResearching
    ? `Researching · ${completed} of ${total} chapters complete.`
    : completed === total
    ? `— ${total} ${plural('chapter', total)} researched.`
    : completed > 0
    ? `${completed} of ${total} chapters researched · ${total - completed} remaining.`
    : `Optional · grounds each chapter in cited sources. Researching a few chapters takes a few minutes; you can skip and let ClassBuild draft from model knowledge instead.`;

  return (
    <header
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 24,
        alignItems: 'flex-end',
        paddingBottom: 14,
        marginBottom: 24,
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
          Research dossiers
        </div>
        <h1
          style={{
            margin: '4px 0 6px',
            fontSize: 26,
            lineHeight: 1.25,
            fontWeight: 500,
            fontVariationSettings: '"opsz" 20',
            letterSpacing: '-0.005em',
            color: 'var(--cb-text-default)',
          }}
        >
          What does ClassBuild{' '}
          <span
            className="cb-italic"
            style={{ color: 'var(--cb-accent-emphasis)' }}
          >
            know
          </span>{' '}
          about this material?
        </h1>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            fontSize: 15,
            lineHeight: 1.5,
            color: 'var(--cb-text-muted)',
          }}
        >
          {isResearching && <PenStroke width={48} />}
          <span className="cb-italic">{progress}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'baseline' }}>
        {showSkip && (
          <CodexButton variant="ghost" size="sm" onClick={onSkip}>
            Skip research
          </CodexButton>
        )}
        {showResearchAll && (
          <CodexButton
            variant="secondary"
            size="sm"
            onClick={onResearchAll}
            disabled={isResearching}
          >
            Research all remaining
          </CodexButton>
        )}
        <CodexButton
          variant="primary"
          size="sm"
          onClick={onProceed}
          disabled={!canProceed}
          title={!canProceed ? 'Research at least one chapter before proceeding.' : undefined}
        >
          {isResearching && completed === 0
            ? 'Begin build · researching…'
            : 'Begin build →'}
        </CodexButton>
      </div>
    </header>
  );
}

// ─── DossierList ─────────────────────────────────────────────────────────

interface DossierListItem {
  index: number;
  number: number;
  title: string;
  dossier?: ResearchDossier;
  state: ChapterResearchState;
  isResearching: boolean;
}

function DossierList({
  chapters,
  currentIndex,
  onSelect,
}: {
  chapters: DossierListItem[];
  currentIndex: number;
  onSelect: (i: number) => void;
}) {
  return (
    <section>
      <div
        className="cb-sc"
        style={{
          fontSize: 13,
          color: 'var(--cb-text-muted)',
          letterSpacing: '0.14em',
          marginBottom: 12,
        }}
      >
        Dossiers
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {chapters.map((c) => (
          <DossierCard
            key={c.number}
            item={c}
            selected={c.index === currentIndex}
            onClick={() => onSelect(c.index)}
          />
        ))}
      </div>
    </section>
  );
}

function DossierCard({
  item,
  selected,
  onClick,
}: {
  item: DossierListItem;
  selected: boolean;
  onClick: () => void;
}) {
  const status: 'cited' | 'drafting' | 'queued' = item.dossier
    ? 'cited'
    : item.isResearching
    ? 'drafting'
    : 'queued';

  const cited = item.dossier?.sources.length ?? 0;
  const evaluated = item.state.webResults.length;
  const queries = item.state.searchQueries.length;

  const meta =
    status === 'cited'
      ? evaluated > cited
        ? `${evaluated} evaluated · ${cited} cited`
        : `${cited} ${plural('source', cited)} cited`
      : status === 'drafting'
      ? phaseLabel(item.state.phase, evaluated, queries)
      : 'awaiting';

  return (
    <button
      type="button"
      onClick={onClick}
      className="cb-focus"
      style={{
        position: 'relative',
        textAlign: 'left',
        padding: '12px 14px 12px 16px',
        background: selected
          ? 'var(--cb-accent-emphasis-quiet)'
          : 'var(--cb-ground-page)',
        border: `1px solid ${selected ? 'var(--cb-accent-emphasis)' : 'var(--cb-border-default)'}`,
        borderRadius: 1.5,
        cursor: 'pointer',
        fontFamily: 'inherit',
        color: 'var(--cb-text-default)',
        display: 'grid',
        gridTemplateColumns: '38px 1fr auto',
        alignItems: 'baseline',
        gap: 12,
        transition: 'border-color 200ms cubic-bezier(0.32,0.04,0.32,1)',
      }}
    >
      {selected && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: -2,
            top: -1,
            bottom: -1,
            width: 2,
            background: 'var(--cb-accent-emphasis)',
          }}
        />
      )}
      <span
        className="cb-italic"
        style={{
          fontSize: 20,
          color:
            status === 'queued'
              ? 'var(--cb-text-subtle)'
              : 'var(--cb-accent-emphasis)',
          lineHeight: 1,
          fontVariationSettings: '"opsz" 16',
        }}
      >
        {ROMAN_UPPER[item.index] ?? String(item.index + 1)}
      </span>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            lineHeight: 1.3,
            color:
              status === 'queued'
                ? 'var(--cb-text-muted)'
                : 'var(--cb-text-default)',
            fontWeight: status === 'queued' ? 400 : 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {item.title}
        </div>
        <div
          className="cb-italic"
          style={{
            fontSize: 13.5,
            color:
              status === 'drafting'
                ? 'var(--cb-accent-emphasis)'
                : 'var(--cb-text-muted)',
            marginTop: 2,
          }}
        >
          {meta}
        </div>
      </div>
      <div>
        <CodexBadge
          tone={
            status === 'cited'
              ? 'success'
              : status === 'drafting'
              ? 'emphasis'
              : 'neutral'
          }
        >
          {status}
        </CodexBadge>
      </div>
    </button>
  );
}

// ─── DossierPanel ────────────────────────────────────────────────────────

function DossierPanel({
  chapterNumber,
  chapterTitle,
  chapterNarrative,
  dossier,
  state,
  isResearching,
  onStart,
}: {
  chapterNumber: number;
  chapterTitle: string;
  chapterNarrative: string;
  dossier?: ResearchDossier;
  state: ChapterResearchState;
  isResearching: boolean;
  onStart: () => void;
}) {
  const status: 'cited' | 'drafting' | 'queued' = dossier
    ? 'cited'
    : isResearching
    ? 'drafting'
    : 'queued';

  const showEmpty = !dossier && !isResearching;
  const hasQueries = state.searchQueries.length > 0;
  // Cited sources + synthesis render only from a parsed dossier — never from raw
  // streaming output. While the model is mid-stream, the JSON isn't valid yet.
  const showCitedSources = !!dossier && dossier.sources.length > 0;
  const showSynthesis = !!dossier && !!dossier.synthesisNotes?.trim();

  const ordinal = (() => {
    const i = Math.max(0, chapterNumber - 1);
    return ROMAN_UPPER[i] ?? String(chapterNumber);
  })();

  return (
    <section>
      <div
        style={{
          background: 'var(--cb-ground-page)',
          border: '1px solid var(--cb-border-default)',
          borderRadius: 2,
          padding: 32,
        }}
      >
        {/* Head */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            paddingBottom: 14,
            borderBottom: '0.5px solid var(--cb-border-rule)',
            gap: 16,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              className="cb-sc"
              style={{
                fontSize: 13,
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
                gap: 14,
                marginTop: 6,
              }}
            >
              <span
                className="cb-italic"
                style={{
                  fontSize: 28,
                  color: 'var(--cb-accent-emphasis)',
                  lineHeight: 1,
                  fontVariationSettings: '"opsz" 22',
                }}
              >
                {ordinal}
              </span>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 500,
                  fontVariationSettings: '"opsz" 20',
                  color: 'var(--cb-text-default)',
                  lineHeight: 1.25,
                  letterSpacing: '-0.005em',
                }}
              >
                {chapterTitle}
              </span>
            </div>
          </div>
          <CodexBadge
            tone={
              status === 'cited'
                ? 'success'
                : status === 'drafting'
                ? 'emphasis'
                : 'neutral'
            }
          >
            {status === 'cited'
              ? 'cited · ready'
              : status === 'drafting'
              ? phaseLabel(state.phase, state.webResults.length, state.searchQueries.length)
              : 'awaiting'}
          </CodexBadge>
        </div>

        {/* Error */}
        {state.error && (
          <div
            style={{
              marginTop: 18,
              padding: '14px 16px',
              background: 'var(--cb-status-danger-bg)',
              borderLeft: '2px solid var(--cb-status-danger)',
              fontSize: 14.5,
              lineHeight: 1.55,
              color: 'var(--cb-text-default)',
            }}
          >
            <div>{state.error}</div>
            {state.error.includes('web_search') && (
              <p
                className="cb-italic"
                style={{
                  margin: '6px 0 0',
                  fontSize: 13.5,
                  color: 'var(--cb-text-muted)',
                }}
              >
                Web search isn't responding. You can retry, or proceed with what's drafted.
              </p>
            )}
            <button
              type="button"
              onClick={onStart}
              disabled={isResearching}
              className="cb-mono cb-focus"
              style={{
                marginTop: 12,
                background: 'transparent',
                border: '1px solid var(--cb-border-strong)',
                padding: '5px 12px',
                borderRadius: 2,
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--cb-text-default)',
                cursor: isResearching ? 'wait' : 'pointer',
                opacity: isResearching ? 0.5 : 1,
              }}
            >
              {isResearching ? 'retrying…' : 'retry research ↻'}
            </button>
          </div>
        )}

        {/* Abstract — italic muted, visible across all phases */}
        {chapterNarrative && (
          <p
            className="cb-italic"
            style={{
              margin: '18px 0 0',
              fontSize: 15,
              lineHeight: 1.55,
              color: 'var(--cb-text-muted)',
              maxWidth: '72ch',
            }}
          >
            {chapterNarrative.length > 260
              ? `${chapterNarrative.slice(0, 260).trimEnd()}…`
              : chapterNarrative}
          </p>
        )}

        {/* Live status — visible during all research phases */}
        {isResearching && (
          <StatusLine
            phase={state.phase}
            queries={state.searchQueries.length}
            verifyProgress={state.verifyProgress}
          />
        )}

        {/* Search queries — appear as they stream, settle as a numbered list */}
        {hasQueries && (
          <SearchQueriesSection queries={state.searchQueries} />
        )}

        {/* Synthesis — frames the chapter; lives above the cited sources */}
        {showSynthesis && <SynthesisSection text={dossier.synthesisNotes} />}

        {/* Cited sources — the evidence base */}
        {showCitedSources && (
          <CitedSourcesSection
            sources={dossier.sources}
            evaluated={state.webResults.length}
            enrichment={state.enrichment}
          />
        )}

        {/* Empty state */}
        {showEmpty && (
          <div style={{ padding: '36px 0', textAlign: 'center' }}>
            <p
              className="cb-italic"
              style={{
                fontSize: 15,
                color: 'var(--cb-text-muted)',
                margin: '0 0 16px',
                lineHeight: 1.55,
              }}
            >
              No research yet for this chapter. ClassBuild will run web searches,
              cite peer-reviewed sources, and verify DOIs — give it a minute or two.
            </p>
            <CodexButton variant="primary" size="sm" onClick={onStart}>
              Start research
            </CodexButton>
          </div>
        )}

        {/* Foot summary — only when settled. Honest one-liner, no query leak. */}
        {dossier && dossier.sources.length > 0 && (
          <FootSummary sources={dossier.sources} enrichment={state.enrichment} />
        )}
      </div>
    </section>
  );
}

// ─── StatusLine ──────────────────────────────────────────────────────────

function StatusLine({
  phase,
  queries,
  verifyProgress,
}: {
  phase: ResearchPhase;
  queries: number;
  verifyProgress: { done: number; total: number } | null;
}) {
  const label =
    phase === 'thinking'
      ? 'Planning research strategy…'
      : phase === 'searching'
      ? `Searching · ${queries} ${plural('query', queries, 'queries')} underway…`
      : phase === 'compiling'
      ? 'Compiling sources…'
      : phase === 'verifying'
      ? verifyProgress
        ? `Verifying against Semantic Scholar, Crossref, Unpaywall · ${verifyProgress.done} of ${verifyProgress.total}…`
        : 'Verifying sources against Semantic Scholar, Crossref, Unpaywall…'
      : 'Drafting…';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 12,
        marginTop: 18,
      }}
    >
      <PenStroke width={48} />
      <span
        className="cb-italic"
        style={{
          fontSize: 15,
          color: 'var(--cb-text-muted)',
          lineHeight: 1.5,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── SearchQueriesSection ────────────────────────────────────────────────

function SearchQueriesSection({ queries }: { queries: string[] }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div
        className="cb-sc"
        style={{
          fontSize: 13,
          color: 'var(--cb-text-muted)',
          letterSpacing: '0.14em',
          marginBottom: 4,
        }}
      >
        Search queries · {queries.length}
      </div>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {queries.map((q, i) => (
          <li
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr',
              gap: 12,
              padding: '8px 0',
              borderTop:
                i === 0 ? 'none' : '0.5px solid var(--cb-border-subtle)',
              alignItems: 'baseline',
            }}
          >
            <span
              className="cb-italic"
              style={{
                color: 'var(--cb-accent-emphasis)',
                fontSize: 14.5,
                fontVariationSettings: '"opsz" 12',
              }}
            >
              {ROMAN_LOWER[i] ?? String(i + 1)}.
            </span>
            <span
              className="cb-mono"
              style={{
                fontSize: 13.5,
                lineHeight: 1.55,
                color: 'var(--cb-text-default)',
                wordBreak: 'break-word',
                maxWidth: '80ch',
                letterSpacing: '0.01em',
              }}
            >
              {q}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── CitedSourcesSection ────────────────────────────────────────────────

function CitedSourcesSection({
  sources,
  evaluated,
  enrichment,
}: {
  sources: ResearchSource[];
  evaluated: number;
  enrichment: EnrichmentStats | null;
}) {
  if (sources.length === 0) return null;
  const showEvaluated = evaluated > sources.length;
  const unverifiedCount = enrichment?.unverified ?? 0;

  return (
    <div style={{ marginTop: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        <div
          className="cb-sc"
          style={{
            fontSize: 13,
            color: 'var(--cb-text-muted)',
            letterSpacing: '0.14em',
          }}
        >
          {showEvaluated
            ? `Cited sources · ${evaluated} evaluated · ${sources.length} cited`
            : `Cited sources · ${sources.length}`}
        </div>
        {unverifiedCount > 0 && (
          <span
            className="cb-italic"
            style={{ fontSize: 13.5, color: 'var(--cb-status-warning)' }}
          >
            {unverifiedCount} {plural('source', unverifiedCount)} unverified
          </span>
        )}
      </div>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {sources.map((s, i) => (
          <Citation key={i} source={s} index={i} />
        ))}
      </ol>
    </div>
  );
}

// ─── Citation ────────────────────────────────────────────────────────────

function Citation({ source, index }: { source: ResearchSource; index: number }) {
  const [open, setOpen] = useState(false);
  const hasSummary = !!source.summary?.trim();
  const hasResource =
    (source.url && isSafeHttpUrl(source.url)) || !!source.doi;

  return (
    <li
      style={{
        display: 'grid',
        gridTemplateColumns: '24px 1fr',
        gap: 10,
        padding: '12px 0',
        borderTop: '0.5px solid var(--cb-border-subtle)',
        alignItems: 'baseline',
      }}
    >
      <span
        className="cb-italic"
        style={{ color: 'var(--cb-accent-emphasis)', fontSize: 14.5 }}
      >
        {ROMAN_LOWER[index] ?? String(index + 1)}.
      </span>
      <div style={{ minWidth: 0 }}>
        {/* Title + author/year — full width, no measure cap (it's one line). */}
        <div
          style={{
            fontSize: 15.5,
            lineHeight: 1.4,
            color: 'var(--cb-text-default)',
          }}
        >
          {source.title}
          {source.authors && (
            <span
              className="cb-italic"
              style={{
                color: 'var(--cb-text-muted)',
                fontWeight: 400,
              }}
            >
              {' '}— {source.authors}
              {source.year ? `, ${source.year}` : ''}
            </span>
          )}
        </div>

        {/* "used for:" — capped to 72ch */}
        {source.relevance && (
          <div
            className="cb-italic"
            style={{
              fontSize: 13.5,
              color: 'var(--cb-accent-emphasis)',
              marginTop: 4,
              maxWidth: '72ch',
              lineHeight: 1.5,
            }}
          >
            used for: {source.relevance}
          </div>
        )}

        {/* "about this paper" disclosure — collapsed by default */}
        {hasSummary && (
          <div style={{ marginTop: 6 }}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="cb-focus"
              style={{
                background: 'transparent',
                border: 0,
                padding: 0,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 13,
                fontStyle: 'italic',
                color: 'var(--cb-text-muted)',
                letterSpacing: '0.01em',
              }}
            >
              {open ? '↑ about this paper' : '↓ about this paper'}
            </button>
            {open && (
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: 14.5,
                  color: 'var(--cb-text-muted)',
                  lineHeight: 1.55,
                  maxWidth: '72ch',
                }}
              >
                {source.summary}
              </p>
            )}
          </div>
        )}

        {/* Resource strip — single muted mono line, hostname only. */}
        {hasResource && (
          <div
            className="cb-mono"
            style={{
              marginTop: 6,
              fontSize: 13.5,
              color: 'var(--cb-text-muted)',
              display: 'flex',
              gap: 10,
              alignItems: 'baseline',
              flexWrap: 'wrap',
            }}
          >
            {isSafeHttpUrl(source.url) && (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--cb-text-muted)',
                  textDecoration: 'underline',
                  textDecorationThickness: '0.5px',
                  textUnderlineOffset: 3,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--cb-accent-link)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--cb-text-muted)';
                }}
              >
                ↗ {hostnameOf(source.url)}
              </a>
            )}
            {isSafeHttpUrl(source.url) && source.doi && <span>·</span>}
            {source.doi && <span>doi {source.doi}</span>}
          </div>
        )}
      </div>
    </li>
  );
}

// ─── FootSummary ─────────────────────────────────────────────────────────

function FootSummary({
  sources,
  enrichment,
}: {
  sources: ResearchSource[];
  enrichment: EnrichmentStats | null;
}) {
  const span = useMemo(() => {
    const years = sources
      .map((s) => {
        const m = (s.year ?? '').match(/\d{4}/);
        return m ? Number(m[0]) : null;
      })
      .filter((y): y is number => y != null && y > 1500 && y <= 2100);
    if (years.length === 0) return null;
    const min = Math.min(...years);
    const max = Math.max(...years);
    return min === max ? String(min) : `${min}–${max}`;
  }, [sources]);

  const verifiedCount =
    enrichment != null
      ? enrichment.doiVerified + enrichment.doiResolved
      : null;

  return (
    <div
      style={{
        marginTop: 22,
        paddingTop: 14,
        borderTop: '0.5px solid var(--cb-border-rule)',
        display: 'flex',
        gap: 18,
        flexWrap: 'wrap',
      }}
    >
      <span
        className="cb-sc cb-mono"
        style={{ fontSize: 13.5, color: 'var(--cb-text-muted)', letterSpacing: '0.12em' }}
      >
        {sources.length} {plural('source', sources.length)}
      </span>
      {span && (
        <span
          className="cb-sc cb-mono"
          style={{
            fontSize: 13.5,
            color: 'var(--cb-text-muted)',
            letterSpacing: '0.12em',
          }}
        >
          spanning {span}
        </span>
      )}
      {verifiedCount != null && verifiedCount > 0 && (
        <span
          className="cb-sc cb-mono"
          style={{ fontSize: 13.5, color: 'var(--cb-text-muted)', letterSpacing: '0.12em' }}
        >
          {verifiedCount} verified
        </span>
      )}
      {enrichment != null && enrichment.oaFound > 0 && (
        <span
          className="cb-sc cb-mono"
          style={{ fontSize: 13.5, color: 'var(--cb-text-muted)', letterSpacing: '0.12em' }}
        >
          {enrichment.oaFound} open access
        </span>
      )}
      <span
        className="cb-sc cb-mono"
        style={{ fontSize: 13.5, color: 'var(--cb-text-muted)', letterSpacing: '0.12em' }}
      >
        evidence base settled
      </span>
    </div>
  );
}

function hostnameOf(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ─── SynthesisSection ────────────────────────────────────────────────────

function SynthesisSection({ text }: { text: string }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div
        className="cb-sc"
        style={{
          fontSize: 13,
          color: 'var(--cb-text-muted)',
          letterSpacing: '0.14em',
          marginBottom: 10,
        }}
      >
        Synthesis
      </div>
      <blockquote
        style={{
          margin: 0,
          padding: '4px 0 4px 16px',
          borderLeft: '2px solid var(--cb-accent-emphasis)',
        }}
      >
        <p
          className="cb-italic"
          style={{
            margin: 0,
            fontSize: 15.5,
            lineHeight: 1.6,
            color: 'var(--cb-text-default)',
          }}
        >
          {text}
        </p>
      </blockquote>
    </div>
  );
}

// ─── PenStroke + helpers ─────────────────────────────────────────────────

function PenStroke({ width = 60 }: { width?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width,
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
          animation: 'cb-pen 1.4s cubic-bezier(0.32,0.04,0.32,1) infinite',
        }}
      />
    </span>
  );
}

function plural(noun: string, n: number, irregularPlural?: string): string {
  if (n === 1) return noun;
  return irregularPlural ?? `${noun}s`;
}

function phaseLabel(phase: ResearchPhase, sources: number, queries: number): string {
  switch (phase) {
    case 'thinking':
      return 'planning…';
    case 'searching':
      return `searching · ${sources} ${plural('source', sources)} found`;
    case 'compiling':
      return `compiling · ${queries} ${plural('query', queries, 'queries')}`;
    case 'verifying':
      return 'verifying sources…';
    default:
      return 'drafting…';
  }
}
