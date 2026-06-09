import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useCourseStore } from '../store/courseStore';
import { STAGES } from '../types/course';
import type { StageId } from '../types/course';
import { CodexButton, CodexBadge, CodexModal, Colophon } from '../components/codex';
import {
  applyProjectFile,
  parseProjectFile,
  type ProjectFileState,
} from '../utils/projectFile';

// ─── Example courses ─────────────────────────────────────────────────────

interface ExampleCourseInput {
  topic: string;
  level: string;
  priorKnowledge: string;
  cohortSize: string;
  learnerDetails: string;
  environment: string;
  voice: string;
  additionalDetails?: string;
}

interface ExampleCourse {
  title: string;
  subtitle: string;
  slug: string;
  chapters: number;
  audience: string;
  themeName: string;
  readingLength: string;
  hook: string;
  image: string;
  input: ExampleCourseInput;
}

const exampleCourses: ExampleCourse[] = [
  {
    title: 'Puppy School',
    subtitle: 'Socialisation, House Training, and Surviving the First Year',
    slug: 'raising-a-puppy',
    chapters: 8,
    audience: 'General public',
    themeName: 'Almanac',
    readingLength: 'Standard',
    hook:
      'From the critical 3–16 week socialisation window to adolescent regression at 18 months — everything a first-time owner needs, grounded in veterinary behavioural science.',
    image: '/courses/raising-a-puppy.jpg',
    input: {
      topic: 'Raising a Puppy: A Complete Guide for First-Time Dog Owners',
      level: 'General public',
      priorKnowledge: 'Some',
      cohortSize: '60',
      learnerDetails:
        'First-time puppy owners, mixed ages — many will be anxious and overwhelmed',
      environment: 'Lecture theatre',
      voice: 'Not specified',
      additionalDetails:
        'Tone should be reassuring, practical, and non-judgmental. Use Australian veterinary standards. Prioritise evidence-based training (positive reinforcement). Cite veterinary behavioural science (Sophia Yin, AVSAB).',
    },
  },
  {
    title: 'Understanding Your Sleep',
    subtitle: 'Circadian Rhythms, Sleep Architecture, and the Caffeine Equation',
    slug: 'understanding-your-sleep',
    chapters: 7,
    audience: 'General public',
    themeName: 'Studio',
    readingLength: 'Standard',
    hook:
      'Why morning light matters more than blue-light glasses, how sleep stages actually work, and where the evidence on eight hours gets overstated.',
    image: '/courses/understanding-your-sleep.jpg',
    input: {
      topic: 'Understanding Your Sleep: The Science of Rest, Rhythm, and Recovery',
      level: 'General public',
      priorKnowledge: 'Some',
      cohortSize: '60',
      learnerDetails:
        'Adults interested in improving their sleep — mix of general curiosity, poor sleep habits, shift workers',
      environment: 'Lecture theatre',
      voice: 'Not specified',
      additionalDetails:
        'Scientifically grounded but accessible. Key sources: Walker (flag overstatement), Dijk & Czeisler, Mednick. Be honest about what evidence supports vs. popular sleep hygiene advice.',
    },
  },
  {
    title: 'One Leaf, Ten Thousand Cups',
    subtitle: 'Chemistry, Culture, and Ceremony in Every Cup',
    slug: 'science-and-art-of-tea',
    chapters: 6,
    audience: 'General public',
    themeName: 'Press',
    readingLength: 'Standard',
    hook:
      "One plant becomes six types of tea. The oxidation science, brewing variables, and centuries of ritual behind the world's most consumed drink.",
    image: '/courses/science-and-art-of-tea.jpg',
    input: {
      topic: 'The Science and Art of Tea',
      level: 'General public',
      priorKnowledge: 'Some',
      cohortSize: '60',
      learnerDetails:
        'Tea enthusiasts, home brewers, foodies, and curious generalists — international audience',
      environment: 'Lecture theatre',
      voice: 'Charlie — Australian male, relaxed and natural',
      additionalDetails:
        'Respect deep cultural traditions without flattening them. Balance sensory, scientific, and historical. Conversation with a knowledgeable friend, not a textbook.',
    },
  },
  {
    title: 'From Couch to Finish Line',
    subtitle: 'Training Science, Nutrition, and the Psychology of 42.2 km',
    slug: 'training-for-your-first-marathon',
    chapters: 8,
    audience: 'General public',
    themeName: 'Storybook',
    readingLength: 'Standard',
    hook:
      "Evidence-based periodisation, race-day fuelling, and injury prevention — for people who aren't sure they're \"a runner\" yet.",
    image: '/courses/training-for-your-first-marathon.jpg',
    input: {
      topic: 'From Couch to Finish Line: Training for Your First Marathon',
      level: 'General public',
      priorKnowledge: 'Some',
      cohortSize: '200',
      learnerDetails:
        'Adults who can run a little (or not at all) and want to complete a marathon',
      environment: 'Online / hybrid',
      voice: 'Daniel — British male, authoritative news-anchor',
      additionalDetails:
        "Encouraging but honest — no toxic positivity. Practical, body-positive. Knowledgeable running mate. The message: finishing is the goal, not your time.",
    },
  },
  {
    title: 'Leadership through Crisis',
    subtitle: 'Grenfell Tower, Fukushima, and the Thai Cave Rescue',
    slug: 'leadership-through-crisis',
    chapters: 8,
    audience: 'Professional',
    themeName: 'Notebook',
    readingLength: 'Standard',
    hook:
      'Real case studies in high-stakes decision-making — from initial mobilisation under pressure to building a post-incident learning culture.',
    image: '/courses/leadership-through-crisis.jpg',
    input: {
      topic: 'Leadership through Crisis: Decision-Making When the Stakes Are High',
      level: 'Professional',
      priorKnowledge: 'Some',
      cohortSize: '60',
      learnerDetails:
        'Mid-career to senior professionals across sectors — emergency services, management, government, healthcare, military',
      environment: 'Collaborative room',
      voice: 'Brian — American male, deep narration',
      additionalDetails:
        "Use real research: Klein's Recognition-Primed Decision, Weick on sensemaking, Reason's Swiss cheese, Dekker on just culture. Real case studies — Grenfell, Fukushima, Thai cave, Australian bushfire.",
    },
  },
  {
    title: 'The Strategy of Everything',
    subtitle: 'Nash Equilibria, Auctions, and the Mathematics of Trust',
    slug: 'game-theory',
    chapters: 12,
    audience: 'Advanced undergrad',
    themeName: 'Terminal',
    readingLength: 'Comprehensive',
    hook:
      "Penalty kicks, arms races, spectrum auctions, and evolution — twelve chapters from the prisoner's dilemma to Arrow's impossibility theorem.",
    image: '/courses/game-theory.jpg',
    input: {
      topic: 'The Strategy of Everything: An Introduction to Game Theory',
      level: 'Advanced undergrad',
      priorKnowledge: 'Some',
      cohortSize: '60',
      learnerDetails:
        'Third-year students across economics, politics, psychology, biology, philosophy, computer science',
      environment: 'Collaborative room',
      voice: 'Daniel — British male, authoritative news-anchor',
      additionalDetails:
        "No calculus assumed. Diverse applications — not just firms competing. Cite: von Neumann & Morgenstern, Nash, Selten, Harsanyi, Axelrod, Maynard Smith, Spence, Arrow, Milgrom & Wilson.",
    },
  },
];

