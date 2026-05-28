/**
 * Replace `<figure class="ai-image">` placeholders in chapter HTML with
 * actual generated images from OpenAI gpt-image-2. The chapter prompt
 * instructs the model to emit a `data-prompt` attribute and an optional
 * `data-aspect` ("square" | "portrait" | "landscape") which we map to an
 * aspect-ratio-correct size.
 *
 * Placeholders that fail to generate fall back to a hairline-bordered
 * placeholder so the reading still flows.
 */

import { generateImageWithRetry } from './imageGen';
import { withSafetyClause } from './safetyClause';

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

/** Tolerant of attribute order — caption may appear anywhere in the figure. */
function findPlaceholders(html: string): PlaceholderMatch[] {
  // Match the entire <figure …> … </figure> for class="ai-image".
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

export async function replaceAiImagePlaceholders(
  html: string,
  apiKey: string,
  options?: {
    /** Tighten the prompt with extra context (e.g. chapter theme). */
    enhancePrompt?: (raw: string, aspect: string) => string;
    /** Image quality. Defaults to 'high'. */
    quality?: 'low' | 'medium' | 'high' | 'auto';
  },
): Promise<string> {
  const matches = findPlaceholders(html);
  if (matches.length === 0) return html;

  // Generate in parallel — gpt-image-2 is async and the OpenAI API supports
  // concurrent requests. Capped at 3 in flight to be a good citizen.
  const results: Array<string | null> = await runWithConcurrency(
    matches.map((m) => async () => {
      try {
        const size = ASPECT_TO_SIZE[m.aspect] ?? ASPECT_TO_SIZE.landscape;
        const enhanced = options?.enhancePrompt
          ? options.enhancePrompt(m.prompt, m.aspect)
          : m.prompt;
        const finalPrompt = withSafetyClause(enhanced);
        return await generateImageWithRetry(finalPrompt, apiKey, {
          size,
          quality: options?.quality ?? 'high',
        });
      } catch {
        return null;
      }
    }),
    3,
  );

  let out = html;
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const dataUri = results[i];
    // The model is told not to include its own figure numbering, but it
    // sometimes does anyway ("Fig. 1 Caption text"). Strip a leading
    // "Fig. N" / "Figure N" so we never end up with "Fig. Fig. 1 …".
    const rawCaption = (m.caption || '').replace(
      /^\s*(?:Fig(?:ure)?\.?\s*\d+[.:]?\s*)/i,
      '',
    ).trim();
    // Auto-number per chapter: i is 0-indexed, captions read "Fig. 1", "Fig. 2", …
    const figNum = i + 1;
    // Keep the original prompt + aspect on the rendered figure so the
    // per-image refine flow (BuildPage) can read them back, let the user
    // tweak the prompt, and regenerate just this one image.
    const figureAttrs = `class="ch-figure" data-image-idx="${i}" data-prompt="${escapeAttr(m.prompt)}" data-aspect="${escapeAttr(m.aspect)}"`;
    if (dataUri) {
      // Theme CSS sets a fixed height (170–280px) on .ch-figbox for the
      // empty-state cream placeholder. With a real image inside, we need to
      // un-fix the height so the image renders at its natural aspect ratio,
      // capped by max-height so portrait crops don't dominate the scroll.
      const replacement = `<figure ${figureAttrs}><div class="ch-figbox" style="height:auto;overflow:visible;"><img src="${dataUri}" alt="${escapeAttr(rawCaption)}" data-image-idx="${i}" style="display:block;max-width:100%;max-height:75vh;height:auto;width:auto;margin:0 auto;cursor:pointer;"></div>${
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

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const i = cursor++;
      results[i] = await tasks[i]();
    }
  }
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}
