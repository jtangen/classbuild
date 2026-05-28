import { useEffect, useState } from 'react';
import {
  CHAPTER_THEMES,
  DEFAULT_CHAPTER_THEME_ID,
  FONTS_URL,
  type ChapterTheme,
  type ChapterThemeId,
} from '../../themes';
import { ThemePreviewOverlay } from '../export/ThemePreviewOverlay';

interface CourseStylePickerProps {
  value: ChapterThemeId | string | undefined;
  onChange: (id: ChapterThemeId) => void;
}

/**
 * Six tangible theme sample cards. Each card is a real micro-chapter rendered
 * in the theme's actual fonts and palette — chapter eyebrow, italic title, a
 * paragraph of body, and a small meta strip. No iframes, no JS, just CSS
 * variables.
 *
 * Fonts for all six themes are loaded on mount via a single Google Fonts link
 * so type renders correctly the first time the card paints. (They're not in
 * the global index.css to keep the initial bundle lean — only the chrome
 * fonts ship by default.)
 */
export function CourseStylePicker({ value, onChange }: CourseStylePickerProps) {
  const [overlayId, setOverlayId] = useState<ChapterThemeId | null>(null);
  const selected =
    CHAPTER_THEMES.find((t) => t.id === value) ??
    CHAPTER_THEMES.find((t) => t.id === DEFAULT_CHAPTER_THEME_ID)!;

  // Lazy-load all six themes' fonts on mount so the sample cards render
  // correctly the moment the user opens this section. ~18 KB on the wire,
  // cached afterwards.
  useEffect(() => {
    const id = 'cb-theme-sample-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = FONTS_URL;
    document.head.appendChild(link);
    // Don't remove on unmount — leave cached for the rest of the session.
  }, []);

  return (
    <div>
      <div
        className="cb-sc"
        style={{
          fontSize: 13,
          color: 'var(--cb-text-muted)',
          letterSpacing: '0.12em',
          marginBottom: 6,
        }}
      >
        Course style
      </div>

      <div
        className="cb-italic"
        style={{
          fontSize: 13.5,
          color: 'var(--cb-text-muted)',
          lineHeight: 1.45,
          marginBottom: 12,
          maxWidth: '64ch',
        }}
      >
        How exported chapters and slides look. Each card below is a real
        micro-chapter rendered in the theme's actual fonts and palette — what
        you see is what your readers will see. You can change this on Export.
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 14,
        }}
      >
        {CHAPTER_THEMES.map((t) => {
          const isSelected = selected.id === t.id;
          const accent = t.palette[2];
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className="cb-focus"
              aria-pressed={isSelected}
              aria-label={`Course style: ${t.name}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                background: 'var(--cb-ground-page)',
                border: isSelected ? `1.5px solid ${accent}` : '1px solid var(--cb-border-default)',
                borderRadius: 3,
                cursor: 'pointer',
                fontFamily: 'var(--font-cb-serif)',
                color: 'var(--cb-text-default)',
                textAlign: 'left',
                overflow: 'hidden',
                transition: 'border-color 160ms ease, transform 160ms ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'var(--cb-border-strong)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'var(--cb-border-default)';
                }
              }}
            >
              {/* Card head — Codex chrome */}
              <div
                style={{
                  padding: '10px 14px 9px',
                  borderBottom: '0.5px solid var(--cb-border-default)',
                  background: 'var(--cb-surface-sunken)',
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <span
                  className="cb-italic"
                  style={{
                    fontSize: 14.5,
                    color: 'var(--cb-text-default)',
                    fontVariationSettings: '"opsz" 14',
                  }}
                >
                  {t.name}
                </span>
                <span
                  className="cb-italic"
                  style={{
                    fontSize: 11.5,
                    color: 'var(--cb-text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '60%',
                  }}
                  title={t.pitch}
                >
                  {firstClause(t.pitch)}
                </span>
              </div>

              {/* Sample — themed typography on themed background */}
              <SampleBlock theme={t} />

              {/* Foot — palette swatches */}
              <div
                style={{
                  display: 'flex',
                  borderTop: '0.5px solid var(--cb-border-default)',
                }}
                aria-hidden
              >
                {t.palette.slice(0, 5).map((c, i) => (
                  <span
                    key={i}
                    style={{
                      flex: 1,
                      height: 10,
                      background: c,
                      display: 'inline-block',
                    }}
                  />
                ))}
              </div>

              {isSelected && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 8,
                    height: 8,
                    background: accent,
                    borderRadius: '50%',
                    boxShadow: '0 0 0 3px var(--cb-ground-page)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Full preview link */}
      <div style={{ marginTop: 14 }}>
        <button
          type="button"
          onClick={() => setOverlayId(selected.id)}
          className="cb-mono cb-focus"
          style={{
            background: 'transparent',
            border: 0,
            padding: 0,
            cursor: 'pointer',
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--cb-text-muted)',
          }}
        >
          full {selected.name} preview ↗
        </button>
      </div>

      <ThemePreviewOverlay
        themeId={overlayId}
        onClose={() => setOverlayId(null)}
        onPick={(id) => onChange(id)}
      />
    </div>
  );
}

/**
 * A tiny "real" chapter rendered in the theme's actual fonts and palette.
 * Lives inside the theme-coloured background, no chrome leaks in.
 */
function SampleBlock({ theme }: { theme: ChapterTheme }) {
  const [bg, text, accent, , surface] = theme.palette;
  return (
    <div
      style={{
        background: bg,
        color: text,
        padding: '16px 18px 14px',
        minHeight: 168,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontFamily: theme.monoFont,
          fontSize: 9.5,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: accent,
          marginBottom: 10,
        }}
      >
        {theme.sample.eyebrow}
      </div>
      <div
        style={{
          fontFamily: theme.displayFont,
          fontSize: 22,
          lineHeight: 1.15,
          letterSpacing: '-0.005em',
          color: text,
          marginBottom: 10,
          fontStyle: theme.id === 'studio' ? 'italic' : 'normal',
        }}
      >
        {theme.sample.title}
      </div>
      <p
        style={{
          fontFamily: theme.bodyFont,
          fontSize: 11.5,
          lineHeight: 1.55,
          color: text,
          margin: 0,
          opacity: 0.78,
          maxWidth: '34ch',
        }}
      >
        The earliest record dates to <em style={{ color: accent, fontStyle: 'italic' }}>1547</em>, when the practice
        spread north from the Italian peninsula and reshaped the way scholars
        catalogued the new continent's flora.
      </p>
      {/* Decorative accent rule */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          bottom: 12,
          left: 18,
          width: 24,
          height: 1,
          background: accent,
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 28,
          background: surface,
          opacity: 0.5,
        }}
      />
    </div>
  );
}

function firstClause(pitch: string): string {
  const idx = pitch.indexOf('.');
  if (idx === -1) return pitch;
  return pitch.slice(0, idx + 1);
}