// ─── Learning principles & deliverables ──────────────────────────────────

const principles: { label: string; desc: string }[] = [
  {
    label: 'Spacing',
    desc: 'Key concepts return across chapters at deliberate intervals — not once and never again.',
  },
  {
    label: 'Interleaving',
    desc: 'Related topics mix across practice sets, forcing the kind of discrimination a real exam asks for.',
  },
  {
    label: 'Retrieval practice',
    desc: 'Quizzes and prompts make students answer first and read second — recall, not re-read.',
  },
  {
    label: 'Concrete examples',
    desc: 'Abstract theory anchored to specific cases the teacher could narrate from memory.',
  },
  {
    label: 'Dual coding',
    desc: 'Words alongside diagrams and figures — two channels for the same idea.',
  },
];

const deliverables: { label: string; detail: string }[] = [
  { label: 'Reading', detail: 'Interactive chapter with embedded visualisations.' },
  { label: 'In-class quiz', detail: 'Five unique printed versions and an answer key.' },
  { label: 'Slides', detail: 'Ready-to-present deck with speaker notes (PPTX).' },
  { label: 'Teaching pack', detail: 'Discussion prompts, activities, facilitation guides.' },
  { label: 'Practice quiz', detail: 'Self-test with instant feedback and rationale.' },
  { label: 'Weekly challenge', detail: 'Mastery assessment that uploads to your LMS.' },
  { label: 'Audio', detail: 'Narrated chapter audio students can listen to anywhere.' },
];

