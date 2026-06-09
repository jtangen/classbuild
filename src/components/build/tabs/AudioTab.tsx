import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CodexButton as Button } from '../../codex';
import { slugify } from '../../../utils/format';
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
  canGenerate: boolean;
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
  hasElevenLabsKey,
  onGenerate,
  onRetry,
  onAddKey,
  onStop,
  onSaveTranscript,
}: AudioTabProps) {
  if (audioTranscript) {
    return (
      <div className="space-y-4">
        {audioUrl && (
          <div className="bg-cb-ground-page border border-cb-border-default rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-cb-accent-emphasis-quiet flex items-center justify-center">
                <svg className="w-5 h-5 text-cb-accent-emphasis" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Class Audiobook</p>
                <p className="text-xs text-cb-text-muted">Generated with ElevenLabs</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = audioUrl;
                  a.download = `audio-${chapterNum}-${slugify(chapterTitle || 'chapter')}.mp3`;
                  a.click();
                }}
              >
                <svg className="mr-1.5 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download .mp3
              </Button>
            </div>
            <audio controls className="w-full" src={audioUrl}>
              Your browser does not support the audio element.
            </audio>
            {audioPersistNote && (
              <p className="mt-3 mb-0 text-xs italic text-cb-text-muted leading-relaxed">
                {audioPersistNote}
              </p>
            )}
          </div>
        )}
        {!audioUrl && hasElevenLabsKey && audioError && (
          <div className="bg-cb-status-warning-bg border border-cb-status-warning rounded-xl p-4">
            <p className="text-cb-status-warning text-sm mb-1">
              Audio synthesis failed: {audioError}
            </p>
            <Button size="sm" variant="secondary" className="mt-2" onClick={onRetry} disabled={isGenerating}>
              Retry Audio
            </Button>
          </div>
        )}
        {!audioUrl && hasElevenLabsKey && !audioError && (
          <div className="bg-cb-ground-page border border-cb-border-default rounded-xl p-4 text-center">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-cb-accent-emphasis"
                      animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.8, delay: i * 0.12, repeat: Infinity }}
                    />
                  ))}
                </div>
                <span className="text-cb-text-default text-sm">
                  {audioChunkProgress
                    ? `Synthesizing audio: chunk ${audioChunkProgress.current} of ${audioChunkProgress.total}...`
                    : 'Synthesizing audio...'}
                </span>
                {audioChunkProgress && (
                  <div className="w-48">
                    <div className="h-1.5 bg-cb-surface-sunken rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cb-accent-emphasis rounded-full transition-all duration-500"
                        style={{ width: `${(audioChunkProgress.current / audioChunkProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                <Button size="sm" variant="ghost" onClick={onStop}>
                  Stop
                </Button>
              </div>
            ) : (
              <>
                <p className="text-cb-text-default text-sm mb-1">Transcript ready — click below to generate audio.</p>
                <Button size="sm" variant="secondary" className="mt-2" onClick={onRetry} disabled={isGenerating}>
                  Generate Audio
                </Button>
              </>
            )}
          </div>
        )}
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
  const [draft, setDraft] = useState(transcript);

  // Track external transcript changes (regenerate, chapter switch) while not
  // editing, so opening the editor always starts from the live text.
  useEffect(() => {
    if (!editing) setDraft(transcript);
  }, [transcript, editing]);

  const words = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  // ~155 wpm is a comfortable narration pace.
  const minutes = Math.max(1, Math.round(words / 155));
  const changed = draft.trim() !== transcript.trim();

  return (
    <div className="bg-cb-ground-page border border-cb-border-default rounded-xl overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 px-5 py-3 bg-cb-surface-sunken border-b border-cb-border-default">
        <span className="font-mono text-xs text-cb-text-muted tracking-wide">
          transcript · {words.toLocaleString()} words · ≈ {minutes} min narrated
        </span>
        <div className="flex gap-2 shrink-0">
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
            onClick={() => {
              const a = document.createElement('a');
              a.href = URL.createObjectURL(new Blob([transcript], { type: 'text/plain' }));
              a.download = `transcript-${chapterNum}-${slugify(chapterTitle || 'chapter')}.txt`;
              a.click();
            }}
          >
            Download .txt
          </Button>
        </div>
      </div>
      {editing ? (
        <div className="p-5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={14}
            className="w-full text-sm leading-relaxed text-cb-text-default bg-cb-ground-canvas border border-cb-border-default rounded p-3 resize-y outline-none"
          />
          <div className="flex items-baseline gap-2 mt-3 flex-wrap">
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
              <span className="text-xs italic text-cb-text-muted">
                Saving won’t change the existing audio — re-narrate to update it.
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="px-5 py-4 max-h-96 overflow-y-auto">
          <p className="m-0 text-sm leading-relaxed text-cb-text-default whitespace-pre-wrap">
            {transcript}
          </p>
        </div>
      )}
    </div>
  );
}
