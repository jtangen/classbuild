import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUiStore } from '../../store/uiStore';
import { useCourseStore } from '../../store/courseStore';
import { Logo } from '../shared/Logo';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === '/';
  const { isGenerating } = useUiStore();
  const { reset, currentStage } = useCourseStore();
  const [showConfirm, setShowConfirm] = useState(false);

  const hasProgress = currentStage !== 'landing' && currentStage !== 'setup';

  const handleNewCourse = () => {
    if (hasProgress) {
      setShowConfirm(true);
    } else {
      reset();
      navigate('/setup');
    }
  };

  const confirmReset = () => {
    setShowConfirm(false);
    reset();
    navigate('/setup');
  };

  return (
    <>
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-bg-primary/80 border-b border-violet-500/10"
    >
      {/* Generating progress shimmer */}
      {isGenerating && (
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-violet-500 to-transparent"
          animate={{ left: ['-30%', '100%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          style={{ width: '30%' }}
        />
      )}
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="no-underline">
          <Logo size={28} />
        </Link>

        <div className="flex items-center gap-4">
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20"
            >
              <motion.div
                className="w-2 h-2 rounded-full bg-violet-500"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-xs text-violet-400 font-medium">Generating</span>
            </motion.div>
          )}
          {!isLanding && !isGenerating && (
            <button
              onClick={handleNewCourse}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-secondary hover:bg-bg-elevated transition cursor-pointer bg-transparent border-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Course
            </button>
          )}
        </div>
      </div>

    </motion.header>
    <AnimatePresence>
      {showConfirm && (
        <ResetConfirmDialog
          onConfirm={confirmReset}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </AnimatePresence>
    </>
  );
}

function ResetConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-bg-card border border-violet-500/20 rounded-xl p-6 max-w-sm mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-2">Start a new course?</h3>
        <p className="text-sm text-text-secondary mb-5">
          This will clear your current course data including the syllabus, research, and any generated classes.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-bg-elevated text-text-secondary text-sm font-medium hover:bg-bg-card transition cursor-pointer border-0"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition cursor-pointer border-0"
          >
            Start New Course
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
