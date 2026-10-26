/**
 * String helpers shared between the web app (BuildPage) and the headless CLI
 * (scripts/generate-course.ts). Kept deliberately small and side-effect-free
 * so both entry points can import cheaply.
 */

/** Lowercase, hyphenate, clip to 40 chars. For filenames and URL slugs. */
export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

/**
 * Extract chapter HTML from a Claude response. Handles three formats:
 *
 *  1. NEW contract (current chapter prompt): `<article class="ch">…</article>`
 *     plus any trailing `<script>` blocks for widget logic. Returned as a
 *     fragment — the wrapping `<!DOCTYPE html>` envelope is added by
 *     `wrapChapterHtml` from `src/themes/themes.config.ts`.
 *
 *  2. LEGACY full document (chapters generated under the old prompt):
 *     `<!DOCTYPE html>…</html>`. Returned as-is so existing courseStore
 *     entries keep rendering.
 *
 *  3. Either of the above wrapped in a ```html fence, or surrounded by
 *     incidental prose. The wrapper is stripped.
 */
export function extractHtml(text: string): string {
  const fenced = text.match(/```html\s*\n?([\s\S]*?)\n?```/);
  const body = fenced ? fenced[1] : text;
  const trimmed = body.trim();

  // Legacy full HTML document.
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
    const endHtml = trimmed.lastIndexOf('</html>');
    return endHtml !== -1 ? trimmed.slice(0, endHtml + 7) : trimmed;
  }

  // New contract: starts with <article class="ch">.
  const articleStart = body.indexOf('<article');
  if (articleStart !== -1) {
    // Extend to the last </script> (widgets) or </article> (no widgets).
    const lastScript = body.lastIndexOf('</script>');
    const lastArticle = body.lastIndexOf('</article>');
    const endIdx = Math.max(lastScript === -1 ? -1 : lastScript + 9, lastArticle === -1 ? -1 : lastArticle + 10);
    if (endIdx > articleStart) return body.slice(articleStart, endIdx);
    return body.slice(articleStart);
  }

  // Fallback: legacy doc somewhere mid-response.
  const docIdx = body.indexOf('<!DOCTYPE');
  const htmlIdx = body.indexOf('<html');
  const startIdx = docIdx !== -1 ? docIdx : htmlIdx;
  if (startIdx !== -1) {
    const endIdx = body.lastIndexOf('</html>');
    if (endIdx !== -1) return body.slice(startIdx, endIdx + 7);
    return body.slice(startIdx);
  }

  return trimmed;
}

/**
 * Drop trailing commas before `}` / `]` — outside string literals only, so a
 * value such as "Arrays like [a, ] here" is left untouched. Valid JSON has no
 * trailing commas, so it comes back unchanged.
 */
function stripTrailingCommas(json: string): string {
  if (!/,\s*[}\]]/.test(json)) return json;
  let out = '';
  let inString = false;
  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (inString) {
      if (ch === '\\') {
        out += ch + (json[i + 1] ?? '');
        i++;
        continue;
      }
      if (ch === '"') inString = false;
      out += ch;
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === ',') {
      let j = i + 1;
      while (j < json.length && /\s/.test(json[j])) j++;
      if (json[j] === '}' || json[j] === ']') continue;
    }
    out += ch;
  }
  return out;
}

/**
 * Parse JSON from a Claude response. Tolerates:
 *  - ```json fences
 *  - leading / trailing prose around the object or array
 *  - trailing commas (outside strings)
 *  - occasional unescaped quotes inside strings (up to 10 repair attempts)
 *
 * `wrapType` selects whether we expect an array ('[') or object ('{').
 * Input that is already valid JSON parses exactly as JSON.parse would.
 */
export function parseJson(text: string, wrapType: '[' | '{' = '['): unknown {
  let jsonStr = text;
  const match = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (match) jsonStr = match[1];
  const open = wrapType;
  const close = wrapType === '[' ? ']' : '}';
  const first = jsonStr.indexOf(open);
  const last = jsonStr.lastIndexOf(close);
  if (first !== -1 && last !== -1) jsonStr = jsonStr.slice(first, last + 1);
  jsonStr = stripTrailingCommas(jsonStr);

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      // An unescaped quote inside a string ("He said "hi" to me") closes the
      // string early, so the parser fails on the character *after* that quote.
      // V8 reports the position; escape the quote just before it (skipping
      // whitespace) and retry. Other engines' messages carry no position, and
      // other syntax errors don't sit right after a quote — those rethrow.
      if (e instanceof SyntaxError) {
        const posMatch = e.message.match(/position (\d+)/);
        if (posMatch) {
          let q = parseInt(posMatch[1], 10) - 1;
          while (q > 0 && /\s/.test(jsonStr[q])) q--;
          if (q > 0 && jsonStr[q] === '"' && jsonStr[q - 1] !== '\\') {
            jsonStr = jsonStr.slice(0, q) + '\\"' + jsonStr.slice(q + 1);
            continue;
          }
        }
      }
      throw e;
    }
  }
  return JSON.parse(jsonStr);
}
