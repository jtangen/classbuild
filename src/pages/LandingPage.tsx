import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/shared/Button';
import { useCourseStore } from '../store/courseStore';
import type { StageId } from '../types/course';

// --- Example courses for showcase ---

interface ExampleCourse {
  title: string;
  subtitle: string;
  slug: string;
  chapters: number;
  audience: string;
  themeColor: string;
  themeName: string;
  readingLength: string;
  hook: string;
  image: string;
  input: {
    topic: string;
    level: string;
    priorKnowledge: string;
    cohortSize: string;
    learnerDetails: string;
    environment: string;
    additionalDetails?: string;
    voice: string;
  };
}

const exampleCourses: ExampleCourse[] = [
  {
    title: 'Puppy School',
    subtitle: 'Socialisation, House Training, and Surviving the First Year',
    slug: 'raising-a-puppy',
    chapters: 8,
    audience: 'General public',
    themeColor: '#06b6d4',
    themeName: 'Ocean',
    readingLength: 'Standard',
    hook: 'From the critical 3\u201316 week socialisation window to adolescent regression at 18 months \u2014 everything a first-time owner needs to know, grounded in veterinary behavioural science.',
    image: '/courses/raising-a-puppy.jpg',
    input: {
      topic: 'Raising a Puppy: A Complete Guide for First-Time Dog Owners',
      level: 'General public',
      priorKnowledge: 'Some',
      cohortSize: '60',
      learnerDetails: 'First-time puppy owners, mixed ages \u2014 many will be anxious and overwhelmed',
      environment: 'Lecture theatre',
      voice: 'Not specified',
      additionalDetails: 'Tone should be reassuring, practical, and non-judgmental. Use Australian veterinary standards and terminology where relevant (e.g., desexing not spaying/neutering, council registration, tick prevention for east coast Australia). Avoid breed-specific advice \u2014 keep it universal.\n\nChapter structure: 1) Before They Arrive \u2014 preparation, puppy-proofing, essential equipment. 2) The First 72 Hours \u2014 settling in, first-night survival. 3) The Socialisation Window \u2014 the critical period (3\u201316 weeks). 4) Bite Inhibition & Mouthing. 5) Crate Training & House Training. 6) Nutrition & Feeding. 7) Veterinary Milestones \u2014 vaccinations, desexing, parasites. 8) The Adolescent Dog \u2014 6\u201318 month regression.\n\nPrioritise evidence-based training methods (positive reinforcement). Cite veterinary behavioural science (Sophia Yin, AVSAB position statements). Widgets: socialisation exposure checklists, house training schedules, scenario quizzes. Keep the tone warm \u2014 these people are sleep-deprived and covered in puppy teeth marks.',
    },
  },
  {
    title: 'Understanding Your Sleep',
    subtitle: 'Circadian Rhythms, Sleep Architecture, and the Caffeine Equation',
    slug: 'understanding-your-sleep',
    chapters: 7,
    audience: 'General public',
    themeColor: '#8b5cf6',
    themeName: 'Midnight',
    readingLength: 'Standard',
    hook: 'Why morning light matters more than blue-light glasses, how sleep stages actually work, and where the evidence on eight hours gets overstated.',
    image: '/courses/understanding-your-sleep.jpg',
    input: {
      topic: 'Understanding Your Sleep: The Science of Rest, Rhythm, and Recovery',
      level: 'General public',
      priorKnowledge: 'Some',
      cohortSize: '60',
      learnerDetails: 'Adults interested in improving their sleep \u2014 mix of general curiosity, people with poor sleep habits, and professionals in shift work',
      environment: 'Lecture theatre',
      voice: 'Not specified',
      additionalDetails: 'Scientifically grounded but accessible \u2014 no jargon without explanation.\n\nChapter structure: 1) Your Internal Clock \u2014 circadian biology, chronotypes. 2) The Architecture of a Night \u2014 NREM/REM cycles, sleep stages. 3) Light as a Drug \u2014 melanopsin, lux thresholds, morning light protocol. 4) The Caffeine Equation \u2014 adenosine receptors, half-life, timing rules. 5) Moving to Sleep \u2014 exercise timing, body temperature. 6) Screens, Stimulation & Wind-Down \u2014 blue light vs. cognitive arousal. 7) The Strategic Nap \u2014 20 vs. 90 minutes, coffee naps, sleep inertia.\n\nKey sources: Matthew Walker (but flag where his claims overstate the evidence), Dijk & Czeisler on circadian regulation, Mednick on napping. Be honest about what evidence actually supports vs. popular sleep hygiene advice that\'s weakly supported.\n\nWidgets: chronotype self-assessment, caffeine half-life calculator, personalised light exposure timeline. Avoid medicalising normal sleep variation.',
    },
  },
  {
    title: 'One Leaf, Ten Thousand Cups',
    subtitle: 'Chemistry, Culture, and Ceremony in Every Cup',
    slug: 'science-and-art-of-tea',
    chapters: 6,
    audience: 'General public',
    themeColor: '#f59e0b',
    themeName: 'Warm',
    readingLength: 'Standard',
    hook: 'One plant becomes six types of tea. The oxidation science, brewing variables, and centuries of ritual behind the world\u2019s most consumed drink.',
    image: '/courses/science-and-art-of-tea.jpg',
    input: {
      topic: 'The Science and Art of Tea',
      level: 'General public',
      priorKnowledge: 'Some',
      cohortSize: '60',
      learnerDetails: 'Tea enthusiasts, home brewers, foodies, and curious generalists \u2014 international audience',
      environment: 'Lecture theatre',
      voice: 'Amelia \u2014 Friendly, approachable guide',
      additionalDetails: 'The course should respect the deep cultural traditions around tea without appropriating or flattening them. Balance sensory, scientific, and historical perspectives. This course should feel like a conversation with a knowledgeable friend, not a textbook. Keep the topics basic and incredibly interesting.',
    },
  },
  {
    title: 'From Couch to Finish Line',
    subtitle: 'Training Science, Nutrition, and the Psychology of 42.2 km',
    slug: 'training-for-your-first-marathon',
    chapters: 8,
    audience: 'General public',
    themeColor: '#8b5cf6',
    themeName: 'Midnight',
    readingLength: 'Standard',
    hook: 'Evidence-based periodisation, race-day fuelling, and injury prevention \u2014 for people who aren\u2019t sure they\u2019re "a runner" yet.',
    image: '/courses/training-for-your-first-marathon.jpg',
    input: {
      topic: 'From Couch to Finish Line: Training for Your First Marathon',
      level: 'General public',
      priorKnowledge: 'Some',
      cohortSize: '200',
      learnerDetails: 'Adults who can currently run a little (or not at all) and want to complete a marathon \u2014 mixed fitness levels, mixed ages',
      environment: 'Online / hybrid',
      voice: 'Daniel \u2014 Articulate British academic',
      additionalDetails: 'Many will be nervous about injury, time commitment, and whether they\'re "a runner." Tone should be encouraging but honest \u2014 no toxic positivity. Practical, evidence-based, body-positive.\n\nGround in sports science. Widgets should be useful in the moment \u2014 self-assessments, decision tools, knowledge checks rather than ongoing trackers. Tone like a knowledgeable running mate \u2014 direct, warm, no bro-science. The message: finishing is the goal, not your time.',
    },
  },
  {
    title: 'Leadership through Crisis',
    subtitle: 'Grenfell Tower, Fukushima, and the Thai Cave Rescue',
    slug: 'leadership-through-crisis',
    chapters: 8,
    audience: 'Professional',
    themeColor: '#3b82f6',
    themeName: 'Classic',
    readingLength: 'Standard',
    hook: 'Real case studies in high-stakes decision-making \u2014 from initial mobilisation under pressure to building a post-incident learning culture.',
    image: '/courses/leadership-through-crisis.jpg',
    input: {
      topic: 'Leadership through Crisis: Decision-Making When the Stakes Are High',
      level: 'Professional',
      priorKnowledge: 'Some',
      cohortSize: '60',
      learnerDetails: 'Mid-career to senior professionals across sectors \u2014 emergency services, corporate management, government, healthcare, military',
      environment: 'Collaborative room',
      voice: 'Josh \u2014 Casual, energetic narrator',
      additionalDetails: 'They\'ve likely experienced crises but haven\'t had formal training in crisis leadership. Expect scepticism of theory that doesn\'t match reality. Use real case studies, not hypothetical scenarios.\n\nTopics: defining crisis vs. incident, activation and initial mobilisation, decision-making under pressure and cognitive load, stakeholder mapping, crisis communication, team resilience during prolonged events, post-incident review and learning culture, and building organisational preparedness.\n\nGround in real research: Klein\'s Recognition-Primed Decision model, Weick on sensemaking and Mann Gulch, Reason\'s Swiss cheese model, Dekker on just culture. Use real case studies \u2014 Grenfell Tower, Fukushima, Thai cave rescue, Australian bushfire response, airline incidents.\n\nWidgets: crisis decision simulations, stakeholder mapping exercises, communication drafting under time pressure. Tone: direct and credible \u2014 no corporate jargon, no "learnings."',
    },
  },
  {
    title: 'The Strategy of Everything',
    subtitle: 'Nash Equilibria, Auctions, and the Mathematics of Trust',
    slug: 'game-theory',
    chapters: 12,
    audience: 'Advanced undergrad',
    themeColor: '#f59e0b',
    themeName: 'Warm',
    readingLength: 'Comprehensive',
    hook: 'Penalty kicks, arms races, spectrum auctions, and evolution \u2014 twelve chapters from the prisoner\u2019s dilemma to Arrow\u2019s impossibility theorem.',
    image: '/courses/game-theory.jpg',
    input: {
      topic: 'The Strategy of Everything: An Introduction to Game Theory',
      level: 'Advanced undergrad',
      priorKnowledge: 'Some',
      cohortSize: '60',
      learnerDetails: 'Third-year students across economics, politics, psychology, biology, philosophy, and computer science',
      environment: 'Collaborative room',
      voice: 'Daniel \u2014 Articulate British academic',
      additionalDetails: 'No calculus assumed but they should be comfortable with basic algebra. They need to see equations as tools for precise thinking, not obstacles. Use diverse applications \u2014 if every example is about firms competing, you\'ve lost half the room. Australian and international examples.\n\nChapter structure: 1) Thinking Strategically \u2014 prisoner\'s dilemma, brief history. 2) Representing Games \u2014 normal and extensive form. 3) Dominant Strategies & Nash Equilibrium. 4) Mixed Strategies \u2014 matching pennies, penalty kicks, actual algebra. 5) Sequential Games & Backward Induction. 6) Repeated Games & Cooperation \u2014 Axelrod\'s tournaments. 7) Information & Signalling \u2014 Spence\'s job market model. 8) Auction Theory \u2014 Milgrom & Wilson 2020 Nobel. 9) Evolutionary Game Theory \u2014 hawk-dove, cooperation in nature. 10) Bargaining & Negotiation. 11) Voting & Social Choice \u2014 Arrow\'s impossibility theorem. 12) Games in the Wild \u2014 climate, arms races, algorithmic game theory.\n\nCite: von Neumann & Morgenstern, Nash, Selten, Harsanyi, Axelrod, Maynard Smith, Spence, Arrow, Milgrom & Wilson. Widgets: play prisoner\'s dilemma, compute Nash equilibria, run auctions, build game trees, simulate evolutionary dynamics. Tone: intellectually exciting, not dry \u2014 game theory is inherently dramatic.',
    },
  },
];

