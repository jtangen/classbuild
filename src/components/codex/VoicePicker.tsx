import { useEffect, useRef, useState } from 'react';
import { VOICE_OPTIONS, DEFAULT_VOICE_ID, type VoiceOption } from '../../themes';
import { useApiStore } from '../../store/apiStore';

interface VoicePickerProps {
  value: string | undefined;
  onChange: (voiceId: string) => void;
}

/**
 * 8-tile voice picker with a preview player. Every voice in VOICE_OPTIONS is
 * an ElevenLabs premade voice — automatically available in every user's
 * library, no manual add step required. The picker tries the static CDN URL
 * first; if it has rotated, it falls back to `/v1/voices/{voice_id}` using
 * the user's API key to resolve the canonical preview, then caches.
 */
export function VoicePicker({ value, onChange }: VoicePickerProps) {
  const selectedId = value ?? DEFAULT_VOICE_ID;
  const { elevenLabsApiKey } = useApiStore();
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(
    () => () => {
      const a = audioRef.current;
      if (a) {
        a.pause();
        a.src = '';
      }
    },
    [],
  );

  async function fetchCanonicalPreviewUrl(
    voiceId: string,
  ): Promise<string | null> {
    if (!elevenLabsApiKey?.trim()) return null;
    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/voices/${encodeURIComponent(voiceId)}`,
        { headers: { 'xi-api-key': elevenLabsApiKey.trim() } },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { preview_url?: string };
      return data.preview_url ?? null;
    } catch {
      return null;
    }
  }

  async function playUrl(voiceId: string, url: string): Promise<boolean> {
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    return new Promise((resolve) => {
      let settled = false;
      const onPlaying = () => {
        if (settled) return;
        settled = true;
        audio.removeEventListener('playing', onPlaying);
        audio.removeEventListener('error', onError);
        resolve(true);
      };
      const onError = () => {
        if (settled) return;
        settled = true;
        audio.removeEventListener('playing', onPlaying);
        audio.removeEventListener('error', onError);
        resolve(false);
      };
      audio.addEventListener('playing', onPlaying);
      audio.addEventListener('error', onError);
      audio.onended = () => setPreviewingId((id) => (id === voiceId ? null : id));
      audio.src = url;
      void audio.play().catch(() => onError());
    });
  }

  async function togglePreview(voice: VoiceOption) {
    const isCurrent = previewingId === voice.id;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (isCurrent) {
      setPreviewingId(null);
      return;
    }
    setPreviewingId(voice.id);

    // Try cached resolved URL, then static URL.
    const candidates = [resolvedUrls[voice.id], voice.previewUrl].filter(
      (u): u is string => !!u,
    );
    for (const url of candidates) {
      const ok = await playUrl(voice.id, url);
      if (ok) return;
    }

    // Fall back to the ElevenLabs API resolver.
    setResolvingId(voice.id);
    const canonical = await fetchCanonicalPreviewUrl(voice.id);
    setResolvingId((id) => (id === voice.id ? null : id));
    if (!canonical) {
      setPreviewingId(null);
      return;
    }
    setResolvedUrls((prev) => ({ ...prev, [voice.id]: canonical }));
    const ok = await playUrl(voice.id, canonical);
    if (!ok) setPreviewingId(null);
  }

  return (
    <div>
      <div
        className="cb-sc"
        style={{
          fontSize: 12.5,
          color: 'var(--cb-text-muted)',
          letterSpacing: '0.14em',
          marginBottom: 6,
        }}
      >
        Narrator
      </div>
      <p
        className="cb-italic"
        style={{
          margin: '0 0 10px',
          fontSize: 13,
          lineHeight: 1.45,
          color: 'var(--cb-text-muted)',
        }}
      >
        Used for chapter audiobooks when an ElevenLabs key is set. Tap{' '}
        <span style={{ fontFamily: 'var(--font-cb-mono)' }}>▷</span> to hear a sample.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 6,
        }}
      >
        {VOICE_OPTIONS.map((voice) => {
          const isSelected = voice.id === selectedId;
          const isPreviewing = previewingId === voice.id;
          const isResolving = resolvingId === voice.id;
          return (
            <div
              key={voice.id}
              role="button"
              tabIndex={0}
              onClick={() => onChange(voice.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange(voice.id);
                }
              }}
              className="cb-focus"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                alignItems: 'baseline',
                gap: 10,
                padding: '10px 12px',
                background: 'var(--cb-ground-page)',
                border: isSelected
                  ? '1.5px solid var(--cb-accent-emphasis)'
                  : '1px solid var(--cb-border-default)',
                borderRadius: 2,
                cursor: 'pointer',
                fontFamily: 'var(--font-cb-serif)',
                transition: 'border-color 160ms ease',
              }}
              aria-pressed={isSelected}
              aria-label={`Pick ${voice.label}`}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  className="cb-italic"
                  style={{
                    fontSize: 15,
                    fontVariationSettings: '"opsz" 14',
                    color: 'var(--cb-text-default)',
                  }}
                >
                  {voice.label}
                </div>
                <div
                  className="cb-italic"
                  style={{
                    fontSize: 11.5,
                    lineHeight: 1.4,
                    color: 'var(--cb-text-muted)',
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                  title={voice.desc}
                >
                  {voice.desc}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void togglePreview(voice);
                }}
                className="cb-focus"
                aria-label={
                  isPreviewing
                    ? `Pause ${voice.label} preview`
                    : `Play ${voice.label} preview`
                }
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  border: '1px solid var(--cb-border-strong)',
                  background: isPreviewing
                    ? 'var(--cb-accent-emphasis)'
                    : 'transparent',
                  color: isPreviewing ? '#fff' : 'var(--cb-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                {isResolving ? '⋯' : isPreviewing ? '■' : '▷'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
