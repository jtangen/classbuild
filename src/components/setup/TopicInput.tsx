import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCourseStore } from '../../store/courseStore';

export function TopicInput() {
  const { setup, updateSetup } = useCourseStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-text-primary mb-2 block">
          What course do you want to build? <span className="text-error">*</span>
        </span>
        <textarea
          value={setup.topic}
          onChange={(e) => updateSetup({ topic: e.target.value })}
          placeholder="A second-year university course on research methods and statistics"
          className="w-full bg-bg-elevated border border-violet-500/20 rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 resize-none transition-all"
          rows={3}
        />
      </label>

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-violet-400 transition-colors cursor-pointer"
      >
        <motion.svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          animate={{ rotate: showAdvanced ? 90 : 0 }}
        >
          <polyline points="9 18 15 12 9 6" />
        </motion.svg>
        Additional details (optional)
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-3"
          >
            <label className="block">
              <span className="text-xs text-text-secondary mb-1 block">
                Any specific topics that must be covered?
              </span>
              <input
                type="text"
                value={setup.specificTopics || ''}
                onChange={(e) => updateSetup({ specificTopics: e.target.value })}
                placeholder="e.g., ANOVA, regression, effect sizes"
                className="w-full bg-bg-elevated border border-violet-500/15 rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-violet-500/40 transition-all"
              />
            </label>
            <label className="block">
              <span className="text-xs text-text-secondary mb-1 block">
                Any topics you want to avoid?
              </span>
              <input
                type="text"
                value={setup.avoidTopics || ''}
                onChange={(e) => updateSetup({ avoidTopics: e.target.value })}
                placeholder="e.g., Bayesian statistics, qualitative methods"
                className="w-full bg-bg-elevated border border-violet-500/15 rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-violet-500/40 transition-all"
              />
            </label>
            <label className="block">
              <span className="text-xs text-text-secondary mb-1 block">
                Is there a textbook or resource you typically follow?
              </span>
              <input
                type="text"
                value={setup.textbookReference || ''}
                onChange={(e) => updateSetup({ textbookReference: e.target.value })}
                placeholder="e.g., Field (2024) Discovering Statistics Using R"
                className="w-full bg-bg-elevated border border-violet-500/15 rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-violet-500/40 transition-all"
              />
            </label>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
