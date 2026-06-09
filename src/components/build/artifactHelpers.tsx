import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CodexButton as Button } from '../codex';

/**
 * Shared chrome for per-chapter artefacts on BuildPage tabs. Three roles:
 *
 *   - ArtifactPreviewFrame — bordered card with mono-labelled head + optional
 *     download button + body slot. Used for iframe-based previews (Quiz,
 *     Reading, etc.).
 *   - ArtifactStatusLine — the "drafting…" pen-stroke status row that shows
 *     while a particular artefact is generating.
 *   - ArtifactEmpty — the "nothing here yet" empty state with a primary CTA
 *     and optional secondary action.
 *   - KeyRequiredEmpty — heavier weight empty state for tabs gated by a
 *     missing API key (OpenAI for Slides, ElevenLabs for Audio narration).
 *   - KeyMissingBanner — compact inline banner above a partially-usable
 *     artefact, with an "Add key →" CTA.
 *
 * Lived in BuildPage.tsx; pulled out so each extracted tab component can
 * import what it needs without touching the page file.
 */

export function ArtifactPreviewFrame({
  title,
  downloadLabel,
  onDownload,
  children,
}: {
  title: string;
  downloadLabel?: string;
  onDownload?: () => void;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: 'var(--cb-ground-page)',
        border: '1px solid var(--cb-border-default)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          padding: '12px 18px',
          background: 'var(--cb-surface-sunken)',
          borderBottom: '0.5px solid var(--cb-border-default)',
          gap: 16,
        }}
      >
        <span
          className="cb-mono"
          style={{
            fontSize: 12.5,
            color: 'var(--cb-text-muted)',
            letterSpacing: '0.04em',
          }}
        >
          {title}
        </span>
        {onDownload && (
          <Button size="sm" variant="ghost" onClick={onDownload}>
            {downloadLabel ?? 'Download ↓'}
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

export function ArtifactStatusLine({
  children,
  onStop,
}: {
  children: ReactNode;
  /** When provided, renders a quiet "stop" control that cancels the
   *  generation this line reports on. */
  onStop?: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'baseline',
        padding: '20px 22px',
        background: 'var(--cb-surface-sunken)',
        border: '1px solid var(--cb-border-default)',
        borderRadius: 2,
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: 48,
          height: 1,
          background: 'var(--cb-border-default)',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
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
      <span
        className="cb-italic"
        style={{
          fontSize: 14.5,
          color: 'var(--cb-text-muted)',
          lineHeight: 1.55,
          flex: 1,
          minWidth: 0,
        }}
      >
        {children}
      </span>
      {onStop && (
        <button
          type="button"
          onClick={onStop}
          className="cb-mono"
          title="Stop generating — nothing is saved from a stopped draft"
          style={{
            flexShrink: 0,
            background: 'none',
            border: '0.5px solid var(--cb-border-default)',
            borderRadius: 2,
            padding: '3px 10px',
            fontSize: 11,
            letterSpacing: '0.08em',
            color: 'var(--cb-text-muted)',
            cursor: 'pointer',
          }}
        >
          stop
        </button>
      )}
    </div>
  );
}

export function ArtifactEmpty({
  kicker,
  title,
  body,
  cta,
  onCta,
  disabled,
  secondaryCta,
  onSecondaryCta,
}: {
  kicker: string;
  title: string;
  body: string;
  cta: string;
  onCta: () => void;
  disabled?: boolean;
  secondaryCta?: string;
  onSecondaryCta?: () => void;
}) {
  return (
    <div
      style={{
        padding: '32px 28px',
        background: 'var(--cb-ground-page)',
        border: '1px solid var(--cb-border-default)',
        borderRadius: 2,
      }}
    >
      <div
        className="cb-sc"
        style={{
          fontSize: 11,
          color: 'var(--cb-text-muted)',
          letterSpacing: '0.14em',
        }}
      >
        {kicker}
      </div>
      <h3
        style={{
          margin: '6px 0 10px',
          fontSize: 22,
          fontWeight: 500,
          fontVariationSettings: '"opsz" 20',
          letterSpacing: '-0.005em',
          color: 'var(--cb-text-default)',
          lineHeight: 1.25,
        }}
      >
        {title}
      </h3>
      <p
        className="cb-italic"
        style={{
          margin: '0 0 20px',
          fontSize: 14.5,
          color: 'var(--cb-text-muted)',
          lineHeight: 1.55,
          maxWidth: '72ch',
        }}
      >
        {body}
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <Button onClick={onCta} disabled={disabled}>
          {cta}
        </Button>
        {secondaryCta && onSecondaryCta && (
          <Button variant="ghost" onClick={onSecondaryCta} disabled={disabled}>
            {secondaryCta}
          </Button>
        )}
      </div>
    </div>
  );
}

export function KeyRequiredEmpty({
  kicker,
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  secondaryDisabled,
}: {
  kicker: string;
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryDisabled?: boolean;
}) {
  return (
    <div
      style={{
        padding: '28px 28px 24px',
        background: 'var(--cb-ground-page)',
        border: '1px solid var(--cb-border-default)',
        borderRadius: 2,
      }}
    >
      <div
        className="cb-sc"
        style={{
          fontSize: 11,
          color: 'var(--cb-text-muted)',
          letterSpacing: '0.14em',
        }}
      >
        {kicker} · key required
      </div>
      <h3
        style={{
          margin: '6px 0 10px',
          fontSize: 22,
          fontWeight: 500,
          fontVariationSettings: '"opsz" 20',
          letterSpacing: '-0.005em',
          color: 'var(--cb-text-default)',
          lineHeight: 1.25,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: '0 0 18px',
          padding: '12px 14px',
          background: 'var(--cb-accent-emphasis-quiet)',
          borderLeft: '2px solid var(--cb-accent-emphasis)',
          borderRadius: 2,
          fontSize: 14.5,
          color: 'var(--cb-text-default)',
          lineHeight: 1.55,
          maxWidth: '72ch',
        }}
      >
        {body}
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Button onClick={onPrimary}>{primaryLabel}</Button>
        {secondaryLabel && onSecondary && (
          <Button variant="ghost" onClick={onSecondary} disabled={secondaryDisabled}>
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

export function KeyMissingBanner({
  tone,
  text,
  ctaLabel,
  onCta,
}: {
  tone: 'recommended' | 'optional';
  text: ReactNode;
  ctaLabel: string;
  onCta: () => void;
}) {
  const hard = tone === 'recommended';
  return (
    <div
      style={{
        padding: '12px 14px',
        background: hard
          ? 'var(--cb-accent-emphasis-quiet)'
          : 'var(--cb-surface-sunken)',
        border: `0.5px solid ${hard ? 'var(--cb-accent-emphasis)' : 'var(--cb-border-default)'}`,
        borderLeft: `2px solid ${hard ? 'var(--cb-accent-emphasis)' : 'var(--cb-text-muted)'}`,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        flexWrap: 'wrap',
      }}
    >
      <div
        style={{
          flex: '1 1 320px',
          minWidth: 0,
          fontSize: 14,
          color: 'var(--cb-text-default)',
          lineHeight: 1.55,
        }}
      >
        {text}
      </div>
      <Button size="sm" variant={hard ? 'primary' : 'secondary'} onClick={onCta}>
        {ctaLabel}
      </Button>
    </div>
  );
}

/**
 * One-time inline hint strip surfaced when a new affordance becomes relevant
 * for the first time. Dismisses with × or via a parent timer. Persistence
 * to localStorage is the parent's responsibility — this component renders.
 */
export function DiscoveryHint({
  text,
  onDismiss,
}: {
  text: string;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.24 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        margin: '0 0 12px',
        background: 'var(--cb-accent-emphasis-quiet)',
        border: '0.5px solid var(--cb-accent-emphasis)',
        borderLeft: '2px solid var(--cb-accent-emphasis)',
        borderRadius: 2,
        fontFamily: 'var(--font-cb-serif)',
        fontSize: 13.5,
        color: 'var(--cb-text-default)',
        lineHeight: 1.5,
      }}
    >
      <span style={{ flex: 1 }}>{text}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss hint"
        title="Dismiss"
        style={{
          background: 'none',
          border: 0,
          padding: 4,
          margin: 0,
          fontSize: 13,
          lineHeight: 1,
          color: 'var(--cb-text-muted)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </motion.div>
  );
}
