import type { ReactNode } from 'react';

export type CodexBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'emphasis';

interface CodexBadgeProps {
  tone?: CodexBadgeTone;
  children: ReactNode;
}

const TONE: Record<CodexBadgeTone, { fg: string; bg: string }> = {
  neutral: { fg: 'var(--cb-text-muted)', bg: 'transparent' },
  info: { fg: 'var(--cb-status-info)', bg: 'var(--cb-status-info-bg)' },
  success: { fg: 'var(--cb-status-success)', bg: 'var(--cb-status-success-bg)' },
  warning: { fg: 'var(--cb-status-warning)', bg: 'var(--cb-status-warning-bg)' },
  danger: { fg: 'var(--cb-status-danger)', bg: 'var(--cb-status-danger-bg)' },
  emphasis: { fg: 'var(--cb-accent-emphasis)', bg: 'var(--cb-accent-emphasis-quiet)' },
};

export function CodexBadge({ tone = 'neutral', children }: CodexBadgeProps) {
  const t = TONE[tone];
  return (
    <span
      className="cb-sc"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        background: t.bg,
        color: t.fg,
        border: tone === 'neutral' ? '0.5px solid var(--cb-border-default)' : 'none',
        fontSize: 12,
        letterSpacing: '0.12em',
        borderRadius: 1.5,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}
