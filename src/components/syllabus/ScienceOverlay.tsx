import { motion } from 'framer-motion';
import type { ChapterSyllabus, SciencePrinciple } from '../../types/course';
import { SpacingArcs } from './SpacingArcs';

const legendItems: { principle: SciencePrinciple; color: string; label: string; description: string }[] = [
  { principle: 'spacing', color: '#8b5cf6', label: 'Spacing', description: 'Key concepts reappear across chapters' },
  { principle: 'interleaving', color: '#06b6d4', label: 'Interleaving', description: 'Related topics mixed across practice' },
  { principle: 'retrieval', color: '#f59e0b', label: 'Retrieval Practice', description: 'Built-in opportunities to test recall' },
  { principle: 'examples', color: '#22c55e', label: 'Concrete Examples', description: 'Abstract theories grounded in reality' },
  { principle: 'dual-coding', color: '#3b82f6', label: 'Dual Coding', description: 'Verbal + visual presentation' },
];

interface ScienceOverlayProps {
  chapters: ChapterSyllabus[];
}

export function ScienceOverlay({ chapters }: ScienceOverlayProps) {
  const counts = new Map<SciencePrinciple, number>();
  let totalAnnotations = 0;
  for (const ch of chapters) {
    for (const ann of ch.scienceAnnotations) {
      counts.set(ann.principle, (counts.get(ann.principle) || 0) + 1);
      totalAnnotations++;
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="mt-8 bg-bg-card border border-violet-500/15 rounded-xl p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Learning Science Architecture
        </h3>
        <span className="text-xs text-text-muted">
          {totalAnnotations} annotations across {chapters.length} chapters
        </span>
      </div>

      {/* Principle counters */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {legendItems.map((item, i) => {
          const count = counts.get(item.principle) || 0;
          const percentage = totalAnnotations > 0 ? Math.round((count / totalAnnotations) * 100) : 0;
          return (
            <motion.div
              key={item.principle}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="text-center"
            >
              <div className="relative mx-auto mb-2 w-12 h-12">
                {/* Background ring */}
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke={`${item.color}15`} strokeWidth="3" />
                  <motion.circle
                    cx="18" cy="18" r="15" fill="none"
                    stroke={item.color}
                    strokeWidth="3"
                    strokeDasharray={`${percentage} ${100 - percentage}`}
                    strokeLinecap="round"
                    initial={{ strokeDasharray: '0 100' }}
                    animate={{ strokeDasharray: `${percentage} ${100 - percentage}` }}
                    transition={{ duration: 1, delay: i * 0.1, ease: 'easeOut' }}
                  />
                </svg>
                <div
                  className="absolute inset-0 flex items-center justify-center text-sm font-bold"
                  style={{ color: item.color }}
                >
                  {count}
                </div>
              </div>
              <div className="text-xs font-medium" style={{ color: item.color }}>
                {item.label}
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">{item.description}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Spacing arcs visualization */}
      <div className="border-t border-violet-500/10 pt-5">
        <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
          Spacing Connections — concepts revisited across chapters
        </h4>
        <SpacingArcs chapters={chapters} />
      </div>
    </motion.div>
  );
}
