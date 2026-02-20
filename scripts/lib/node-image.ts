/**
 * Node.js Gemini image generation — skips browser canvas compression,
 * saves raw PNG base64 directly.
 */

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  thought?: boolean;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: { message: string };
}

/**
 * Generate an infographic using Gemini's image generation model.
 * Returns raw base64 image data (no data URI prefix).
 */
export async function generateInfographicNode(
  prompt: string,
  apiKey: string,
): Promise<{ base64: string; mimeType: string }> {
  const model = 'gemini-3-pro-image-preview';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errBody.slice(0, 200)}`);
  }

  const data: GeminiResponse = await res.json();

  if (data.error) {
    throw new Error(`Gemini error: ${data.error.message}`);
  }

  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts || parts.length === 0) {
    throw new Error('Gemini returned no content');
  }

  // Find the last non-thought image part
  let imagePart: GeminiPart | undefined;
  for (const part of parts) {
    if (part.inlineData && !part.thought) {
      imagePart = part;
    }
  }

  if (!imagePart?.inlineData) {
    throw new Error('Gemini returned no image');
  }

  return {
    base64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType,
  };
}
