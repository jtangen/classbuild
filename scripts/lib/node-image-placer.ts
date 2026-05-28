/**
 * Node-compatible counterpart of src/services/openai/imagePlacer.ts.
 * Replaces <figure class="ai-image"> placeholders in chapter HTML with
 * gpt-image-2 renders.
 */
import { generateImageNode } from './node-image';
import { withSafetyClause } from '../../src/services/openai/safetyClause';

const ASPECT_TO_SIZE: Record<string, string> = {
  square: '1024x1024',
  portrait: '1024x1536',
  landscape: '1536x1024',
  'wide-landscape': '2048x1152',
};

interface PlaceholderMatch {
  full: string;
  prompt: string;
  aspect: string;
  caption: string;
}

function findPlaceholders(html: string): PlaceholderMatch[] {
  const figureRegex =
    /<figure\b[^>]*\bclass="ai-image"[^>]*>([\s\S]*?)<\/figure>/gi;
  const matches: PlaceholderMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = figureRegex.exec(html)) !== null) {
    const full = m[0];
    const inner = m[1];
    const promptMatch =
      /data-prompt="([^"]+)"/i.exec(full) ??
      /data-prompt='([^']+)'/i.exec(full);
    const aspectMatch =
      /data-aspect="([^"]+)"/i.exec(full) ??
      /data-aspect='([^']+)'/i.exec(full);
    const captionMatch = /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i.exec(inner);
    if (!promptMatch) continue;
    matches.push({
      full,
      prompt: promptMatch[1],
      aspect: (aspectMatch?.[1] ?? 'landscape').toLowerCase(),
      caption: captionMatch ? captionMatch[1].trim() : '',
    });
  }
  return matches;
}

async function generateWithRetry(
  prompt: string,
  apiKey: string,
  size: string,
  maxRetries = 2,
): Promise<string> {
  const finalPrompt = withSafetyClause(prompt);
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { base64, mimeType } = await generateImageNode(finalPrompt, apiKey, {
        size,
        quality: 'high',
      });
      return `data:${mimeType};base64,${base64}`;
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const transient = /429|rate|quota|5\d\d/i.test(msg);
      if (!transient || attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 4000 * Math.pow(2, attempt)));
    }
  }
  throw lastErr;
}

export async function replaceAiImagePlaceholdersNode(
  html: string,
  apiKey: string,
): Promise<string> {
  const matches = findPlaceholders(html);
  if (matches.length === 0) return html;

  const results: Array<string | null> = [];
  for (const m of matches) {
    const size = ASPECT_TO_SIZE[m.aspect] ?? ASPECT_TO_SIZE.landscape;
    try {
      results.push(await generateWithRetry(m.prompt, apiKey, size));
    } catch {
      results.push(null);
    }
  }

  let out = html;
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const dataUri = results[i];
    // Strip a leading "Fig. N" the model sometimes includes despite the prompt
    // telling it not to — otherwise we end up with "Fig. Fig. 1 …".
    const rawCaption = (m.caption || '')
      .replace(/^\s*(?:Fig(?:ure)?\.?\s*\d+[.:]?\s*)/i, '')
      .trim();
    const figNum = i + 1;
    // Keep the original prompt + aspect on the rendered figure so the SPA's
    // per-image refine flow can pick them up when the user opens the chapter
    // later. (CLI-generated chapters don't refine in-CLI, but the SPA may
    // load and refine them.)
    const figureAttrs = `class="ch-figure" data-image-idx="${i}" data-prompt="${m.prompt.replace(/"/g, '&quot;')}" data-aspect="${m.aspect.replace(/"/g, '&quot;')}"`;
    if (dataUri) {
      // Theme CSS sets a fixed height on .ch-figbox for the empty-state
      // placeholder; with a real image inside we let it grow to fit.
      const replacement = `<figure ${figureAttrs}><div class="ch-figbox" style="height:auto;overflow:visible;"><img src="${dataUri}" alt="${rawCaption.replace(/"/g, '&quot;')}" data-image-idx="${i}" style="display:block;max-width:100%;max-height:75vh;height:auto;width:auto;margin:0 auto;cursor:pointer;"></div>${
        rawCaption
          ? `<figcaption><span class="ch-fig-num">Fig. ${figNum}</span> ${rawCaption}</figcaption>`
          : ''
      }</figure>`;
      out = out.replace(m.full, replacement);
    } else {
      const fallback = `<figure ${figureAttrs}><div class="ch-figbox" style="display:flex;align-items:center;justify-content:center;"><span class="ch-figbox-tag">image unavailable</span></div>${
        rawCaption ? `<figcaption><span class="ch-fig-num">Fig. ${figNum}</span> ${rawCaption}</figcaption>` : ''
      }</figure>`;
      out = out.replace(m.full, fallback);
    }
  }
  return out;
}

// Backwards-compat alias so the older import name still works.
export const replaceGeminiImagePlaceholdersNode = replaceAiImagePlaceholdersNode;
