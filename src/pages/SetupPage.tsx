import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourseStore } from '../store/courseStore';
import { useApiStore } from '../store/apiStore';
import { useUiStore } from '../store/uiStore';
import { MODELS } from '../services/claude/client';
import type {
  CourseSetup,
  EducationLevel,
  PriorKnowledge,
  TeachingEnvironment,
} from '../types/course';
import {
  CodexButton,
  CodexInput,
  CodexTextarea,
  CodexSlider,
  CodexBadge,
  CodexModal,
  ChoicePill,
  CourseStylePicker,
  VoicePicker,
} from '../components/codex';
import type { ChapterThemeId } from '../themes';

// ─── Domain options ──────────────────────────────────────────────────────

interface AudienceTile {
  value: EducationLevel;
  label: string;
  sub: string;
}

const AUDIENCE_TILES: AudienceTile[] = [
  { value: 'first-year', label: 'First-year', sub: '100-level intro' },
  { value: 'advanced-undergrad', label: 'Undergraduate', sub: '200–400 level' },
  { value: 'postgraduate', label: 'Postgraduate', sub: 'Honours · Masters' },
  { value: 'professional', label: 'Professional', sub: 'Working practice' },
  { value: 'general-public', label: 'General', sub: 'Curious public' },
];

const AUDIENCE_VALUES = new Set(AUDIENCE_TILES.map((t) => t.value));

const PRIOR_KNOWLEDGE: { value: PriorKnowledge; label: string; sub: string }[] = [
  { value: 'none', label: 'No prior knowledge', sub: 'Complete beginners.' },
  { value: 'some', label: 'Some foundation', sub: 'Basic concepts in hand.' },
  { value: 'significant', label: 'Significant background', sub: 'Ready for advanced material.' },
];

const COHORT_SIZES: { value: number; label: string; sub: string }[] = [
  { value: 25, label: 'Small', sub: 'under 30' },
  { value: 65, label: 'Medium', sub: '30–100' },
  { value: 200, label: 'Large', sub: '100–300' },
  { value: 400, label: 'Very large', sub: '300+' },
];

const VALID_COHORTS = new Set(COHORT_SIZES.map((c) => c.value));

// Teaching-environment options for in-class activity tailoring. Optional —
// when nothing is selected, the activities prompt defaults to a classic
// lecture-theatre footprint (turn-and-talks, hand polls, no movement).
const TEACHING_ENVIRONMENTS: { value: TeachingEnvironment; label: string; sub: string }[] = [
  { value: 'lecture-theatre',  label: 'Lecture theatre',  sub: 'Tiered seating, students fixed' },
  { value: 'active-classroom', label: 'Active classroom', sub: 'Moveable desks or group tables' },
  { value: 'online',           label: 'Online or hybrid', sub: 'Breakouts, shared docs, chat' },
];

// ─── Starter briefs ──────────────────────────────────────────────────────

interface StarterBrief {
  title: string;
  topic: string;
  audienceLabel: string;
  educationLevel: EducationLevel;
  chapters: number;
}

const STARTER_BRIEFS: StarterBrief[] = [
  {
    title: 'Memory and the science of forgetting',
    topic:
      'Memory and the science of forgetting — how the brain encodes, decays, and rebuilds what we know. Decay, interference, consolidation, and the practical art of remembering.',
    audienceLabel: 'first-year · 8 weeks',
    educationLevel: 'first-year',
    chapters: 8,
  },
  {
    title: 'How to read a poem',
    topic:
      'How to read a poem — close attention as a learnable skill. One poem a week, paragraph by paragraph: form, sound, rhetoric, and the silences between.',
    audienceLabel: 'undergrad seminar · 6 weeks',
    educationLevel: 'advanced-undergrad',
    chapters: 6,
  },
  {
    title: "Wittgenstein's Philosophical Investigations",
    topic:
      "Wittgenstein's Philosophical Investigations — a slow reading from §1. Language games, rule-following, private language, and the picture that held us captive.",
    audienceLabel: 'graduate seminar · 10 weeks',
    educationLevel: 'postgraduate',
    chapters: 10,
  },
];

// ─── Page ────────────────────────────────────────────────────────────────

