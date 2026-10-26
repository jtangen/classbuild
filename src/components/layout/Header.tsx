import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUiStore } from '../../store/uiStore';
import type { MaterialKind } from '../../store/uiStore';
import { useCourseStore } from '../../store/courseStore';
import { isPersistenceBlocked } from '../../store/idbStorage';
import { CodexButton } from '../codex/Button';
import { CodexModal } from '../codex/Modal';
import { Colophon } from '../codex/Colophon';
import { useCourseBusy } from './useCourseBusy';

const ROMAN_LOWER = [
  'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x',
  'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx',
];

const MATERIAL_LABELS: Record<MaterialKind, { label: string; tab: string }> = {
  quiz: { label: 'practice quiz', tab: 'quiz' },
  inclassquiz: { label: 'in-class', tab: 'inclassquiz' },
  weeklychallenge: { label: 'challenge', tab: 'weeklychallenge' },
  discussion: { label: 'discussion', tab: 'discussion' },
  activities: { label: 'activities', tab: 'activities' },
  audio: { label: 'audio', tab: 'audio' },
  slides: { label: 'slides', tab: 'slides' },
};

function formatSavedAgo(savedAt: number, now: number): string {
  const diff = Math.max(0, Math.floor((now - savedAt) / 1000));
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === '/';
  const {
    isGenerating,
    readingDraft,
    lastSavedAt,
    persistError,
    inFlight,
    slidesRender,
    batchGenerating,
    batchCurrentChapter,
    batchMaterial,
    setActiveTab,
    setSelectedChapterNum,
  } = useUiStore();
  const { reset, currentStage } = useCourseStore();
  // Not just isGenerating: a batch, slide render or per-material job keeps
  // writing into the course by chapter number, so resetting under it would
  // land the old course's output in the new one.
  const isBusy = useCourseBusy();
  // Read on render: persistError changes whenever this flag is set.
  const savingOff = persistError !== null && isPersistenceBlocked();
  const [showConfirm, setShowConfirm] = useState(false);

  // Re-tick the relative "Saved · Xs ago" label. Once per 5s is plenty:
  // the label only changes every 5s/1m boundary.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (lastSavedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, [lastSavedAt]);

  const hasProgress = currentStage !== 'landing' && currentStage !== 'setup';

  const handleNewCourse = () => {
    if (hasProgress) {
      setShowConfirm(true);
    } else {
      reset();
      navigate('/setup');
    }
  };

  const confirmReset = () => {
    setShowConfirm(false);
    reset();
    navigate('/setup');
  };

  return (
    <>
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: 'var(--cb-ground-page)',
          borderBottom: '0.5px solid var(--cb-border-rule)',
          fontFamily: 'var(--font-cb-serif)',
        }}
      >
        {/* In-flight pen-stroke — replaces the violet gradient shimmer. */}
        {isGenerating && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 1,
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                position: 'absolute',
                inset: 0,
                background: 'var(--cb-accent-emphasis)',
                animation: 'cb-pen 1.2s cubic-bezier(0.32,0.04,0.32,1) infinite',
              }}
            />
          </span>
        )}

        <div
          className="cb-header-inner"
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            height: 64,
            padding: '0 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 28,
          }}
        >
          {/* Colophon mark + wordmark. */}
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 14,
              textDecoration: 'none',
            }}
          >
            <Colophon size={36} />
            <span
              className="cb-italic"
              style={{
                fontSize: 24,
                color: 'var(--cb-text-default)',
                fontVariationSettings: '"opsz" 22',
                letterSpacing: '-0.01em',
                fontWeight: 500,
              }}
            >
              ClassBuild
              <span style={{ color: 'var(--cb-accent-emphasis)' }}>.</span>
            </span>
          </Link>

          {/* In-flight strip — visible across all pages so users can see what
              is generating in the background and jump back to that chapter. */}
          <InFlightStrip
            inFlight={inFlight}
            slidesRender={slidesRender}
            batchGenerating={batchGenerating}
            batchCurrentChapter={batchCurrentChapter}
            batchMaterial={batchMaterial}
            onJump={(chapterNum, tab) => {
              setSelectedChapterNum(chapterNum);
              setActiveTab(tab);
              if (location.pathname !== '/build') {
                navigate('/build');
              }
            }}
          />

          <span style={{ flex: 1 }} />

          {/* Right side: a quiet "Saved · Xs ago" reassurance + nav. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {isGenerating &&
              (readingDraft ? (
                // A Build reading draft: name its chapter and jump to it.
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChapterNum(readingDraft.chapterNum);
                    setActiveTab('chapter');
                    if (location.pathname !== '/build') navigate('/build');
                  }}
                  className="cb-sc cb-mono cb-focus"
                  title={`Class ${readingDraft.chapterNum} · ${readingDraft.mode === 'refine' ? 'revising' : 'drafting'} the reading (click to view)`}
                  style={{
                    fontSize: 12,
                    letterSpacing: '0.14em',
                    color: 'var(--cb-accent-emphasis)',
                    background: 'transparent',
                    border: 0,
                    padding: 0,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {readingDraft.mode === 'refine' ? 'revising' : 'drafting'}{' '}
                  {ROMAN_LOWER[readingDraft.chapterNum - 1] ?? readingDraft.chapterNum}
                </button>
              ) : (
                <span
                  className="cb-sc cb-mono"
                  style={{
                    fontSize: 12,
                    letterSpacing: '0.14em',
                    color: 'var(--cb-accent-emphasis)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  drafting
                </span>
              ))}

            {!isLanding && !isGenerating && lastSavedAt !== null && !persistError && (
              <span
                className="cb-mono"
                title={`Auto-saved to this browser at ${new Date(lastSavedAt).toLocaleTimeString()}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11.5,
                  color: 'var(--cb-text-muted)',
                  letterSpacing: '0.04em',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    flexShrink: 0,
                    borderRadius: '50%',
                    background: 'var(--cb-status-success, #3d5c33)',
                    opacity: 0.85,
                  }}
                />
                {/* Label hidden on phones (index.css); the dot + tooltip remain. */}
                <span className="cb-wide-only">Saved · {formatSavedAgo(lastSavedAt, now)}</span>
              </span>
            )}

            {!isLanding && persistError && (
              <button
                type="button"
                className="cb-mono cb-focus"
                // Saving switched off (storage unreadable): a retry can't
                // help, so say so instead of offering one.
                title={savingOff ? persistError : `${persistError} — click to retry the save.`}
                onClick={() => {
                  if (savingOff) return;
                  // A no-op set re-runs the persist middleware, which
                  // re-serializes the FULL current state; success clears
                  // this banner via idbStorage.
                  useCourseStore.setState({});
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11.5,
                  color: 'var(--cb-status-danger, #a03535)',
                  letterSpacing: '0.04em',
                  background: 'transparent',
                  border: '0.5px solid var(--cb-status-danger, #a03535)',
                  borderRadius: 2,
                  padding: '3px 9px 4px',
                  cursor: savingOff ? 'help' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    flexShrink: 0,
                    borderRadius: '50%',
                    background: 'var(--cb-status-danger, #a03535)',
                  }}
                />
                <span className="cb-wide-only">
                  {savingOff ? 'Not saving in this tab' : 'Save failed — retry'}
                </span>
                <span className="cb-narrow-only">{savingOff ? 'Not saving' : 'Not saved'}</span>
              </button>
            )}

            {!isLanding && !isBusy && (
              <CodexButton variant="ghost" size="sm" onClick={handleNewCourse}>
                + new course
              </CodexButton>
            )}
          </div>
        </div>
      </header>

      <CodexModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        kicker="confirm"
        title={
          <>
            Start a <span className="cb-italic">new</span> course?
          </>
        }
        sub="This will clear your current syllabus, research, and any generated classes. Local-only — nothing is sent anywhere. To keep a copy first, download a project file from the Export page."
        width={440}
        actions={
          <>
            <CodexButton variant="ghost" onClick={() => setShowConfirm(false)}>
              Cancel
            </CodexButton>
            <CodexButton variant="destructive" onClick={confirmReset}>
              Start new course
            </CodexButton>
          </>
        }
      >
        <></>
      </CodexModal>
    </>
  );
}

