import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourseStore } from '../store/courseStore';
import { useApiStore } from '../store/apiStore';
import { useUiStore } from '../store/uiStore';
import { streamMessage } from '../services/claude/streaming';
import { MODELS } from '../services/claude/client';
import {
  buildSyllabusPrompt,
  parseSyllabusResponse,
  parsePartialChapters,
} from '../prompts/syllabus';
import type { ChapterSyllabus, WidgetSpec } from '../types/course';
import { friendlyError } from '../utils/errors';
import { CodexButton, CodexInput, CodexTextarea } from '../components/codex';

const ROMAN_UPPER = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
];

type Phase = 'thinking' | 'drafting' | 'settled';

export function SyllabusPage() {
  const navigate = useNavigate();
  const {
    setup,
    syllabus,
    setSyllabus,
    updateSyllabusChapter,
    syllabusConversation,
    addSyllabusMessage,
    setStage,
    completeStage,
  } = useCourseStore();
  const { claudeApiKey } = useApiStore();
  const { isGenerating, setIsGenerating, error, setError } = useUiStore();

  const [isThinking, setIsThinking] = useState(false);
  const [partialChapters, setPartialChapters] = useState<ChapterSyllabus[]>([]);
  const [partialTitle, setPartialTitle] = useState('');
  const [partialOverview, setPartialOverview] = useState('');
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const [elapsedSec, setElapsedSec] = useState(0);
  const fullTextRef = useRef('');
  const generationStarted = useRef(false);

  const generateSyllabus = useCallback(
    async (feedbackText?: string) => {
      setIsGenerating(true);
      setIsThinking(true);
      setPartialChapters([]);
      setPartialTitle('');
      setPartialOverview('');
      setOverviewOpen(false);
      setThinkingText('');
      setElapsedSec(0);
      setError(null);
      fullTextRef.current = '';

      try {
        const { systemPrompt, userMessage } = buildSyllabusPrompt(
          setup,
          feedbackText,
          syllabusConversation,
        );

        if (feedbackText) addSyllabusMessage('user', feedbackText);

        const messages =
          feedbackText && syllabusConversation.length > 0
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
            // 'high' (not 'max'): on Opus 4.8 the effort levels were
            // recalibrated and 'max' overthinks — it stalled ~7 min before the
            // first token. 'high' matches the (fast) chapter build and is the
            // recommended floor for intelligence-sensitive work.
            thinkingBudget: 'high',
            maxTokens: 16000,
          },
          {
            onText: (text) => {
              setIsThinking(false);
              fullTextRef.current += text;
              const partial = parsePartialChapters(fullTextRef.current);
              if (partial.title) setPartialTitle(partial.title);
              if (partial.overview) setPartialOverview(partial.overview);
              if (partial.chapters.length > partialChapters.length) {
                setPartialChapters(partial.chapters);
              }
            },
            onThinking: (text) => setThinkingText((prev) => prev + text),
            onError: (err) => setError(err.message),
          },
        );

        addSyllabusMessage('assistant', fullText);
        const parsed = parseSyllabusResponse(fullText);
        if (parsed) {
          setSyllabus(parsed);
          setPartialChapters([]);
          setOverviewOpen(true);
        } else {
          setError(
            'Failed to parse syllabus. The model may have returned malformed JSON. Try regenerating.',
          );
        }
      } catch (err) {
        setError(friendlyError(err, 'Syllabus generation failed.'));
      } finally {
        setIsGenerating(false);
        // Collapse thinking once we leave the thinking phase.
        setIsThinking(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setup, claudeApiKey, syllabusConversation],
  );

  useEffect(() => {
    if (!syllabus && !isGenerating && claudeApiKey && !generationStarted.current) {
      generationStarted.current = true;
      void generateSyllabus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live elapsed counter for the thinking trace — gives the Opus planning
  // pause a visible heartbeat instead of a frozen label.
  useEffect(() => {
    if (!isGenerating) return;
    setElapsedSec(0);
    const startedAt = Date.now();
    const id = window.setInterval(
      () => setElapsedSec(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [isGenerating]);

  const handleProceed = () => {
    completeStage('syllabus');
    setStage('research');
    navigate('/research');
  };

  // ─── Derived state ──────────────────────────────────────────────────
  const totalChapters = Math.max(setup.numChapters || 12, partialChapters.length);
  const displayChapters: ChapterSyllabus[] = syllabus?.chapters ?? partialChapters;
  const displayTitle = syllabus?.courseTitle || partialTitle;
  const displayOverview = syllabus?.courseOverview || partialOverview;

  const phase: Phase = syllabus
    ? 'settled'
    : isThinking
    ? 'thinking'
    : isGenerating
    ? 'drafting'
    : 'thinking'; // pre-generation transient — useEffect is about to fire

  const draftedCount = syllabus ? totalChapters : partialChapters.length;
  const activeDraftIndex = syllabus ? -1 : Math.max(0, partialChapters.length - 1);

  // Inline edits are only offered once a syllabus has settled and nothing is
  // streaming. During a regenerate the previous syllabus stays on screen
  // (phase reads 'settled'), so gate on isGenerating too — otherwise an open
  // editor would hold stale drafts over the incoming chapters.
  const editable = Boolean(syllabus) && !isGenerating;

  return (
    <div
      style={{
        fontFamily: 'var(--font-cb-serif)',
        color: 'var(--cb-text-default)',
        padding: '32px 0 56px',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <SyllabusBanner
          phase={phase}
          title={displayTitle}
          drafted={draftedCount}
          total={totalChapters}
          onEditBrief={() => navigate('/setup')}
          onRegenerate={() => void generateSyllabus()}
          onProceed={handleProceed}
        />

        {phase === 'thinking' && (
          <ThinkingTrace thinkingText={thinkingText} elapsedSec={elapsedSec} />
        )}

        <OverviewDisclosure
          overview={displayOverview}
          open={overviewOpen}
          onToggle={() => setOverviewOpen((v) => !v)}
          phase={phase}
        />

        {error && (
          <ErrorBanner
            message={error}
            onRetry={() => {
              setError(null);
              void generateSyllabus();
            }}
          />
        )}

        {/* Main grid — skeleton renders from second zero */}
        <div
          className="cb-syllabus-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr',
            gap: 48,
            alignItems: 'start',
            marginTop: 24,
          }}
        >
          <ChapterTimeline
            totalChapters={totalChapters}
            chapters={displayChapters}
            draftedCount={draftedCount}
            activeDraftIndex={activeDraftIndex}
            phase={phase}
            editable={editable}
            onSaveChapter={updateSyllabusChapter}
          />
          {displayChapters.length >= 2 && (
            <SyllabusAside chapters={displayChapters} />
          )}
        </div>

        {/* Folio hidden during generation */}
        {phase === 'settled' && <div className="cb-folio">— 02 —</div>}
      </div>
    </div>
  );
}

// ─── ThinkingTrace (Opus planning pause) ──────────────────────────────────
function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

// Surfaces Opus's summarized reasoning (thinking.display = 'summarized') while
// it plans the course, so the pre-output pause reads as live progress rather
// than a frozen "Designing the course architecture…" label.
function ThinkingTrace({
  thinkingText,
  elapsedSec,
}: {
  thinkingText: string;
  elapsedSec: number;
}) {
  return (
    <div style={{ marginTop: 18 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          fontSize: 14.5,
          color: 'var(--cb-text-muted)',
        }}
      >
        <PenStroke width={48} />
        <span className="cb-italic">
          {thinkingText
            ? `Reasoning through the course architecture · ${formatElapsed(elapsedSec)}`
            : `Warming up Opus · ${formatElapsed(elapsedSec)}`}
        </span>
      </div>

      {!thinkingText && elapsedSec >= 6 && (
        <p
          className="cb-italic"
          style={{
            margin: '12px 0 0',
            fontSize: 13,
            lineHeight: 1.55,
            color: 'var(--cb-text-muted)',
            maxWidth: '72ch',
          }}
        >
          Opus plans the whole course before it writes — the arc, the chapter
          sequence, and how the learning-science principles thread through. The
          outline streams in as it settles. You can click away; we'll keep
          going.
        </p>
      )}

      {thinkingText && (
        <div
          style={{
            marginTop: 14,
            maxHeight: 220,
            overflow: 'hidden',
            maskImage: 'linear-gradient(to bottom, transparent 0, #000 32px)',
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0, #000 32px)',
          }}
        >
          <pre
            className="cb-mono"
            style={{
              margin: 0,
              fontSize: 11.5,
              lineHeight: 1.7,
              color: 'var(--cb-text-muted)',
              whiteSpace: 'pre-wrap',
              maxWidth: '80ch',
            }}
          >
            {thinkingText.slice(-900)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── SyllabusBanner ──────────────────────────────────────────────────────

function SyllabusBanner({
  phase,
  title,
  drafted,
  total,
  onEditBrief,
  onRegenerate,
  onProceed,
}: {
  phase: Phase;
  title: string;
  drafted: number;
  total: number;
  onEditBrief: () => void;
  onRegenerate: () => void;
  onProceed: () => void;
}) {
  const progress =
    phase === 'thinking'
      ? 'Designing the course architecture…'
      : phase === 'drafting'
      ? `Drafting chapter ${Math.min(drafted + 1, total)} of ${total}.`
      : `${total} ${pluralise('chapter', total)} · syllabus settled.`;

  const displayTitle =
    phase === 'thinking' && !title
      ? 'Drafting your syllabus…'
      : title || 'Drafting your syllabus…';

  const isGenerating = phase !== 'settled';

  return (
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
          The syllabus
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
          {displayTitle}
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
          {phase !== 'settled' && <PenStroke width={48} />}
          {phase === 'settled' && (
            <span
              style={{ color: 'var(--cb-accent-emphasis)', fontSize: 14.5 }}
            >
              —
            </span>
          )}
          <span className="cb-italic">{progress}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'baseline' }}>
        <CodexButton
          variant="ghost"
          size="sm"
          onClick={onEditBrief}
          disabled={isGenerating}
        >
          Edit brief
        </CodexButton>
        <CodexButton
          variant="secondary"
          size="sm"
          onClick={onRegenerate}
          disabled={isGenerating}
        >
          Regenerate
        </CodexButton>
        <CodexButton
          variant="primary"
          size="sm"
          onClick={onProceed}
          disabled={isGenerating}
        >
          {isGenerating ? 'Begin research · drafting…' : 'Begin research →'}
        </CodexButton>
      </div>
    </header>
  );
}

// ─── OverviewDisclosure ──────────────────────────────────────────────────

function OverviewDisclosure({
  overview,
  open,
  onToggle,
  phase,
}: {
  overview: string;
  open: boolean;
  onToggle: () => void;
  phase: Phase;
}) {
  if (!overview) return null;

  const isLong = overview.split(/\s+/).length > 40;
  // When closed and long, show first sentence only as a teaser.
  const teaser = isLong ? (overview.split(/(?<=\.)\s+/)[0] ?? overview) : overview;

  return (
    <section style={{ marginBottom: 18 }}>
      <button
        type="button"
        onClick={isLong ? onToggle : undefined}
        className="cb-focus"
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          background: 'transparent',
          border: 0,
          padding: 0,
          cursor: isLong ? 'pointer' : 'default',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            fontSize: 17,
            lineHeight: 1.55,
            color: 'var(--cb-text-default)',
            maxWidth: 800,
          }}
        >
          {open ? overview : teaser}
        </span>
      </button>
      {isLong && (
        <div style={{ marginTop: 6 }}>
          <button
            type="button"
            onClick={onToggle}
            className="cb-focus"
            style={{
              background: 'transparent',
              border: 0,
              padding: 0,
              cursor: 'pointer',
              color: 'var(--cb-accent-link)',
              textDecoration: 'underline',
              textDecorationThickness: '0.5px',
              textUnderlineOffset: 3,
              fontFamily: 'inherit',
              fontSize: 14.5,
              fontStyle: 'italic',
            }}
          >
            {open
              ? '↑ collapse overview'
              : phase === 'settled'
              ? '↓ read full overview'
              : '↓ read what has drafted so far'}
          </button>
        </div>
      )}
    </section>
  );
}

// ─── ErrorBanner ─────────────────────────────────────────────────────────

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      style={{
        padding: '12px 16px',
        marginBottom: 22,
        background: 'var(--cb-status-danger-bg)',
        borderLeft: '2px solid var(--cb-status-danger)',
        fontSize: 15,
        lineHeight: 1.55,
        color: 'var(--cb-text-default)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 16,
      }}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="cb-focus"
        style={{
          background: 'transparent',
          border: 0,
          padding: 0,
          cursor: 'pointer',
          color: 'var(--cb-accent-link)',
          textDecoration: 'underline',
          textDecorationThickness: '0.5px',
          textUnderlineOffset: 3,
          fontFamily: 'inherit',
          fontSize: 14.5,
          whiteSpace: 'nowrap',
        }}
      >
        Try again
      </button>
    </div>
  );
}

// ─── ChapterTimeline ─────────────────────────────────────────────────────

function ChapterTimeline({
  totalChapters,
  chapters,
  draftedCount,
  activeDraftIndex,
  phase,
  editable,
  onSaveChapter,
}: {
  totalChapters: number;
  chapters: ChapterSyllabus[];
  draftedCount: number;
  activeDraftIndex: number;
  phase: Phase;
  editable: boolean;
  onSaveChapter: (
    number: number,
    updates: { title: string; narrative: string },
  ) => void;
}) {
  return (
    <section>
      <div
        className="cb-sc"
        style={{
          fontSize: 13,
          color: 'var(--cb-text-muted)',
          letterSpacing: '0.14em',
          marginBottom: 18,
        }}
      >
        Chapter timeline
      </div>
      <div style={{ position: 'relative', paddingLeft: 32 }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 14,
            top: 8,
            bottom: 8,
            width: 0.5,
            background: 'var(--cb-border-rule)',
          }}
        />
        {Array.from({ length: totalChapters }).map((_, i) => {
          const isDrafted = phase === 'settled' || i < draftedCount - (phase === 'drafting' ? 1 : 0);
          const isActive =
            phase === 'drafting' && i === activeDraftIndex;
          const slotState: 'drafted' | 'drafting' | 'queued' = isDrafted
            ? 'drafted'
            : isActive
            ? 'drafting'
            : 'queued';
          const chapter = chapters[i];

          return (
            <ChapterSlot
              key={i}
              index={i}
              state={slotState}
              chapter={chapter}
              editable={editable}
              onSaveChapter={onSaveChapter}
            />
          );
        })}
      </div>

    </section>
  );
}

function ChapterSlot({
  index,
  state,
  chapter,
  editable,
  onSaveChapter,
}: {
  index: number;
  state: 'drafted' | 'drafting' | 'queued';
  chapter?: ChapterSyllabus;
  editable: boolean;
  onSaveChapter: (
    number: number,
    updates: { title: string; narrative: string },
  ) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  // Row hover reveals the edit affordance (it stays keyboard-focusable
  // regardless — focus also reveals it, inside DraftedSlot).
  const [hovered, setHovered] = useState(false);
  const roman = ROMAN_UPPER[index] ?? String(index + 1);
  const week = index + 1;

  const nodeStyle: React.CSSProperties =
    state === 'drafted'
      ? {
          background: 'var(--cb-accent-emphasis)',
          border: '1px solid var(--cb-accent-emphasis)',
        }
      : state === 'drafting'
      ? {
          background: 'var(--cb-ground-page)',
          border: '1px solid var(--cb-accent-emphasis)',
        }
      : {
          background: 'var(--cb-ground-page)',
          border: '1px solid var(--cb-border-strong)',
        };

  const title = chapter?.title?.trim() ?? '';
  const narrative = chapter?.narrative?.trim() ?? '';
  const keyConcepts = chapter?.keyConcepts ?? [];
  const widgets = chapter?.widgets ?? [];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        padding: '14px 0 16px 24px',
        borderBottom: '0.5px solid var(--cb-border-subtle)',
      }}
    >
      {/* Node on the rail */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: -22,
          top: 18,
          width: 11,
          height: 11,
          borderRadius: 999,
          ...nodeStyle,
        }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '56px 1fr',
          alignItems: 'baseline',
          gap: 16,
        }}
      >
        {/* Gutter — Roman + week */}
        <div>
          <div
            className="cb-italic"
            style={{
              fontSize: 24,
              color:
                state === 'queued'
                  ? 'var(--cb-text-subtle)'
                  : 'var(--cb-accent-emphasis)',
              lineHeight: 1,
              fontVariationSettings: '"opsz" 20',
            }}
          >
            {roman}
          </div>
          <div
            className="cb-mono"
            style={{
              fontSize: 11.5,
              color: 'var(--cb-text-muted)',
              marginTop: 5,
              letterSpacing: '0.04em',
            }}
          >
            week {week}
          </div>
        </div>

        {/* Content */}
        <div style={{ minWidth: 0 }}>
          {state === 'drafted' && (
            <DraftedSlot
              title={title}
              narrative={narrative}
              keyConcepts={keyConcepts}
              widgets={widgets}
              expanded={expanded}
              onToggle={() => setExpanded((v) => !v)}
              editable={editable && !!chapter}
              rowHovered={hovered}
              onSave={(updates) => {
                if (chapter) onSaveChapter(chapter.number, updates);
              }}
            />
          )}
          {state === 'drafting' && (
            <DraftingSlot title={title} narrative={narrative} />
          )}
          {state === 'queued' && <QueuedSlot />}
        </div>
      </div>
    </div>
  );
}

