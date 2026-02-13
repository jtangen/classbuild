import { useState, useEffect, useRef, useCallback } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { useApiStore } from '../../store/apiStore';
import { THEMES, VOICE_OPTIONS, type Theme } from '../../themes';

function ThemePreviewCard({ theme, selected, onClick }: { theme: Theme; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left transition-all cursor-pointer rounded-xl overflow-hidden"
      style={{
        border: selected ? `2.5px solid ${theme.accent}` : `1.5px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
        boxShadow: selected
          ? `0 0 0 1px ${theme.accent}40, 0 4px 20px ${theme.accent}20`
          : '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <div
        className="px-5 py-4"
        style={{ background: theme.pageBg }}
      >
        <div
          className="text-[15px] font-bold mb-2.5 leading-tight"
          style={{ color: theme.textPrimary, fontFamily: theme.headingFont }}
        >
          {theme.name}
        </div>
        <p
          className="text-[12.5px] leading-[1.65]"
          style={{ color: theme.textSecondary, fontFamily: theme.bodyFont }}
        >
          Learn how <strong style={{ color: theme.textPrimary, fontWeight: 600 }}>retrieval practice</strong> strengthens memory. Concepts like{' '}
          <span style={{ color: theme.accent, fontWeight: 500 }}>spaced repetition</span>{' '}
          make learning stick.
        </p>
        <div className="flex items-center gap-2 mt-3">
          <div
            className="h-[3px] flex-1 rounded-full"
            style={{ background: `linear-gradient(to right, ${theme.accent}, ${theme.accentLight})` }}
          />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: theme.warmAccent }} />
        </div>
      </div>
    </button>
  );
}

function VoiceCard({
  voice,
  selected,
  previewUrl,
  playingId,
  onSelect,
  onPlay,
}: {
  voice: typeof VOICE_OPTIONS[number];
  selected: boolean;
  previewUrl: string | undefined;
  playingId: string | null;
  onSelect: () => void;
  onPlay: (id: string, url: string) => void;
}) {
  const isPlaying = playingId === voice.id;

  return (
    <div
      className={`rounded-lg border transition-all ${
        selected
          ? 'border-violet-500/50 bg-violet-500/10'
          : 'border-violet-500/15 bg-bg-elevated hover:border-violet-500/30'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full p-2.5 pb-0 text-left cursor-pointer bg-transparent border-0"
      >
        <div className={`text-xs font-medium ${
          selected ? 'text-violet-400' : 'text-text-secondary'
        }`}>
          {voice.label}
        </div>
        <div className="text-xs text-text-muted mt-0.5">{voice.desc}</div>
      </button>

      {previewUrl && (
        <div className="px-2.5 pb-2 pt-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlay(voice.id, previewUrl);
            }}
            className={`flex items-center gap-1.5 text-[11px] cursor-pointer bg-transparent border-0 transition-colors ${
              isPlaying ? 'text-violet-400' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {isPlaying ? (
              <>
                <div className="flex items-end gap-[2px] h-3 w-3">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-[3px] rounded-full bg-violet-400"
                      style={{
                        animation: `voiceBar 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
                      }}
                    />
                  ))}
                </div>
                Playing...
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <polygon points="6 3 20 12 6 21" />
                </svg>
                Preview
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export function StyleSelector() {
  const { setup, updateSetup } = useCourseStore();
  const { elevenLabsApiKey } = useApiStore();
  const selectedTheme = setup.themeId || 'midnight';
  const selectedVoice = setup.voiceId || 'ZF6FPAbjXT4488VcRRnw';

  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch voice preview URLs when API key is available
  useEffect(() => {
    if (!elevenLabsApiKey) return;
    let cancelled = false;

    async function fetchPreviews() {
      const urls: Record<string, string> = {};
      await Promise.all(
        VOICE_OPTIONS.map(async (voice) => {
          try {
            const res = await fetch(`https://api.elevenlabs.io/v1/voices/${voice.id}`, {
              headers: { 'xi-api-key': elevenLabsApiKey },
            });
            if (res.ok) {
              const data = await res.json();
              if (data.preview_url) urls[voice.id] = data.preview_url;
            }
          } catch {
            // Silently skip
          }
        })
      );
      if (!cancelled) setPreviewUrls(urls);
    }

    fetchPreviews();
    return () => { cancelled = true; };
  }, [elevenLabsApiKey]);

  const handlePlay = useCallback((voiceId: string, url: string) => {
    if (playingId === voiceId) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }

    audioRef.current?.pause();

    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingId(voiceId);

    audio.onended = () => {
      setPlayingId(null);
      audioRef.current = null;
    };
    audio.onerror = () => {
      setPlayingId(null);
      audioRef.current = null;
    };
    audio.play().catch(() => {
      setPlayingId(null);
      audioRef.current = null;
    });
  }, [playingId]);

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  return (
    <div className="space-y-5">
      <style>{`
        @keyframes voiceBar {
          0% { height: 3px; }
          100% { height: 12px; }
        }
      `}</style>

      <h3 className="text-sm font-medium text-text-primary">Visual Theme</h3>

      <div className="grid grid-cols-2 gap-3">
        {THEMES.map((theme) => (
          <ThemePreviewCard
            key={theme.id}
            theme={theme}
            selected={selectedTheme === theme.id}
            onClick={() => updateSetup({ themeId: theme.id })}
          />
        ))}
      </div>

      {elevenLabsApiKey && (
        <div className="pt-4 border-t border-violet-500/10">
          <h3 className="text-sm font-medium text-text-primary mb-3">Narrator Voice</h3>
          <div className="grid grid-cols-2 gap-2">
            {VOICE_OPTIONS.map((voice) => (
              <VoiceCard
                key={voice.id}
                voice={voice}
                selected={selectedVoice === voice.id}
                previewUrl={previewUrls[voice.id]}
                playingId={playingId}
                onSelect={() => updateSetup({ voiceId: voice.id })}
                onPlay={handlePlay}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
