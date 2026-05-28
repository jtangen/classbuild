import type { ChangeEvent, ReactNode } from 'react';

interface CodexCheckboxProps {
  checked: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  label: ReactNode;
  sub?: ReactNode;
  disabled?: boolean;
}

export function CodexCheckbox({ checked, onChange, label, sub, disabled }: CodexCheckboxProps) {
  return (
    <label
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        position: 'relative',
      }}
    >
      <span
        aria-hidden
        style={{
          flex: '0 0 auto',
          width: 18,
          height: 18,
          marginTop: 2,
          border: `1px solid ${checked ? 'var(--cb-accent-emphasis)' : 'var(--cb-border-strong)'}`,
          borderRadius: 1.5,
          background: checked ? 'var(--cb-accent-emphasis)' : 'var(--cb-ground-canvas)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 200ms, border-color 200ms',
        }}
      >
        {checked && (
          <span
            style={{
              display: 'block',
              width: 10,
              height: 6,
              borderLeft: '1.5px solid var(--cb-text-inverse)',
              borderBottom: '1.5px solid var(--cb-text-inverse)',
              transform: 'rotate(-45deg) translate(1px,-1px)',
            }}
          />
        )}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="cb-focus"
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', inset: 0 }}
      />
      <div>
        <div style={{ fontSize: 15, color: 'var(--cb-text-default)', lineHeight: 1.45 }}>{label}</div>
        {sub && (
          <div className="cb-italic" style={{ fontSize: 13.5, color: 'var(--cb-text-muted)', marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
    </label>
  );
}
