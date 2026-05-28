import { useEffect, useMemo } from 'react';
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

/**
 * Shared full-bleed preview overlay. Used by both the Export picker
 * (3×2 card grid) and the Setup picker (compact 6-tile row) — single source
 * of truth for what a chapter looks like in each theme.
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

  useEffect(() => {
    if (!themeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [themeId, onClose]);

  if (!themeId) return null;
  const theme = CHAPTER_THEMES.find((t) => t.id === themeId);

  return (
    <div
      role="dialog"
      aria-modal="true"
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
      <div
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
    </div>
  );
}
