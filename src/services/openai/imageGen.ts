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
  /** Cancels the request (and any pending retry). */
  signal?: AbortSignal;
}

const DEFAULT_QUALITY: ImageQuality = 'high';
const DEFAULT_SIZE = 'auto';
const DEFAULT_COMPRESSION = 90;
const ENDPOINT = 'https://api.openai.com/v1/images/generations';
const MODEL = 'gpt-image-2';

export class OpenAIImageError extends Error {
  readonly status: number | undefined;
  /** Server-requested wait before retrying (Retry-After), when it sent one. */
  readonly retryAfterMs: number | undefined;

  constructor(message: string, status?: number, retryAfterMs?: number) {
    super(message);
    this.name = 'OpenAIImageError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * True for failures a retry can fix: rate limits and 5xx. A 429 that reports
 * exhausted quota / billing / credit is permanent, so it isn't retried.
 */
export function isTransientImageError(err: unknown): boolean {
  if (!(err instanceof OpenAIImageError) || err.status === undefined) return false;
  if (err.status === 429) return !/quota|billing|credit/i.test(err.message);
  return err.status >= 500;
}

/** Retry-After / retry-after-ms → milliseconds, if the response carries one. */
function readRetryAfterMs(res: Response): number | undefined {
  const ms = Number(res.headers.get('retry-after-ms'));
  if (Number.isFinite(ms) && ms > 0) return ms;
  const header = res.headers.get('retry-after');
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
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
    signal: options.signal,
  });

  if (!res.ok) {
    // Read the body once as text, then try JSON — a body can't be read twice,
    // so a json()-then-text() fallback never sees non-JSON error pages.
    const raw = await res.text().catch(() => '');
    let detail = raw;
    try {
      detail = (JSON.parse(raw) as GenerateResponse).error?.message ?? '';
    } catch {
      /* not JSON (e.g. a gateway error page) — keep the raw body */
    }
    throw new OpenAIImageError(
      `OpenAI image generation failed (${res.status}): ${detail.slice(0, 300) || res.statusText}`,
      res.status,
      readRetryAfterMs(res),
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
 * 5xx and 429 retry; everything else fails fast. A 429 waits for the server's
 * Retry-After when it sends one, otherwise 20 s then 40 s — image limits are
 * per minute, so a few seconds of backoff just collects more 429s.
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
      if (options.signal?.aborted) throw err;
      if (!isTransientImageError(err) || attempt === maxRetries) throw err;
      const { status, retryAfterMs } = err as OpenAIImageError;
      const delay =
        status === 429
          ? Math.min(retryAfterMs ?? 20000 * Math.pow(2, attempt), 120000)
          : 4000 * Math.pow(2, attempt);
      await abortableDelay(delay, options.signal);
    }
  }
  throw lastErr;
}

/** setTimeout that rejects as soon as `signal` aborts. */
function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const id = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(id);
      reject(signal!.reason);
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
