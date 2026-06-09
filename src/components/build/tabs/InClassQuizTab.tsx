import { motion } from 'framer-motion';
import { CodexButton as Button } from '../../codex';
import { ArtifactStatusLine, ArtifactEmpty } from '../artifactHelpers';
import type { InClassQuizQuestion } from '../../../types/course';

export interface InClassQuizTabProps {
  questions: InClassQuizQuestion[];
  courseTitle: string;
  chapterTitle: string;
  isGenerating: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
  /** Cancels the in-flight generation this tab reports on. */
  onStop: () => void;
  onError: (message: string) => void;
}

export function InClassQuizTab({
  questions,
  courseTitle,
  chapterTitle,
  isGenerating,
  canGenerate,
  onGenerate,
  onStop,
  onError,
}: InClassQuizTabProps) {
  if (questions.length === 0) {
    if (isGenerating) {
      return (
        <ArtifactStatusLine onStop={onStop}>
          Drafting in-class quiz — ten questions, five shuffled versions, answer key.
        </ArtifactStatusLine>
      );
    }
    return (
      <ArtifactEmpty
        kicker="In-class quiz"
        title="Ten questions · five shuffled versions"
        body="Multiple-choice with distractor-level feedback. Exports as a ZIP containing five Word docs (A–E) and a single answer key."
        cta="Generate in-class quiz"
        onCta={onGenerate}
        disabled={!canGenerate}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-cb-text-muted">
          {questions.length} questions — 5 shuffled versions (A-E) + answer key
        </p>
        <Button
          size="sm"
          onClick={async () => {
            try {
              const { generateQuizDocPackage } = await import(
                '../../../services/export/quizDocExporter'
              );
              const blob = await generateQuizDocPackage(
                questions,
                courseTitle,
                chapterTitle,
              );
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `quiz-${chapterTitle
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .slice(0, 40)}.zip`;
              a.click();
              URL.revokeObjectURL(url);
            } catch (err) {
              onError(err instanceof Error ? err.message : 'Quiz export failed.');
            }
          }}
        >
          <svg
            className="mr-1.5 w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download Quiz Pack (.zip)
        </Button>
      </div>
      {questions.map((q, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-cb-ground-page border border-cb-border-default rounded-xl p-5"
        >
          <div className="flex items-start gap-3 mb-3">
            <span className="shrink-0 w-7 h-7 rounded-lg bg-cb-accent-emphasis-quiet flex items-center justify-center text-xs font-bold text-cb-accent-emphasis">
              {i + 1}
            </span>
            <p className="text-sm font-medium leading-relaxed">{q.question}</p>
          </div>
          <div className="ml-10 space-y-1.5">
            <div className="flex items-start gap-2 text-sm">
              <span className="text-cb-status-success text-xs font-medium mt-0.5 shrink-0">a)</span>
              <span className="text-cb-status-success">{q.correctAnswer}</span>
            </div>
            {q.distractors.map((d, j) => (
              <div key={j} className="flex items-start gap-2 text-sm">
                <span className="text-cb-text-muted text-xs font-medium mt-0.5 shrink-0">
                  {String.fromCharCode(98 + j)})
                </span>
                <span className="text-cb-text-default">{d.text}</span>
              </div>
            ))}
          </div>
          <div className="ml-10 mt-3 pt-3 border-t border-cb-border-subtle">
            <p className="text-xs text-cb-status-success mb-1.5">
              <span className="font-medium">Correct:</span> {q.correctFeedback}
            </p>
            {q.distractors.map((d, j) => (
              <p key={j} className="text-xs text-cb-text-muted mb-1">
                <span className="font-medium text-cb-status-danger">"{d.text}":</span>{' '}
                {d.feedback}
              </p>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
