import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import {
  CHAPTER_THEMES,
  type ChapterThemeId,
  wrapChapterHtml,
} from '../../themes';
import { PREVIEW_CHAPTER_FRAGMENT } from './themePreviewSample';

interface ThemePreviewOverlayProps {
  /** Which theme to render the sample chapter in. Mount the overlay only
   *  when this is set; pass `null` to keep it unmounted. */
  themeId: ChapterThemeId | null;
  /** Close the overlay (Esc, outside-click, or the close button). */
  onClose: () => void;
  /** Persist the currently-previewed theme as the picked theme. */
  onPick: (id: ChapterThemeId) => void;
}

const FOCUSABLE =
  'button:not([disabled]), iframe, [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Invisible, focusable edge marker for the focus trap. */
const GUARD_STYLE: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  opacity: 0,
  pointerEvents: 'none',
};

/**
 * Shared full-bleed preview overlay. Used by both the Export picker
 * (3×2 card grid) and the Setup picker (compact 6-tile row) — single source
 * of truth for what a chapter looks like in each theme.
 *
 * A modal dialog for keyboard users too: focus moves in on open (to the close
 * button), Tab and Shift+Tab stay inside — including through the preview
 * iframe, via guard elements at both edges — Escape closes even from inside
 * the iframe, and focus returns to whatever opened it.
 */
export function ThemePreviewOverlay({
  themeId,
  onClose,
  onPick,
}: ThemePreviewOverlayProps) {
  const previewHtml = useMemo(() => {
    if (!themeId) return '';
    return wrapChapterHtml(PREVIEW_CHAPTER_FRAGMENT, themeId, 'Preview');
  }, [themeId]);

  const dialogRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Latest onClose for listeners attached inside the iframe document.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const focusables = useCallback(
    () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []),
    [],
  );
  const focusFirst = useCallback(() => focusables()[0]?.focus(), [focusables]);
  const focusLast = useCallback(() => {
    const all = focusables();
    all[all.length - 1]?.focus();
  }, [focusables]);

  useEffect(() => {
    if (!themeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [themeId, onClose]);

  // Take focus on open; give it back to the opener on close.
  useEffect(() => {
    if (!themeId) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    // Safety net for focus that lands outside the dialog some other way.
    const onFocusIn = (e: FocusEvent) => {
      const dialog = dialogRef.current;
      if (dialog && e.target instanceof Node && !dialog.contains(e.target)) focusFirst();
    };
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      if (opener?.isConnected) opener.focus();
    };
  }, [themeId, focusFirst]);

  if (!themeId) return null;
  const theme = CHAPTER_THEMES.find((t) => t.id === themeId);
  const label = `Theme preview: ${theme?.name ?? themeId}`;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20, 17, 13, 0.78)',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        padding: 24,
        zIndex: 200,
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Shift+Tab off the first control wraps to the last. */}
      <div tabIndex={0} onFocus={focusLast} style={GUARD_STYLE} />
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 1100,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--cb-ground-page)',
          boxShadow: 'var(--cb-shadow-modal)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderBottom: '0.5px solid var(--cb-border-default)',
            background: 'var(--cb-ground-canvas)',
            fontFamily: 'var(--font-cb-serif)',
          }}
        >
          <span
            className="cb-sc"
            style={{
              fontSize: 11,
              letterSpacing: '0.16em',
              color: 'var(--cb-text-muted)',
            }}
          >
            preview · {theme?.name ?? themeId}
          </span>
          <div style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
            <button
              type="button"
              onClick={() => {
                onPick(themeId);
                onClose();
              }}
              className="cb-mono cb-focus"
              style={{
                background: 'var(--cb-accent-emphasis)',
                color: '#fff',
                border: 0,
                padding: '6px 14px',
                borderRadius: 2,
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              use this theme
            </button>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="cb-mono cb-focus"
              style={{
                background: 'transparent',
                border: 0,
                padding: 0,
                cursor: 'pointer',
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--cb-text-muted)',
              }}
              aria-label="Close preview"
            >
              close · esc
            </button>
          </div>
        </div>
        <iframe
          srcDoc={previewHtml}
          title={`Full chapter preview — ${themeId}`}
          sandbox="allow-scripts allow-same-origin"
          onLoad={(e) => {
            // Keys pressed inside the preview go to the iframe's own document,
            // so listen there too: Escape still closes.
            e.currentTarget.contentDocument?.addEventListener('keydown', (ev) => {
              if (ev.key === 'Escape') onCloseRef.current();
            });
          }}
          style={{
            flex: 1,
            width: '100%',
            minHeight: 0,
            border: 0,
            display: 'block',
            background: 'var(--cb-ground-page)',
          }}
        />
      </div>
      {/* Tab off the last control (or out of the iframe) wraps to the first. */}
      <div tabIndex={0} onFocus={focusFirst} style={GUARD_STYLE} />
    </div>
  );
}
