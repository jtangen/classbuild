import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/shared/Button';
import { useCourseStore } from '../store/courseStore';
import type { StageId } from '../types/course';

// --- Preview card mockups for the hero strip ---

function ChapterPreview() {
  return (
    <div className="w-56 h-36 rounded-lg bg-[#0f0f1a] border border-violet-500/20 p-3 text-left overflow-hidden shadow-xl shadow-black/40 shrink-0">
      <div className="text-[8px] text-violet-400 font-medium mb-1.5">CLASS 3</div>
      <div className="text-[10px] font-semibold text-text-primary mb-2 leading-tight">The Neuroscience of Memory Consolidation</div>
      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-text-muted/10 w-full" />
        <div className="h-1.5 rounded-full bg-text-muted/10 w-4/5" />
        <div className="h-1.5 rounded-full bg-text-muted/10 w-full" />
      </div>
      <div className="mt-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-1.5">
        <div className="text-[8px] text-amber-400 font-medium">Pause and Reflect</div>
        <div className="text-[7px] text-text-muted mt-0.5">Why might sleep deprivation impair learning?</div>
      </div>
    </div>
  );
}

function QuizPreview() {
  return (
    <div className="w-56 h-36 rounded-lg bg-[#0f0f1a] border border-violet-500/20 p-3 text-left overflow-hidden shadow-xl shadow-black/40 shrink-0">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[8px] text-violet-400 font-medium">PRACTICE QUIZ</div>
        <div className="text-[8px] text-amber-400">Q4 / 12</div>
      </div>
      <div className="text-[9px] text-text-primary mb-2 leading-tight">Which principle explains why interleaved practice outperforms blocked practice?</div>
      <div className="text-[8px] text-text-muted mb-1.5">How confident are you?</div>
      <div className="flex gap-1.5">
        {['Just guessing', 'Somewhat sure', 'Very confident'].map((label, i) => (
          <div
            key={label}
            className={`flex-1 rounded px-1 py-1 text-center text-[7px] border ${
              i === 1
                ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                : 'bg-bg-elevated border-violet-500/10 text-text-muted'
            }`}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function SyllabusPreview() {
  return (
    <div className="w-56 h-36 rounded-lg bg-[#0f0f1a] border border-violet-500/20 p-3 text-left overflow-hidden shadow-xl shadow-black/40 shrink-0">
      <div className="text-[8px] text-violet-400 font-medium mb-2">SYLLABUS</div>
      {[
        { n: 1, title: 'Foundations of Memory', tags: ['spacing', 'examples'] },
        { n: 2, title: 'Encoding & Retrieval', tags: ['retrieval', 'interleaving'] },
        { n: 3, title: 'The Testing Effect', tags: ['retrieval', 'dual-coding'] },
      ].map((ch) => (
        <div key={ch.n} className="flex items-center gap-2 mb-1.5">
          <div className="w-4 h-4 rounded-full bg-violet-500/15 flex items-center justify-center text-[7px] text-violet-400 font-medium shrink-0">{ch.n}</div>
          <div className="text-[8px] text-text-primary truncate flex-1">{ch.title}</div>
          <div className="flex gap-0.5 shrink-0">
            {ch.tags.map((tag) => (
              <div
                key={tag}
                className={`w-1.5 h-1.5 rounded-full ${
                  tag === 'spacing' ? 'bg-[#8b5cf6]'
                  : tag === 'interleaving' ? 'bg-[#06b6d4]'
                  : tag === 'retrieval' ? 'bg-[#f59e0b]'
                  : tag === 'examples' ? 'bg-[#22c55e]'
                  : 'bg-[#3b82f6]'
                }`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SlidePreview() {
  return (
    <div className="w-56 h-36 rounded-lg bg-[#1a1a2e] border border-violet-500/20 p-3 text-left overflow-hidden shadow-xl shadow-black/40 shrink-0 flex flex-col items-center justify-center">
      <div className="text-[8px] text-violet-400 font-medium mb-1 self-start">BIG IDEA</div>
      <div className="text-[11px] font-bold text-text-primary text-center leading-tight my-auto px-2">
        "Every time you recall something, you change the memory itself."
      </div>
      <div className="flex gap-1 mt-1.5">
        <span className="w-1 h-1 rounded-full bg-text-muted/30" />
        <span className="w-1 h-1 rounded-full bg-violet-500" />
        <span className="w-1 h-1 rounded-full bg-text-muted/30" />
      </div>
      <div className="text-[7px] text-text-muted mt-1.5">Slide 7 / 14</div>
    </div>
  );
}

function DiscussionPreview() {
  return (
    <div className="w-56 h-36 rounded-lg bg-[#0f0f1a] border border-violet-500/20 p-3 text-left overflow-hidden shadow-xl shadow-black/40 shrink-0">
      <div className="text-[8px] text-violet-400 font-medium mb-2">CONVERSATION STARTERS</div>
      <div className="rounded-md bg-violet-500/5 border border-violet-500/10 p-2 mb-1.5">
        <div className="text-[7px] text-amber-400 font-medium mb-0.5">Thought Experiment</div>
        <div className="text-[9px] text-text-primary leading-tight">If we could upload your brain to a computer, would the copy be "you"?</div>
      </div>
      <div className="rounded-md bg-violet-500/5 border border-violet-500/10 p-2">
        <div className="text-[7px] text-amber-400 font-medium mb-0.5">Current Events</div>
        <div className="text-[9px] text-text-primary leading-tight">What does AlphaFold tell us about the limits of understanding?</div>
      </div>
    </div>
  );
}

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
        className="flex flex-col items-center text-center pt-20 pb-8 px-4 relative"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, #1a1a2e 0%, #0f0f1a 70%)' }}
      >
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
            Describe your subject and get interactive chapters, gamified quizzes, presentation slides, voice narration, and AI infographics — all woven with five evidence-based learning principles.
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
              className="flex gap-4 w-max"
              style={{ animation: 'marquee 50s linear infinite' }}
              onMouseEnter={(e) => { e.currentTarget.style.animationPlayState = 'paused'; }}
              onMouseLeave={(e) => { e.currentTarget.style.animationPlayState = 'running'; }}
            >
              {/* Double the cards for seamless loop */}
              {[0, 1].map((set) => (
                <div key={set} className="flex gap-4 shrink-0">
                  <div className="transform -rotate-1"><ChapterPreview /></div>
                  <div className="transform rotate-1"><QuizPreview /></div>
                  <div className="transform -rotate-0.5"><SyllabusPreview /></div>
                  <div className="transform rotate-1"><SlidePreview /></div>
                  <div className="transform -rotate-1"><DiscussionPreview /></div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
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
            From topic to deployment-ready course materials.
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
