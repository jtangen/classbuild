import { useId, type CSSProperties, type InputHTMLAttributes, type ReactNode } from 'react';

type Size = 'sm' | 'md' | 'lg';

interface CodexInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  label?: string;
  hint?: ReactNode;
  error?: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
  size?: Size;
  style?: CSSProperties;
}

const SIZE: Record<Size, { h: number; px: number; fz: number }> = {
  sm: { h: 30, px: 10, fz: 14.5 },
  md: { h: 38, px: 12, fz: 15 },
  lg: { h: 44, px: 14, fz: 17 },
};

export function CodexInput({
  label,
  hint,
  error,
  prefix,
  suffix,
  size = 'md',
  id,
  required,
  disabled,
  style,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...props
}: CodexInputProps) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const hintId = `${reactId}-hint`;
  const errorId = `${reactId}-error`;
  const isError = Boolean(error);
  const describedBy =
    [ariaDescribedBy, !isError && hint ? hintId : null, isError ? errorId : null]
      .filter(Boolean)
      .join(' ') || undefined;
  const sz = SIZE[size];

  return (
    <label htmlFor={inputId} style={{ display: 'block', ...style }}>
      {label && (
        <div
          className="cb-sc"
          style={{
            fontSize: 13,
            color: 'var(--cb-text-muted)',
            letterSpacing: '0.12em',
            marginBottom: 8,
          }}
        >
          {label}
          {required && <span style={{ color: 'var(--cb-accent-emphasis)' }}> *</span>}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--cb-ground-canvas)',
          border: `1px solid ${error ? 'var(--cb-status-danger)' : 'var(--cb-border-default)'}`,
          borderRadius: 1.5,
          height: sz.h,
          transition: 'border-color 200ms cubic-bezier(0.32,0.04,0.32,1)',
          opacity: disabled ? 0.55 : 1,
        }}
        onFocus={(e) => {
          if (!error) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--cb-accent-link)';
        }}
        onBlur={(e) => {
          if (!error) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--cb-border-default)';
        }}
      >
        {prefix && (
          <span
            className="cb-mono"
            style={{
              padding: `0 0 0 ${sz.px}px`,
              color: 'var(--cb-text-muted)',
              fontSize: sz.fz - 1,
              flex: '0 0 auto',
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
            }}
          >
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          disabled={disabled}
          required={required}
          {...props}
          aria-describedby={describedBy}
          aria-invalid={isError ? true : ariaInvalid}
          style={{
            border: 0,
            outline: 'none',
            background: 'transparent',
            font: 'inherit',
            fontFamily: 'var(--font-cb-serif)',
            fontSize: sz.fz,
            color: 'var(--cb-text-default)',
            width: '100%',
            height: '100%',
            padding: `0 ${sz.px}px`,
          }}
        />
        {suffix && (
          <span
            className="cb-mono"
            style={{
              padding: `0 ${sz.px}px 0 6px`,
              color: 'var(--cb-text-muted)',
              fontSize: sz.fz - 2,
              flex: '0 0 auto',
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
            }}
          >
            {suffix}
          </span>
        )}
      </div>
      {isError ? (
        <div
          key="error"
          id={errorId}
          role="alert"
          className="cb-italic"
          style={{
            fontSize: 13.5,
            marginTop: 8,
            lineHeight: 1.45,
            color: 'var(--cb-status-danger)',
          }}
        >
          {error}
        </div>
      ) : hint ? (
        <div
          key="hint"
          id={hintId}
          className="cb-italic"
          style={{
            fontSize: 13.5,
            marginTop: 8,
            lineHeight: 1.45,
            color: 'var(--cb-text-muted)',
          }}
        >
          {hint}
        </div>
      ) : null}
    </label>
  );
}
