import type { ReactNode } from 'react';

/**
 * Canonical container for every per-chapter artefact in BuildPage.
 *
 * Each tab — Reading, Quiz, Audio, Slides, Discussion, etc. — should wrap its
 * preview in this shell so the chrome reads as one design language: small
 * uppercase kicker label on the left, italic title beside it, optional meta
 * line in muted italic, and a right-aligned actions cluster. The body is a
 * free-form children slot; an optional foot slot sits below for metadata
 * strips or secondary controls.
 *
 * The shell is decoration only — generation state, downloads, refines, and
 * all per-artefact behaviour stay with the calling tab. The shell just
 * guarantees the *outside* of every artefact looks like every other.
 */
export interface ArtifactShellProps {
  /** Small uppercase SC label, e.g. "Slides", "Reading", "Audio". */
  kicker: string;
  /** Plain-language title for what's inside (italic). */
  title?: ReactNode;
  /** Optional muted meta line — counts, status, etc. */
  meta?: ReactNode;
  /** Right-aligned action cluster (buttons, chips). */
  actions?: ReactNode;
  /** Optional foot rule + content (e.g. summary metrics). */
  foot?: ReactNode;
  /** Body content. */
  children: ReactNode;
  /** When true, render the body without a border-bordered card (useful for
   *  full-bleed iframes or single-image previews). Header still renders. */
  bodyless?: boolean;
}

export function ArtifactShell({
  kicker,
  title,
  meta,
  actions,
  foot,
  children,
  bodyless,
}: ArtifactShellProps) {
  return (
    <section
      style={{
        background: 'var(--cb-ground-page)',
        border: '1px solid var(--cb-border-default)',
        borderRadius: 2,
        overflow: 'hidden',
        fontFamily: 'var(--font-cb-serif)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          padding: '14px 20px',
          background: 'var(--cb-surface-sunken)',
          borderBottom: '0.5px solid var(--cb-border-default)',
        }}
      >
        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
          <div
            className="cb-sc"
            style={{
              fontSize: 11,
              letterSpacing: '0.14em',
              color: 'var(--cb-text-muted)',
              marginBottom: title ? 4 : 0,
            }}
          >
            {kicker}
          </div>
          {title && (
            <div
              className="cb-italic"
              style={{
                fontSize: 16,
                color: 'var(--cb-text-default)',
                lineHeight: 1.3,
                fontVariationSettings: '"opsz" 14',
              }}
            >
              {title}
            </div>
          )}
          {meta && (
            <div
              className="cb-italic"
              style={{
                fontSize: 12.5,
                color: 'var(--cb-text-muted)',
                marginTop: 4,
                lineHeight: 1.4,
              }}
            >
              {meta}
            </div>
          )}
        </div>
        {actions && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            {actions}
          </div>
        )}
      </header>
      {bodyless ? (
        children
      ) : (
        <div style={{ padding: '20px 22px' }}>{children}</div>
      )}
      {foot && (
        <footer
          style={{
            padding: '12px 20px',
            borderTop: '0.5px solid var(--cb-border-rule)',
            background: 'var(--cb-surface-sunken)',
            fontSize: 12.5,
            color: 'var(--cb-text-muted)',
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          {foot}
        </footer>
      )}
    </section>
  );
}
