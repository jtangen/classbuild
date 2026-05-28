import { useId, type CSSProperties, type ReactNode, type SelectHTMLAttributes } from 'react';

export interface CodexSelectOption {
  value: string;
  label: string;
}

interface CodexSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'style'> {
  label?: string;
  hint?: ReactNode;
  options: CodexSelectOption[];
  style?: CSSProperties;
}

export function CodexSelect({
  label,
  hint,
  options,
  id,
  style,
  ...props
}: CodexSelectProps) {
  const reactId = useId();
  const selectId = id ?? reactId;

  return (
    <label htmlFor={selectId} style={{ display: 'block', ...style }}>
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
        </div>
      )}
      <div
        style={{
          position: 'relative',
          background: 'var(--cb-ground-canvas)',
          border: '1px solid var(--cb-border-default)',
          borderRadius: 1.5,
          height: 38,
        }}
      >
        <select
          id={selectId}
          {...props}
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            background: 'transparent',
            border: 0,
            outline: 'none',
            width: '100%',
            height: '100%',
            padding: '0 36px 0 12px',
            font: 'inherit',
            fontFamily: 'var(--font-cb-serif)',
            fontSize: 15,
            color: 'var(--cb-text-default)',
            cursor: 'pointer',
          }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--cb-text-muted)',
            fontSize: 13,
            fontFamily: 'serif',
            pointerEvents: 'none',
            fontStyle: 'italic',
          }}
        >
          ▾
        </span>
      </div>
      {hint && (
        <div
          className="cb-italic"
          style={{
            fontSize: 13.5,
            marginTop: 8,
            color: 'var(--cb-text-muted)',
            lineHeight: 1.45,
          }}
        >
          {hint}
        </div>
      )}
    </label>
  );
}
