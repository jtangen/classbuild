import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCourseStore } from '../store/courseStore';
import { useApiStore } from '../store/apiStore';
import { getTheme, VOICE_OPTIONS } from '../themes';
import { TopicInput } from '../components/setup/TopicInput';
import { AudienceSelector } from '../components/setup/AudienceSelector';
import { ChapterConfig } from '../components/setup/ChapterConfig';
import { StyleSelector } from '../components/setup/StyleSelector';
import { ApiKeyPanel } from '../components/setup/ApiKeyPanel';
import { Button } from '../components/shared/Button';

const LENGTH_LABELS: Record<string, string> = {
  concise: 'Concise (~2,000 words · 1 widget each)',
  standard: 'Standard (~4,000 words · 2 widgets each)',
  comprehensive: 'Comprehensive (~6,000 words · 3 widgets each)',
};

const COHORT_LABELS: Record<number, string> = {
  25: 'Small cohort',
  65: 'Medium cohort',
  200: 'Large cohort',
  400: 'Very large cohort',
};

const KNOWLEDGE_LABELS: Record<string, string> = {
  none: 'No prior knowledge',
  some: 'Some foundation',
  significant: 'Significant background',
};

const ENVIRONMENT_LABELS: Record<string, string> = {
  'lecture-theatre': 'Lecture theatre',
  'collaborative': 'Collaborative room',
  'flat-classroom': 'Flat classroom',
  'online': 'Online/hybrid',
};

export function SetupPage() {
  const navigate = useNavigate();
  const { setup, setStage, completeStage, resetDownstream } = useCourseStore();
  const { claudeApiKey, claudeKeyValid, elevenLabsKeyValid, geminiKeyValid, elevenLabsApiKey, geminiApiKey } = useApiStore();

  const hasTopic = setup.topic.trim().length > 10;
  const hasApiKey = claudeApiKey.trim().length > 0;
  const canProceed = hasTopic && hasApiKey;

  const handleGenerate = () => {
    // Clear all downstream data so syllabus generates fresh
    resetDownstream();
    completeStage('setup');
    setStage('syllabus');
    navigate('/syllabus');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto py-8 space-y-8"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Course Setup</h1>
        <p className="text-text-secondary">
          Tell us about the course you want to build. ClassBuild will handle the rest.
        </p>
      </div>

      <div className="space-y-8">
        {/* Section 1: Topic */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-bg-card border border-violet-500/10 rounded-xl p-6"
        >
          <TopicInput />
        </motion.section>

        {/* Section 2: Your Class */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-bg-card border border-violet-500/10 rounded-xl p-6"
        >
          <AudienceSelector />
        </motion.section>

        {/* Section 3: Course Structure */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-bg-card border border-violet-500/10 rounded-xl p-6"
        >
          <ChapterConfig />
        </motion.section>

        {/* Section 4: Style */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-bg-card border border-violet-500/10 rounded-xl p-6"
        >
          <StyleSelector />
        </motion.section>

        {/* Section 5: API Keys */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-bg-card border border-violet-500/10 rounded-xl p-6"
        >
          <ApiKeyPanel />
        </motion.section>

        {/* Summary & Action */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-bg-card border border-violet-500/10 rounded-xl p-6"
        >
          <h3 className="text-sm font-medium text-text-primary mb-4">Course Summary</h3>
          <div className="space-y-2 text-sm mb-6">
            <div className="flex gap-2">
              <span className="text-text-muted shrink-0">Topic:</span>
              <span className="text-text-secondary truncate">
                {setup.topic.trim()
                  ? (setup.topic.trim().length > 60 ? setup.topic.trim().slice(0, 60) + '...' : setup.topic.trim())
                  : 'Not yet entered'}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-text-muted shrink-0">Classes:</span>
              <span className="text-text-secondary">
                {setup.numChapters} · {LENGTH_LABELS[setup.chapterLength] ?? setup.chapterLength}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-text-muted shrink-0">Students:</span>
              <span className="text-text-secondary capitalize">
                {setup.educationLevel.replace(/-/g, ' ')} · {COHORT_LABELS[setup.cohortSize] ?? `~${setup.cohortSize} students`} · {KNOWLEDGE_LABELS[setup.priorKnowledge] ?? setup.priorKnowledge}
                {setup.teachingEnvironment ? ` · ${ENVIRONMENT_LABELS[setup.teachingEnvironment] ?? setup.teachingEnvironment}` : ''}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-text-muted shrink-0">Style:</span>
              <span className="text-text-secondary">
                {getTheme(setup.themeId).name} theme · {VOICE_OPTIONS.find(v => v.id === setup.voiceId)?.label ?? 'Default'} voice
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-text-muted shrink-0">Services:</span>
              <span className="text-text-secondary flex items-center gap-1.5 flex-wrap">
                <span className={claudeKeyValid === true ? 'text-emerald-400' : claudeApiKey ? 'text-amber-400' : 'text-text-muted'}>
                  Claude {claudeKeyValid === true ? '✓' : claudeApiKey ? '?' : '✗'}
                </span>
                {' · '}
                <span className={elevenLabsKeyValid === true ? 'text-emerald-400' : elevenLabsApiKey ? 'text-amber-400' : 'text-text-muted'}>
                  Narration {elevenLabsKeyValid === true ? '✓' : elevenLabsApiKey ? '?' : '—'}
                </span>
                {' · '}
                <span className={geminiKeyValid === true ? 'text-emerald-400' : geminiApiKey ? 'text-amber-400' : 'text-text-muted'}>
                  Infographics {geminiKeyValid === true ? '✓' : geminiApiKey ? '?' : '—'}
                </span>
              </span>
            </div>
          </div>

          {claudeKeyValid === false && (
            <div className="mb-4 p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
              Your Claude connection didn't work. Check that you copied the full key from{' '}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline hover:text-error/80">
                console.anthropic.com
              </a>{' '}
              and that your account has API credits.
            </div>
          )}

          <Button
            size="lg"
            className="w-full"
            disabled={!canProceed}
            onClick={handleGenerate}
          >
            Generate Syllabus
            <svg className="ml-2 w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Button>

          {!canProceed && (
            <p className="text-xs text-text-muted text-center mt-3">
              {!hasTopic && !hasApiKey ? 'Enter a course topic and add your Anthropic API key to continue' :
               !hasTopic ? (setup.topic.trim().length === 0 ? 'Enter a course topic to continue' : 'Please provide a more detailed topic description') :
               'Add your Anthropic API key to continue'}
            </p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
