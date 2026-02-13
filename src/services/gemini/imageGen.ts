/**
 * Gemini image generation service for educational infographics.
 * Uses Gemini 3 Pro Image for text+image output.
 */

/**
 * Compress a base64 PNG to JPEG using canvas.
 * Returns a data:image/jpeg;base64,... URI.
 */
function compressToJpeg(base64Png: string, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = `data:image/png;base64,${base64Png}`;
  });
}

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
 * Returns a data:image/jpeg;base64,... URI.
 */
export async function generateInfographic(
  prompt: string,
  apiKey: string,
): Promise<string> {
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

  // Compress PNG to JPEG for smaller storage
  const base64 = imagePart.inlineData.data;
  const mimeType = imagePart.inlineData.mimeType;

  if (mimeType.includes('png')) {
    return await compressToJpeg(base64);
  }

  // Already JPEG or other format — return as-is
  return `data:${mimeType};base64,${base64}`;
}