function DraftedSlot({
  title,
  narrative,
  keyConcepts,
  widgets,
  expanded,
  onToggle,
  editable,
  rowHovered,
  onSave,
}: {
  title: string;
  narrative: string;
  keyConcepts: string[];
  widgets: WidgetSpec[];
  expanded: boolean;
  onToggle: () => void;
  editable: boolean;
  rowHovered: boolean;
  onSave: (updates: { title: string; narrative: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftNarrative, setDraftNarrative] = useState('');
  const [editFocused, setEditFocused] = useState(false);

  // If a regenerate kicks off mid-edit, drop back to the read view — an open
  // editor would otherwise hold stale drafts over the incoming chapter.
  useEffect(() => {
    if (!editable) setEditing(false);
  }, [editable]);

  const beginEdit = () => {
    setDraftTitle(title);
    setDraftNarrative(narrative);
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = () => {
    const trimmedTitle = draftTitle.trim();
    if (!trimmedTitle) return; // an empty title is never saved
    onSave({ title: trimmedTitle, narrative: draftNarrative.trim() });
    setEditing(false);
  };

  // Two concepts max — kicker is for scanning, not for cataloguing.
  // The week marker lives in the rail under the Roman numeral.
  const kicker =
    keyConcepts.length > 0 ? keyConcepts.slice(0, 2).join(' · ') : '';
  const isLong = narrative.length > 220;

  const kickerEl = kicker ? (
    <div
      className="cb-italic"
      style={{
        fontSize: 14.5,
        color: 'var(--cb-text-muted)',
        lineHeight: 1.4,
        marginBottom: 4,
      }}
    >
      {kicker}
    </div>
  ) : null;

  if (editing && editable) {
    return (
      <div>
        {kickerEl}
        <div style={{ display: 'grid', gap: 12 }}>
          <CodexInput
            label="Chapter title"
            size="lg"
            value={draftTitle}
            autoFocus
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
              }
              if (e.key === 'Escape') cancelEdit();
            }}
          />
          <CodexTextarea
            label="Narrative"
            rows={5}
            value={draftNarrative}
            onChange={(e) => setDraftNarrative(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') cancelEdit();
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveEdit();
            }}
          />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <CodexButton
              variant="primary"
              size="sm"
              onClick={saveEdit}
              disabled={!draftTitle.trim()}
            >
              Save
            </CodexButton>
            <CodexButton variant="ghost" size="sm" onClick={cancelEdit}>
              Cancel
            </CodexButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {kickerEl}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 500,
            fontVariationSettings: '"opsz" 18',
            color: 'var(--cb-text-default)',
            lineHeight: 1.25,
            letterSpacing: '-0.005em',
            minWidth: 0,
          }}
        >
          {title}
        </span>
        {editable && (
          <button
            type="button"
            onClick={beginEdit}
            onFocus={() => setEditFocused(true)}
            onBlur={() => setEditFocused(false)}
            className="cb-focus"
            aria-label={`Edit “${title}”`}
            style={{
              background: 'transparent',
              border: 0,
              padding: 0,
              cursor: 'pointer',
              color: 'var(--cb-accent-link)',
              textDecoration: 'underline',
              textDecorationThickness: '0.5px',
              textUnderlineOffset: 3,
              fontFamily: 'inherit',
              fontSize: 13.5,
              fontStyle: 'italic',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              opacity: rowHovered || editFocused ? 1 : 0,
              transition: 'opacity 150ms ease',
            }}
          >
            ✎ edit
          </button>
        )}
      </div>
      {narrative && (
        <div
          style={{
            fontSize: 17,
            lineHeight: 1.55,
            color: 'var(--cb-text-default)',
            ...(expanded
              ? {}
              : {
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }),
          }}
        >
          {narrative}
        </div>
      )}
      {narrative && isLong && (
        <button
          type="button"
          onClick={onToggle}
          className="cb-focus"
          style={{
            background: 'transparent',
            border: 0,
            padding: 0,
            cursor: 'pointer',
            color: 'var(--cb-accent-link)',
            textDecoration: 'underline',
            textDecorationThickness: '0.5px',
            textUnderlineOffset: 3,
            fontFamily: 'inherit',
            fontSize: 13.5,
            fontStyle: 'italic',
            marginTop: 6,
          }}
        >
          {expanded ? '↑ collapse' : '↓ read the full description'}
        </button>
      )}
      <WidgetPlan widgets={widgets} />
    </div>
  );
}

