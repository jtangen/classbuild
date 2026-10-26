import { CodexButton as Button } from '../../codex';
import { ArtifactStatusLine, ArtifactEmpty } from '../artifactHelpers';
import { ArtifactShell } from '../ArtifactShell';
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

  const downloadPack = async () => {
    try {
      const { generateQuizDocPackage } = await import(
        '../../../services/export/quizDocExporter'
      );
      const blob = await generateQuizDocPackage(questions, courseTitle, chapterTitle);
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
  };

  return (
    <ArtifactShell
      kicker="In-class quiz"
      title={`${questions.length} questions`}
      meta="Exports as five shuffled versions (A–E) and an answer key."
      actions={
        <Button size="sm" variant="secondary" onClick={() => void downloadPack()}>
          Download quiz pack (.zip) ↓
        </Button>
      }
    >
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {questions.map((q, i) => (
          <li
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '28px minmax(0, 1fr)',
              gap: 12,
              padding: i === 0 ? '2px 0 18px' : '18px 0',
              borderTop: i === 0 ? 'none' : '0.5px solid var(--cb-border-default)',
            }}
          >
            <span
              className="cb-mono"
              style={{ fontSize: 12.5, color: 'var(--cb-accent-emphasis)', paddingTop: 3 }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: '0 0 10px', fontSize: 16, lineHeight: 1.5 }}>{q.question}</p>
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 14.5, lineHeight: 1.55 }}>
                {[{ text: q.correctAnswer, correct: true }, ...q.distractors.map((d) => ({ text: d.text, correct: false }))].map(
                  (opt, j) => (
                    <li key={j} style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 2 }}>
                      <span
                        className="cb-mono"
                        style={{ fontSize: 12, color: 'var(--cb-text-muted)', flexShrink: 0 }}
                      >
                        {String.fromCharCode(97 + j)})
                      </span>
                      <span style={{ color: opt.correct ? 'var(--cb-status-success)' : 'var(--cb-text-default)' }}>
                        {opt.text}
                      </span>
                    </li>
                  ),
                )}
              </ol>
              <div
                style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: '0.5px solid var(--cb-border-subtle)',
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: 'var(--cb-text-muted)',
                }}
              >
                <p style={{ margin: '0 0 4px' }}>
                  <span className="cb-sc" style={{ color: 'var(--cb-status-success)', marginRight: 6 }}>
                    Correct
                  </span>
                  {q.correctFeedback}
                </p>
                {q.distractors.map((d, j) => (
                  <p key={j} style={{ margin: '0 0 4px' }}>
                    <span style={{ color: 'var(--cb-status-danger)' }}>“{d.text}”</span> {d.feedback}
                  </p>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </ArtifactShell>
  );
}
