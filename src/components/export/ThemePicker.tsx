import { useMemo, useState } from 'react';
import {
  CHAPTER_THEMES,
  type ChapterThemeId,
  wrapChapterHtml,
} from '../../themes';
import { buildPreviewHeaderFragment } from './themePreviewSample';
import { ThemePreviewOverlay } from './ThemePreviewOverlay';

interface ThemePickerProps {
  selectedId: ChapterThemeId;
  onSelect: (id: ChapterThemeId) => void;
}

export function ThemePicker({ selectedId, onSelect }: ThemePickerProps) {
  const [overlayId, setOverlayId] = useState<ChapterThemeId | null>(null);

  // Build mini-preview HTML once per theme — they don't change.
  const cardHtml = useMemo(
    () =>
      Object.fromEntries(
        CHAPTER_THEMES.map((t) => [
          t.id,
          wrapChapterHtml(
            buildPreviewHeaderFragment(t.sample.eyebrow, t.sample.title),
            t.id,
            t.sample.title,
          ),
        ]),
      ) as Record<ChapterThemeId, string>,
    [],
  );

  return (
    <section
      style={{
        marginBottom: 32,
        padding: '24px 28px',
        background: 'var(--cb-ground-canvas)',
        border: '0.5px solid var(--cb-border-default)',
        borderRadius: 3,
        fontFamily: 'var(--font-cb-serif)',
        color: 'var(--cb-text-default)',
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <div
          className="cb-sc"
          style={{
            fontSize: 12,
            letterSpacing: '0.16em',
            color: 'var(--cb-accent-emphasis)',
          }}
        >
          Course theme
        </div>
        <h2
          style={{
            margin: '4px 0 6px',
            fontSize: 24,
            fontWeight: 500,
            letterSpacing: '-0.005em',
            fontVariationSettings: '"opsz" 22',
          }}
        >
          Choose how the readings <em>look</em>.
        </h2>
        <p
          className="cb-italic"
          style={{
            margin: 0,
            fontSize: 13.5,
            color: 'var(--cb-text-muted)',
            lineHeight: 1.45,
          }}
        >
          Set in Setup; change here if you want to try another.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          // Six themes, two symmetric rows of three. Forced — auto-fit would
          // pack 4 onto row 1 at the page's typical width and leave the
          // final two stranded on row 2.
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 14,
        }}
      >
        {CHAPTER_THEMES.map((t) => {
          const isSelected = t.id === selectedId;
          const accent = t.palette[2];
          return (
            <article
              key={t.id}
              style={{
                background: 'var(--cb-ground-page)',
                border: isSelected ? `1.5px solid ${accent}` : '0.5px solid var(--cb-border-default)',
                borderRadius: 3,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'border-color 200ms ease, transform 200ms ease',
                position: 'relative',
              }}
              onClick={() => onSelect(t.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(t.id);
                }
              }}
              tabIndex={0}
              role="button"
              aria-pressed={isSelected}
              aria-label={`Select ${t.name} theme`}
            >
              {/* Mini-preview iframe — 16:9 reads more like a slide thumb than
                  a chapter book; matches the content density better than 4:3. */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 9',
                  overflow: 'hidden',
                  background: t.palette[0],
                  pointerEvents: 'none',
                }}
              >
                <iframe
                  srcDoc={cardHtml[t.id]}
                  title={`${t.name} preview`}
                  sandbox="allow-same-origin"
                  scrolling="no"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '250%',
                    height: '250%',
                    border: 0,
                    transformOrigin: 'top left',
                    transform: 'scale(0.4)',
                  }}
                />
              </div>

              {/* Card foot */}
              <div
                style={{
                  padding: '9px 11px 10px',
                  borderTop: '0.5px solid var(--cb-border-default)',
                  background: 'var(--cb-ground-canvas)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginBottom: 3,
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: 'var(--cb-text-default)',
                      fontVariationSettings: '"opsz" 13',
                    }}
                  >
                    {t.name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOverlayId(t.id);
                    }}
                    className="cb-mono cb-focus"
                    style={{
                      background: 'transparent',
                      border: 0,
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: 9.5,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--cb-text-muted)',
                    }}
                    aria-label={`Preview full chapter in ${t.name}`}
                  >
                    preview ↗
                  </button>
                </div>
                <p
                  className="cb-italic"
                  style={{
                    margin: '0 0 7px',
                    fontSize: 11.5,
                    lineHeight: 1.35,
                    color: 'var(--cb-text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                  }}
                  title={t.pitch}
                >
                  {t.pitch}
                </p>
                <div style={{ display: 'flex', gap: 3 }}>
                  {t.palette.map((c, i) => (
                    <span
                      key={i}
                      title={c}
                      style={{
                        width: 10,
                        height: 10,
                        background: c,
                        border: '0.5px solid rgba(0,0,0,0.18)',
                        borderRadius: 2,
                        display: 'inline-block',
                      }}
                    />
                  ))}
                </div>
              </div>

              {isSelected && (
                <span
                  className="cb-mono"
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    background: accent,
                    color: '#fff',
                    fontSize: 8.5,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    borderRadius: 2,
                    zIndex: 1,
                  }}
                >
                  selected
                </span>
              )}
            </article>
          );
        })}
      </div>

      <ThemePreviewOverlay
        themeId={overlayId}
        onClose={() => setOverlayId(null)}
        onPick={onSelect}
      />
    </section>
  );
}