// ─── WidgetPlan (planned interactives) ────────────────────────────────────
//
// Quiet, secondary metadata: the chapter's planned interactive widgets from
// the syllabus. Hover a chip for the widget's description and rationale.
function WidgetPlan({ widgets }: { widgets: WidgetSpec[] }) {
  if (widgets.length === 0) return null;
  return (
    <div
      style={{
        marginTop: 10,
        display: 'flex',
        alignItems: 'baseline',
        flexWrap: 'wrap',
        gap: '6px 8px',
      }}
    >
      <span
        className="cb-sc"
        style={{
          fontSize: 12,
          color: 'var(--cb-text-muted)',
          letterSpacing: '0.14em',
        }}
      >
        interactives
      </span>
      {widgets.map((w, i) => {
        const detail = [w.description, w.rationale ? `Why: ${w.rationale}` : '']
          .filter(Boolean)
          .join(' — ');
        return (
          <span
            key={`${w.title}-${i}`}
            title={detail || undefined}
            style={{
              fontSize: 13,
              lineHeight: 1.5,
              color: 'var(--cb-text-muted)',
              border: '0.5px solid var(--cb-border-default)',
              borderRadius: 1.5,
              padding: '1px 8px',
              cursor: detail ? 'help' : 'default',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {w.title}
          </span>
        );
      })}
    </div>
  );
}

function DraftingSlot({
  title,
  narrative,
}: {
  title: string;
  narrative: string;
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          marginBottom: 4,
        }}
      >
        <span
          className="cb-italic"
          style={{
            fontSize: 14.5,
            color: 'var(--cb-accent-emphasis)',
            lineHeight: 1.4,
          }}
        >
          drafting
        </span>
        <PenStroke width={48} />
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 500,
          fontVariationSettings: '"opsz" 18',
          color: 'var(--cb-text-default)',
          lineHeight: 1.25,
          letterSpacing: '-0.005em',
          marginBottom: 6,
        }}
      >
        {title || (
          <span
            className="cb-italic"
            style={{ color: 'var(--cb-text-muted)', fontWeight: 400 }}
          >
            drafting title…
          </span>
        )}
      </div>
      {narrative && (
        <div
          style={{
            fontSize: 17,
            lineHeight: 1.55,
            color: 'var(--cb-text-muted)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {narrative}
        </div>
      )}
    </div>
  );
}