function CourseCard({ course }: { course: ExampleCourse }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.a
      href={`https://courses.classbuild.ai/${course.slug}/`}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl bg-bg-card border border-white/5 overflow-hidden group hover:border-white/10 transition-all duration-200 cursor-pointer"
      style={{ textDecoration: 'none', color: 'inherit' }}
      whileHover={{ y: -2, boxShadow: `0 8px 30px ${course.themeColor}15` }}
    >
      {/* Hero image with gradient overlay */}
      <div className="relative h-36 overflow-hidden">
        <img
          src={course.image}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(to top, var(--color-bg-card) 0%, transparent 60%)` }}
        />
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: `linear-gradient(90deg, ${course.themeColor}, ${course.themeColor}60)` }}
        />
      </div>

      <div className="p-5 -mt-4 relative">
        <div className="mb-2">
          <h3 className="text-xl font-bold text-text-primary leading-tight">{course.title}</h3>
          <p className="text-sm text-text-secondary mt-1">{course.subtitle}</p>
        </div>

        <p className="text-sm text-text-muted leading-relaxed mb-4">{course.hook}</p>

        <div className="flex flex-wrap gap-1.5 mb-5">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border"
            style={{ backgroundColor: `${course.themeColor}15`, borderColor: `${course.themeColor}30`, color: course.themeColor }}>
            {course.chapters} chapters
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-text-secondary">
            {course.audience}
          </span>
          {course.readingLength === 'Comprehensive' && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-text-secondary">
              {course.readingLength}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm font-medium" style={{ color: course.themeColor }}>
            Explore Course {'\u2192'}
          </span>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(!expanded); }}
            className="text-sm font-medium transition-colors cursor-pointer bg-transparent border-0 p-0 hover:opacity-80"
            style={{ color: course.themeColor }}
          >
            {expanded ? 'Hide input \u2191' : 'See what we entered \u2193'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <div className="px-5 pb-5 border-t border-white/5 pt-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">What we entered</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                <div><span className="text-text-muted">Topic:</span> <span className="text-text-secondary">{course.input.topic}</span></div>
                <div><span className="text-text-muted">Level:</span> <span className="text-text-secondary">{course.input.level}</span></div>
                <div><span className="text-text-muted">Prior knowledge:</span> <span className="text-text-secondary">{course.input.priorKnowledge}</span></div>
                <div><span className="text-text-muted">Cohort:</span> <span className="text-text-secondary">{course.input.cohortSize} students</span></div>
                <div><span className="text-text-muted">Environment:</span> <span className="text-text-secondary">{course.input.environment}</span></div>
                <div><span className="text-text-muted">Reading length:</span> <span className="text-text-secondary">{course.readingLength}</span></div>
                <div><span className="text-text-muted">Theme:</span> <span className="text-text-secondary">{course.themeName}</span></div>
                <div><span className="text-text-muted">Voice:</span> <span className="text-text-secondary">{course.input.voice}</span></div>
              </div>
              {course.input.additionalDetails && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">Additional details</div>
                  <div className="rounded-lg bg-bg-elevated border border-white/5 p-3 text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                    {course.input.additionalDetails}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.a>
  );
}

// --- Preview card labels for the hero strip ---
const previewCards = [
  { src: '/preview-chapter.jpg', label: 'Interactive Chapter' },
  { src: '/preview-quiz.jpg', label: 'Gamified Quiz' },
  { src: '/preview-syllabus.jpg', label: 'Course Syllabus' },
  { src: '/preview-slides.jpg', label: 'Presentation Slides' },
  { src: '/preview-activities.jpg', label: 'Teaching Activities' },
];

// --- Learning science principles ---

const principles = [
  { color: '#8b5cf6', label: 'Spacing', desc: 'Key concepts reappear across chapters, not just once' },
  { color: '#06b6d4', label: 'Interleaving', desc: 'Related topics are mixed across practice sets' },
  { color: '#f59e0b', label: 'Retrieval Practice', desc: 'Built-in opportunities to test recall, not re-read' },
  { color: '#22c55e', label: 'Concrete Examples', desc: 'Abstract theories grounded in real-world cases' },
  { color: '#3b82f6', label: 'Dual Coding', desc: 'Verbal + visual: widgets, diagrams, and simulations' },
];

// --- Deliverable icons ---

function DocIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function QuizCheckIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function ClipboardListIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <line x1="8" y1="11" x2="16" y2="11" />
      <line x1="8" y1="15" x2="13" y2="15" />
    </svg>
  );
}

function SlidesIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function AudioIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function ResourcesIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

// --- Deliverable artifacts for "What You Get" ---

const deliverables: { label: string; detail: string; icon: ReactNode }[] = [
  { label: 'Reading', detail: 'Interactive HTML with embedded widgets', icon: <DocIcon /> },
  { label: 'Practice Quiz', detail: 'Gamified with confidence calibration', icon: <QuizCheckIcon /> },
  { label: 'In-Class Quiz', detail: '5 shuffled versions + answer keys', icon: <ClipboardListIcon /> },
  { label: 'Slides', detail: 'PowerPoint with speaker notes', icon: <SlidesIcon /> },
  { label: 'Audiobook', detail: 'AI-narrated with pro voices', icon: <AudioIcon /> },
  { label: 'Teaching Pack', detail: 'Discussions, activities, starters', icon: <ResourcesIcon /> },
];

// --- Pipeline stages ---

const stages = [
  { n: 1, label: 'Setup', desc: 'Topic, audience, and preferences' },
  { n: 2, label: 'Syllabus', desc: 'AI-designed course structure' },
  { n: 3, label: 'Research', desc: 'Web-sourced knowledge base' },
  { n: 4, label: 'Build', desc: 'Chapters, quizzes, slides, and audio' },
  { n: 5, label: 'Export', desc: 'Download or publish as a course site' },
];

const STAGE_ROUTES: Record<StageId, string> = {
  landing: '/',
  setup: '/setup',
  syllabus: '/syllabus',
  research: '/research',
  build: '/build',
  export: '/export',
};

export function LandingPage() {
  const navigate = useNavigate();
  const { currentStage, reset, setup } = useCourseStore();
  const [showConfirm, setShowConfirm] = useState(false);

  const hasExistingCourse = currentStage !== 'landing' && currentStage !== 'setup';

  const handleStartBuilding = () => {
    if (hasExistingCourse) {
      setShowConfirm(true);
    } else {
      navigate('/setup');
    }
  };

  const confirmStartFresh = () => {
    setShowConfirm(false);
    reset();
    navigate('/setup');
  };

  const continueCurrent = () => {
    setShowConfirm(false);
    navigate(STAGE_ROUTES[currentStage]);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bg-card border border-violet-500/20 rounded-xl p-6 max-w-sm mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-2">Welcome back!</h3>
              <p className="text-sm text-text-secondary mb-5">
                You have a course in progress{setup.topic ? ` on "${setup.topic}"` : ''}. Starting fresh will replace it with a new one — your current syllabus, research, and generated classes won't carry over.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={continueCurrent}
                  className="px-4 py-2 rounded-lg bg-bg-elevated text-text-secondary text-sm font-medium hover:bg-bg-card transition cursor-pointer border-0"
                >
                  Continue Course
                </button>
                <button
                  onClick={confirmStartFresh}
                  className="px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition cursor-pointer border-0"
                >
                  Start Fresh
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ===== HERO ===== */}
      <section
        className="flex flex-col items-center text-center pt-20 pb-8 px-4 relative overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, #1a1a2e 0%, #0f0f1a 70%)' }}
      >
        {/* Hero background image — faded at top so it only shows in lower half */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage: 'url(/hero-bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            maskImage: 'linear-gradient(to bottom, transparent 60%, black 90%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 60%, black 90%)',
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            Anthropic Hackathon 2026
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
            One topic in.
            <br />
            A complete course&nbsp;out.
          </h1>
          <p className="text-lg mb-6">
            <span className="bg-gradient-to-r from-violet-400 via-violet-500 to-amber-400 bg-clip-text text-transparent font-semibold">
              Grounded in how humans actually learn.
            </span>
          </p>

          <p className="text-base text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            Turn any topic into a complete multimedia course, grounded in five evidence-based learning principles.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={handleStartBuilding}>
              Start Building
              <svg className="ml-2 w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Button>
            <Button variant="secondary" size="lg" onClick={() => {
              document.getElementById('science')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              How It Works
            </Button>
          </div>
        </motion.div>

        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* ===== PREVIEW STRIP ===== */}
      <section className="py-8 overflow-hidden">
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <div className="relative group">
            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-bg-primary to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-bg-primary to-transparent z-10 pointer-events-none" />

            <div
              className="flex gap-5 w-max items-center"
              style={{ animation: 'marquee 50s linear infinite' }}
              onMouseEnter={(e) => { e.currentTarget.style.animationPlayState = 'paused'; }}
              onMouseLeave={(e) => { e.currentTarget.style.animationPlayState = 'running'; }}
            >
              {[0, 1].map((set) => (
                <div key={set} className="flex gap-5 shrink-0 items-center">
                  {previewCards.map((card, i) => (
                    <div key={card.src} className="shrink-0" style={{ transform: `rotate(${i % 2 === 0 ? -1 : 1}deg)` }}>
                      <div className="w-48 h-60 rounded-xl overflow-hidden border border-violet-500/20 shadow-xl shadow-black/40 relative">
                        <img src={card.src} alt={card.label} className="w-full h-full object-cover object-top" loading="lazy" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                          <span className="text-[10px] font-medium text-violet-300">{card.label}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ===== EXAMPLE COURSES SHOWCASE ===== */}
      <section className="py-20 border-t border-violet-500/10">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-4">
            See what ClassBuild{' '}
            <span className="bg-gradient-to-r from-violet-400 to-amber-400 bg-clip-text text-transparent">creates</span>
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Six real courses, built end-to-end. Click "See what we entered" to see the input that produced each one.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto px-4">
          {[0, 5, 1, 4, 2, 3].map((idx, i) => (
            <motion.div
              key={exampleCourses[idx].slug}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <CourseCard course={exampleCourses[idx]} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== LEARNING SCIENCE DIFFERENTIATOR ===== */}
      <section id="science" className="py-20 border-t border-violet-500/10">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-4">
            Every course is architected around how humans{' '}
            <span className="bg-gradient-to-r from-violet-400 to-amber-400 bg-clip-text text-transparent">actually learn</span>
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            These aren't buzzwords. Each principle draws on decades of cognitive science, and ClassBuild weaves all five into every chapter, quiz, and activity it generates.
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-6 max-w-4xl mx-auto">
          {principles.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col items-center text-center w-36"
            >
              <div
                className="px-4 py-1.5 rounded-full text-sm font-medium mb-3 border"
                style={{
                  backgroundColor: `${p.color}15`,
                  borderColor: `${p.color}30`,
                  color: p.color,
                }}
              >
                {p.label}
              </div>
              <p className="text-xs text-text-muted leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== WHAT YOU GET ===== */}
      <section className="py-20 border-t border-violet-500/10">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl font-bold mb-4">A complete course package, per class</h2>
          <p className="text-text-secondary max-w-lg mx-auto">
            Six deliverables for every class. Download individually or as a single ZIP.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto px-4"
        >
          {deliverables.map((d, i) => (
            <motion.div
              key={d.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-bg-card border border-violet-500/15 hover:border-violet-500/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 shrink-0">
                {d.icon}
              </div>
              <div>
                <div className="text-sm font-medium text-text-primary">{d.label}</div>
                <div className="text-xs text-text-muted mt-0.5">{d.detail}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ===== PIPELINE ===== */}
      <section className="py-20 border-t border-violet-500/10">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-4">Five stages. One click at a time.</h2>
          <p className="text-text-secondary max-w-lg mx-auto">
            A full 12-chapter course takes about 2 hours to build and costs around $20–30. Audiobook narration is optional — about $5/month.
          </p>
        </motion.div>

        <div className="flex items-start justify-center max-w-2xl mx-auto px-4">
          {stages.map((stage, i) => (
            <motion.div
              key={stage.n}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="flex items-start min-w-0"
            >
              <div className="flex flex-col items-center gap-1.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-violet-500/15 flex items-center justify-center text-sm font-medium text-violet-400 shrink-0">
                  {stage.n}
                </div>
                <span className="text-[10px] text-text-muted whitespace-nowrap">{stage.label}</span>
                <span className="text-[9px] text-text-muted/60 text-center leading-tight max-w-[90px] hidden md:block">{stage.desc}</span>
              </div>
              {i < stages.length - 1 && (
                <div className="w-6 md:w-12 h-px bg-violet-500/20 mx-0.5 shrink-0 mt-[18px]" />
              )}
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button size="lg" onClick={handleStartBuilding}>
            Get Started
            <svg className="ml-2 w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Button>
        </div>
      </section>

      {/* ===== CLI CALLOUT ===== */}
      <section className="py-12 border-t border-violet-500/10">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto px-4"
        >
          <div className="rounded-xl bg-bg-card border border-violet-500/15 p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 shrink-0 mt-0.5">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary mb-1">Building multiple courses?</h3>
              <p className="text-sm text-text-secondary mb-3">
                The ClassBuild CLI can generate complete courses headlessly — ideal for creating entire programs or course catalogues.
              </p>
              <a
                href="https://github.com/jtangen/classbuild#cli--headless-course-generation"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors inline-flex items-center gap-1"
              >
                View on GitHub
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-10 border-t border-violet-500/10 text-center text-sm">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-text-muted text-xs">Powered by</span>
          {[
            { label: 'Claude', sub: 'Anthropic', color: '#8b5cf6' },
            { label: 'ElevenLabs', sub: 'Voice', color: '#64748b' },
            { label: 'Gemini', sub: 'Google', color: '#3b82f6' },
          ].map((b) => (
            <span
              key={b.label}
              className="px-3 py-1 rounded-full text-xs border"
              style={{
                borderColor: `${b.color}30`,
                backgroundColor: `${b.color}10`,
                color: b.color,
              }}
            >
              {b.label}
            </span>
          ))}
        </div>
        <p className="text-text-muted/70 text-xs mb-3">
          Your API keys never leave your browser. No backend, no tracking, no accounts.
        </p>
        <p className="text-text-muted/50 text-xs">
          ClassBuild — Anthropic Hackathon, Feb 10-17, 2026
        </p>
      </footer>
    </div>
  );
}
