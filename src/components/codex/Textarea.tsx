import { useId, type CSSProperties, type ReactNode, type TextareaHTMLAttributes } from 'react';

interface CodexTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'style' | 'size'> {
  label?: string;
  hint?: ReactNode;
  error?: ReactNode;
  /** 'md' (default body, 15px) or 'lg' (body-lg, 20px — for marquee inputs). */
  size?: 'md' | 'lg';
  style?: CSSProperties;
}

export function CodexTextarea({
  label,
  hint,
  error,
  id,
  rows = 4,
  size = 'md',
  style,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...props
}: CodexTextareaProps) {
  const reactId = useId();
  const textareaId = id ?? reactId;
  const hintId = `${reactId}-hint`;
  const errorId = `${reactId}-error`;
  const isError = Boolean(error);
  const describedBy =
    [ariaDescribedBy, !isError && hint ? hintId : null, isError ? errorId : null]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <label htmlFor={textareaId} style={{ display: 'block', ...style }}>
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
      <textarea
        id={textareaId}
        rows={rows}
        {...props}
        aria-describedby={describedBy}
        aria-invalid={isError ? true : ariaInvalid}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'var(--cb-ground-canvas)',
          border: `1px solid ${error ? 'var(--cb-status-danger)' : 'var(--cb-border-default)'}`,
          borderRadius: 1.5,
          color: 'var(--cb-text-default)',
          font: 'inherit',
          fontFamily: 'var(--font-cb-serif)',
          fontSize: size === 'lg' ? 20 : 15,
          lineHeight: 1.55,
          resize: 'vertical',
          outline: 'none',
          transition: 'border-color 200ms cubic-bezier(0.32,0.04,0.32,1)',
        }}
        onFocus={(e) => {
          if (!error) e.currentTarget.style.borderColor = 'var(--cb-accent-link)';
        }}
        onBlur={(e) => {
          if (!error) e.currentTarget.style.borderColor = 'var(--cb-border-default)';
        }}
      />
      {isError ? (
        <div
          key="error"
          id={errorId}
          role="alert"
          className="cb-italic"
          style={{
            fontSize: 13.5,
            marginTop: 8,
            color: 'var(--cb-status-danger)',
            lineHeight: 1.45,
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
            color: 'var(--cb-text-muted)',
            lineHeight: 1.45,
          }}
        >
          {hint}
        </div>
      ) : null}
    </label>
  );
}
