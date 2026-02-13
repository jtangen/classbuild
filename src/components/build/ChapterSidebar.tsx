import { motion } from 'framer-motion';
import { useCourseStore } from '../../store/courseStore';
import { useApiStore } from '../../store/apiStore';

interface ChapterSidebarProps {
  selectedChapterNum: number;
  onSelectChapter: (num: number) => void;
  disabled: boolean;
  batchCurrentChapter: number | null;
}

function countReady(ch: { htmlContent: string; practiceQuizData?: string; inClassQuizData?: unknown[]; discussionData?: unknown[]; activityData?: unknown[]; audioTranscript?: string; slidesJson?: unknown[]; infographicDataUri?: string }, hasGemini: boolean): number {
  let count = 0;
  if (ch.htmlContent) count++;
  if (ch.practiceQuizData) count++;
  if (ch.inClassQuizData && ch.inClassQuizData.length > 0) count++;
  if (ch.discussionData && ch.discussionData.length > 0) count++;
  if (ch.activityData && ch.activityData.length > 0) count++;
  if (ch.audioTranscript) count++;
  if (ch.slidesJson && ch.slidesJson.length > 0) count++;
  if (hasGemini && ch.infographicDataUri) count++;
  return count;
}

export function ChapterSidebar({ selectedChapterNum, onSelectChapter, disabled, batchCurrentChapter }: ChapterSidebarProps) {
  const { syllabus, chapters, researchDossiers } = useCourseStore();
  const { geminiApiKey } = useApiStore();
  const hasGemini = !!geminiApiKey;
  const totalOutputs = hasGemini ? 8 : 7;

  if (!syllabus) return null;

  return (
    <div className="w-[260px] shrink-0 border-r border-violet-500/10 overflow-y-auto pr-2">
      <div className="px-3 py-2 mb-1">
        <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Classes</p>
      </div>
      <div className="space-y-1">
        {syllabus.chapters.map((ch) => {
          const generated = chapters.find(c => c.number === ch.number);
          const dossier = researchDossiers.find(d => d.chapterNumber === ch.number);
          const readyCount = generated ? countReady(generated, hasGemini) : 0;
          const isSelected = ch.number === selectedChapterNum;
          const isBatchCurrent = batchCurrentChapter === ch.number;
          const progress = readyCount / totalOutputs;

          return (
            <button
              key={ch.number}
              onClick={() => !disabled && onSelectChapter(ch.number)}
              disabled={disabled}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all border-0 ${
                disabled ? 'cursor-default' : 'cursor-pointer'
              } ${
                isSelected
                  ? 'bg-violet-500/15 border-l-2 border-l-violet-500'
                  : 'bg-transparent hover:bg-bg-elevated'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {isBatchCurrent && (
                  <motion.span
                    className="w-2 h-2 rounded-full bg-violet-500 shrink-0"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                )}
                <span className={`text-sm font-medium truncate ${isSelected ? 'text-violet-400' : 'text-text-primary'}`}>
                  {ch.number}. {ch.title}
                </span>
              </div>

              {/* Status line */}
              <div className="flex items-center gap-2 pl-0.5">
                {readyCount > 0 ? (
                  <>
                    <div className="flex-1 h-1 bg-bg-elevated rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          readyCount >= totalOutputs ? 'bg-success' : 'bg-violet-500'
                        }`}
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-text-muted tabular-nums shrink-0">
                      {readyCount}/{totalOutputs}
                    </span>
                  </>
                ) : (
                  <span className="text-[11px] text-text-muted">Not started</span>
                )}
              </div>

              {/* Research badge */}
              {dossier && dossier.sources.length > 0 ? (
                <div className="mt-1 pl-0.5">
                  <span className="text-[10px] text-violet-400/70">
                    {dossier.sources.length} source{dossier.sources.length !== 1 ? 's' : ''}
                  </span>
                </div>
              ) : (
                <div className="mt-1 pl-0.5">
                  <span className="text-[10px] text-amber-400/60">No research</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