const ROMAN_LOWER = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];

const STAGE_ROUTES: Record<StageId, string> = {
  landing: '/',
  setup: '/setup',
  syllabus: '/syllabus',
  research: '/research',
  build: '/build',
  export: '/export',
};

/** Route for a restored project's stage — 'landing' has no STAGES entry, so
 *  a freshly-restored project lands on Setup rather than back here. */
function stagePathFor(stage: StageId): string {
  return STAGES.find((s) => s.id === stage)?.path ?? '/setup';
}

/** "12 May 2026" from a project file's ISO savedAt, or null if unparseable. */
function formatSavedAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Page ────────────────────────────────────────────────────────────────

export function LandingPage() {
  const navigate = useNavigate();
  const { currentStage, reset, setup, syllabus, chapters } = useCourseStore();
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Restore-a-project-file flow ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{
    state: ProjectFileState;
    savedAt: string | null;
  } | null>(null);

  const hasExistingCourse =
    currentStage !== 'landing' && currentStage !== 'setup';

  const handleStart = () => {
    if (hasExistingCourse) {
      setShowConfirm(true);
    } else {
      navigate('/setup');
    }
  };

  const startFresh = () => {
    setShowConfirm(false);
    reset();
    navigate('/setup');
  };

  const continueExisting = () => {
    setShowConfirm(false);
    navigate(STAGE_ROUTES[currentStage]);
  };

  const applyRestore = (state: ProjectFileState) => {
    applyProjectFile(state);
    setPendingRestore(null);
    navigate(stagePathFor(state.currentStage));
  };

  const handleRestoreFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file after an error
    if (!file) return;
    setRestoreError(null);
    let text: string;
    try {
      text = await file.text();
    } catch {
      setRestoreError('Could not read that file — try selecting it again.');
      return;
    }
    const result = parseProjectFile(text);
    if (!result.ok) {
      setRestoreError(result.error);
      return;
    }
    // A course already underway? Confirm before replacing it.
    if (syllabus || chapters.length > 0) {
      setPendingRestore({ state: result.state, savedAt: result.savedAt });
    } else {
      applyRestore(result.state);
    }
  };

  const pendingTopic = pendingRestore?.state.setup.topic ?? '';
  const pendingSavedAt = formatSavedAt(pendingRestore?.savedAt ?? null);

  return (
    <div
      style={{
        fontFamily: 'var(--font-cb-serif)',
        color: 'var(--cb-text-default)',
      }}
    >
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{ padding: '88px 0 72px' }}>
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 300px',
            gap: 64,
            alignItems: 'end',
          }}
        >
          <div>
            <div
              className="cb-sc"
              style={{
                fontSize: 13.5,
                color: 'var(--cb-accent-emphasis)',
                letterSpacing: '0.18em',
              }}
            >
              ClassBuild — open source
            </div>
            <h1
              style={{
                margin: '16px 0 0',
                fontSize: 96,
                lineHeight: 1.0,
                fontWeight: 400,
                fontVariationSettings: '"opsz" 72',
                letterSpacing: '-0.022em',
                color: 'var(--cb-text-default)',
                maxWidth: 880,
              }}
            >
              Draft a course. Edit it.{' '}
              <span
                className="cb-italic"
                style={{ color: 'var(--cb-accent-emphasis)' }}
              >
                Teach it.
              </span>
            </h1>
            <p
              style={{
                margin: '22px 0 0',
                maxWidth: 620,
                fontSize: 20,
                lineHeight: 1.6,
                color: 'var(--cb-text-default)',
              }}
            >
              Drafts a syllabus, slides, quizzes, readings, and narration — exportable
              to PPTX, DOCX, HTML, or SCORM. You edit; you teach.
            </p>
            <div
              style={{
                marginTop: 32,
                display: 'flex',
                gap: 14,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <CodexButton variant="primary" size="lg" onClick={handleStart}>
                Begin a course →
              </CodexButton>
              <a
                href="#examples"
                className="cb-focus"
                style={{
                  color: 'var(--cb-accent-link)',
                  textDecoration: 'underline',
                  textDecorationThickness: '0.5px',
                  textUnderlineOffset: 4,
                  fontSize: 17,
                }}
              >
                See example courses ↓
              </a>
              <button
                type="button"
                onClick={() => {
                  setRestoreError(null);
                  fileInputRef.current?.click();
                }}
                className="cb-focus"
                title="Re-open a saved .classbuild.json project. Keys are not included."
                style={{
                  background: 'transparent',
                  border: 0,
                  padding: 0,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: 'var(--cb-accent-link)',
                  textDecoration: 'underline',
                  textDecorationThickness: '0.5px',
                  textUnderlineOffset: 4,
                  fontSize: 17,
                }}
              >
                Restore a project file ↑
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json,.classbuild"
                onChange={(e) => void handleRestoreFile(e)}
                style={{ display: 'none' }}
              />
            </div>
            {restoreError && (
              <p
                className="cb-italic"
                role="alert"
                style={{
                  margin: '14px 0 0',
                  fontSize: 14.5,
                  lineHeight: 1.5,
                  color: 'var(--cb-status-danger)',
                }}
              >
                {restoreError}
              </p>
            )}
            <div
              className="cb-mono"
              style={{
                fontSize: 13,
                color: 'var(--cb-text-muted)',
                marginTop: 28,
                letterSpacing: '0.04em',
              }}
            >
              BYOK · Anthropic, OpenAI, ElevenLabs · runs entirely in your browser · MIT-licensed
            </div>
          </div>

          <HeroPanel />
        </div>
      </section>

      {/* ── § How it works ───────────────────────────────────── */}
      <Section kicker="How it works" sub="brief, draft, edit.">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 48,
          }}
        >
          {[
            {
              title: 'You set the brief',
              body:
                'A topic, an audience, a chapter count. Anywhere from four chapters to a full semester.',
            },
            {
              title: 'ClassBuild drafts',
              body:
                'It writes the syllabus, researches each chapter, generates slides and quizzes, narrates the lectures.',
            },
            {
              title: 'You edit, you teach',
              body:
                'Every artifact is editable in the browser, exportable as DOCX, PPTX, HTML, or SCORM.',
            },
          ].map((s) => (
            <div key={s.title}>
              <h3
                style={{
                  fontSize: 24,
                  fontVariationSettings: '"opsz" 20',
                  fontWeight: 500,
                  letterSpacing: '-0.005em',
                  margin: 0,
                  color: 'var(--cb-text-default)',
                }}
              >
                {s.title}
              </h3>
              <p
                style={{
                  marginTop: 10,
                  fontSize: 17,
                  lineHeight: 1.6,
                  color: 'var(--cb-text-default)',
                }}
              >
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── § Example courses ────────────────────────────────── */}
      <Section
        id="examples"
        kicker="Example courses"
        sub="six courses drafted by ClassBuild itself, lightly edited."
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 18,
          }}
        >
          {exampleCourses.map((c) => (
            <CourseCard key={c.slug} course={c} />
          ))}
        </div>
      </Section>

      {/* ── § The principles ─────────────────────────────────── */}
      <Section
        kicker="The principles"
        sub="every chapter is built around these five."
        ornament
      >
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {principles.map((p, i) => (
            <li
              key={p.label}
              style={{
                display: 'grid',
                gridTemplateColumns: '32px 140px 1fr',
                padding: '10px 0',
                gap: 18,
                borderTop:
                  i === 0 ? 'none' : '0.5px solid var(--cb-border-subtle)',
                alignItems: 'baseline',
              }}
            >
              <span
                className="cb-italic"
                style={{
                  fontSize: 17,
                  color: 'var(--cb-accent-emphasis)',
                  fontVariationSettings: '"opsz" 14',
                }}
              >
                {ROMAN_LOWER[i]}.
              </span>
              <span
                className="cb-sc"
                style={{
                  fontSize: 13.5,
                  color: 'var(--cb-text-default)',
                  letterSpacing: '0.14em',
                }}
              >
                {p.label}
              </span>
              <span
                style={{
                  fontSize: 17,
                  lineHeight: 1.55,
                  color: 'var(--cb-text-default)',
                }}
              >
                {p.desc}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {/* ── § What ClassBuild produces ───────────────────────── */}
      <Section
        kicker="What ClassBuild produces"
        sub="seven artifacts per chapter — download individually or as a bundle."
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
          }}
        >
          {deliverables.map((d, i) => (
            <article
              key={d.label}
              style={{
                border: '1px solid var(--cb-border-default)',
                borderRadius: 2,
                padding: '14px 16px',
                background: 'transparent',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <span
                className="cb-italic"
                style={{
                  fontSize: 14.5,
                  color: 'var(--cb-accent-emphasis)',
                  fontVariationSettings: '"opsz" 14',
                }}
              >
                {ROMAN_LOWER[i]}.
              </span>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 500,
                  fontVariationSettings: '"opsz" 18',
                  color: 'var(--cb-text-default)',
                  lineHeight: 1.2,
                }}
              >
                {d.label}
              </span>
              <span
                className="cb-italic"
                style={{
                  fontSize: 15,
                  color: 'var(--cb-text-muted)',
                  lineHeight: 1.45,
                }}
              >
                {d.detail}
              </span>
            </article>
          ))}
        </div>
        <p
          className="cb-italic"
          style={{
            textAlign: 'center',
            margin: '32px 0 0',
            fontSize: 17,
            color: 'var(--cb-text-muted)',
            lineHeight: 1.5,
          }}
        >
          All seven produced from one brief, while you make a coffee.
        </p>
      </Section>

      {/* ── § Headlessly, via CLI ────────────────────────────── */}
      <Section
        kicker="From the terminal"
        sub="same generator, scripted."
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 40,
            alignItems: 'start',
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 17,
                lineHeight: 1.6,
                color: 'var(--cb-text-default)',
                maxWidth: 460,
              }}
            >
              The ClassBuild CLI runs the same generator from your terminal — for
              when you're building a program, a catalogue, or just want everything
              piped to disk.
            </p>
            <div style={{ marginTop: 16 }}>
              <a
                href="https://github.com/jtangen/classbuild#cli--headless-course-generation"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 15,
                  color: 'var(--cb-accent-link)',
                  textDecoration: 'underline',
                  textDecorationThickness: '0.5px',
                  textUnderlineOffset: 3,
                }}
              >
                View on GitHub ↗
              </a>
            </div>
          </div>
          <pre
            className="cb-mono"
            style={{
              margin: 0,
              padding: '16px 18px',
              background: 'var(--cb-surface-sunken)',
              border: '1px solid var(--cb-border-default)',
              borderRadius: 2,
              fontSize: 13.5,
              lineHeight: 1.6,
              color: 'var(--cb-text-default)',
              overflowX: 'auto',
            }}
          >
{`ANTHROPIC_API_KEY=sk-ant-… \\
  npx tsx scripts/generate-course.ts \\
    --topic "Cognitive Load Theory" \\
    --chapters 12 \\
    --output ./out`}
          </pre>
        </div>
      </Section>

      {/* ── Closing CTA — quiet, just a button ─────────────── */}
      <section
        style={{
          padding: '48px 0',
          borderTop: '0.5px solid var(--cb-border-rule)',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <CodexButton variant="primary" size="lg" onClick={handleStart}>
            Begin a course →
          </CodexButton>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer
        style={{
          padding: '40px 0 32px',
          background: 'var(--cb-surface-sunken)',
          borderTop: '0.5px solid var(--cb-border-default)',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
            gap: 32,
          }}
        >
          <div>
            <div
              className="cb-italic"
              style={{
                fontSize: 24,
                color: 'var(--cb-text-default)',
                fontVariationSettings: '"opsz" 20',
              }}
            >
              ClassBuild
              <span style={{ color: 'var(--cb-accent-emphasis)' }}>.</span>
            </div>
            <p
              className="cb-italic"
              style={{
                fontSize: 14.5,
                color: 'var(--cb-text-muted)',
                lineHeight: 1.55,
                marginTop: 8,
              }}
            >
              An open-source AI course generator. No backend. No telemetry. MIT.
            </p>
          </div>
          <FooterCol
            heading="Product"
            links={[
              { label: 'Examples', href: '#examples' },
              { label: 'GitHub ↗', href: 'https://github.com/jtangen/classbuild' },
              { label: 'CLI', href: 'https://github.com/jtangen/classbuild#cli--headless-course-generation' },
            ]}
          />
          <FooterCol
            heading="About"
            links={[
              { label: 'The maker', href: 'https://tangenlab.com' },
              { label: 'Code with Claude · Tokyo', href: 'https://claude.com/code-with-claude/tokyo' },
            ]}
          />
          <FooterCol
            heading="Provenance"
            links={[
              { label: 'How outputs are generated', href: 'https://github.com/jtangen/classbuild#how-it-works' },
              { label: 'Citations & sources', href: 'https://github.com/jtangen/classbuild#research' },
              { label: 'Licensing — MIT', href: 'https://github.com/jtangen/classbuild/blob/main/LICENSE' },
            ]}
          />
        </div>
        <div
          style={{
            maxWidth: 1100,
            margin: '32px auto 0',
            paddingTop: 16,
            borderTop: '0.5px solid var(--cb-border-rule)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            className="cb-mono"
            style={{ fontSize: 12, color: 'var(--cb-text-muted)' }}
          >
            v0.2 · MIT · 2026
          </span>
          <Colophon size={18} style={{ opacity: 0.7 }} />
        </div>
      </footer>

      {/* ── Resume / start-fresh modal ───────────────────────── */}
      <CodexModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        kicker="welcome back"
        title={
          <>
            You have a course in <span className="cb-italic">progress</span>.
          </>
        }
        sub={
          setup.topic
            ? `On "${setup.topic.length > 80 ? setup.topic.slice(0, 80) + '…' : setup.topic}".`
            : 'Continue where you left off, or start fresh.'
        }
        actions={
          <>
            <CodexButton variant="ghost" onClick={() => setShowConfirm(false)}>
              Cancel
            </CodexButton>
            <CodexButton variant="destructive" onClick={startFresh}>
              Start fresh
            </CodexButton>
            <CodexButton variant="primary" onClick={continueExisting}>
              Continue course →
            </CodexButton>
          </>
        }
      >
        <p
          style={{
            margin: 0,
            fontSize: 15,
            lineHeight: 1.55,
            color: 'var(--cb-text-default)',
          }}
        >
          Continuing returns you to{' '}
          <span className="cb-italic">
            {STAGE_LABELS[currentStage] ?? 'where you were'}
          </span>
          . Starting fresh clears the current syllabus, research, and chapters.
        </p>
      </CodexModal>

      {/* ── Restore-project confirm modal ────────────────────── */}
      <CodexModal
        open={pendingRestore !== null}
        onClose={() => setPendingRestore(null)}
        kicker="restore a project"
        title={
          <>
            Replace the course in <span className="cb-italic">progress</span>?
          </>
        }
        sub={
          pendingTopic
            ? `The file contains "${
                pendingTopic.length > 80 ? pendingTopic.slice(0, 80) + '…' : pendingTopic
              }"${pendingSavedAt ? `, saved ${pendingSavedAt}` : ''}.`
            : 'Restore the saved project and continue where it left off.'
        }
        actions={
          <>
            <CodexButton variant="ghost" onClick={() => setPendingRestore(null)}>
              Cancel
            </CodexButton>
            <CodexButton
              variant="destructive"
              onClick={() => {
                if (pendingRestore) applyRestore(pendingRestore.state);
              }}
            >
              Replace & restore
            </CodexButton>
          </>
        }
      >
        <p
          style={{
            margin: 0,
            fontSize: 15,
            lineHeight: 1.55,
            color: 'var(--cb-text-default)',
          }}
        >
          Restoring replaces your current syllabus, research, and chapters with
          the saved project. API keys are never part of a project file.
        </p>
      </CodexModal>
    </div>
  );
}

const STAGE_LABELS: Record<StageId, string> = {
  landing: 'the start',
  setup: 'Setup',
  syllabus: 'Syllabus',
  research: 'Research',
  build: 'Build',
  export: 'Export',
};

// ─── Section wrapper ─────────────────────────────────────────────────────

function Section({
  id,
  kicker,
  sub,
  children,
  ornament = false,
}: {
  id?: string;
  kicker: string;
  sub: string;
  children: ReactNode;
  ornament?: boolean;
}) {
  return (
    <section
      id={id}
      style={{
        padding: '64px 0',
        borderTop: '0.5px solid var(--cb-border-rule)',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {ornament && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <Fleuron />
          </div>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 14,
            paddingBottom: 14,
            marginBottom: 24,
            borderBottom: '0.5px solid var(--cb-border-rule)',
          }}
        >
          <span
            className="cb-sc"
            style={{
              fontSize: 14.5,
              color: 'var(--cb-accent-emphasis)',
              letterSpacing: '0.16em',
            }}
          >
            {kicker}
          </span>
          <span
            className="cb-italic"
            style={{ fontSize: 15, color: 'var(--cb-text-muted)' }}
          >
            — {sub}
          </span>
        </div>
        {children}
      </div>
    </section>
  );
}

// ─── Fleuron ─────────────────────────────────────────────────────────────

function Fleuron() {
  return (
    <svg
      width={90}
      height={22}
      viewBox="0 0 90 22"
      aria-hidden
      style={{ display: 'block' }}
    >
      <line
        x1="0"
        y1="11"
        x2="32"
        y2="11"
        stroke="var(--cb-accent-gilt)"
        strokeWidth="0.75"
      />
      <line
        x1="58"
        y1="11"
        x2="90"
        y2="11"
        stroke="var(--cb-accent-gilt)"
        strokeWidth="0.75"
      />
      <g
        transform="translate(45,11)"
        fill="none"
        stroke="var(--cb-accent-gilt)"
        strokeWidth="0.9"
      >
        <circle r="3" />
        <path d="M -8 0 Q -5 -4 0 -3 Q 5 -4 8 0 Q 5 4 0 3 Q -5 4 -8 0 Z" />
      </g>
    </svg>
  );
}

// ─── Footer column ───────────────────────────────────────────────────────

function FooterCol({
  heading,
  links,
}: {
  heading: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <div
        className="cb-sc"
        style={{
          fontSize: 12,
          color: 'var(--cb-text-muted)',
          letterSpacing: '0.14em',
        }}
      >
        {heading}
      </div>
      <ul
        style={{
          margin: '12px 0 0',
          padding: 0,
          listStyle: 'none',
          fontSize: 15,
          lineHeight: 1.85,
        }}
      >
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              target={l.href.startsWith('http') ? '_blank' : undefined}
              rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              style={{
                color: 'var(--cb-text-default)',
                textDecoration: 'underline',
                textDecorationColor: 'var(--cb-border-default)',
                textDecorationThickness: '0.5px',
                textUnderlineOffset: 3,
                transition: 'color 200ms cubic-bezier(0.32,0.04,0.32,1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--cb-accent-link)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--cb-text-default)';
              }}
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── HeroPanel — what's in a ClassBuild course (honest static list) ──────

function HeroPanel() {
  return (
    <aside
      style={{
        padding: '22px 22px',
        background: 'var(--cb-surface-sunken)',
        border: '1px solid var(--cb-border-default)',
        borderRadius: 2,
      }}
    >
      <div
        className="cb-sc"
        style={{
          fontSize: 12,
          color: 'var(--cb-text-muted)',
          letterSpacing: '0.14em',
        }}
      >
        A course includes
      </div>
      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          margin: '14px 0 0',
          display: 'grid',
          gap: 0,
        }}
      >
        {HERO_ARTIFACTS.map((a, i) => (
          <li
            key={a.label}
            style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr',
              alignItems: 'baseline',
              padding: '7px 0',
              borderTop:
                i === 0 ? 'none' : '0.5px solid var(--cb-border-subtle)',
            }}
          >
            <span
              className="cb-italic"
              style={{
                color: 'var(--cb-accent-emphasis)',
                fontSize: 14.5,
              }}
            >
              {a.n}.
            </span>
            <span
              style={{
                fontSize: 15.5,
                lineHeight: 1.4,
                color: 'var(--cb-text-default)',
              }}
            >
              {a.label}
            </span>
          </li>
        ))}
      </ol>
      <div
        className="cb-italic"
        style={{
          fontSize: 13.5,
          color: 'var(--cb-text-muted)',
          marginTop: 14,
          paddingTop: 12,
          borderTop: '0.5px solid var(--cb-border-default)',
          lineHeight: 1.4,
        }}
      >
        Drafted unattended in the background.
      </div>
    </aside>
  );
}

const HERO_ARTIFACTS: { n: string; label: string }[] = [
  { n: 'i', label: 'Reading chapter' },
  { n: 'ii', label: 'Slides (PPTX)' },
  { n: 'iii', label: 'In-class quiz' },
  { n: 'iv', label: 'Practice quiz' },
  { n: 'v', label: 'Teaching pack' },
  { n: 'vi', label: 'Narrated audio' },
  { n: 'vii', label: 'Weekly mastery challenge' },
];

// ─── CourseCard ──────────────────────────────────────────────────────────

function CourseCard({ course }: { course: ExampleCourse }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      style={{
        background: 'var(--cb-ground-page)',
        border: '1px solid var(--cb-border-default)',
        borderRadius: 2,
        overflow: 'hidden',
        transition: 'border-color 200ms cubic-bezier(0.32,0.04,0.32,1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--cb-border-strong)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--cb-border-default)';
      }}
    >
      {/* Image */}
      <a
        href={`https://courses.classbuild.ai/${course.slug}/`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block',
          aspectRatio: '16 / 9',
          overflow: 'hidden',
          background: 'var(--cb-surface-sunken)',
          borderBottom: '0.5px solid var(--cb-border-default)',
        }}
      >
        <img
          src={course.image}
          alt={course.title}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </a>

      <div style={{ padding: '20px 22px' }}>
        <div
          className="cb-sc"
          style={{
            fontSize: 12,
            color: 'var(--cb-accent-emphasis)',
            letterSpacing: '0.14em',
          }}
        >
          {course.audience}
        </div>
        <h3
          style={{
            margin: '6px 0 4px',
            fontSize: 24,
            fontVariationSettings: '"opsz" 20',
            fontWeight: 500,
            letterSpacing: '-0.005em',
            lineHeight: 1.2,
            color: 'var(--cb-text-default)',
          }}
        >
          {course.title}
        </h3>
        <p
          className="cb-italic"
          style={{
            margin: '0 0 12px',
            fontSize: 15,
            color: 'var(--cb-text-muted)',
            lineHeight: 1.45,
          }}
        >
          {course.subtitle}
        </p>
        <p
          style={{
            margin: '0 0 16px',
            fontSize: 15,
            lineHeight: 1.6,
            color: 'var(--cb-text-default)',
          }}
        >
          {course.hook}
        </p>

        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 14,
          }}
        >
          <CodexBadge tone="neutral">{course.chapters} chapters</CodexBadge>
          {course.readingLength === 'Comprehensive' && (
            <CodexBadge tone="neutral">Comprehensive</CodexBadge>
          )}
          <CodexBadge tone="neutral">{course.themeName} theme</CodexBadge>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            paddingTop: 10,
            borderTop: '0.5px solid var(--cb-border-subtle)',
          }}
        >
          <a
            href={`https://courses.classbuild.ai/${course.slug}/`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 15,
              color: 'var(--cb-accent-link)',
              textDecoration: 'underline',
              textDecorationThickness: '0.5px',
              textUnderlineOffset: 3,
            }}
          >
            Explore course ↗
          </a>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="cb-focus"
            style={{
              background: 'transparent',
              border: 0,
              padding: 0,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 14.5,
              color: 'var(--cb-text-muted)',
              fontStyle: 'italic',
            }}
          >
            {expanded ? 'hide input ↑' : 'see what we entered ↓'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '16px 22px 20px',
                background: 'var(--cb-surface-sunken)',
                borderTop: '0.5px solid var(--cb-border-default)',
              }}
            >
              <div
                className="cb-sc"
                style={{
                  fontSize: 12,
                  color: 'var(--cb-text-muted)',
                  letterSpacing: '0.14em',
                  marginBottom: 10,
                }}
              >
                The brief
              </div>
              <dl
                style={{
                  margin: 0,
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr',
                  rowGap: 6,
                  columnGap: 14,
                  fontSize: 14.5,
                  lineHeight: 1.5,
                }}
              >
                {[
                  ['Topic', course.input.topic],
                  ['Level', course.input.level],
                  ['Prior knowledge', course.input.priorKnowledge],
                  ['Cohort', `${course.input.cohortSize} students`],
                  ['Environment', course.input.environment],
                  ['Reading length', course.readingLength],
                  ['Theme', course.themeName],
                  ['Voice', course.input.voice],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    style={{ display: 'contents' }}
                  >
                    <dt
                      className="cb-italic"
                      style={{ color: 'var(--cb-text-muted)' }}
                    >
                      {k}
                    </dt>
                    <dd style={{ margin: 0, color: 'var(--cb-text-default)' }}>
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
              {course.input.additionalDetails && (
                <div style={{ marginTop: 14 }}>
                  <div
                    className="cb-sc"
                    style={{
                      fontSize: 12,
                      color: 'var(--cb-text-muted)',
                      letterSpacing: '0.14em',
                      marginBottom: 6,
                    }}
                  >
                    Additional details
                  </div>
                  <p
                    style={{
                      margin: 0,
                      padding: '12px 14px',
                      background: 'var(--cb-ground-canvas)',
                      border: '0.5px solid var(--cb-border-default)',
                      fontSize: 14.5,
                      lineHeight: 1.55,
                      color: 'var(--cb-text-default)',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {course.input.additionalDetails}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

