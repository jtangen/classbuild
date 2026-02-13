/**
 * Replaces <figure class="gemini-image" data-prompt="..."> placeholders in chapter HTML
 * with AI-generated images from Gemini.
 */
import { generateInfographic } from './imageGen';

async function generateWithRetry(prompt: string, apiKey: string, maxRetries = 3): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await generateInfographic(prompt, apiKey);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isQuota = /quota|rate|429|resource.*exhausted/i.test(msg);
      if (!isQuota || attempt === maxRetries) throw err;
      // Exponential backoff: 5s, 10s, 20s
      await new Promise(r => setTimeout(r, 5000 * Math.pow(2, attempt)));
    }
  }
  throw new Error('Gemini retry exhausted');
}

export async function replaceGeminiImagePlaceholders(html: string, apiKey: string): Promise<string> {
  const placeholderRegex = /<figure\s+class="gemini-image"\s+data-prompt="([^"]+)">\s*<figcaption>([^<]*)<\/figcaption>\s*<\/figure>/g;
  const matches: Array<{ full: string; prompt: string; caption: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = placeholderRegex.exec(html)) !== null) {
    matches.push({ full: m[0], prompt: m[1], caption: m[2] });
  }
  if (matches.length === 0) return html;

  // Generate images sequentially to avoid hitting Gemini rate limits
  const results: Array<{ status: 'fulfilled'; value: string } | { status: 'rejected' }> = [];
  for (const { prompt } of matches) {
    try {
      const value = await generateWithRetry(prompt, apiKey);
      results.push({ status: 'fulfilled', value });
    } catch {
      results.push({ status: 'rejected' });
    }
  }

  let result = html;
  for (let i = 0; i < matches.length; i++) {
    const r = results[i];
    if (r.status === 'fulfilled') {
      const replacement = `<figure style="margin:2rem 0;text-align:center"><img src="${r.value}" alt="${matches[i].caption}" style="max-width:100%;border-radius:12px;"><figcaption style="margin-top:0.5rem;font-size:0.85rem;color:#94a3b8;font-style:italic">${matches[i].caption}</figcaption></figure>`;
      result = result.replace(matches[i].full, replacement);
    } else {
      const fallback = `<figure style="margin:2rem 0;text-align:center;padding:2rem;border:1px dashed #4a4a6a;border-radius:12px"><figcaption style="font-size:0.85rem;color:#94a3b8;font-style:italic">${matches[i].caption}</figcaption></figure>`;
      result = result.replace(matches[i].full, fallback);
    }
  }
  return result;
}