export function SetupPage() {
  const navigate = useNavigate();
  const { setup, updateSetup, setStage, completeStage, resetDownstream, syllabus, chapters } = useCourseStore();
  const { claudeApiKey, claudeKeyValid } = useApiStore();
  const {
    openKeysOnNextSetupVisit,
    setOpenKeysOnNextSetupVisit,
  } = useUiStore();
  const [refineOpen, setRefineOpen] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const [showBeginConfirm, setShowBeginConfirm] = useState(false);

  // Honour cross-page request to open the keys modal — e.g. user clicked an
  // "Add OpenAI key →" CTA on the Build page.
  useEffect(() => {
    if (openKeysOnNextSetupVisit) {
      setKeysOpen(true);
      setOpenKeysOnNextSetupVisit(false);
    }
  }, [openKeysOnNextSetupVisit, setOpenKeysOnNextSetupVisit]);

  // Snap stale cohort values to the nearest valid pill.
  useEffect(() => {
    if (!VALID_COHORTS.has(setup.cohortSize)) updateSetup({ cohortSize: 65 });
  }, [setup.cohortSize, updateSetup]);

  // Snap stale education levels (e.g. 'high-school', 'general-public') to the
  // 4-tile picker's default.
  useEffect(() => {
    if (!AUDIENCE_VALUES.has(setup.educationLevel)) {
      updateSetup({ educationLevel: 'advanced-undergrad' });
    }
  }, [setup.educationLevel, updateSetup]);

  // Legacy classroom values from the 4-tile version map cleanly onto the new
  // 'active-classroom' bucket (both were "students can rearrange and form
  // groups"). Migrate quietly so old courses don't show an empty pill.
  useEffect(() => {
    if (
      setup.teachingEnvironment === 'collaborative' ||
      setup.teachingEnvironment === 'flat-classroom'
    ) {
      updateSetup({ teachingEnvironment: 'active-classroom' });
    }
  }, [setup.teachingEnvironment, updateSetup]);

  // Clamp persisted numChapters to the current 3..20 range — any older
  // value outside that band gets pulled to the nearest valid endpoint.
  useEffect(() => {
    if (setup.numChapters < 3) updateSetup({ numChapters: 3 });
    else if (setup.numChapters > 20) updateSetup({ numChapters: 20 });
  }, [setup.numChapters, updateSetup]);

  const hasTopic = setup.topic.trim().length > 10;
  const hasApiKey = claudeApiKey.trim().length > 0;
  const canProceed = hasTopic && hasApiKey;
  // Anything downstream that "Begin" would wipe.
  const hasDownstream = !!syllabus || chapters.length > 0;

  const doGenerate = () => {
    resetDownstream();
    completeStage('setup');
    setStage('syllabus');
    navigate('/syllabus');
  };

  const handleGenerate = () => {
    // Beginning again replaces the course in progress — confirm first.
    if (hasDownstream) setShowBeginConfirm(true);
    else doGenerate();
  };

  const applyStarter = (s: StarterBrief) => {
    updateSetup({
      topic: s.topic,
      educationLevel: s.educationLevel,
      numChapters: s.chapters,
    });
  };

  const helperLine = !hasTopic && !hasApiKey
    ? 'Add a course topic and your Anthropic key to continue.'
    : !hasTopic
    ? 'Add a course topic to continue.'
    : !hasApiKey
    ? 'Add your Anthropic key to continue.'
    : claudeKeyValid === false
    ? 'Your Anthropic key failed verification — check it before you begin.'
    : 'Drafting the syllabus takes a few minutes.';

  return (
    <div
      style={{
        fontFamily: 'var(--font-cb-serif)',
        color: 'var(--cb-text-default)',
        padding: '48px 0 64px',
      }}
    >
      <style>{`
        .cb-chip {
          display: grid; grid-template-columns: 1fr auto; gap: 14px;
          align-items: baseline;
          padding: 12px 16px;
          background: transparent;
          border: 1px solid var(--cb-border-default);
          border-radius: 1.5px;
          font-family: var(--font-cb-serif);
          color: var(--cb-text-default);
          text-align: left;
          cursor: pointer;
          transition: border-color 200ms cubic-bezier(0.32,0.04,0.32,1);
        }
        .cb-chip:hover { border-color: var(--cb-border-strong); }
      `}</style>

      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* ── TOPIC SECTION ───────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <div>
            <div
              className="cb-sc"
              style={{
                fontSize: 13,
                color: 'var(--cb-accent-emphasis)',
                letterSpacing: '0.16em',
              }}
            >
              The brief
            </div>
            <h1
              style={{
                margin: '8px 0 6px',
                fontSize: 46,
                lineHeight: 1.1,
                fontWeight: 500,
                fontVariationSettings: '"opsz" 36',
                letterSpacing: '-0.01em',
                color: 'var(--cb-text-default)',
              }}
            >
              What are you teaching?
            </h1>
            <p
              className="cb-italic"
              style={{
                fontSize: 19,
                lineHeight: 1.55,
                color: 'var(--cb-text-muted)',
                margin: '0 0 22px',
                maxWidth: 640,
              }}
            >
              Three answers, and ClassBuild drafts the rest — slides, quizzes, readings,
              narration.
            </p>

            <CodexTextarea
              label="Course topic"
              size="lg"
              value={setup.topic}
              onChange={(e) => updateSetup({ topic: e.target.value })}
              placeholder="e.g. Cognitive Load Theory — how working memory shapes good teaching."
              rows={3}
              hint={
                <>
                  Be specific — <span className="cb-italic">"Cognitive Load Theory"</span>{' '}
                  reads better than <span className="cb-italic">"Psychology"</span>.
                </>
              }
            />

            <div style={{ marginTop: 16 }}>
              <div
                className="cb-sc"
                style={{
                  fontSize: 13,
                  color: 'var(--cb-text-muted)',
                  letterSpacing: '0.12em',
                  marginBottom: 10,
                }}
              >
                Start from an example
              </div>
              <div
                className="cb-starter-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${STARTER_BRIEFS.length}, minmax(0, 1fr))`,
                  gap: 12,
                }}
              >
                {STARTER_BRIEFS.map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => applyStarter(s)}
                    className="cb-focus"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--cb-border-default)',
                      borderRadius: 1.5,
                      padding: '14px',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-cb-serif)',
                      color: 'var(--cb-text-default)',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      transition:
                        'border-color 200ms cubic-bezier(0.32,0.04,0.32,1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        'var(--cb-border-strong)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor =
                        'var(--cb-border-default)';
                    }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        lineHeight: 1.3,
                        fontVariationSettings: '"opsz" 14',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {s.title}
                    </span>
                    <span
                      className="cb-italic cb-sc"
                      style={{
                        fontSize: 11,
                        color: 'var(--cb-text-muted)',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {s.audienceLabel}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── BRIEF FIELDS ────────────────────────────────────────── */}
        <div>
          {/* Hairline rule between topic group and audience */}
          <div
            aria-hidden
            style={{
              height: 0.5,
              background: 'var(--cb-border-default)',
              marginBottom: 32,
            }}
          />

          {/* Audience — 4-tile picker */}
          <div style={{ marginBottom: 16 }}>
            <div
              className="cb-sc"
              style={{
                fontSize: 13,
                color: 'var(--cb-text-muted)',
                letterSpacing: '0.12em',
                marginBottom: 10,
              }}
            >
              Audience
            </div>
            <div
              className="cb-pill-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${AUDIENCE_TILES.length}, minmax(0, 1fr))`,
                gap: 8,
              }}
            >
              {AUDIENCE_TILES.map((t) => (
                <ChoicePill
                  key={t.value}
                  selected={setup.educationLevel === t.value}
                  onClick={() => updateSetup({ educationLevel: t.value })}
                  label={t.label}
                  sub={t.sub}
                />
              ))}
            </div>
            <p
              className="cb-italic"
              style={{
                fontSize: 13,
                lineHeight: 1.5,
                color: 'var(--cb-text-muted)',
                margin: '8px 0 0',
              }}
            >
              Sets reading level and quiz difficulty.
            </p>
          </div>

          {/* Length — slider */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 10,
              }}
            >
              <span
                className="cb-sc"
                style={{
                  fontSize: 13,
                  color: 'var(--cb-text-muted)',
                  letterSpacing: '0.12em',
                }}
              >
                Length
              </span>
              <span
                className="cb-italic"
                style={{
                  fontSize: 17,
                  color: 'var(--cb-accent-emphasis)',
                  fontVariationSettings: '"opsz" 14',
                }}
              >
                {setup.numChapters} chapters
              </span>
            </div>
            <CodexSlider
              value={setup.numChapters}
              min={3}
              max={20}
              onChange={(e) =>
                updateSetup({ numChapters: Number(e.target.value) })
              }
            />
            <p
              className="cb-italic"
              style={{
                fontSize: 13,
                lineHeight: 1.5,
                color: 'var(--cb-text-muted)',
                margin: '8px 0 0',
              }}
            >
              ≈ one chapter per week of teaching.
            </p>
          </div>

          {/* Primary action row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 16,
              flexWrap: 'wrap',
              marginTop: 48,
            }}
          >
            <span
              className="cb-italic"
              style={{
                fontSize: 13,
                color: claudeKeyValid === false && hasApiKey && hasTopic
                  ? 'var(--cb-status-warning)'
                  : 'var(--cb-text-muted)',
                // Narrow basis lets the helper share one row with both
                // buttons; the row only wraps on genuinely tight widths.
                flex: '1 1 200px',
                lineHeight: 1.5,
              }}
            >
              {helperLine}
            </span>
            {(!hasApiKey || claudeKeyValid === false) && (
              <CodexButton
                variant="secondary"
                size="lg"
                onClick={() => setKeysOpen(true)}
              >
                {hasApiKey ? 'Check key →' : 'Add Anthropic key →'}
              </CodexButton>
            )}
            <CodexButton
              variant="primary"
              size="lg"
              disabled={!canProceed}
              onClick={handleGenerate}
            >
              Begin · Syllabus →
            </CodexButton>
          </div>

          {/* Beginning again replaces the in-progress course — confirm. */}
          <CodexModal
            open={showBeginConfirm}
            onClose={() => setShowBeginConfirm(false)}
            kicker="begin again"
            title={
              <>
                Replace the course in <span className="cb-italic">progress</span>?
              </>
            }
            sub={`Beginning from this brief clears the current syllabus${
              chapters.length > 0
                ? `, ${chapters.length} drafted ${chapters.length === 1 ? 'chapter' : 'chapters'},`
                : ''
            } and all research dossiers. Download a project file from Export first if you want to keep it.`}
            width={480}
            actions={
              <>
                <span style={{ flex: 1 }} />
                <CodexButton variant="ghost" onClick={() => setShowBeginConfirm(false)}>
                  Cancel
                </CodexButton>
                <CodexButton
                  variant="destructive"
                  onClick={() => {
                    setShowBeginConfirm(false);
                    doGenerate();
                  }}
                >
                  Replace & begin →
                </CodexButton>
              </>
            }
          >
            <></>
          </CodexModal>

          <div style={{ marginTop: 24 }}>
            <RefineDisclosure
              open={refineOpen}
              onToggle={() => setRefineOpen((v) => !v)}
              setup={setup}
              updateSetup={updateSetup}
            />
          </div>
        </div>

        {/* ── WHAT COMES NEXT ─────────────────────────────────────── */}
        <WhatComesNext />

        {/* ── EACH CHAPTER WILL INCLUDE ───────────────────────────── */}
        <EachChapterIncludes />

        {/* ── FOOTER ──────────────────────────────────────────────── */}
        <div
          style={{
            marginTop: 48,
            paddingTop: 16,
            borderTop: '0.5px solid var(--cb-border-default)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            fontSize: 14.5,
            color: 'var(--cb-text-muted)',
          }}
        >
          <button
            type="button"
            onClick={() => setKeysOpen(true)}
            className="cb-focus"
            style={{
              background: 'transparent',
              border: 0,
              padding: 0,
              cursor: 'pointer',
              color: 'var(--cb-accent-link)',
              textDecoration: 'underline',
              textDecorationThickness: '0.5px',
              textUnderlineOffset: 3,
              fontFamily: 'inherit',
              fontSize: 14.5,
              whiteSpace: 'nowrap',
            }}
          >
            {hasApiKey ? 'Manage keys ↗' : 'Set keys ↗'}
          </button>
          <span className="cb-italic">
            Keys live in this browser. Nothing is sent to ClassBuild — there is no
            ClassBuild server.
          </span>
        </div>

        <div className="cb-folio">— 01 —</div>
      </div>

      <ApiKeysModal open={keysOpen} onClose={() => setKeysOpen(false)} />
    </div>
  );
}

