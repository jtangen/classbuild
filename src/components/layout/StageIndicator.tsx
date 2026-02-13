import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { STAGES } from '../../types/course';
import { useCourseStore } from '../../store/courseStore';
import { useUiStore } from '../../store/uiStore';

export function StageIndicator() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentStage, completedStages, chapters } = useCourseStore();
  const { isGenerating } = useUiStore();
  const currentIndex = STAGES.findIndex((s) => s.id === currentStage);
  const hasChapters = chapters.length > 0;

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      {STAGES.map((stage, i) => {
        const isComplete = completedStages.includes(stage.id);
        const isCurrent = stage.id === currentStage;
        const isPast = i < currentIndex;
        const isOnThisPage = location.pathname === stage.path;
        // Allow Generate/Export once any chapter exists (partial export)
        const isUnlockedByContent = hasChapters && (stage.id === 'build' || stage.id === 'export');
        const isClickable = !isGenerating && !isOnThisPage && (isComplete || isPast || isCurrent || isUnlockedByContent);

        return (
          <div key={stage.id} className="flex items-center">
            <button
              className={`flex flex-col items-center gap-1 bg-transparent border-0 p-0 ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
              onClick={() => isClickable && navigate(stage.path)}
              disabled={!isClickable}
            >
              <motion.div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                  isCurrent
                    ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                    : isComplete
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                    : isPast || isUnlockedByContent
                    ? 'bg-violet-500/15 text-violet-400'
                    : 'bg-bg-elevated text-text-muted'
                }`}
                animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                whileHover={isClickable && !isCurrent ? { scale: 1.1 } : {}}
              >
                {isComplete ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  stage.number
                )}
              </motion.div>
              <span
                className={`text-xs transition-colors ${
                  isCurrent ? 'text-violet-400 font-medium' : isClickable ? 'text-text-secondary' : 'text-text-muted'
                }`}
              >
                {stage.label}
              </span>
            </button>
            {i < STAGES.length - 1 && (
              <div className="relative w-10 mx-0.5 mb-5">
                <div className="h-px bg-bg-elevated w-full" />
                {(isPast || isComplete) && (
                  <motion.div
                    className="absolute top-0 left-0 h-px bg-gradient-to-r from-violet-500/60 to-violet-500/30"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
