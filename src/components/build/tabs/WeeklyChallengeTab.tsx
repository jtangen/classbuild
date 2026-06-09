import { downloadFile } from '../../../utils/download';
import { slugify } from '../../../utils/format';
import {
  ArtifactPreviewFrame,
  ArtifactStatusLine,
  ArtifactEmpty,
} from '../artifactHelpers';

export interface WeeklyChallengeTabProps {
  challengeHtml: string;
  chapterNum: number;
  chapterTitle: string;
  isGenerating: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
  /** Cancels the in-flight generation this tab reports on. */
  onStop: () => void;
}

export function WeeklyChallengeTab({
  challengeHtml,
  chapterNum,
  chapterTitle,
  isGenerating,
  canGenerate,
  onGenerate,
  onStop,
}: WeeklyChallengeTabProps) {
  if (challengeHtml) {
    return (
      <ArtifactPreviewFrame
        title={`mastery-${chapterNum}.html · preview`}
        downloadLabel="Download .html ↓"
        onDownload={() =>
          downloadFile(
            challengeHtml,
            `mastery-${chapterNum}-${slugify(chapterTitle || 'chapter')}.html`,
          )
        }
      >
        <iframe
          srcDoc={challengeHtml}
          style={{ width: '100%', height: '80vh', border: 0, display: 'block' }}
          title="Mastery challenge preview"
          sandbox="allow-scripts"
        />
      </ArtifactPreviewFrame>
    );
  }
  if (isGenerating) {
    return (
      <ArtifactStatusLine onStop={onStop}>
        Drafting the mastery challenge — ten to twelve questions in mixed formats.
      </ArtifactStatusLine>
    );
  }
  return (
    <ArtifactEmpty
      kicker="Mastery challenge"
      title="An end-of-chapter mastery check"
      body="A short assessment that pushes students past simple recall — multiple choice mixed with confidence ratings, two-stage reasoning, and slider estimates. Downloads as a SCORM package, ready to drop into Canvas, Moodle, Blackboard, or any standards-compliant LMS."
      cta="Generate mastery challenge"
      onCta={onGenerate}
      disabled={!canGenerate}
    />
  );
}