// ─── Refine disclosure ───────────────────────────────────────────────────

interface RefineDisclosureProps {
  open: boolean;
  onToggle: () => void;
  setup: CourseSetup;
  updateSetup: (updates: Partial<CourseSetup>) => void;
}

function RefineDisclosure({
  open,
  onToggle,
  setup,
  updateSetup,
}: RefineDisclosureProps) {
  return (
    <section
      style={{
        marginTop: 8,
        paddingTop: 16,
        borderTop: '0.5px solid var(--cb-border-default)',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="cb-focus"
        aria-expanded={open}
        style={{
          background: 'transparent',
          border: 0,
          padding: 0,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 12,
          color: 'var(--cb-text-default)',
          fontFamily: 'inherit',
        }}
      >
        <span
          className="cb-sc"
          style={{
            fontSize: 13.5,
            color: 'var(--cb-accent-emphasis)',
            letterSpacing: '0.14em',
          }}
        >
          More to tell ClassBuild
        </span>
        <span
          className="cb-italic"
          style={{ fontSize: 14.5, color: 'var(--cb-text-muted)' }}
        >
          {open ? '— hide —' : '— optional —'}
        </span>
      </button>

      {open && (
        <div style={{ display: 'grid', gap: 32, marginTop: 24 }}>
          {/* ── CONTENT SCOPE ─────────────────────────────────── */}
          <RefineGroup kicker="Content scope">
            <CodexInput
              label="Specific topics that must be covered"
              value={setup.specificTopics ?? ''}
              onChange={(e) => updateSetup({ specificTopics: e.target.value })}
              placeholder="e.g. interference theory, Ebbinghaus curve, consolidation"
            />
            <CodexInput
              label="Topics to avoid"
              value={setup.avoidTopics ?? ''}
              onChange={(e) => updateSetup({ avoidTopics: e.target.value })}
              placeholder="e.g. statistical methods, edge-case neuroscience, anything off-syllabus"
            />
            <CodexInput
              label="Textbook or resource you typically follow"
              value={setup.textbookReference ?? ''}
              onChange={(e) => updateSetup({ textbookReference: e.target.value })}
              placeholder="e.g. Baddeley (2020) Memory · Oxford"
            />
          </RefineGroup>

          {/* ── ABOUT YOUR STUDENTS ───────────────────────────── */}
          <RefineGroup kicker="About your students">
            <PillGroup
              label="What do students already know?"
              cols={3}
              value={setup.priorKnowledge}
              onChange={(v) => updateSetup({ priorKnowledge: v as PriorKnowledge })}
              options={PRIOR_KNOWLEDGE.map((p) => ({
                value: p.value,
                label: p.label,
                sub: p.sub,
              }))}
            />
            <CodexInput
              label="Anything else about your learners"
              value={setup.learnerNotes ?? ''}
              onChange={(e) => updateSetup({ learnerNotes: e.target.value })}
              placeholder="e.g. English is their second language; mixed maths backgrounds"
            />
          </RefineGroup>

          {/* ── WHERE YOU TEACH ───────────────────────────────── */}
          <RefineGroup kicker="Where you teach">
            <PillGroup
              label="Classroom shape"
              cols={3}
              value={setup.teachingEnvironment}
              onChange={(v) => updateSetup({ teachingEnvironment: v as TeachingEnvironment })}
              options={TEACHING_ENVIRONMENTS.map((e) => ({
                value: e.value,
                label: e.label,
                sub: e.sub,
              }))}
              deselectable
            />
            <p
              className="cb-italic"
              style={{
                margin: '-2px 0 0',
                fontSize: 13.5,
                color: 'var(--cb-text-muted)',
                lineHeight: 1.5,
              }}
            >
              Skip to default to classic lecture-theatre activities (turn-and-talks, hand
              polls, no movement). Click a selected pill again to clear.
            </p>
            <CodexInput
              label="Room details (optional)"
              value={setup.environmentNotes ?? ''}
              onChange={(e) => updateSetup({ environmentNotes: e.target.value })}
              placeholder="e.g. 240-seat raked theatre, students bring laptops, one aisle on each side"
            />
          </RefineGroup>

          {/* ── OUTPUT SHAPE ──────────────────────────────────── */}
          <RefineGroup kicker="Output shape">
            <CourseStylePicker
              value={setup.themeId}
              onChange={(id) => updateSetup({ themeId: id as ChapterThemeId })}
            />
            <ReadingLengthField setup={setup} updateSetup={updateSetup} />
          </RefineGroup>
        </div>
      )}
    </section>
  );
}

// ─── RefineGroup — sub-kicker + hairline rule + stacked fields ───────────

function RefineGroup({
  kicker,
  children,
}: {
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="cb-sc"
        style={{
          fontSize: 13,
          color: 'var(--cb-accent-emphasis)',
          letterSpacing: '0.14em',
          paddingBottom: 10,
          marginBottom: 16,
          borderBottom: '0.5px solid var(--cb-border-default)',
        }}
      >
        {kicker}
      </div>
      <div style={{ display: 'grid', gap: 18 }}>{children}</div>
    </div>
  );
}

// ─── ReadingLengthField — free-text + example chips ──────────────────────

const READING_LENGTH_EXAMPLES: {
  title: string;
  caption: string;
  value: string;
}[] = [
  {
    title: '~20 MIN',
    caption: 'intro level',
    value: '~20 minutes per chapter, intro-level pacing',
  },
  {
    title: '~60 MIN',
    caption: 'comprehensive · worked examples',
    value:
      '~60 minutes per chapter, comprehensive with worked examples and figures',
  },
  {
    title: '~2 HOURS',
    caption: 'deep dive · extended examples',
    value:
      '~2 hours per chapter, deep-dive with extended worked examples and discussion of edge cases',
  },
];

function detectLongReading(brief: string): boolean {
  if (!brief) return false;
  // Hours mentioned, or any word-count >= ~10,000.
  if (/\b\d+(?:\.\d+)?\s*(?:hours?|hrs?)\b/i.test(brief)) return true;
  const wordMatch = brief.match(/\b(\d{4,})\s*(?:w|words?)\b/i);
  if (wordMatch && Number(wordMatch[1]) >= 10000) return true;
  return false;
}

function ReadingLengthField({
  setup,
  updateSetup,
}: {
  setup: CourseSetup;
  updateSetup: (updates: Partial<CourseSetup>) => void;
}) {
  const value = setup.chapterLengthBrief ?? '';
  const isLong = detectLongReading(value);

  return (
    <div>
      {/* Label */}
      <div
        className="cb-sc"
        style={{
          fontSize: 13,
          color: 'var(--cb-text-muted)',
          letterSpacing: '0.12em',
          marginBottom: 6,
        }}
      >
        Reading length per chapter
      </div>

      {/* Hint sits above the input — commentary on the field, not on the typed value */}
      <div
        className="cb-italic"
        style={{
          fontSize: 13.5,
          color: 'var(--cb-text-muted)',
          lineHeight: 1.45,
          marginBottom: 10,
        }}
      >
        Reading time only. Quizzes, slides, and activities add more.
      </div>

      <CodexInput
        aria-label="Reading length per chapter"
        value={value}
        onChange={(e) => updateSetup({ chapterLengthBrief: e.target.value })}
        placeholder="e.g. ~30 minutes per chapter, comprehensive coverage with worked examples"
      />

      <div style={{ marginTop: 14 }}>
        <div
          className="cb-sc"
          style={{
            fontSize: 11.5,
            color: 'var(--cb-text-muted)',
            letterSpacing: '0.12em',
            marginBottom: 8,
          }}
        >
          Start from an example
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {READING_LENGTH_EXAMPLES.map((ex) => (
            <button
              key={ex.title}
              type="button"
              onClick={() => updateSetup({ chapterLengthBrief: ex.value })}
              className="cb-focus"
              style={{
                background: 'transparent',
                border: '1px solid var(--cb-border-default)',
                borderRadius: 1.5,
                padding: '14px',
                cursor: 'pointer',
                fontFamily: 'var(--font-cb-serif)',
                color: 'var(--cb-text-default)',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                transition:
                  'border-color 200ms cubic-bezier(0.32,0.04,0.32,1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--cb-border-strong)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--cb-border-default)';
              }}
            >
              <span
                className="cb-mono"
                style={{
                  fontSize: 13.5,
                  letterSpacing: '0.06em',
                  color: 'var(--cb-text-default)',
                }}
              >
                {ex.title}
              </span>
              <span
                className="cb-italic"
                style={{
                  fontSize: 13,
                  color: 'var(--cb-text-muted)',
                  lineHeight: 1.4,
                }}
              >
                {ex.caption}
              </span>
            </button>
          ))}
        </div>
      </div>

      {isLong && (
        <div
          className="cb-italic"
          style={{
            marginTop: 8,
            fontSize: 13,
            color: 'var(--cb-text-muted)',
            lineHeight: 1.5,
          }}
        >
          Long readings take noticeably longer per chapter to draft — feel free to step away.
        </div>
      )}
    </div>
  );
}

// ─── PillGroup helper ────────────────────────────────────────────────────

interface PillGroupProps {
  label: string;
  cols: number;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; sub?: string }[];
  deselectable?: boolean;
}

function PillGroup({ label, cols, value, onChange, options, deselectable }: PillGroupProps) {
  return (
    <div>
      <div
        className="cb-sc"
        style={{
          fontSize: 13,
          color: 'var(--cb-text-muted)',
          letterSpacing: '0.12em',
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: 'grid',
          // intrinsic-responsive — collapses to a single column on narrow viewports.
          gridTemplateColumns: `repeat(auto-fit, minmax(min(160px, 100%), 1fr))`,
          // Cap at the requested column count on wider viewports.
          maxWidth: cols >= 5 ? '100%' : `calc(${cols} * 220px)`,
          gap: 10,
        }}
      >
        {options.map((o) => (
          <ChoicePill
            key={o.value}
            selected={value === o.value}
            onClick={() =>
              onChange(deselectable && value === o.value ? '' : o.value)
            }
            label={o.label}
            sub={o.sub}
          />
        ))}
      </div>
    </div>
  );
}

// ─── WhatComesNext — process strip ──────────────────────────────────────

function WhatComesNext() {
  const stages = [
    { label: 'Syllabus',  body: 'You review the chapter titles and order before research begins.' },
    { label: 'Research',  body: 'ClassBuild gathers and cites sources for each chapter.' },
    { label: 'Build',     body: 'Eight materials drafted per chapter — reading, slides, audio, quizzes, and more.' },
    { label: 'Export',    body: 'Download as PowerPoint, Word, web pages, or LMS packages — all local.' },
  ];
  return (
    <section
      style={{
        marginTop: 48,
        paddingTop: 32,
        borderTop: '0.5px solid var(--cb-border-default)',
      }}
    >
      <div
        className="cb-sc"
        style={{
          fontSize: 14,
          color: 'var(--cb-accent-emphasis)',
          letterSpacing: '0.14em',
          marginBottom: 18,
        }}
      >
        What comes next
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))`,
          gap: 24,
        }}
        className="cb-pill-grid"
      >
        {stages.map((s) => (
          <div key={s.label}>
            <div
              className="cb-sc"
              style={{
                fontSize: 11.5,
                color: 'var(--cb-text-muted)',
                letterSpacing: '0.12em',
                marginBottom: 6,
              }}
            >
              {s.label}
            </div>
            <p
              className="cb-italic"
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.55,
                color: 'var(--cb-text-default)',
              }}
            >
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── EachChapterIncludes — categories line ───────────────────────────────

function EachChapterIncludes() {
  const items = [
    'Reading',
    'Practice',
    'Quizzes',
    'Challenge',
    'Discussion',
    'Activities',
    'Audio',
    'Slides',
  ];
  return (
    <section style={{ marginTop: 32 }}>
      <div
        className="cb-sc"
        style={{
          fontSize: 14,
          color: 'var(--cb-accent-emphasis)',
          letterSpacing: '0.14em',
          marginBottom: 12,
        }}
      >
        Each chapter will include
      </div>
      <p
        className="cb-italic"
        style={{
          margin: 0,
          fontSize: 15,
          lineHeight: 1.6,
          color: 'var(--cb-text-default)',
        }}
      >
        {items.map((label, i) => (
          <span key={label}>
            {label}
            {i < items.length - 1 && (
              <span style={{ color: 'var(--cb-text-subtle)' }}> · </span>
            )}
          </span>
        ))}
      </p>
    </section>
  );
}

// ─── API keys modal ──────────────────────────────────────────────────────

function ApiKeysModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setup, updateSetup } = useCourseStore();
  const {
    claudeApiKey,
    openaiApiKey,
    elevenLabsApiKey,
    claudeKeyValid,
    openaiKeyValid,
    elevenLabsKeyValid,
    isValidatingClaude,
    isValidatingOpenai,
    isValidatingElevenLabs,
    setClaudeApiKey,
    setOpenaiApiKey,
    setElevenLabsApiKey,
    setClaudeKeyValid,
    setOpenaiKeyValid,
    setElevenLabsKeyValid,
    setIsValidatingClaude,
    setIsValidatingOpenai,
    setIsValidatingElevenLabs,
  } = useApiStore();

  const validateClaude = useCallback(async () => {
    if (!claudeApiKey.trim()) return;
    setIsValidatingClaude(true);
    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({
        apiKey: claudeApiKey.trim(),
        dangerouslyAllowBrowser: true,
      });
      // countTokens is free — it authenticates without spending tokens.
      await client.messages.countTokens({
        model: MODELS.haiku,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      setClaudeKeyValid(true);
    } catch {
      setClaudeKeyValid(false);
    } finally {
      setIsValidatingClaude(false);
    }
  }, [claudeApiKey, setClaudeKeyValid, setIsValidatingClaude]);

  const validateOpenai = useCallback(async () => {
    if (!openaiApiKey.trim()) return;
    setIsValidatingOpenai(true);
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${openaiApiKey.trim()}` },
      });
      setOpenaiKeyValid(res.ok);
    } catch {
      setOpenaiKeyValid(false);
    } finally {
      setIsValidatingOpenai(false);
    }
  }, [openaiApiKey, setOpenaiKeyValid, setIsValidatingOpenai]);

  const validateElevenLabs = useCallback(async () => {
    if (!elevenLabsApiKey.trim()) return;
    setIsValidatingElevenLabs(true);
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
        headers: { 'xi-api-key': elevenLabsApiKey.trim() },
      });
      setElevenLabsKeyValid(res.ok);
    } catch {
      setElevenLabsKeyValid(false);
    } finally {
      setIsValidatingElevenLabs(false);
    }
  }, [elevenLabsApiKey, setElevenLabsKeyValid, setIsValidatingElevenLabs]);

  // Re-validate stored keys when modal opens for the first time.
  const validatedRef = useRef(false);
  useEffect(() => {
    if (!open || validatedRef.current) return;
    validatedRef.current = true;
    if (claudeApiKey.trim() && claudeKeyValid === null) void validateClaude();
    if (openaiApiKey.trim() && openaiKeyValid === null) void validateOpenai();
    if (elevenLabsApiKey.trim() && elevenLabsKeyValid === null) {
      void validateElevenLabs();
    }
  }, [
    open,
    claudeApiKey,
    openaiApiKey,
    elevenLabsApiKey,
    claudeKeyValid,
    openaiKeyValid,
    elevenLabsKeyValid,
    validateClaude,
    validateOpenai,
    validateElevenLabs,
  ]);

  const statusFor = (
    validating: boolean,
    valid: boolean | null,
    raw: string,
  ) =>
    validating
      ? { text: 'checking…', color: 'var(--cb-text-muted)' }
      : valid === true
      ? { text: '✓ verified', color: 'var(--cb-status-success)' }
      : valid === false
      ? { text: '✗ failed', color: 'var(--cb-status-danger)' }
      : raw
      ? { text: 'unverified', color: 'var(--cb-text-subtle)' }
      : null;

  const claudeStatus = statusFor(isValidatingClaude, claudeKeyValid, claudeApiKey);
  const openaiStatus = statusFor(isValidatingOpenai, openaiKeyValid, openaiApiKey);
  const elevenLabsStatus = statusFor(
    isValidatingElevenLabs,
    elevenLabsKeyValid,
    elevenLabsApiKey,
  );
  const anyValidating = isValidatingClaude || isValidatingOpenai || isValidatingElevenLabs;

  const linkStyle: React.CSSProperties = {
    color: 'var(--cb-accent-link)',
    textDecoration: 'underline',
    textDecorationThickness: '0.5px',
    textUnderlineOffset: 3,
    fontStyle: 'normal',
  };

  return (
    <CodexModal
      open={open}
      onClose={onClose}
      kicker="setup"
      title={
        <>
          API <span className="cb-italic">keys</span>
        </>
      }
      sub="Bring your own. Keys live in this browser — nothing is sent to ClassBuild (there is no ClassBuild server)."
      width={560}
      actions={
        <>
          <CodexBadge tone="info">local-only</CodexBadge>
          <span style={{ flex: 1 }} />
          <CodexButton variant="ghost" onClick={onClose}>
            Close
          </CodexButton>
          <CodexButton
            variant="secondary"
            onClick={() => {
              if (claudeApiKey.trim()) void validateClaude();
              if (openaiApiKey.trim()) void validateOpenai();
              if (elevenLabsApiKey.trim()) void validateElevenLabs();
            }}
            disabled={
              (!claudeApiKey.trim() &&
                !openaiApiKey.trim() &&
                !elevenLabsApiKey.trim()) ||
              anyValidating
            }
          >
            {anyValidating ? 'verifying…' : 'Verify'}
          </CodexButton>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 16 }}>
        <CodexInput
          label="Anthropic · required"
          type="password"
          value={claudeApiKey}
          onChange={(e) => setClaudeApiKey(e.target.value)}
          onBlur={() => {
            if (claudeApiKey.trim() && claudeKeyValid === null) void validateClaude();
          }}
          placeholder="sk-ant-…"
          suffix={
            claudeStatus ? (
              <span style={{ color: claudeStatus.color }}>{claudeStatus.text}</span>
            ) : undefined
          }
          hint={
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              Where do Anthropic keys come from? ↗
            </a>
          }
        />
        <div
          style={{
            padding: '12px 14px',
            background: 'var(--cb-accent-emphasis-quiet)',
            border: '0.5px solid var(--cb-accent-emphasis)',
            borderLeft: '2px solid var(--cb-accent-emphasis)',
            borderRadius: 2,
            fontSize: 13.5,
            color: 'var(--cb-text-default)',
            lineHeight: 1.55,
          }}
        >
          <strong style={{ fontWeight: 600 }}>OpenAI is strongly recommended.</strong>
          {' '}Without it, each chapter ships with placeholder figure boxes
          instead of editorial images, and the slide-deck export is locked
          (slides are rendered as 4K editorial images, not text boxes).
          You only pay OpenAI for what you generate.
        </div>
        <CodexInput
          label="OpenAI · strongly recommended"
          type="password"
          value={openaiApiKey}
          onChange={(e) => setOpenaiApiKey(e.target.value)}
          onBlur={() => {
            if (openaiApiKey.trim() && openaiKeyValid === null) void validateOpenai();
          }}
          placeholder="sk-proj-… · unlocks in-chapter images and the slide deck"
          suffix={
            openaiStatus ? (
              <span style={{ color: openaiStatus.color }}>{openaiStatus.text}</span>
            ) : undefined
          }
          hint={
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              Where do OpenAI keys come from? ↗ (gpt-image-2 renders the images)
            </a>
          }
        />
        <CodexInput
          label="ElevenLabs · optional"
          type="password"
          value={elevenLabsApiKey}
          onChange={(e) => setElevenLabsApiKey(e.target.value)}
          onBlur={() => {
            if (elevenLabsApiKey.trim() && elevenLabsKeyValid === null) {
              void validateElevenLabs();
            }
          }}
          placeholder="sk_… · narrates the audio transcript as a class audiobook"
          suffix={
            elevenLabsStatus ? (
              <span style={{ color: elevenLabsStatus.color }}>
                {elevenLabsStatus.text}
              </span>
            ) : undefined
          }
          hint={
            <>
              <span
                className="cb-italic"
                style={{ color: 'var(--cb-text-muted)', fontSize: 13 }}
              >
                Skip happily — the audio transcript still ships as text without it. ·{' '}
              </span>
              <a
                href="https://elevenlabs.io/app/settings/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                style={linkStyle}
              >
                Where do ElevenLabs keys come from? ↗
              </a>
            </>
          }
        />
        <VoicePicker
          value={setup.voiceId}
          onChange={(id) => updateSetup({ voiceId: id })}
        />
      </div>
    </CodexModal>
  );
}
