import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCourseStore } from '../../store/courseStore';

interface ResearchPanelProps {
  chapterNum: number;
}

export function ResearchPanel({ chapterNum }: ResearchPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const { researchDossiers } = useCourseStore();
  const dossier = researchDossiers.find(d => d.chapterNumber === chapterNum);

  if (!dossier || dossier.sources.length === 0) return null;

  return (
    <div className="mb-4 border border-violet-500/10 rounded-xl overflow-hidden bg-bg-card">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 bg-transparent border-0 cursor-pointer hover:bg-violet-500/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="text-sm font-medium text-text-primary">
            Research — {dossier.sources.length} source{dossier.sources.length !== 1 ? 's' : ''}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 space-y-2.5 border-t border-violet-500/10 pt-3">
              {dossier.sources.map((source, i) => (
                <div key={i} className="bg-bg-elevated rounded-lg p-3">
                  <p className="text-sm font-medium text-text-primary">{source.title}</p>
                  {source.authors && (
                    <p className="text-xs text-text-muted mt-0.5">
                      {source.authors}{source.year ? ` (${source.year})` : ''}
                    </p>
                  )}
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-violet-400 hover:underline mt-1 block truncate"
                    >
                      {source.url}
                    </a>
                  )}
                </div>
              ))}

              {dossier.synthesisNotes && (
                <div className="pt-2 border-t border-violet-500/10">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Synthesis</p>
                  <p className="text-sm text-text-secondary leading-relaxed">{dossier.synthesisNotes}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
