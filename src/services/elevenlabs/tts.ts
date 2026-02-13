const ELEVENLABS_TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const DEFAULT_VOICE_ID = 'ZF6FPAbjXT4488VcRRnw'; // Amelia — friendly, approachable guide
const DEFAULT_MODEL_ID = 'eleven_v3';
const MAX_CHUNK_CHARS = 2800; // Stay under 3000 limit with margin

export class ElevenLabsError extends Error {
  readonly status: number | undefined;
  readonly detail: string | undefined;

  constructor(message: string, status?: number, detail?: string) {
    super(message);
    this.name = 'ElevenLabsError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Split text into chunks under MAX_CHUNK_CHARS, respecting paragraph and sentence boundaries.
 */
function chunkText(text: string): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // If adding this paragraph would exceed limit, flush current
    if (current && (current.length + 2 + trimmed.length) > MAX_CHUNK_CHARS) {
      chunks.push(current.trim());
      current = '';
    }

    // If single paragraph exceeds limit, split on sentences
    if (trimmed.length > MAX_CHUNK_CHARS) {
      if (current) {
        chunks.push(current.trim());
        current = '';
      }
      const sentences = trimmed.match(/[^.!?]+[.!?]+[\s]*/g) || [trimmed];
      let sentenceChunk = '';
      for (const sentence of sentences) {
        if (sentenceChunk && (sentenceChunk.length + sentence.length) > MAX_CHUNK_CHARS) {
          chunks.push(sentenceChunk.trim());
          sentenceChunk = '';
        }
        sentenceChunk += sentence;
      }
      if (sentenceChunk.trim()) {
        current = sentenceChunk;
      }
    } else {
      current += (current ? '\n\n' : '') + trimmed;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

/**
 * Generate audio for a single chunk via the ElevenLabs TTS API.
 */
async function synthesizeChunk(
  text: string,
  apiKey: string,
  voiceId: string,
  modelId: string,
): Promise<ArrayBuffer> {
  const url = `${ELEVENLABS_TTS_URL}/${voiceId}`;

  const body = {
    text,
    model_id: modelId,
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
    },
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new ElevenLabsError(
      `Network error calling ElevenLabs API: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    let detail = '';
    try {
      const respBody = await response.json();
      detail = respBody?.detail?.message ?? respBody?.detail ?? JSON.stringify(respBody);
    } catch {
      detail = await response.text().catch(() => 'Unknown error');
    }
    throw new ElevenLabsError(
      `ElevenLabs API returned ${response.status}: ${detail}`,
      response.status,
      detail,
    );
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0) {
    throw new ElevenLabsError('ElevenLabs API returned an empty audio response.');
  }

  return buffer;
}

/**
 * Generate an audiobook MP3 blob from text using the ElevenLabs TTS API.
 * Automatically chunks long text and concatenates MP3 buffers.
 *
 * @param text       - The transcript text to synthesize.
 * @param apiKey     - ElevenLabs API key.
 * @param options    - Optional overrides for voice ID, model ID, and progress callback.
 * @returns An audio/mpeg Blob containing the synthesized speech.
 */
export async function generateAudiobook(
  text: string,
  apiKey: string,
  options?: {
    voiceId?: string;
    modelId?: string;
    onProgress?: (current: number, total: number) => void;
  },
): Promise<Blob> {
  const voiceId = options?.voiceId ?? DEFAULT_VOICE_ID;
  const modelId = options?.modelId ?? DEFAULT_MODEL_ID;

  if (!text.trim()) {
    throw new ElevenLabsError('Cannot generate audio from empty text.');
  }

  if (!apiKey.trim()) {
    throw new ElevenLabsError('ElevenLabs API key is required.');
  }

  const chunks = chunkText(text);
  const audioBuffers: ArrayBuffer[] = [];

  for (let i = 0; i < chunks.length; i++) {
    options?.onProgress?.(i + 1, chunks.length);

    const buffer = await synthesizeChunk(chunks[i], apiKey, voiceId, modelId);
    audioBuffers.push(buffer);
  }

  // MP3 frames are independently decodable — simple concatenation works
  const combinedBlob = new Blob(audioBuffers, { type: 'audio/mpeg' });
  if (combinedBlob.size === 0) {
    throw new ElevenLabsError('Audio generation produced no output.');
  }

  return combinedBlob;
}
