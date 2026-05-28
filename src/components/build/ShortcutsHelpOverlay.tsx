import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SHORTCUTS: Array<{ keys: string; label: string }> = [
  { keys: '1 … 8',  label: 'Switch tab (Reading / Quizzes / Slides / …)' },
  { keys: 'J',      label: 'Next chapter' },
  { keys: 'K',      label: 'Previous chapter' },
  { keys: 'G',      label: 'Generate all materials for this chapter' },
  { keys: '⌘ S',    label: 'Already auto-saved — friendly reminder' },
  { keys: '?',      label: 'Show / hide this help' },
  { keys: 'Esc',    label: 'Close drawer / dialog' },
];

/** Modal overlay listing the keyboard shortcuts. Toggled by `?`. Dismisses
 *  with Escape, scrim click, or any external close trigger. */
export function ShortcutsHelpOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(20,17,13,0.42)',
            padding: 16,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--cb-surface-raised, var(--cb-ground-page))',
              border: '1px solid var(--cb-border-default)',
              borderRadius: 3,
              padding: '28px 32px 24px',
              width: 'min(520px, 100%)',
              fontFamily: 'var(--font-cb-serif)',
              boxShadow: 'var(--cb-shadow-modal, 0 24px 60px rgba(20,17,13,0.18))',
            }}
          >
            <div
              className="cb-sc"
              style={{
                fontSize: 13,
                letterSpacing: '0.16em',
                color: 'var(--cb-accent-emphasis)',
                marginBottom: 4,
              }}
            >
              Keyboard
            </div>
            <h3
              style={{
                margin: '0 0 18px',
                fontSize: 22,
                fontWeight: 500,
                fontVariationSettings: '"opsz" 20',
                letterSpacing: '-0.005em',
                color: 'var(--cb-text-default)',
              }}
            >
              Shortcuts
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14.5 }}>
              <tbody>
                {SHORTCUTS.map((s, i) => (
                  <tr
                    key={i}
                    style={{
                      borderTop: i === 0 ? 'none' : '0.5px solid var(--cb-border-subtle)',
                    }}
                  >
                    <td
                      className="cb-mono"
                      style={{
                        padding: '10px 14px 10px 0',
                        fontSize: 13,
                        color: 'var(--cb-accent-emphasis)',
                        whiteSpace: 'nowrap',
                        width: 80,
                      }}
                    >
                      {s.keys}
                    </td>
                    <td style={{ padding: '10px 0', color: 'var(--cb-text-default)', lineHeight: 1.45 }}>
                      {s.label}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p
              className="cb-italic"
              style={{
                margin: '18px 0 0',
                fontSize: 12.5,
                color: 'var(--cb-text-muted)',
                lineHeight: 1.55,
              }}
            >
              Shortcuts only fire when you're not typing in a field. Esc or click outside to dismiss.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
