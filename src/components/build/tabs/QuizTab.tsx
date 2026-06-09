import { downloadFile } from '../../../utils/download';
import { slugify } from '../../../utils/format';
import {
  ArtifactPreviewFrame,
  ArtifactStatusLine,
  ArtifactEmpty,
} from '../artifactHelpers';

export interface QuizTabProps {
  quizHtml: string;
  chapterNum: number;
  chapterTitle: string;
  isGenerating: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
  /** Cancels the in-flight generation this tab reports on. */
  onStop: () => void;
}

export function QuizTab({
  quizHtml,
  chapterNum,
  chapterTitle,
  isGenerating,
  canGenerate,
  onGenerate,
  onStop,
}: QuizTabProps) {
  if (quizHtml) {
    return (
      <ArtifactPreviewFrame
        title={`quiz-${chapterNum}.html · preview`}
        downloadLabel="Download .html ↓"
        onDownload={() =>
          downloadFile(
            quizHtml,
            `quiz-${chapterNum}-${slugify(chapterTitle || 'chapter')}.html`,
          )
        }
      >
        <iframe
          srcDoc={quizHtml}
          style={{ width: '100%', height: '80vh', border: 0, display: 'block' }}
          title="Practice quiz preview"
          sandbox="allow-scripts"
        />
      </ArtifactPreviewFrame>
    );
  }
  if (isGenerating) {
    return (
      <ArtifactStatusLine onStop={onStop}>
        Drafting practice quiz — multiple choice and short response, twelve questions.
      </ArtifactStatusLine>
    );
  }
  return (
    <ArtifactEmpty
      kicker="Practice quiz"
      title="A self-paced practice quiz"
      body="Twelve questions students can work through on their own, with instant feedback after each answer. Designed for retrieval practice, not assessment — scores stay with the student and aren't sent back to you."
      cta="Generate practice quiz"
      onCta={onGenerate}
      disabled={!canGenerate}
    />
  );
}
