import type { ChangeEvent, ReactNode } from 'react';

interface CodexRadioProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  label: ReactNode;
  sub?: ReactNode;
  disabled?: boolean;
}

export function CodexRadio({
  name,
  value,
  checked,
  onChange,
  label,
  sub,
  disabled,
}: CodexRadioProps) {
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
          borderRadius: 999,
          background: 'var(--cb-ground-canvas)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'border-color 200ms',
        }}
      >
        {checked && (
          <span
            style={{
              display: 'block',
              width: 9,
              height: 9,
              borderRadius: 999,
              background: 'var(--cb-accent-emphasis)',
            }}
          />
        )}
      </span>
      <input
        type="radio"
        name={name}
        value={value}
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
