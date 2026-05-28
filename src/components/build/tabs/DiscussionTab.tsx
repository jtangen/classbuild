import { motion } from 'framer-motion';
import { ArtifactShell } from '../ArtifactShell';
import { ArtifactStatusLine, ArtifactEmpty } from '../artifactHelpers';

export interface DiscussionPrompt {
  prompt: string;
  hook: string;
}

export interface DiscussionTabProps {
  discussions: DiscussionPrompt[];
  isGenerating: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
  onCopy: (text: string, label: string) => void;
  copiedLabel: string;
  formatDiscussionsText: () => string;
}

export function DiscussionTab({
  discussions,
  isGenerating,
  canGenerate,
  onGenerate,
  onCopy,
  copiedLabel,
  formatDiscussionsText,
}: DiscussionTabProps) {
  if (discussions.length === 0) {
    if (isGenerating) {
      return (
        <ArtifactStatusLine>
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
        <button
          onClick={() => onCopy(formatDiscussionsText(), 'discussions')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cb-accent-emphasis-quiet text-cb-accent-emphasis hover:bg-cb-accent-emphasis-quiet transition-colors cursor-pointer shrink-0"
        >
          {copiedLabel === 'discussions' ? (
            <>
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy all ↓
            </>
          )}
        </button>
      }
    >
      <div className="space-y-3">
        {discussions.map((d, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-cb-ground-page border border-cb-border-default rounded-xl p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-cb-accent-emphasis-quiet text-cb-accent-emphasis font-medium inline-block mb-3">
                  {d.hook}
                </span>
                <p className="text-base text-cb-text-default leading-relaxed">
                  {d.prompt}
                </p>
              </div>
              <button
                onClick={() => onCopy(d.prompt, `discussion-${i}`)}
                className="shrink-0 p-1.5 rounded-md text-cb-text-muted hover:text-cb-accent-emphasis hover:bg-cb-accent-emphasis-quiet transition-colors cursor-pointer"
                title="Copy prompt"
              >
                {copiedLabel === `discussion-${i}` ? (
                  <svg
                    className="w-4 h-4 text-cb-status-success"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </ArtifactShell>
  );
}
