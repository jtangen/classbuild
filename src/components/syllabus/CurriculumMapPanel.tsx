import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useCourseStore } from '../../store/courseStore';
import { useApiStore } from '../../store/apiStore';
import { streamMessage } from '../../services/claude/streaming';
import {
  buildLearningObjectivesPrompt,
  buildLearningObjectivesUserPrompt,
  parseCurriculumMapResponse,
} from '../../prompts/learningObjectives';
import { Button } from '../shared/Button';
import type { AlignmentLevel } from '../../types/course';

const ALIGNMENT_STYLES: Record<AlignmentLevel, { label: string; bg: string; text: string }> = {
  introduced: { label: 'I', bg: 'bg-blue-500/15', text: 'text-blue-400' },
  developed: { label: 'D', bg: 'bg-violet-500/15', text: 'text-violet-400' },
  mastered: { label: 'M', bg: 'bg-amber-500/15', text: 'text-amber-400' },
};

const BLOOM_COLORS: Record<string, string> = {
  remember: 'bg-slate-500/15 text-slate-400',
  understand: 'bg-blue-500/15 text-blue-400',
  apply: 'bg-emerald-500/15 text-emerald-400',
  analyze: 'bg-violet-500/15 text-violet-400',
  evaluate: 'bg-amber-500/15 text-amber-400',
  create: 'bg-rose-500/15 text-rose-400',
};

export function CurriculumMapPanel() {
  const { syllabus, curriculumMap, setCurriculumMap } = useCourseStore();
  const { claudeApiKey } = useApiStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!syllabus || !claudeApiKey) return;
    setIsGenerating(true);
    setError(null);

    try {
      const fullText = await streamMessage(
        {
          apiKey: claudeApiKey,
          system: buildLearningObjectivesPrompt(),
          messages: [{ role: 'user', content: buildLearningObjectivesUserPrompt(syllabus) }],
          thinkingBudget: 'medium',
          maxTokens: 4000,
        },
        { onError: (err) => setError(err.message) }
      );

      const parsed = parseCurriculumMapResponse(fullText);
      if (parsed) {
        setCurriculumMap(parsed);
      } else {
        setError('Failed to parse curriculum map. Try regenerating.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [syllabus, claudeApiKey, setCurriculumMap]);

  if (!syllabus) return null;

  const chapterNumbers = syllabus.chapters.map((ch) => ch.number);

  // Not yet generated
  if (!curriculumMap && !isGenerating) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="mt-8 bg-bg-card border border-violet-500/15 rounded-xl p-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <h3 className="text-sm font-semibold text-text-primary">Curriculum Alignment Matrix</h3>
        </div>
        <p className="text-sm text-text-secondary mb-4">
          Generate a curriculum map that aligns learning objectives to chapters using Bloom&apos;s taxonomy.
          Each objective is tracked as Introduced (I), Developed (D), and Mastered (M) across the course.
        </p>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">{error}</div>
        )}
        <Button size="sm" onClick={handleGenerate}>
          Generate Curriculum Map
        </Button>
      </motion.div>
    );
  }

  // Generating
  if (isGenerating) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="mt-8 bg-bg-card border border-violet-500/15 rounded-xl p-6"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-violet-500" />
            <div className="absolute inset-0 w-3 h-3 rounded-full bg-violet-500 animate-ping" />
          </div>
          <span className="text-sm font-medium text-violet-400">
            Generating curriculum map...
          </span>
        </div>
      </motion.div>
    );
  }

  // Generated — show matrix
  const objectives = curriculumMap!.objectives;

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
          <svg className="w-4 h-4 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Curriculum Alignment Matrix
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">
            {objectives.length} objectives &middot; {chapterNumbers.length} chapters
          </span>
          <Button size="sm" variant="secondary" onClick={handleGenerate} disabled={isGenerating}>
            Regenerate
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">{error}</div>
      )}

      {/* Matrix table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-violet-500/10">
              <th className="text-left py-2 pr-3 font-medium text-text-muted sticky left-0 bg-bg-card z-10 w-16">Bloom</th>
              <th className="text-left py-2 pr-3 font-medium text-text-muted sticky left-16 bg-bg-card z-10 max-w-[280px]">Objective</th>
              {chapterNumbers.map((num) => (
                <th key={num} className="py-2 font-medium text-text-muted text-center w-9">{num}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {objectives.map((obj) => (
              <tr key={obj.id} className="border-b border-violet-500/5 hover:bg-violet-500/5 transition-colors">
                <td className="py-2 pr-3 sticky left-0 bg-bg-card z-10">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${BLOOM_COLORS[obj.bloomLevel] || ''}`}>
                    {obj.bloomLevel}
                  </span>
                </td>
                <td className="py-2 pr-3 sticky left-16 bg-bg-card z-10 max-w-[280px] truncate text-text-secondary" title={obj.text}>
                  {obj.text}
                </td>
                {chapterNumbers.map((num) => {
                  const level = obj.alignments[num];
                  if (!level) return <td key={num} className="py-2 text-center" />;
                  const style = ALIGNMENT_STYLES[level];
                  return (
                    <td key={num} className="py-2 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-violet-500/10">
        <span className="text-xs text-text-muted">Legend:</span>
        {(['introduced', 'developed', 'mastered'] as AlignmentLevel[]).map((level) => {
          const style = ALIGNMENT_STYLES[level];
          return (
            <div key={level} className="flex items-center gap-1.5">
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${style.bg} ${style.text}`}>
                {style.label}
              </span>
              <span className="text-xs text-text-muted capitalize">{level}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
