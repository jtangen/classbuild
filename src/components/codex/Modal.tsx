import { useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CodexModalProps {
  open: boolean;
  onClose: () => void;
  /** Small-caps overline (e.g. "confirm", "settings"). */
  kicker?: string;
  /** Display heading. */
  title: ReactNode;
  /** Italic subhead under the title. */
  sub?: ReactNode;
  /** Footer slot — typically a CodexButton row. Right-aligned. */
  actions?: ReactNode;
  /** Body content. */
  children: ReactNode;
  /** Max-width of the modal in px. Default 480. */
  width?: number;
}

/**
 * Codex modal. Flat 42% dim — no backdrop-blur. Square-ish radius. Sheet
 * shadow. Escape closes. Overlay click closes. Focus moves into the modal
 * on open.
 */
export function CodexModal({
  open,
  onClose,
  kicker,
  title,
  sub,
  actions,
  children,
  width = 480,
}: CodexModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    // Move focus into the modal so the screen reader and keyboard land here.
    ref.current?.focus();
    // Lock body scroll while modal is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(26,24,20,0.42)',
            padding: 16,
          }}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            ref={ref}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            style={{
              background: 'var(--cb-surface-raised)',
              border: '1px solid var(--cb-border-default)',
              borderRadius: 3,
              padding: '28px 32px',
              maxWidth: width,
              width: '100%',
              maxHeight: 'calc(100vh - 32px)',
              overflowY: 'auto',
              boxShadow: 'var(--cb-shadow-modal)',
              fontFamily: 'var(--font-cb-serif)',
              color: 'var(--cb-text-default)',
              outline: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {kicker && (
              <div
                className="cb-sc"
                style={{
                  fontSize: 13,
                  letterSpacing: '0.16em',
                  color: 'var(--cb-accent-emphasis)',
                  marginBottom: 6,
                }}
              >
                {kicker}
              </div>
            )}
            <h3
              style={{
                margin: '0 0 10px',
                fontSize: 24,
                fontWeight: 500,
                fontVariationSettings: '"opsz" 20',
                letterSpacing: '-0.005em',
                color: 'var(--cb-text-default)',
                lineHeight: 1.2,
              }}
            >
              {title}
            </h3>
            {sub && (
              <p
                style={{
                  margin: '0 0 18px',
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: 'var(--cb-text-muted)',
                  fontStyle: 'italic',
                }}
              >
                {sub}
              </p>
            )}
            <div>{children}</div>
            {actions && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                  marginTop: 22,
                  paddingTop: 18,
                  borderTop: '0.5px solid var(--cb-border-default)',
                }}
              >
                {actions}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
