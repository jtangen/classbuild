import type { CSSProperties, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CodexButton as Button } from '../../codex';
import { ArtifactShell } from '../ArtifactShell';
import { ArtifactStatusLine, ArtifactEmpty, CopyIconButton, PenStroke } from '../artifactHelpers';
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
  /** False without an Anthropic key: "Expand to full guide" calls Claude. */
  canExpand?: boolean;
  onGenerate: () => void;
  /** Cancels the in-flight generation this tab reports on. */
  onStop: () => void;
  onCopy: (text: string, label: string) => void;
  onFleshOut: (i: number) => void;
  onCollapse: (i: number) => void;
  formatActivitiesText: () => string;
}

const LABEL: CSSProperties = {
  fontSize: 11.5,
  letterSpacing: '0.12em',
  color: 'var(--cb-text-muted)',
  marginBottom: 6,
};

const TEXT_LINK: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  background: 'transparent',
  border: 0,
  padding: 0,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 13.5,
  fontStyle: 'italic',
  color: 'var(--cb-accent-link)',
  textDecoration: 'underline',
  textDecorationThickness: '0.5px',
  textUnderlineOffset: 3,
};

/** Plain-text version of one activity (plus its guide, if expanded) for the clipboard. */
function activityText(a: Activity, d: ActivityDetail | null | undefined): string {
  let text = `${a.title}  (${a.duration})\n\n${a.description}\n\nMaterials: ${a.materials}\nLearning Goal: ${a.learningGoal}\nScaling: ${a.scalingNotes}`;
  if (d) {
    text += '\n\nStep-by-Step Guide:\n' + d.steps.map((s) => `  [${s.timing}] ${s.instruction}${s.studentAction ? `\n    → Students: ${s.studentAction}` : ''}`).join('\n');
    if (d.facilitationTips.length) text += '\n\nFacilitation Tips:\n' + d.facilitationTips.map((t) => `  • ${t}`).join('\n');
    if (d.commonPitfalls.length) text += '\n\nCommon Pitfalls:\n' + d.commonPitfalls.map((p) => `  • ${p}`).join('\n');
    text += `\n\nDebrief Guide:\n  ${d.debriefGuide}`;
    if (d.variations.length) text += '\n\nVariations:\n' + d.variations.map((v) => `  • ${v}`).join('\n');
    if (d.assessmentIdeas) text += `\n\nAssessment Ideas:\n  ${d.assessmentIdeas}`;
  }
  return text;
}

function DetailBox({ label, tone, children }: { label: string; tone?: string; children: ReactNode }) {
  return (
    <div
      style={{
        padding: '12px 14px',
        background: 'var(--cb-ground-page)',
        border: '0.5px solid var(--cb-border-default)',
        borderRadius: 2,
      }}
    >
      <div className="cb-sc" style={{ ...LABEL, color: tone ?? LABEL.color }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.55 }}>
      {items.map((t, j) => (
        <li key={j} style={{ marginBottom: 2 }}>
          {t}
        </li>
      ))}
    </ul>
  );
}

