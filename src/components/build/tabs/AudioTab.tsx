import { useState } from 'react';
import { CodexButton as Button } from '../../codex';
import { slugify } from '../../../utils/format';
import { downloadFile } from '../../../utils/download';
import { isSafeMediaUrl } from '../../../utils/url';
import { ArtifactShell } from '../ArtifactShell';
import {
  ArtifactStatusLine,
  ArtifactEmpty,
  KeyMissingBanner,
} from '../artifactHelpers';

export interface AudioTabProps {
  audioTranscript: string;
  audioUrl: string;
  audioError: string;
  /** Non-error notice: audio plays now but exceeded the persistable size cap. */
  audioPersistNote: string;
  audioPhase: 'transcript' | 'synthesizing' | null;
  audioChunkProgress: { current: number; total: number } | null;
  chapterNum: number;
  chapterTitle: string;
  isGenerating: boolean;
  /** Drafting the transcript (needs the Anthropic key; one at a time). */
  canGenerate: boolean;
  /** Narrating an existing transcript: ElevenLabs only, but one narration at
   *  a time across chapters (the in-flight slot is single per kind). */
  canNarrate?: boolean;
  hasElevenLabsKey: boolean;
  onGenerate: () => void;
  onRetry: () => void;
  onAddKey: () => void;
  /** Cancels the in-flight transcript draft / synthesis. */
  onStop: () => void;
  /** Persist an edited transcript back to the chapter. */
  onSaveTranscript: (text: string) => void;
}

export function AudioTab({
  audioTranscript,
  audioUrl,
  audioError,
  audioPersistNote,
  audioPhase,
  audioChunkProgress,
  chapterNum,
  chapterTitle,
  isGenerating,
  canGenerate,
  canNarrate = true,
  hasElevenLabsKey,
  onGenerate,
  onRetry,
  onAddKey,
  onStop,
  onSaveTranscript,
}: AudioTabProps) {
  if (audioTranscript) {
    // audioUrl can come from an imported project file; only an app-made
    // blob:/data:audio URL may reach the imperative href below (a javascript:
    // URL would run on click).
    const canDownload = isSafeMediaUrl(audioUrl, 'audio');
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        {audioUrl && (
          <ArtifactShell
            kicker="Narration"
            title="Class audiobook"
            meta="Generated with ElevenLabs"
            actions={
              <Button
                size="sm"
                variant="secondary"
                disabled={!canDownload}
                onClick={() => {
                  if (!isSafeMediaUrl(audioUrl, 'audio')) return;
                  const a = document.createElement('a');
                  a.href = audioUrl;
                  a.download = `audio-${chapterNum}-${slugify(chapterTitle || 'chapter')}.mp3`;
                  a.click();
                }}
              >
                Download .mp3 ↓
              </Button>
            }
          >
            <audio controls src={audioUrl} style={{ display: 'block', width: '100%' }}>
              Your browser does not support the audio element.
            </audio>
            {audioPersistNote && (
              <p
                className="cb-italic"
                style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--cb-text-muted)' }}
              >
                {audioPersistNote}
              </p>
            )}
          </ArtifactShell>
        )}
        {!audioUrl && hasElevenLabsKey && audioError && (
          <div
            role="alert"
            style={{
              padding: '12px 14px',
              background: 'var(--cb-status-warning-bg)',
              borderLeft: '2px solid var(--cb-status-warning)',
              borderRadius: 2,
            }}
          >
            <p style={{ margin: '0 0 10px', fontSize: 14, lineHeight: 1.55 }}>
              <span style={{ color: 'var(--cb-status-warning-text)', fontWeight: 500 }}>
                Audio synthesis failed.
              </span>{' '}
              {audioError}
            </p>
            <Button size="sm" variant="secondary" onClick={onRetry} disabled={isGenerating || !canNarrate}>
              Retry audio
            </Button>
          </div>
        )}
        {!audioUrl && hasElevenLabsKey && !audioError &&
          (isGenerating ? (
            <div>
              <ArtifactStatusLine onStop={onStop}>
                {audioChunkProgress
                  ? `Synthesising audio · chunk ${audioChunkProgress.current} of ${audioChunkProgress.total}…`
                  : 'Synthesising audio…'}
              </ArtifactStatusLine>
              {audioChunkProgress && (
                <div style={{ height: 2, background: 'var(--cb-border-default)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(audioChunkProgress.current / Math.max(1, audioChunkProgress.total)) * 100}%`,
                      background: 'var(--cb-accent-emphasis)',
                      transition: 'width 320ms cubic-bezier(0.32,0.04,0.32,1)',
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: '10px 16px',
                flexWrap: 'wrap',
                padding: '14px 16px',
                background: 'var(--cb-surface-sunken)',
                border: '1px solid var(--cb-border-default)',
                borderRadius: 2,
              }}
            >
              <span className="cb-italic" style={{ fontSize: 14, color: 'var(--cb-text-muted)' }}>
                Transcript ready. Narrate it as a class audiobook.
              </span>
              <Button size="sm" variant="secondary" onClick={onRetry} disabled={isGenerating || !canNarrate}>
                Generate audio
              </Button>
            </div>
          ))}
        {!audioUrl && !hasElevenLabsKey && (
          <KeyMissingBanner
            tone="optional"
            text={
              <>
                <strong>Transcript ready.</strong> Add an ElevenLabs key to narrate
                it as a class audiobook — or skip and keep the transcript text only.
              </>
            }
            ctaLabel="Add ElevenLabs key →"
            onCta={onAddKey}
          />
        )}
        <TranscriptPanel
          transcript={audioTranscript}
          chapterNum={chapterNum}
          chapterTitle={chapterTitle}
          hasAudio={!!audioUrl}
          editable={!isGenerating}
          onSave={onSaveTranscript}
        />
      </div>
    );
  }

  if (isGenerating) {
    return (
      <ArtifactStatusLine onStop={onStop}>
        {audioPhase === 'transcript'
          ? 'Adapting chapter for spoken delivery…'
          : audioChunkProgress
          ? `Synthesising audio · chunk ${audioChunkProgress.current} of ${audioChunkProgress.total}…`
          : 'Preparing audio synthesis…'}
      </ArtifactStatusLine>
    );
  }

  return (
    <ArtifactEmpty
      kicker="Audio"
      title="Narrated chapter audio"
      body={
        hasElevenLabsKey
          ? 'A spoken-word transcript adapted from the chapter text, synthesised through ElevenLabs into a single audio file.'
          : 'A spoken-word transcript adapted from the chapter text — and optionally narrated as a class audiobook through ElevenLabs. Without an ElevenLabs key you still get the transcript text.'
      }
      cta="Generate audio"
      onCta={onGenerate}
      disabled={!canGenerate}
      secondaryCta={!hasElevenLabsKey ? 'Add ElevenLabs key →' : undefined}
      onSecondaryCta={!hasElevenLabsKey ? onAddKey : undefined}
    />
  );
}

