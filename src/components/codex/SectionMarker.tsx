import type { ReactNode } from 'react';

interface SectionMarkerProps {
  /** Small-caps label. */
  label: string;
  /** Optional italic subhead to the right of the label. */
  sub?: ReactNode;
}

/**
 * Label-only form-group overline. Renders the label in small-caps muted ink
 * with a hairline rule beneath. The rule is the section break — no § symbol.
 */
export function SectionMarker({ label, sub }: SectionMarkerProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 12,
        paddingBottom: 10,
        marginBottom: 18,
        borderBottom: '0.5px solid var(--cb-border-rule)',
      }}
    >
      <span
        className="cb-sc"
        style={{
          fontSize: 13.5,
          color: 'var(--cb-text-muted)',
          letterSpacing: '0.14em',
        }}
      >
        {label}
      </span>
      {sub && (
        <span
          className="cb-italic"
          style={{ fontSize: 14.5, color: 'var(--cb-text-muted)' }}
        >
          {sub}
        </span>
      )}
      <span style={{ flex: 1 }} />
    </div>
  );
}