export function ActivitiesTab({
  activities,
  expandedActivities,
  expandingActivity,
  copiedLabel,
  isGenerating,
  canGenerate,
  canExpand = true,
  onGenerate,
  onStop,
  onCopy,
  onFleshOut,
  onCollapse,
  formatActivitiesText,
}: ActivitiesTabProps) {
  if (activities.length === 0) {
    if (isGenerating) {
      return (
        <ArtifactStatusLine onStop={onStop}>
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

  const expandDisabled = expandingActivity !== null || !canExpand;

  return (
    <ArtifactShell
      kicker="Activities"
      title={`${activities.length} in-class activities`}
      meta="Each with timing, materials and notes for scaling up or down."
      actions={
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onCopy(formatActivitiesText(), 'activities')}
        >
          {copiedLabel === 'activities' ? 'Copied' : 'Copy all'}
        </Button>
      }
      bodyless
    >
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {activities.map((a, i) => {
          const detail = normalizeActivityDetail(expandedActivities[i]);
          const isExpanding = expandingActivity === i;
          return (
            <li
              key={i}
              style={{ borderTop: i === 0 ? 'none' : '0.5px solid var(--cb-border-default)' }}
            >
              <div style={{ padding: '18px 22px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 500, lineHeight: 1.35, minWidth: 0 }}>
                    {a.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {a.duration && (
                      <span
                        className="cb-mono"
                        style={{
                          fontSize: 12,
                          padding: '2px 7px',
                          border: '0.5px solid var(--cb-border-default)',
                          borderRadius: 1.5,
                          color: 'var(--cb-status-warning-text)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {a.duration}
                      </span>
                    )}
                    <CopyIconButton
                      copied={copiedLabel === `activity-${i}`}
                      onClick={() => onCopy(activityText(a, detail), `activity-${i}`)}
                      label="Copy activity"
                    />
                  </div>
                </div>
                <p style={{ margin: '0 0 12px', fontSize: 15, lineHeight: 1.6 }}>{a.description}</p>
                <dl
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '10px 18px',
                    margin: '0 0 12px',
                    fontSize: 13.5,
                    lineHeight: 1.5,
                  }}
                >
                  {(
                    [
                      ['Materials', a.materials],
                      ['Learning goal', a.learningGoal],
                      ['Scaling', a.scalingNotes],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label}>
                      <dt className="cb-sc" style={LABEL}>
                        {label}
                      </dt>
                      <dd style={{ margin: 0 }}>{value}</dd>
                    </div>
                  ))}
                </dl>
                {!detail && !isExpanding && (
                  <button
                    type="button"
                    onClick={() => onFleshOut(i)}
                    disabled={expandDisabled}
                    className="cb-focus pointer-coarse:min-h-11"
                    style={{
                      ...TEXT_LINK,
                      opacity: expandDisabled ? 0.45 : 1,
                      cursor: expandDisabled ? 'default' : 'pointer',
                    }}
                  >
                    Expand to full guide →
                  </button>
                )}
                {isExpanding && (
                  <span role="status" style={{ display: 'inline-flex', alignItems: 'baseline', gap: 10 }}>
                    <PenStroke />
                    <span className="cb-italic" style={{ fontSize: 13, color: 'var(--cb-accent-emphasis)' }}>
                      Expanding the guide…
                    </span>
                  </span>
                )}
                {detail && (
                  <button
                    type="button"
                    onClick={() => onCollapse(i)}
                    className="cb-focus pointer-coarse:min-h-11"
                    style={TEXT_LINK}
                  >
                    Collapse
                  </button>
                )}
              </div>

              <AnimatePresence initial={false}>
                {detail && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ overflow: 'hidden', borderTop: '0.5px solid var(--cb-border-default)' }}
                  >
                    <div
                      style={{
                        padding: '18px 22px',
                        background: 'var(--cb-surface-sunken)',
                        display: 'grid',
                        gap: 14,
                      }}
                    >
                      <div>
                        <div className="cb-sc" style={{ ...LABEL, color: 'var(--cb-accent-emphasis)' }}>
                          Step-by-step guide
                        </div>
                        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                          {detail.steps.map((s, j) => (
                            <li
                              key={j}
                              style={{ display: 'grid', gridTemplateColumns: '64px minmax(0, 1fr)', gap: 12 }}
                            >
                              <span
                                className="cb-mono"
                                style={{ fontSize: 12, color: 'var(--cb-status-warning-text)', paddingTop: 2 }}
                              >
                                {s.timing}
                              </span>
                              <div style={{ borderLeft: '0.5px solid var(--cb-border-strong)', paddingLeft: 12 }}>
                                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{s.instruction}</p>
                                {s.studentAction && (
                                  <p
                                    className="cb-italic"
                                    style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--cb-text-muted)' }}
                                  >
                                    Students: {s.studentAction}
                                  </p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {(detail.facilitationTips.length > 0 || detail.commonPitfalls.length > 0) && (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: 12,
                          }}
                        >
                          {detail.facilitationTips.length > 0 && (
                            <DetailBox label="Facilitation tips" tone="var(--cb-status-success)">
                              <BulletList items={detail.facilitationTips} />
                            </DetailBox>
                          )}
                          {detail.commonPitfalls.length > 0 && (
                            <DetailBox label="Common pitfalls" tone="var(--cb-status-warning-text)">
                              <BulletList items={detail.commonPitfalls} />
                            </DetailBox>
                          )}
                        </div>
                      )}

                      <DetailBox label="Debrief guide" tone="var(--cb-accent-emphasis)">
                        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>{detail.debriefGuide}</p>
                      </DetailBox>

                      {detail.variations.length > 0 && (
                        <DetailBox label="Variations">
                          <BulletList items={detail.variations} />
                        </DetailBox>
                      )}

                      {detail.assessmentIdeas && (
                        <DetailBox label="Assessment ideas">
                          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>{detail.assessmentIdeas}</p>
                        </DetailBox>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>
    </ArtifactShell>
  );
}
