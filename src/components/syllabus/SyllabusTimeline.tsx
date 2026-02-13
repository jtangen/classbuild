import { motion } from 'framer-motion';
import type { ChapterSyllabus } from '../../types/course';
import { ChapterCard } from './ChapterCard';

interface SyllabusTimelineProps {
  chapters: ChapterSyllabus[];
  showScience: boolean;
}

export function SyllabusTimeline({ chapters, showScience }: SyllabusTimelineProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative"
    >
      {/* Timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-violet-500/40 via-violet-500/20 to-transparent" />

      <div className="space-y-6">
        {chapters.map((chapter, i) => (
          <motion.div
            key={chapter.number}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="relative pl-16"
          >
            {/* Timeline node */}
            <div className="absolute left-3.5 top-6 w-5 h-5 rounded-full bg-bg-primary border-2 border-violet-500 z-10">
              <motion.div
                className="absolute inset-1 rounded-full bg-violet-500"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.08 + 0.2 }}
              />
            </div>

            <ChapterCard chapter={chapter} showScience={showScience} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
