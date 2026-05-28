import type { ReactNode } from 'react';

interface ChoicePillProps {
  selected: boolean;
  onClick: () => void;
  label: ReactNode;
  sub?: ReactNode;
  disabled?: boolean;
  /** When true, lays out the pill as a square-ish numeric chip. */
  compact?: boolean;
}

/**
 * A two-line selectable pill. Codex equivalent of the legacy "card-style"
 * radio used in AudienceSelector and ChapterConfig. Selection is signalled
 * by border-color (Oxblood) and a faint emphasis-quiet wash — never by
 * shadow or scale.
 */
export function ChoicePill({
  selected,
  onClick,
  label,
  sub,
  disabled,
  compact = false,
}: ChoicePillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="cb-focus"
      style={{
        textAlign: 'left',
        padding: compact ? '6px 0' : '10px 12px',
        background: selected ? 'var(--cb-accent-emphasis-quiet)' : 'var(--cb-ground-canvas)',
        border: `1px solid ${selected ? 'var(--cb-accent-emphasis)' : 'var(--cb-border-default)'}`,
        borderRadius: 1.5,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        color: 'var(--cb-text-default)',
        fontFamily: 'var(--font-cb-serif)',
        transition:
          'background-color 200ms cubic-bezier(0.32,0.04,0.32,1), border-color 200ms',
        width: '100%',
        minHeight: compact ? 32 : undefined,
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 0 : 2,
        alignItems: compact ? 'center' : 'flex-start',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontSize: compact ? 13 : 14,
          fontWeight: selected ? 500 : 400,
          color: selected ? 'var(--cb-accent-emphasis)' : 'var(--cb-text-default)',
          lineHeight: 1.3,
        }}
      >
        {label}
      </span>
      {sub && (
        <span
          className="cb-italic"
          style={{
            fontSize: 13.5,
            color: 'var(--cb-text-muted)',
            lineHeight: 1.4,
          }}
        >
          {sub}
        </span>
      )}
    </button>
  );
}
