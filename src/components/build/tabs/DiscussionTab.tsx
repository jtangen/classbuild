import { CodexButton as Button } from '../../codex';
import { ArtifactShell } from '../ArtifactShell';
import { ArtifactStatusLine, ArtifactEmpty, CopyIconButton } from '../artifactHelpers';

export interface DiscussionPrompt {
  prompt: string;
  hook: string;
}

export interface DiscussionTabProps {
  discussions: DiscussionPrompt[];
  isGenerating: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
  /** Cancels the in-flight generation this tab reports on. */
  onStop: () => void;
  onCopy: (text: string, label: string) => void;
  copiedLabel: string;
  formatDiscussionsText: () => string;
}

export function DiscussionTab({
  discussions,
  isGenerating,
  canGenerate,
  onGenerate,
  onStop,
  onCopy,
  copiedLabel,
  formatDiscussionsText,
}: DiscussionTabProps) {
  if (discussions.length === 0) {
    if (isGenerating) {
      return (
        <ArtifactStatusLine onStop={onStop}>
          Drafting conversation starters — five or six prompts students can read off
          a slide as they walk in.
        </ArtifactStatusLine>
      );
    }
    return (
      <ArtifactEmpty
        kicker="Discussion"
        title="Five or six provocative prompts"
        body="Conversation starters designed to display on a slide as students arrive. Each prompt comes with a one-line hook for you to read aloud."
        cta="Generate prompts"
        onCta={onGenerate}
        disabled={!canGenerate}
      />
    );
  }

  return (
    <ArtifactShell
      kicker="Discussion"
      title={`${discussions.length} conversation prompts`}
      meta="Designed to display on a slide as students arrive."
      actions={
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onCopy(formatDiscussionsText(), 'discussions')}
        >
          {copiedLabel === 'discussions' ? 'Copied' : 'Copy all'}
        </Button>
      }
    >
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {discussions.map((d, i) => (
          <li
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              gap: 12,
              alignItems: 'start',
              padding: i === 0 ? '2px 0 16px' : '16px 0',
              borderTop: i === 0 ? 'none' : '0.5px solid var(--cb-border-default)',
            }}
          >
            <div style={{ minWidth: 0 }}>
              {d.hook && (
                <div
                  className="cb-italic"
                  style={{
                    fontSize: 13.5,
                    lineHeight: 1.5,
                    color: 'var(--cb-accent-emphasis)',
                    marginBottom: 6,
                  }}
                >
                  {d.hook}
                </div>
              )}
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55 }}>{d.prompt}</p>
            </div>
            <CopyIconButton
              copied={copiedLabel === `discussion-${i}`}
              onClick={() => onCopy(d.prompt, `discussion-${i}`)}
              label="Copy prompt"
            />
          </li>
        ))}
      </ol>
    </ArtifactShell>
  );
}
