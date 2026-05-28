/**
 * Node.js wrapper around OpenAI gpt-image-2 — returns raw base64 plus the
 * mime type, leaving the data-URI assembly to the caller.
 */

interface ImageResponse {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string };
}

export interface NodeImageOptions {
  size?: string;
  quality?: 'low' | 'medium' | 'high' | 'auto';
}

export async function generateImageNode(
  prompt: string,
  apiKey: string,
  options: NodeImageOptions = {},
): Promise<{ base64: string; mimeType: string }> {
  const body = {
    model: 'gpt-image-2',
    prompt,
    n: 1,
    size: options.size ?? '1024x1024',
    quality: options.quality ?? 'high',
    output_format: 'jpeg',
    output_compression: 90,
  };

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const errBody = (await res.json()) as ImageResponse;
      detail = errBody.error?.message ?? '';
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new Error(`OpenAI image API ${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as ImageResponse;
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('OpenAI returned no image data.');
  }
  return { base64: b64, mimeType: 'image/jpeg' };
}

/** Backwards-compat alias for the previous helper name. */
export const generateInfographicNode = generateImageNode;
