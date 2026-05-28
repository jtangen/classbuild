import { motion, AnimatePresence } from 'framer-motion';

/**
 * Small bottom-right toast for short-lived feedback (e.g., catching Cmd+S
 * with "no need to save — auto-saved"). Parent controls visibility by
 * passing `message` (string) or `null`; auto-dismissal lives in the parent.
 */
export function TransientToast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.22 }}
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 55,
            padding: '10px 16px',
            background: 'var(--cb-text-default)',
            color: 'var(--cb-ground-page)',
            borderRadius: 3,
            fontFamily: 'var(--font-cb-serif)',
            fontSize: 14,
            lineHeight: 1.45,
            maxWidth: 360,
            boxShadow: '0 14px 32px rgba(20,17,13,0.24)',
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