function QueuedSlot() {
  return (
    <div
      className="cb-italic"
      style={{
        fontSize: 14.5,
        color: 'var(--cb-text-subtle)',
        lineHeight: 1.4,
      }}
    >
      awaiting
    </div>
  );
}

// ─── SyllabusAside (pedagogical note) ───────────────────────────────────
//
// The course-wide concepts × chapters matrix lived here historically, but it
// muddied the syllabus stage (it implied learning outcomes when it was really
// concept overlap, and it would have gone stale on chapter revision). The
// proper learning-outcomes table is now a generated output on the Export page.

function SyllabusAside({ chapters }: { chapters: ChapterSyllabus[] }) {
  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PedagogicalNote chapters={chapters} />
    </aside>
  );
}

function PedagogicalNote({ chapters }: { chapters: ChapterSyllabus[] }) {
  const noteText = useMemo(() => {
    if (chapters.length < 2) {
      return 'The first chapter sets the language the rest of the course reads in. Subsequent chapters spiral back to its terms.';
    }
    const richest = [...chapters].sort(
      (a, b) =>
        (b.spacingConnections?.length ?? 0) - (a.spacingConnections?.length ?? 0),
    )[0];
    if (richest?.spacingConnections && richest.spacingConnections.length > 2) {
      const ref = richest.spacingConnections
        .slice(0, 3)
        .map((n) => ROMAN_UPPER[n - 1] ?? String(n))
        .join(', ');
      return `Chapter ${ROMAN_UPPER[richest.number - 1] ?? richest.number} pulls threads from earlier weeks (${ref}) — by design, the course spirals rather than marches.`;
    }
    return 'Concepts are introduced once, then revisited across chapters — spaced practice, not single passes.';
  }, [chapters]);

  return (
    <div
      style={{
        padding: '14px 16px',
        background: 'var(--cb-surface-sunken)',
        border: '1px solid var(--cb-border-default)',
        borderRadius: 2,
      }}
    >
      <div
        className="cb-sc"
        style={{
          fontSize: 12,
          color: 'var(--cb-accent-emphasis)',
          letterSpacing: '0.14em',
        }}
      >
        † Pedagogical note
      </div>
      <p
        className="cb-italic"
        style={{
          margin: '6px 0 0',
          fontSize: 14.5,
          lineHeight: 1.55,
          color: 'var(--cb-text-default)',
        }}
      >
        {noteText}
      </p>
    </div>
  );
}

// ─── PenStroke (shared) ──────────────────────────────────────────────────

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

// ─── helpers ─────────────────────────────────────────────────────────────

function pluralise(noun: string, n: number) {
  return n === 1 ? noun : `${noun}s`;
}
