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
  /** [start, end) of the placeholder in the source HTML. */
  start: number;
  end: number;
  /** Attribute values, entity-decoded (plain text). */
  prompt: string;
  aspect: string;
  /** Inner HTML of the figcaption, as written. */
  caption: string;
}

/** Start of any <figure> opening tag (up to its first '>'). */
const FIGURE_OPEN = /<figure\b[^>]*>/gi;
/** The same tag read quote-aware (sticky), so a '>' inside an attribute value
 *  — prompts say things like 'ESTIMATE > v*' — doesn't end it. Quoted values
 *  may not contain '<', so an unbalanced quote can't run past the next tag;
 *  then the plain first-'>' reading above is used instead. */
const FIGURE_OPEN_QUOTED = /<figure\b(?:[^<>"']|"[^"<]*"|'[^'<]*')*>/iy;
/** Whichever comes first after a placeholder opens: its close or a new figure. */
const FIGURE_EDGE = /<\/figure\s*>|<figure\b/gi;
/** A <figcaption> directly after an opening tag (sticky). */
const FIGCAPTION_AT = /\s*<figcaption\b[^>]*>[\s\S]*?<\/figcaption\s*>/iy;

/** Tolerant of attribute order — caption may appear anywhere in the figure. */
function findPlaceholders(html: string): PlaceholderMatch[] {
  const matches: PlaceholderMatch[] = [];
  const open = new RegExp(FIGURE_OPEN.source, 'gi');
  const quoted = new RegExp(FIGURE_OPEN_QUOTED.source, 'iy');
  let m: RegExpExecArray | null;
  while ((m = open.exec(html)) !== null) {
    quoted.lastIndex = m.index;
    const tag = quoted.exec(html)?.[0] ?? m[0];
    if (!/\bclass="ai-image"/i.test(tag)) continue;
    const bodyStart = m.index + tag.length;
    let end = bodyStart;
    let inner = '';
    let closed = false;
    if (!/\/\s*>$/.test(tag)) {
      const edge = new RegExp(FIGURE_EDGE.source, 'gi');
      edge.lastIndex = bodyStart;
      const e = edge.exec(html);
      if (e && e[0][1] === '/') {
        inner = html.slice(bodyStart, e.index);
        end = e.index + e[0].length;
        closed = true;
      }
    }
    if (!closed) {
      // Self-closing (`<figure … />`) or never closed: claim only a caption
      // that directly follows, never the reading after it — a lazy match to
      // the next </figure> would replace whole sections with the image.
      const cap = new RegExp(FIGCAPTION_AT.source, 'iy');
      cap.lastIndex = bodyStart;
      const c = cap.exec(html);
      if (c && !/<figure\b/i.test(c[0])) {
        inner = c[0];
        end = bodyStart + c[0].length;
      }
    }
    open.lastIndex = end;
    const full = html.slice(m.index, end);
    const promptMatch =
      /data-prompt="([^"]+)"/i.exec(full) ??
      /data-prompt='([^']+)'/i.exec(full);
    const aspectMatch =
      /data-aspect="([^"]+)"/i.exec(full) ??
      /data-aspect='([^']+)'/i.exec(full);
    const captionMatch = /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i.exec(inner);
    if (!promptMatch) continue;
    matches.push({
      start: m.index,
      end,
      prompt: decodeEntities(promptMatch[1]),
      aspect: decodeEntities(aspectMatch?.[1] ?? 'landscape').toLowerCase(),
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
    /** Cancels every in-flight render; the call then rejects with the abort. */
    signal?: AbortSignal;
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
          signal: options?.signal,
        });
      } catch (err) {
        // A Stop isn't a failed render — don't paper over it with a fallback.
        if (options?.signal?.aborted) throw err;
        return null;
      }
    }),
    3,
  );

  // Rebuild by position (placeholders are in order and don't overlap) rather
  // than String.replace — model text in captions/prompts may contain `$'`,
  // `$&` etc., which replace() would expand into chunks of the chapter.
  let out = '';
  let cursor = 0;
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
    // m.prompt / m.aspect are decoded text, so they're encoded exactly once.
    const figureAttrs = `class="ch-figure" data-image-idx="${i}" data-prompt="${escapeAttr(m.prompt)}" data-aspect="${escapeAttr(m.aspect)}"`;
    let replacement: string;
    if (dataUri) {
      // Theme CSS sets a fixed height (170–280px) on .ch-figbox for the
      // empty-state cream placeholder. With a real image inside, we need to
      // un-fix the height so the image renders at its natural aspect ratio,
      // capped by max-height so portrait crops don't dominate the scroll.
      // The caption is HTML; alt wants its plain text.
      const altText = decodeEntities(rawCaption.replace(/<[^>]*>/g, ''));
      replacement = `<figure ${figureAttrs}><div class="ch-figbox" style="height:auto;overflow:visible;"><img src="${dataUri}" alt="${escapeAttr(altText)}" data-image-idx="${i}" style="display:block;max-width:100%;max-height:75vh;height:auto;width:auto;margin:0 auto;cursor:pointer;"></div>${
        rawCaption
          ? `<figcaption><span class="ch-fig-num">Fig. ${figNum}</span> ${rawCaption}</figcaption>`
          : ''
      }</figure>`;
    } else {
      replacement = `<figure ${figureAttrs}><div class="ch-figbox" style="display:flex;align-items:center;justify-content:center;"><span class="ch-figbox-tag">image unavailable</span></div>${
        rawCaption ? `<figcaption><span class="ch-fig-num">Fig. ${figNum}</span> ${rawCaption}</figcaption>` : ''
      }</figure>`;
    }
    out += html.slice(cursor, m.start) + replacement;
    cursor = m.end;
  }
  return out + html.slice(cursor);
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: '\u00a0',
  mdash: '\u2014', ndash: '\u2013', hellip: '\u2026', middot: '\u00b7',
  lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201c', rdquo: '\u201d',
  times: '\u00d7', rarr: '\u2192', larr: '\u2190', deg: '\u00b0',
};

/** Decode the character references an attribute value may carry, in one
 *  pass — so "&amp;quot;" becomes the literal text "&quot;", not '"'. Unknown
 *  named references are left as written. */
function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (ref, name: string) => {
    if (name[0] === '#') {
      const code = /^#x/i.test(name) ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ref;
    }
    return NAMED_ENTITIES[name.toLowerCase()] ?? ref;
  });
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
