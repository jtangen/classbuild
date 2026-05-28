import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'link';
type Size = 'sm' | 'md' | 'lg';

interface CodexButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  style?: CSSProperties;
}

const SIZE: Record<Size, { h: number; px: number; fz: number }> = {
  sm: { h: 30, px: 12, fz: 14.5 },
  md: { h: 36, px: 16, fz: 15 },
  lg: { h: 44, px: 22, fz: 17 },
};

const VARIANT_BG: Record<Variant, string> = {
  primary: 'var(--cb-accent-emphasis)',
  secondary: 'transparent',
  ghost: 'transparent',
  destructive: 'var(--cb-status-danger)',
  link: 'transparent',
};

const VARIANT_BG_HOVER: Record<Variant, string> = {
  primary: 'var(--cb-accent-emphasis-hover)',
  secondary: 'var(--cb-surface-sunken)',
  ghost: 'var(--cb-surface-sunken)',
  destructive: 'var(--cb-accent-emphasis-hover)',
  link: 'transparent',
};

function variantStyle(variant: Variant): CSSProperties {
  switch (variant) {
    case 'primary':
      return { background: VARIANT_BG.primary, color: 'var(--cb-text-inverse)' };
    case 'secondary':
      return {
        background: VARIANT_BG.secondary,
        color: 'var(--cb-text-default)',
        borderColor: 'var(--cb-border-strong)',
      };
    case 'ghost':
      return { background: VARIANT_BG.ghost, color: 'var(--cb-text-default)' };
    case 'destructive':
      return { background: VARIANT_BG.destructive, color: '#f8f3e6' };
    case 'link':
      return {
        background: 'transparent',
        color: 'var(--cb-accent-link)',
        textDecoration: 'underline',
        textDecorationThickness: '0.5px',
        textUnderlineOffset: '3px',
        height: 'auto',
        padding: 0,
      };
  }
}

export function CodexButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}: CodexButtonProps) {
  const sz = SIZE[size];
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: variant === 'link' ? 0 : `0 ${sz.px}px`,
    height: variant === 'link' ? 'auto' : sz.h,
    fontFamily: 'var(--font-cb-serif)',
    fontSize: sz.fz,
    fontWeight: 500,
    fontVariationSettings: '"opsz" 14',
    letterSpacing: '0.005em',
    borderRadius: 1.5,
    border: '1px solid transparent',
    cursor: disabled || loading ? 'default' : 'pointer',
    transition:
      'background-color var(--cb-duration-2) var(--cb-ease-paper), color var(--cb-duration-2), border-color var(--cb-duration-2)',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    opacity: disabled ? 0.45 : 1,
    pointerEvents: disabled ? 'none' : 'auto',
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`cb-focus ${props.className ?? ''}`}
      style={{ ...base, ...variantStyle(variant), ...style }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.background = VARIANT_BG_HOVER[variant];
        }
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = VARIANT_BG[variant];
        onMouseLeave?.(e);
      }}
    >
      {loading ? (
        <LoadingRule width={sz.fz * 2.5} />
      ) : (
        <>
          {iconLeft}
          {children}
          {iconRight}
        </>
      )}
    </button>
  );
}

function LoadingRule({ width }: { width: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        height: 1,
        width,
        background: 'currentColor',
        opacity: 0.7,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          background: 'currentColor',
          animation: 'cb-pen 1.2s cubic-bezier(0.32,0.04,0.32,1) infinite',
        }}
      />
    </span>
  );
}
