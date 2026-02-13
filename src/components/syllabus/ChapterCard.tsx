import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChapterSyllabus, SciencePrinciple } from '../../types/course';

const scienceColors: Record<SciencePrinciple, { bg: string; text: string; label: string }> = {
  spacing: { bg: 'bg-science-spacing/15', text: 'text-science-spacing', label: 'Spacing' },
  interleaving: { bg: 'bg-science-interleaving/15', text: 'text-science-interleaving', label: 'Interleaving' },
  retrieval: { bg: 'bg-science-retrieval/15', text: 'text-science-retrieval', label: 'Retrieval' },
  examples: { bg: 'bg-science-examples/15', text: 'text-science-examples', label: 'Examples' },
  'dual-coding': { bg: 'bg-science-dual-coding/15', text: 'text-science-dual-coding', label: 'Dual Coding' },
};

interface ChapterCardProps {
  chapter: ChapterSyllabus;
  showScience: boolean;
}

export function ChapterCard({ chapter, showScience }: ChapterCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="bg-bg-card border border-violet-500/10 rounded-xl p-5 hover:border-violet-500/25 transition-colors cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-violet-400">
              Class {chapter.number}
            </span>
            {chapter.spacingConnections.length > 0 && showScience && (
              <span className="text-xs text-science-spacing">
                ← Class {chapter.spacingConnections.join(', ')}
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold mb-2">{chapter.title}</h3>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {chapter.keyConcepts.map((concept) => (
              <span
                key={concept}
                className="px-2 py-0.5 text-xs rounded-full bg-bg-elevated text-text-secondary"
              >
                {concept}
              </span>
            ))}
          </div>

          {/* Science annotations */}
          <AnimatePresence>
            {showScience && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-1.5 mb-3"
              >
                {chapter.scienceAnnotations.map((ann, i) => {
                  const fallback = { bg: 'bg-violet-500/15', text: 'text-violet-400', label: ann.principle };
                  const colors = scienceColors[ann.principle] || fallback;
                  return (
                    <motion.span
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={`px-2 py-0.5 text-xs rounded-full ${colors.bg} ${colors.text} cursor-help`}
                      title={ann.description}
                    >
                      {colors.label}
                      {ann.relatedChapters && ann.relatedChapters.length > 0 && (
                        <span className="opacity-70"> → Class {ann.relatedChapters.join(', ')}</span>
                      )}
                    </motion.span>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-text-muted shrink-0 mt-1"
          animate={{ rotate: expanded ? 180 : 0 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </motion.svg>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t border-violet-500/10 space-y-4">
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                {chapter.narrative}
              </p>

              {chapter.widgets.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                    Interactive Widgets
                  </h4>
                  <div className="space-y-2">
                    {chapter.widgets.map((widget, i) => (
                      <div
                        key={i}
                        className="bg-bg-elevated rounded-lg p-3"
                      >
                        <div className="text-sm font-medium text-violet-400">
                          {widget.title}
                        </div>
                        <div className="text-xs text-text-secondary mt-1">
                          {widget.description}
                        </div>
                        <div className="text-xs text-text-muted mt-1 italic">
                          Concept: {widget.concept} — {widget.rationale}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showScience && chapter.scienceAnnotations.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                    Learning Science
                  </h4>
                  <div className="space-y-1.5">
                    {chapter.scienceAnnotations.map((ann, i) => {
                      const fallback = { bg: 'bg-violet-500/15', text: 'text-violet-400', label: ann.principle };
                      const colors = scienceColors[ann.principle] || fallback;
                      return (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className={`px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} shrink-0`}>
                            {colors.label}
                          </span>
                          <span className="text-text-secondary">{ann.description}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
