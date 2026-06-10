/**
 * Render the <figure class="ai-image"> placeholders in a chapter HTML file
 * using OpenAI gpt-image-2, then write the images out as JPEG files in an
 * adjacent ./img/ directory and rewrite the placeholders to <img src="img/…">.
 *
 * Why files rather than base64-inline: the HTML stays small enough to edit
 * by hand, the same images are reusable when we re-assemble the published
 * course package, and the inline data URI versions blow chapter files past
 * 1 MB once we have two or three figures.
 *
 *   OPENAI_API_KEY=sk-… npx tsx scripts/render-ai-images.ts \
 *     output/science-and-art-of-tea/chapters-press/01_one-leaf-a-thousand-mountains.html
 *
 * Run with --dry to see what it would do without spending money.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const ENDPOINT = 'https://api.openai.com/v1/images/generations';
const MODEL = 'gpt-image-2';

const ASPECT_TO_SIZE: Record<string, string> = {
  square: '1024x1024',
  portrait: '1024x1536',
  landscape: '1536x1024',
  'wide-landscape': '2048x1152',
};

const SAFETY_CLAUSE =
  ' Render only text, numbers, dates, names, and citations that appear verbatim earlier in this prompt. Do not invent values: no made-up axis numbers, percentages, sample sizes, dates, author names, or journal titles. If a chart or label would require data that is not in this prompt, omit the values entirely and render the visual as an unlabelled abstract trend.';

interface Placeholder {
  full: string;
  prompt: string;
  aspect: string;
  caption: string;
  imageIdx?: string; // when set, output filename uses this idx instead of document order
}

function findPlaceholders(html: string): Placeholder[] {
  const re = /<figure\b[^>]*\bclass="ai-image"[^>]*>([\s\S]*?)<\/figure>/gi;
  const out: Placeholder[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const full = m[0];
    const inner = m[1];
    const promptM = /data-prompt="([^"]+)"/i.exec(full);
    const aspectM = /data-aspect="([^"]+)"/i.exec(full);
    const capM = /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i.exec(inner);
    const idxM = /data-image-idx="([^"]+)"/i.exec(full);
    if (!promptM) continue;
    out.push({
      full,
      prompt: decodeAttr(promptM[1]),
      aspect: (aspectM?.[1] ?? 'landscape').toLowerCase(),
      caption: capM ? capM[1].trim() : '',
      imageIdx: idxM ? idxM[1] : undefined,
    });
  }
  return out;
}

function decodeAttr(s: string): string {
  return s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

async function renderImageOnce(prompt: string, aspect: string, apiKey: string): Promise<Buffer> {
  const body = {
    model: MODEL,
    prompt: prompt.trimEnd() + SAFETY_CLAUSE,
    n: 1,
    size: ASPECT_TO_SIZE[aspect] ?? ASPECT_TO_SIZE.landscape,
    quality: 'high',
    output_format: 'jpeg',
    output_compression: 90,
  };
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`OpenAI ${res.status}: ${text.slice(0, 400)}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const json = await res.json() as { data?: Array<{ b64_json?: string }>; error?: { message?: string } };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error(`OpenAI returned no image: ${JSON.stringify(json).slice(0, 200)}`);
  return Buffer.from(b64, 'base64');
}

async function renderImage(prompt: string, aspect: string, apiKey: string, maxRetries = 3): Promise<Buffer> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await renderImageOnce(prompt, aspect, apiKey);
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number }).status;
      const transient = status === undefined || status === 429 || (status >= 500 && status < 600);
      if (!transient || attempt === maxRetries) throw err;
      const wait = 4000 * Math.pow(2, attempt) + Math.floor(Math.random() * 1500);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const htmlPath = args.find((a) => !a.startsWith('-'));
  if (!htmlPath) {
    console.error('usage: tsx render-ai-images.ts <chapter.html> [--dry]');
    process.exit(2);
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey && !dry) {
    console.error('OPENAI_API_KEY not set');
    process.exit(2);
  }

  const abs = path.resolve(htmlPath);
  const html = await fs.readFile(abs, 'utf8');
  const placeholders = findPlaceholders(html);
  console.log(`${placeholders.length} placeholder(s) in ${path.basename(abs)}`);

  if (placeholders.length === 0) {
    console.log('Nothing to render.');
    return;
  }

  const chapterStem = path.basename(abs, '.html').match(/^(\d+)/)?.[1] ?? '01';
  const imgDir = path.join(path.dirname(abs), 'img');
  await fs.mkdir(imgDir, { recursive: true });

  let out = html;
  for (let i = 0; i < placeholders.length; i++) {
    const p = placeholders[i];
    // Prefer data-image-idx for filename numbering (so partial re-renders
    // preserve their original ch01-fig02.jpg slot). Fall back to document order.
    const figNum = p.imageIdx !== undefined ? parseInt(p.imageIdx, 10) + 1 : i + 1;
    const filename = `ch${chapterStem}-fig${String(figNum).padStart(2, '0')}.jpg`;
    const filePath = path.join(imgDir, filename);
    const relPath = `img/${filename}`;
    console.log(`\n[${i + 1}/${placeholders.length}] ${p.aspect}  → ${filename}`);
    console.log(`  prompt: ${p.prompt.slice(0, 140)}…`);

    if (dry) {
      console.log('  (--dry, skipping render)');
      continue;
    }

    const t0 = Date.now();
    try {
      const buf = await renderImage(p.prompt, p.aspect, apiKey!);
      await fs.writeFile(filePath, buf);
      const kb = (buf.length / 1024).toFixed(0);
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  ✓ ${kb} KB in ${secs}s`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${msg}`);
      continue;
    }

    const writeIdx = p.imageIdx !== undefined ? parseInt(p.imageIdx, 10) : i;
    const cleanCaption = p.caption.replace(/^\s*(?:Fig(?:ure)?\.?\s*\d+[.:]?\s*)/i, '').trim();
    const replacement =
      `<figure class="ch-figure" data-image-idx="${writeIdx}" data-prompt="${escapeAttr(p.prompt)}" data-aspect="${escapeAttr(p.aspect)}">` +
      `<div class="ch-figbox" style="height:auto;overflow:visible;">` +
      `<img src="${relPath}" alt="${escapeAttr(cleanCaption.replace(/<[^>]+>/g, ''))}" style="display:block;max-width:100%;max-height:75vh;height:auto;width:auto;margin:0 auto;">` +
      `</div>` +
      (cleanCaption ? `<figcaption><span class="ch-fig-num">Fig. ${figNum}</span> ${cleanCaption}</figcaption>` : '') +
      `</figure>`;
    out = out.replace(p.full, replacement);
  }

  if (!dry) {
    await fs.writeFile(abs, out, 'utf8');
    console.log(`\nWrote patched HTML: ${abs}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
