import { motion, AnimatePresence } from 'framer-motion';
import { ArtifactStatusLine, ArtifactEmpty } from '../artifactHelpers';
import type { ActivityDetail } from '../../../types/course';
import { normalizeActivityDetail } from '../../../utils/activityDetail';

export interface Activity {
  title: string;
  duration: string;
  description: string;
  materials: string;
  learningGoal: string;
  scalingNotes: string;
}

export interface ActivitiesTabProps {
  activities: Activity[];
  expandedActivities: Record<number, ActivityDetail>;
  expandingActivity: number | null;
  copiedLabel: string;
  isGenerating: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
  onCopy: (text: string, label: string) => void;
  onFleshOut: (i: number) => void;
  onCollapse: (i: number) => void;
  formatActivitiesText: () => string;
}

export function ActivitiesTab({
  activities,
  expandedActivities,
  expandingActivity,
  copiedLabel,
  isGenerating,
  canGenerate,
  onGenerate,
  onCopy,
  onFleshOut,
  onCollapse,
  formatActivitiesText,
}: ActivitiesTabProps) {
  if (activities.length === 0) {
    if (isGenerating) {
      return (
        <ArtifactStatusLine>
          Drafting in-class activities — four to six with timing and scaling notes
          for different cohort sizes.
        </ArtifactStatusLine>
      );
    }
    return (
      <ArtifactEmpty
        kicker="Activities"
        title="Four to six in-class activities"
        body="Ready-to-run exercises for your class session — each one tells you how long it takes, what you need on hand, and how to adapt it for a small seminar or a large lecture."
        cta="Generate activities"
        onCta={onGenerate}
        disabled={!canGenerate}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => onCopy(formatActivitiesText(), 'activities')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cb-accent-emphasis-quiet text-cb-accent-emphasis hover:bg-cb-accent-emphasis-quiet transition-colors cursor-pointer"
        >
          {copiedLabel === 'activities' ? (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy All
            </>
          )}
        </button>
      </div>
      {activities.map((a, i) => {
        const detail = normalizeActivityDetail(expandedActivities[i]);
        const isExpanding = expandingActivity === i;
        const isExpanded = !!detail;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-cb-ground-page border border-cb-border-default rounded-xl overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-base font-semibold">{a.title}</h3>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const d = detail;
                      let text = `${a.title}  (${a.duration})\n\n${a.description}\n\nMaterials: ${a.materials}\nLearning Goal: ${a.learningGoal}\nScaling: ${a.scalingNotes}`;
                      if (d) {
                        text += '\n\nStep-by-Step Guide:\n' + d.steps.map(s => `  [${s.timing}] ${s.instruction}${s.studentAction ? `\n    → Students: ${s.studentAction}` : ''}`).join('\n');
                        if (d.facilitationTips.length) text += '\n\nFacilitation Tips:\n' + d.facilitationTips.map(t => `  • ${t}`).join('\n');
                        if (d.commonPitfalls.length) text += '\n\nCommon Pitfalls:\n' + d.commonPitfalls.map(p => `  • ${p}`).join('\n');
                        text += `\n\nDebrief Guide:\n  ${d.debriefGuide}`;
                        if (d.variations.length) text += '\n\nVariations:\n' + d.variations.map(v => `  • ${v}`).join('\n');
                        if (d.assessmentIdeas) text += `\n\nAssessment Ideas:\n  ${d.assessmentIdeas}`;
                      }
                      onCopy(text, `activity-${i}`);
                    }}
                    className="p-1.5 rounded-md text-cb-text-muted hover:text-cb-accent-emphasis hover:bg-cb-accent-emphasis-quiet transition-colors cursor-pointer"
                    title="Copy activity"
                  >
                    {copiedLabel === `activity-${i}` ? (
                      <svg className="w-3.5 h-3.5 text-cb-status-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cb-status-warning-bg text-cb-status-warning">
                    {a.duration}
                  </span>
                </div>
              </div>
              <p className="text-sm text-cb-text-default mb-3 leading-relaxed">{a.description}</p>
              <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                <div>
                  <span className="text-cb-text-muted font-medium block mb-0.5">Materials</span>
                  <span className="text-cb-text-default">{a.materials}</span>
                </div>
                <div>
                  <span className="text-cb-text-muted font-medium block mb-0.5">Learning Goal</span>
                  <span className="text-cb-text-default">{a.learningGoal}</span>
                </div>
                <div>
                  <span className="text-cb-text-muted font-medium block mb-0.5">Scaling</span>
                  <span className="text-cb-text-default">{a.scalingNotes}</span>
                </div>
              </div>

              {!isExpanded && !isExpanding && (
                <button
                  onClick={() => onFleshOut(i)}
                  disabled={expandingActivity !== null}
                  className="text-xs text-cb-accent-emphasis hover:text-cb-accent-emphasis transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-default"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  Expand to full guide
                </button>
              )}
              {isExpanding && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(j => (
                      <motion.div
                        key={j}
                        className="w-1.5 h-1.5 rounded-full bg-cb-accent-emphasis"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, delay: j * 0.12, repeat: Infinity }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-cb-accent-emphasis">Expanding guide...</span>
                </div>
              )}
              {isExpanded && (
                <button
                  onClick={() => onCollapse(i)}
                  className="text-xs text-cb-text-muted hover:text-cb-text-default transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  Collapse
                </button>
              )}
            </div>

            <AnimatePresence>
              {detail && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border-t border-cb-border-default"
                >
                  <div className="p-5 space-y-5 bg-cb-surface-sunken">
                    <div>
                      <h4 className="text-sm font-semibold text-cb-accent-emphasis mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                        Step-by-Step Guide
                      </h4>
                      <div className="space-y-3">
                        {detail.steps.map((s) => (
                          <div key={s.step} className="flex gap-3">
                            <div className="shrink-0 w-16 text-xs text-cb-status-warning font-mono pt-0.5">{s.timing}</div>
                            <div className="flex-1 border-l-2 border-cb-border-default pl-3">
                              <p className="text-sm text-cb-text-default">{s.instruction}</p>
                              {s.studentAction && (
                                <p className="text-xs text-cb-text-muted mt-1 italic">Students: {s.studentAction}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-cb-ground-page rounded-lg p-4 border border-cb-border-default">
                        <h4 className="text-xs font-semibold text-cb-status-success mb-2">Facilitation Tips</h4>
                        <ul className="space-y-1.5">
                          {detail.facilitationTips.map((tip, j) => (
                            <li key={j} className="text-xs text-cb-text-default flex items-start gap-2">
                              <span className="w-1 h-1 rounded-full bg-cb-status-success shrink-0 mt-1.5" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-cb-ground-page rounded-lg p-4 border border-cb-border-default">
                        <h4 className="text-xs font-semibold text-cb-status-warning mb-2">Common Pitfalls</h4>
                        <ul className="space-y-1.5">
                          {detail.commonPitfalls.map((pitfall, j) => (
                            <li key={j} className="text-xs text-cb-text-default flex items-start gap-2">
                              <span className="w-1 h-1 rounded-full bg-cb-status-warning shrink-0 mt-1.5" />
                              {pitfall}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="bg-cb-ground-page rounded-lg p-4 border border-cb-border-default">
                      <h4 className="text-xs font-semibold text-cb-accent-emphasis mb-2">Debrief Guide</h4>
                      <p className="text-xs text-cb-text-default leading-relaxed">{detail.debriefGuide}</p>
                    </div>

                    {detail.variations.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-cb-text-muted mb-2">Variations</h4>
                        <ul className="space-y-1.5">
                          {detail.variations.map((v, j) => (
                            <li key={j} className="text-xs text-cb-text-default flex items-start gap-2">
                              <span className="w-1 h-1 rounded-full bg-cb-accent-emphasis shrink-0 mt-1.5" />
                              {v}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {detail.assessmentIdeas && (
                      <div className="bg-cb-ground-page rounded-lg p-4 border border-cb-border-default">
                        <h4 className="text-xs font-semibold text-cb-text-muted mb-2">Assessment Ideas</h4>
                        <p className="text-xs text-cb-text-default leading-relaxed">{detail.assessmentIdeas}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
