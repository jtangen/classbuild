/**
 * ElevenLabs text-to-speech service.
 *
 * ElevenLabs returns native MP3 at 44.1 kHz, so there's no PCM-to-WAV
 * gymnastics like the previous Gemini integration. Long transcripts are
 * still chunked — eleven_multilingual_v2 handles up to ~5000 characters
 * per request reliably — but each chunk's MP3 output can be concatenated
 * directly (frame-aligned) into a single blob.
 *
 * Concatenating raw MP3 frames works because every chunk is encoded at
 * the same sample rate and bitrate. Browsers and FFmpeg tolerate the
 * extra ID3v2 / Xing headers that may appear at chunk boundaries.
 */

const API_BASE = 'https://api.elevenlabs.io/v1';
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';
const DEFAULT_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9'; // Daniel — British male narration

const MAX_CHUNK_CHARS = 4500;
const MAX_ATTEMPTS = 3;

export class ElevenLabsTtsError extends Error {
  readonly status: number | undefined;
  readonly detail: string | undefined;

  constructor(message: string, status?: number, detail?: string) {
    super(message);
    this.name = 'ElevenLabsTtsError';
    this.status = status;
    this.detail = detail;
  }
}

export interface TtsOptions {
  /** ElevenLabs voice id (e.g. 'onwK4e9ZLuTAKqWW03F9'). */
  voiceId?: string;
  /** ElevenLabs model id. Defaults to `eleven_multilingual_v2`. */
  modelId?: string;
  /** Voice settings — defaults tuned for long-form narration. */
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  /** Called after each chunk with (completed, total) for UI progress. */
  onProgress?: (current: number, total: number) => void;
}

function chunkText(text: string): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (current && current.length + 2 + trimmed.length > MAX_CHUNK_CHARS) {
      chunks.push(current.trim());
      current = '';
    }

    if (trimmed.length > MAX_CHUNK_CHARS) {
      if (current) {
        chunks.push(current.trim());
        current = '';
      }
      const sentences = trimmed.match(/[^.!?]+[.!?]+[\s]*/g) || [trimmed];
      let sentenceChunk = '';
      for (const sentence of sentences) {
        if (sentenceChunk && sentenceChunk.length + sentence.length > MAX_CHUNK_CHARS) {
          chunks.push(sentenceChunk.trim());
          sentenceChunk = '';
        }
        sentenceChunk += sentence;
      }
      if (sentenceChunk.trim()) current = sentenceChunk;
    } else {
      current += (current ? '\n\n' : '') + trimmed;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function synthesizeChunk(
  text: string,
  apiKey: string,
  voiceId: string,
  modelId: string,
  voiceSettings: Record<string, number | boolean>,
): Promise<Uint8Array> {
  const url = `${API_BASE}/text-to-speech/${encodeURIComponent(voiceId)}`;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: voiceSettings,
        }),
      });
    } catch (err) {
      // A REJECTED fetch (vs an HTTP error response, handled below) means the
      // request never reached ElevenLabs. ElevenLabs allows direct browser
      // calls — its TTS endpoint returns permissive CORS — so this is almost
      // always a *local* block of api.elevenlabs.io (a content/ad/privacy
      // blocker, browser extension, VPN, or iCloud Private Relay), not a
      // transient blip. Don't burn retries on a non-transient block; fail fast
      // with guidance that points at the real, user-fixable cause. (No status
      // is attached, which is how the caller knows to show this verbatim rather
      // than running it through friendlyError.)
      throw new ElevenLabsTtsError(
        `Couldn't reach ElevenLabs — the request to api.elevenlabs.io was blocked before it got a response. ` +
          `This isn't your API key or ElevenLabs itself (it allows direct browser calls). The usual cause is ` +
          `something on your device or network blocking that domain: a content/ad/privacy blocker or browser ` +
          `extension, a VPN, or iCloud Private Relay. Try disabling content blockers and "Prevent Cross-Site ` +
          `Tracking" for this site, turning off any VPN/Private Relay, or switching browser or network. ` +
          `(Underlying: ${err instanceof Error ? err.message : String(err)})`,
      );
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      // Retry transient 5xx / 429; everything else fails fast.
      if ((res.status === 429 || res.status >= 500) && attempt < MAX_ATTEMPTS) {
        await sleep(1500 * attempt);
        continue;
      }
      throw new ElevenLabsTtsError(
        `ElevenLabs returned ${res.status}: ${detail.slice(0, 300)}`,
        res.status,
        detail,
      );
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0) {
      if (attempt < MAX_ATTEMPTS) {
        await sleep(500 * attempt);
        continue;
      }
      throw new ElevenLabsTtsError('ElevenLabs returned an empty audio payload.');
    }
    return new Uint8Array(buf);
  }

  throw new ElevenLabsTtsError('ElevenLabs TTS failed for unknown reason.');
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/**
 * Generate an MP3 audiobook blob from text via ElevenLabs.
 * Automatically chunks long transcripts; chunks are concatenated raw.
 */
export async function generateAudiobook(
  text: string,
  apiKey: string,
  options?: TtsOptions,
): Promise<Blob> {
  if (!text.trim()) {
    throw new ElevenLabsTtsError('Cannot generate audio from empty text.');
  }
  if (!apiKey.trim()) {
    throw new ElevenLabsTtsError('ElevenLabs API key is required.');
  }

  const voiceId = options?.voiceId?.trim() || DEFAULT_VOICE_ID;
  const modelId = options?.modelId?.trim() || DEFAULT_MODEL_ID;
  const voiceSettings: Record<string, number | boolean> = {
    stability: options?.stability ?? 0.4,
    similarity_boost: options?.similarityBoost ?? 0.8,
    style: options?.style ?? 0,
    use_speaker_boost: options?.useSpeakerBoost ?? true,
  };

  const chunks = chunkText(text);
  const audioChunks: Uint8Array[] = [];

  for (let i = 0; i < chunks.length; i++) {
    options?.onProgress?.(i + 1, chunks.length);
    const audio = await synthesizeChunk(
      chunks[i],
      apiKey,
      voiceId,
      modelId,
      voiceSettings,
    );
    audioChunks.push(audio);
  }

  const mp3 = concatBytes(audioChunks);
  return new Blob([mp3 as unknown as BlobPart], { type: 'audio/mpeg' });
}

/**
 * Return the raw MP3 bytes for one short line of preview text. Used by the
 * voice picker's preview button. Falls back to the model default voice if
 * the requested voice id is not allowed for the user's account.
 */
export async function generateVoicePreview(
  apiKey: string,
  voiceId: string,
  text = 'ClassBuild turns a topic description into a complete university course.',
): Promise<Blob> {
  const audio = await synthesizeChunk(
    text,
    apiKey,
    voiceId,
    DEFAULT_MODEL_ID,
    {
      stability: 0.4,
      similarity_boost: 0.8,
      style: 0,
      use_speaker_boost: true,
    },
  );
  return new Blob([audio as unknown as BlobPart], { type: 'audio/mpeg' });
}