// ─── InFlightStrip ───────────────────────────────────────────────────────
//
// Small chip strip in the Header showing what is currently generating across
// the whole app — per-material in-flight items, the in-flight slide-deck
// render, and the batch "Generate all" progress. Click any chip to jump
// back to that chapter+tab on the Build page.

function InFlightStrip({
  inFlight,
  slidesRender,
  batchGenerating,
  batchCurrentChapter,
  batchMaterial,
  onJump,
}: {
  inFlight: Partial<Record<MaterialKind, number>>;
  slidesRender: { chapterNum: number; current: number; total: number; phase: string } | null;
  batchGenerating: boolean;
  batchCurrentChapter: number | null;
  batchMaterial: string | null;
  onJump: (chapterNum: number, tab: string) => void;
}) {
  // Collect inFlight entries (sorted by chapter then tab name for stability).
  const items: Array<{ chapter: number; tab: string; label: string }> = [];

  if (batchGenerating && batchCurrentChapter != null) {
    items.push({
      chapter: batchCurrentChapter,
      tab: 'chapter',
      label: `batch · ${batchMaterial ?? '…'}`,
    });
  }

  if (slidesRender) {
    items.push({
      chapter: slidesRender.chapterNum,
      tab: 'slides',
      label: `deck ${slidesRender.current}/${slidesRender.total}`,
    });
  }

  for (const [kind, chapter] of Object.entries(inFlight) as Array<[MaterialKind, number]>) {
    if (chapter == null) continue;
    // Don't double-list a slide that's also being rendered.
    if (slidesRender?.chapterNum === chapter && kind === 'slides') continue;
    const meta = MATERIAL_LABELS[kind];
    if (!meta) continue;
    items.push({ chapter, tab: meta.tab, label: meta.label });
  }

  if (items.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        flexWrap: 'nowrap',
        alignItems: 'center',
        overflow: 'hidden',
        maxWidth: '50vw',
        marginLeft: 18,
      }}
    >
      {items.slice(0, 5).map((it, i) => {
        const roman = ROMAN_LOWER[it.chapter - 1] ?? String(it.chapter);
        return (
          <button
            key={`${it.chapter}-${it.tab}-${i}`}
            type="button"
            onClick={() => onJump(it.chapter, it.tab)}
            className="cb-focus cb-mono"
            title={`Class ${it.chapter} · ${it.label} (click to view)`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 9px 5px',
              background: 'var(--cb-accent-emphasis-quiet)',
              border: '0.5px solid var(--cb-accent-emphasis)',
              borderRadius: 2,
              fontSize: 10.5,
              letterSpacing: '0.06em',
              color: 'var(--cb-accent-emphasis)',
              cursor: 'pointer',
              fontFamily: 'var(--font-cb-mono)',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: 'var(--cb-accent-emphasis)',
                animation: 'cb-pulse 1.4s ease-in-out infinite',
              }}
            />
            <span className="cb-italic" style={{ fontStyle: 'italic' }}>{roman}</span>
            <span>{it.label}</span>
          </button>
        );
      })}
      {items.length > 5 && (
        <span
          className="cb-mono"
          style={{
            fontSize: 10.5,
            color: 'var(--cb-text-muted)',
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
          }}
        >
          +{items.length - 5}
        </span>
      )}
    </div>
  );
}
