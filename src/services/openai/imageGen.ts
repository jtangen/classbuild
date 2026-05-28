/**
 * OpenAI gpt-image-2 image generation.
 *
 * Calls the Image API (`/v1/images/generations`) directly — no SDK to keep
 * the bundle lean — and returns a `data:image/jpeg;base64,…` URI ready for
 * `<img src>`. JPEG output is requested explicitly because it's both faster
 * to generate and dramatically smaller than PNG for photographic content.
 */

export type ImageQuality = 'low' | 'medium' | 'high' | 'auto';

export interface GenerateImageOptions {
  /** Width × height in pixels, e.g. '1024x1024', '3840x2160'. Defaults to 'auto'. */
  size?: string;
  /** Defaults to 'high' — these images are user-facing artifacts. */
  quality?: ImageQuality;
  /** JPEG compression 0-100. Defaults to 90. */
  compression?: number;
}

const DEFAULT_QUALITY: ImageQuality = 'high';
const DEFAULT_SIZE = 'auto';
const DEFAULT_COMPRESSION = 90;
const ENDPOINT = 'https://api.openai.com/v1/images/generations';
const MODEL = 'gpt-image-2';

export class OpenAIImageError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'OpenAIImageError';
    this.status = status;
  }
}

interface GenerateResponse {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string; type?: string };
}

export async function generateImage(
  prompt: string,
  apiKey: string,
  options: GenerateImageOptions = {},
): Promise<string> {
  if (!prompt.trim()) {
    throw new OpenAIImageError('Cannot generate an image from an empty prompt.');
  }
  if (!apiKey.trim()) {
    throw new OpenAIImageError('OpenAI API key is required.');
  }

  const body = {
    model: MODEL,
    prompt,
    n: 1,
    size: options.size ?? DEFAULT_SIZE,
    quality: options.quality ?? DEFAULT_QUALITY,
    output_format: 'jpeg' as const,
    output_compression: options.compression ?? DEFAULT_COMPRESSION,
  };

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const errBody = (await res.json()) as GenerateResponse;
      detail = errBody.error?.message ?? '';
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new OpenAIImageError(
      `OpenAI image generation failed (${res.status}): ${detail.slice(0, 300) || res.statusText}`,
      res.status,
    );
  }

  const json = (await res.json()) as GenerateResponse;
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) {
    throw new OpenAIImageError('OpenAI returned no image data.');
  }
  return `data:image/jpeg;base64,${b64}`;
}

/**
 * Generate an image with exponential backoff on rate-limit / transient errors.
 * 5xx and 429 retry; everything else fails fast.
 */
export async function generateImageWithRetry(
  prompt: string,
  apiKey: string,
  options: GenerateImageOptions = {},
  maxRetries = 2,
): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await generateImage(prompt, apiKey, options);
    } catch (err) {
      lastErr = err;
      const status = err instanceof OpenAIImageError ? err.status : undefined;
      const transient = status === 429 || (status !== undefined && status >= 500);
      if (!transient || attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 4000 * Math.pow(2, attempt)));
    }
  }
  throw lastErr;
}
