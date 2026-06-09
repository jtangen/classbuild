import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUiStore } from '../../store/uiStore';
import type { MaterialKind } from '../../store/uiStore';
import { useCourseStore } from '../../store/courseStore';
import { CodexButton } from '../codex/Button';
import { Colophon } from '../codex/Colophon';

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
            {isGenerating && (
              <span
                className="cb-sc cb-mono"
                style={{
                  fontSize: 12,
                  letterSpacing: '0.14em',
                  color: 'var(--cb-accent-emphasis)',
                }}
              >
                drafting
              </span>
            )}

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
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--cb-status-success, #3d5c33)',
                    opacity: 0.85,
                  }}
                />
                Saved · {formatSavedAgo(lastSavedAt, now)}
              </span>
            )}

            {!isLanding && persistError && (
              <button
                type="button"
                className="cb-mono cb-focus"
                title={`${persistError} — click to retry the save.`}
                onClick={() => {
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
                  cursor: 'pointer',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--cb-status-danger, #a03535)',
                  }}
                />
                Save failed — retry
              </button>
            )}

            {!isLanding && !isGenerating && (
              <CodexButton variant="ghost" size="sm" onClick={handleNewCourse}>
                + new course
              </CodexButton>
            )}
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showConfirm && (
          <ResetConfirmDialog
            onConfirm={confirmReset}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function ResetConfirmDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(26,24,20,0.42)',
        padding: 16,
      }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16 }}
        style={{
          background: 'var(--cb-surface-raised)',
          border: '1px solid var(--cb-border-default)',
          borderRadius: 3,
          padding: '28px 32px',
          maxWidth: 440,
          width: '100%',
          boxShadow: 'var(--cb-shadow-modal)',
          fontFamily: 'var(--font-cb-serif)',
          color: 'var(--cb-text-default)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="cb-sc"
          style={{
            fontSize: 13,
            letterSpacing: '0.16em',
            color: 'var(--cb-accent-emphasis)',
          }}
        >
          confirm
        </div>
        <h3
          style={{
            margin: '6px 0 10px',
            fontSize: 24,
            fontWeight: 500,
            fontVariationSettings: '"opsz" 20',
            letterSpacing: '-0.005em',
            color: 'var(--cb-text-default)',
          }}
        >
          Start a <span className="cb-italic">new</span> course?
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            lineHeight: 1.55,
            color: 'var(--cb-text-muted)',
            fontStyle: 'italic',
          }}
        >
          This will clear your current syllabus, research, and any generated classes.
          Local-only — nothing is sent anywhere. To keep a copy first, download a
          project file from the Export page.
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            marginTop: 22,
          }}
        >
          <CodexButton variant="ghost" onClick={onCancel}>
            Cancel
          </CodexButton>
          <CodexButton variant="destructive" onClick={onConfirm}>
            Start new course
          </CodexButton>
        </div>
      </motion.div>
    </motion.div>
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