// ─── TranscriptPanel ──────────────────────────────────────────────────
//
// The narration script itself — readable (and editable) before any
// ElevenLabs credits are spent, and kept alongside the player afterwards.

function TranscriptPanel({
  transcript,
  chapterNum,
  chapterTitle,
  hasAudio,
  editable,
  onSave,
}: {
  transcript: string;
  chapterNum: number;
  chapterTitle: string;
  hasAudio: boolean;
  editable: boolean;
  onSave: (text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  // Seeded from the live transcript when the Edit button is pressed; while
  // not editing the view renders `transcript` directly, so no sync effect
  // is needed (and an in-progress edit is never clobbered by external
  // transcript changes).
  const [draft, setDraft] = useState(transcript);

  const words = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  // ~155 wpm is a comfortable narration pace.
  const minutes = Math.max(1, Math.round(words / 155));
  const changed = draft.trim() !== transcript.trim();

  return (
    <ArtifactShell
      kicker="Transcript"
      meta={
        <span className="cb-mono" style={{ fontStyle: 'normal', fontSize: 12 }}>
          {words.toLocaleString()} words · ≈ {minutes} min narrated
        </span>
      }
      actions={
        <>
          {!editing && (
            <Button
              size="sm"
              variant="ghost"
              disabled={!editable}
              onClick={() => {
                setDraft(transcript);
                setEditing(true);
              }}
            >
              Edit
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              // downloadFile revokes its object URL after the click (this
              // used to leak one per download).
              downloadFile(
                transcript,
                `transcript-${chapterNum}-${slugify(chapterTitle || 'chapter')}.txt`,
                'text/plain',
              )
            }
          >
            Download .txt ↓
          </Button>
        </>
      }
      bodyless
    >
      {editing ? (
        <div style={{ padding: '16px 20px' }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={14}
            aria-label="Transcript"
            className="cb-focus"
            style={{
              width: '100%',
              padding: '10px 12px',
              fontFamily: 'var(--font-cb-serif)',
              fontSize: 15,
              lineHeight: 1.6,
              color: 'var(--cb-text-default)',
              background: 'var(--cb-ground-canvas)',
              border: '0.5px solid var(--cb-border-default)',
              borderRadius: 2,
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Button
              size="sm"
              disabled={!draft.trim() || !changed}
              onClick={() => {
                onSave(draft.trim());
                setEditing(false);
              }}
            >
              Save transcript
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setDraft(transcript);
              }}
            >
              Cancel
            </Button>
            {hasAudio && changed && (
              <span className="cb-italic" style={{ fontSize: 13, color: 'var(--cb-text-muted)' }}>
                Saving won’t change the existing audio — re-narrate to update it.
              </span>
            )}
          </div>
        </div>
      ) : (
        <div style={{ padding: '14px 20px', maxHeight: 384, overflowY: 'auto' }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
            {transcript}
          </p>
        </div>
      )}
    </ArtifactShell>
  );
}
