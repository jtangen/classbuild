import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CodexButton as Button } from '../codex';
import { useDialogFocus } from './useDialogFocus';

/**
 * Drawer that slides in from the right when the user clicks a chapter image.
 * Shows a thumbnail of the current render, the original prompt (editable when
 * an OpenAI key is present, read-only otherwise), and a Regenerate button that
 * re-runs gpt-image-2 against just this one image. A figure whose render
 * failed (src null) opens it too, to try again.
 */
export function ChapterImageRefineDrawer({
  state,
  draft,
  onDraftChange,
  onClose,
  onRefine,
  isRefining,
  hasOpenAiKey,
  error,
  onAddKey,
}: {
  state: { idx: number; prompt: string; aspect: string; src: string | null } | null;
  draft: string;
  onDraftChange: (text: string) => void;
  onClose: () => void;
  onRefine: () => void;
  isRefining: boolean;
  hasOpenAiKey: boolean;
  error: string | null;
  onAddKey: () => void;
}) {
  // Esc closes it, as the shortcuts overlay promises. Safe mid-render: the
  // render keeps going and the image swaps in when done.
  const open = state !== null;
  // Focus lands in the prompt (or the panel while it's disabled mid-render),
  // Tab stays inside, and closing hands focus back to the reading.
  const panelRef = useRef<HTMLElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  useDialogFocus(open, panelRef, promptRef);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {state && (
        <>
          {/* Scrim is interactive only when the render is idle. While
              gpt-image-2 runs, we drop it to pointer-events:none so the user
              can still scroll the chapter, switch tabs, or navigate — the
              render keeps going regardless and the image swaps in when done. */}
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: isRefining ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(20, 17, 13, 0.36)',
              // Above the app header (50), like the shortcuts overlay.
              zIndex: 60,
              cursor: 'pointer',
              pointerEvents: isRefining ? 'none' : 'auto',
            }}
          />
          <motion.aside
            key="drawer"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cb-figure-refine-title"
            tabIndex={-1}
            initial={{ x: 480, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 480, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 32 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(480px, 92vw)',
              background: 'var(--cb-ground-page)',
              borderLeft: '1px solid var(--cb-border-default)',
              boxShadow: '-12px 0 36px rgba(20,17,13,0.16)',
              zIndex: 61,
              outline: 'none',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'var(--font-cb-serif)',
            }}
          >
            <header
              style={{
                padding: '20px 24px 16px',
                borderBottom: '0.5px solid var(--cb-border-default)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <div>
                <div
                  className="cb-sc"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.16em',
                    color: 'var(--cb-accent-emphasis)',
                    marginBottom: 4,
                  }}
                >
                  {state.src ? 'Refine image' : 'Image not drawn'}
                </div>
                <h2
                  id="cb-figure-refine-title"
                  style={{
                    margin: 0,
                    fontSize: 22,
                    fontWeight: 500,
                    fontVariationSettings: '"opsz" 20',
                    color: 'var(--cb-text-default)',
                    lineHeight: 1.2,
                  }}
                >
                  Figure {state.idx + 1}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="cb-focus pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                style={{
                  background: 'none',
                  border: 0,
                  padding: 6,
                  cursor: 'pointer',
                  color: 'var(--cb-text-muted)',
                  fontSize: 18,
                  lineHeight: 1,
                }}
                title={isRefining ? 'Close (render keeps going in the background)' : 'Close'}
              >
                ✕
              </button>
            </header>

            <div style={{ padding: '18px 24px', overflowY: 'auto', flex: 1 }}>
              <div
                style={{
                  marginBottom: 18,
                  border: '0.5px solid var(--cb-border-default)',
                  borderRadius: 2,
                  overflow: 'hidden',
                  background: 'var(--cb-surface-sunken)',
                }}
              >
                {state.src ? (
                  <img
                    src={state.src}
                    alt={`Figure ${state.idx + 1} current render`}
                    style={{
                      display: 'block',
                      width: '100%',
                      height: 'auto',
                      maxHeight: 280,
                      objectFit: 'contain',
                      opacity: isRefining ? 0.4 : 1,
                      transition: 'opacity 240ms ease',
                    }}
                  />
                ) : (
                  <p
                    className="cb-italic"
                    style={{
                      margin: 0,
                      padding: '28px 16px',
                      textAlign: 'center',
                      fontSize: 13.5,
                      lineHeight: 1.5,
                      color: 'var(--cb-text-muted)',
                    }}
                  >
                    This figure couldn't be drawn the first time.
                  </p>
                )}
              </div>

              <div
                className="cb-sc"
                style={{
                  fontSize: 11.5,
                  letterSpacing: '0.14em',
                  color: 'var(--cb-text-muted)',
                  marginBottom: 6,
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                }}
              >
                <span>Image prompt · {state.aspect}</span>
                {hasOpenAiKey && draft !== state.prompt && !isRefining && (
                  <button
                    type="button"
                    onClick={() => onDraftChange(state.prompt)}
                    className="cb-italic"
                    style={{
                      background: 'none',
                      border: 0,
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: 11.5,
                      color: 'var(--cb-text-muted)',
                      textTransform: 'none',
                      letterSpacing: 0,
                    }}
                  >
                    ← reset
                  </button>
                )}
              </div>
              <textarea
                ref={promptRef}
                aria-label="Image prompt"
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                readOnly={!hasOpenAiKey}
                disabled={isRefining}
                rows={10}
                spellCheck={false}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontFamily: 'var(--font-cb-mono)',
                  fontSize: 13,
                  lineHeight: 1.55,
                  background: 'var(--cb-ground-canvas)',
                  border: '0.5px solid var(--cb-border-default)',
                  borderRadius: 2,
                  color: 'var(--cb-text-default)',
                  resize: 'vertical',
                  outline: 'none',
                  opacity: isRefining ? 0.6 : !hasOpenAiKey ? 0.85 : 1,
                  cursor: !hasOpenAiKey ? 'default' : undefined,
                }}
              />
              {!hasOpenAiKey && (
                <p
                  className="cb-italic"
                  style={{
                    margin: '10px 0 0',
                    fontSize: 12.5,
                    color: 'var(--cb-text-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  {state.src ? 'This is the prompt that built the image above.' : "This is the figure's prompt."}{' '}
                  Add an OpenAI key to edit it and draw just this one figure.
                </p>
              )}

              {error && (
                <p
                  style={{
                    margin: '12px 0 0',
                    padding: '10px 12px',
                    background: 'var(--cb-status-danger-bg, rgba(160, 53, 53, 0.08))',
                    borderLeft: '2px solid var(--cb-status-danger, #a03535)',
                    fontSize: 13,
                    color: 'var(--cb-text-default)',
                    lineHeight: 1.5,
                  }}
                >
                  {error}
                </p>
              )}

              {isRefining && (
                <p
                  className="cb-italic"
                  style={{
                    margin: '14px 0 0',
                    fontSize: 13,
                    color: 'var(--cb-text-muted)',
                    lineHeight: 1.55,
                  }}
                >
                  Rendering through gpt-image-2 — typically 30–60 seconds.
                  Feel free to close this drawer and scroll around; we'll swap
                  the image in place when it's ready.
                </p>
              )}
            </div>

            <footer
              style={{
                padding: '14px 24px 20px',
                borderTop: '0.5px solid var(--cb-border-default)',
                display: 'flex',
                gap: 10,
                justifyContent: 'flex-end',
                alignItems: 'baseline',
              }}
            >
              <Button variant="ghost" size="sm" onClick={onClose}>
                {isRefining ? 'Close — keep rendering' : 'Cancel'}
              </Button>
              {!hasOpenAiKey ? (
                <Button onClick={onAddKey} size="sm">
                  Add OpenAI key →
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={onRefine}
                  disabled={isRefining || !draft.trim()}
                >
                  {isRefining ? 'Rendering…' : state.src ? 'Regenerate ↻' : 'Try again ↻'}
                </Button>
              )}
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
