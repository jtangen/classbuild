/**
 * Node-compatible counterpart of src/services/openai/imagePlacer.ts.
 * Replaces <figure class="ai-image"> placeholders in chapter HTML with
 * gpt-image-2 renders.
 */
import { generateImageNodeWithRetry } from './node-image';
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

// An opening <figure …> tag; quote-aware so a ">" inside data-prompt doesn't end it.
const FIGURE_OPEN_RE = /<figure\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;

// Reading markup that never belongs inside a placeholder. If any of it appears
// before the next </figure>, the placeholder was self-closed or left open, and
// matching up to that </figure> would swallow reading text.
const READING_BLOCK_RE =
  /<(?:p|h[1-6]|figure|section|article|aside|ul|ol|table|blockquote|script)\b|<div\b[^>]*\bclass="ch-widget/i;

function findPlaceholders(html: string): PlaceholderMatch[] {
  const matches: PlaceholderMatch[] = [];
  FIGURE_OPEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FIGURE_OPEN_RE.exec(html)) !== null) {
    const open = m[0];
    if (!/\bclass="ai-image"/i.test(open)) continue;
    const rest = html.slice(m.index + open.length);
    let full = open;
    let inner = '';
    if (!/\/\s*>$/.test(open)) {
      const close = /<\/figure\s*>/i.exec(rest);
      const body = close ? rest.slice(0, close.index) : null;
      if (close && body !== null && !READING_BLOCK_RE.test(body)) {
        inner = body;
        full = open + body + close[0];
      } else {
        // Self-closed or unclosed: take the tag plus a directly following
        // <figcaption>, and leave the reading text after it alone.
        const cap = /^\s*<figcaption\b[^>]*>[\s\S]*?<\/figcaption>/i.exec(rest);
        if (cap) {
          inner = cap[0];
          full = open + cap[0];
        }
      }
    }
    FIGURE_OPEN_RE.lastIndex = m.index + full.length;

    const promptMatch =
      /data-prompt="([^"]+)"/i.exec(open) ??
      /data-prompt='([^']+)'/i.exec(open);
    const aspectMatch =
      /data-aspect="([^"]+)"/i.exec(open) ??
      /data-aspect='([^']+)'/i.exec(open);
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
): Promise<string> {
  const { base64, mimeType } = await generateImageNodeWithRetry(withSafetyClause(prompt), apiKey, {
    size,
    quality: 'high',
  });
  return `data:${mimeType};base64,${base64}`;
}

/**
 * @param onFailure called once per figure that could not be rendered (it is
 *   left as an "image unavailable" box), so the caller can report the failure.
 */
export async function replaceAiImagePlaceholdersNode(
  html: string,
  apiKey: string,
  onFailure?: (message: string) => void,
): Promise<string> {
  const matches = findPlaceholders(html);
  if (matches.length === 0) return html;

  const results: Array<string | null> = [];
  for (const [i, m] of matches.entries()) {
    const size = ASPECT_TO_SIZE[m.aspect] ?? ASPECT_TO_SIZE.landscape;
    try {
      results.push(await generateWithRetry(m.prompt, apiKey, size));
    } catch (err) {
      results.push(null);
      onFailure?.(`Figure ${i + 1} render failed: ${err instanceof Error ? err.message : String(err)}`);
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
    // Replacements go through a function so "$&", "$'" etc. in model-written
    // prompts and captions are inserted literally, not as replace() patterns.
    if (dataUri) {
      // Theme CSS sets a fixed height on .ch-figbox for the empty-state
      // placeholder; with a real image inside we let it grow to fit.
      const replacement = `<figure ${figureAttrs}><div class="ch-figbox" style="height:auto;overflow:visible;"><img src="${dataUri}" alt="${rawCaption.replace(/"/g, '&quot;')}" data-image-idx="${i}" style="display:block;max-width:100%;max-height:75vh;height:auto;width:auto;margin:0 auto;cursor:pointer;"></div>${
        rawCaption
          ? `<figcaption><span class="ch-fig-num">Fig. ${figNum}</span> ${rawCaption}</figcaption>`
          : ''
      }</figure>`;
      out = out.replace(m.full, () => replacement);
    } else {
      const fallback = `<figure ${figureAttrs}><div class="ch-figbox" style="display:flex;align-items:center;justify-content:center;"><span class="ch-figbox-tag">image unavailable</span></div>${
        rawCaption ? `<figcaption><span class="ch-fig-num">Fig. ${figNum}</span> ${rawCaption}</figcaption>` : ''
      }</figure>`;
      out = out.replace(m.full, () => fallback);
    }
  }
  return out;
}
