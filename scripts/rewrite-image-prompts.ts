/**
 * Apply a sidecar JSON of image-prompt rewrites to a chapter HTML or slides
 * JSON file.
 *
 * Used to swap the painterly "field-guide watercolour" / "broadsheet pen-and-
 * ink" prompts in our example courses for clean editorial photography prompts.
 * The rewrites themselves are produced in a Claude Code conversation (so they
 * don't burn API credits); this script just applies them deterministically and
 * leaves a recoverable backup.
 *
 *   npx tsx --env-file=.env.local scripts/rewrite-image-prompts.ts \
 *     output/raising-a-puppy/chapters-almanac/01_before-they-arrive.html \
 *     --rewrites tmp/rewrites/puppy-ch01.json
 *
 *   npx tsx --env-file=.env.local scripts/rewrite-image-prompts.ts \
 *     output/raising-a-puppy/slides-almanac/01_slides.json \
 *     --rewrites tmp/rewrites/puppy-slides-01.json
 *
 * SIDECAR FORMAT for chapter HTML — value is either a string (just the new
 * data-prompt) or an object {prompt, caption} when the figcaption text also
 * needs updating because the original captioning language ("field-guide
 * reference") would clash with a photographic image:
 *   {
 *     "0": "new prompt for figure index 0",
 *     "1": { "prompt": "...", "caption": "new caption text without Fig. N prefix" }
 *   }
 *
 * SIDECAR FORMAT for slides JSON — value is a string (the new imagePrompt):
 *   { "0": "new prompt for slide 0", "3": "new prompt for slide 3" }
 *
 * --dry prints what would change without writing.
 *
 * Chapter HTMLs are reverted to <figure class="ai-image"> placeholder form so
 * the existing render-ai-images.ts picks them up next run. The <figcaption>
 * text is preserved; the rendered <img> is dropped.
 *
 * Slide JSONs have their imagePrompt fields patched in place.
 *
 * A .pre-photo-rewrite backup of the target file is created the first time
 * this script touches it.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

interface Options {
  dry: boolean;
  rewritesPath: string | null;
}

function parseArgs(argv: string[]): { target: string | null; opts: Options } {
  let target: string | null = null;
  let dry = false;
  let rewritesPath: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry') dry = true;
    else if (a === '--rewrites') rewritesPath = argv[++i] ?? null;
    else if (a.startsWith('--rewrites=')) rewritesPath = a.split('=', 2)[1];
    else if (!a.startsWith('-')) {
      if (!target) target = a;
      else throw new Error(`unexpected positional argument: ${a}`);
    }
  }
  return { target, opts: { dry, rewritesPath } };
}

async function ensureBackup(filePath: string): Promise<void> {
  const bak = `${filePath}.pre-photo-rewrite`;
  try {
    await fs.access(bak);
    return; // backup already exists, leave it alone
  } catch { /* fall through */ }
  await fs.copyFile(filePath, bak);
}

function decodeAttr(s: string): string {
  return s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/** Strip the leading "Fig. N" span (with optional bold/serif wrapping) and HTML tags. */
function cleanCaptionText(raw: string): string {
  return raw
    .replace(/<span\s+class="ch-fig-num"[^>]*>[^<]*<\/span>\s*/i, '')
    .replace(/<[^>]+>/g, '')
    .replace(/^\s*Fig(?:ure)?\.?\s*\d+[.:]?\s*/i, '')
    .trim();
}

interface ChapterFigure {
  full: string;            // the original <figure>...</figure> block
  prompt: string;
  aspect: string;
  caption: string;         // already cleaned of "Fig. N" prefix and inner tags
  imageIdx?: string;       // data-image-idx from a previously-rendered ch-figure, if present
}

function findChapterFigures(html: string): ChapterFigure[] {
  // Match either ai-image (un-rendered placeholder) or ch-figure (already-rendered)
  // figures that carry a data-prompt attribute. Allow other classes alongside the
  // identifying one.
  const re = /<figure\b[^>]*\bclass="(?:ai-image|ch-figure)(?:[^"]*)?"[^>]*>[\s\S]*?<\/figure>/gi;
  const out: ChapterFigure[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const full = m[0];
    const promptM = /data-prompt="([^"]+)"/i.exec(full);
    if (!promptM) continue;
    const aspectM = /data-aspect="([^"]+)"/i.exec(full);
    const capM = /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i.exec(full);
    const idxM = /data-image-idx="([^"]+)"/i.exec(full);
    out.push({
      full,
      prompt: decodeAttr(promptM[1]),
      aspect: aspectM ? decodeAttr(aspectM[1]) : 'landscape',
      caption: capM ? cleanCaptionText(capM[1]) : '',
      imageIdx: idxM ? idxM[1] : undefined,
    });
  }
  return out;
}

function buildPlaceholder(prompt: string, aspect: string, caption: string, imageIdx?: string): string {
  const inner = caption ? `<figcaption>${caption}</figcaption>` : '';
  const idxAttr = imageIdx !== undefined ? ` data-image-idx="${escapeAttr(imageIdx)}"` : '';
  return `<figure class="ai-image"${idxAttr} data-prompt="${escapeAttr(prompt)}" data-aspect="${escapeAttr(aspect)}">${inner}</figure>`;
}

type ChapterRewriteValue = string | { prompt: string; caption?: string };
type SlideRewriteValue = string;
type RewriteValue = ChapterRewriteValue | SlideRewriteValue;

async function loadRewrites(rewritesPath: string): Promise<Record<string, RewriteValue>> {
  const txt = await fs.readFile(rewritesPath, 'utf8');
  const obj = JSON.parse(txt);
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    throw new Error(`rewrites file must be a JSON object of {index: newPrompt | {prompt, caption?}}`);
  }
  return obj as Record<string, RewriteValue>;
}

function unpackChapterRewrite(v: RewriteValue): { prompt: string; caption?: string } | null {
  if (typeof v === 'string') return { prompt: v };
  if (v && typeof v === 'object' && typeof (v as { prompt?: unknown }).prompt === 'string') {
    return { prompt: (v as { prompt: string }).prompt, caption: (v as { caption?: string }).caption };
  }
  return null;
}

async function processChapter(filePath: string, rewrites: Record<string, RewriteValue>, opts: Options): Promise<void> {
  const html = await fs.readFile(filePath, 'utf8');
  const figures = findChapterFigures(html);
  if (figures.length === 0) {
    console.log(`  no figures found in ${path.basename(filePath)}`);
    return;
  }
  console.log(`  ${figures.length} figure(s) found; ${Object.keys(rewrites).length} rewrite(s) supplied`);

  let touched = 0;
  let out = html;
  for (let i = 0; i < figures.length; i++) {
    const rv = rewrites[String(i)];
    if (rv === undefined) {
      console.log(`    [${i}] (skipped — no rewrite supplied)`);
      continue;
    }
    const unpacked = unpackChapterRewrite(rv);
    if (!unpacked) {
      console.warn(`    [${i}] (skipped — rewrite value must be string or {prompt, caption?})`);
      continue;
    }
    const fig = figures[i];
    const nextCaption = unpacked.caption ?? fig.caption;
    console.log(`    [${i}] aspect=${fig.aspect}`);
    console.log(`        BEFORE prompt (${fig.prompt.length} chars): ${fig.prompt.slice(0, 140)}…`);
    console.log(`        AFTER  prompt (${unpacked.prompt.length} chars): ${unpacked.prompt.slice(0, 140)}…`);
    if (unpacked.caption && unpacked.caption !== fig.caption) {
      console.log(`        BEFORE caption: ${fig.caption.slice(0, 140)}${fig.caption.length > 140 ? '…' : ''}`);
      console.log(`        AFTER  caption: ${nextCaption.slice(0, 140)}${nextCaption.length > 140 ? '…' : ''}`);
    }
    out = out.replace(fig.full, buildPlaceholder(unpacked.prompt, fig.aspect, nextCaption, fig.imageIdx ?? String(i)));
    touched += 1;
  }

  if (touched === 0) {
    console.log('  nothing to write');
    return;
  }
  if (opts.dry) {
    console.log(`  (dry) would rewrite ${touched} figure(s) in ${path.basename(filePath)}`);
    return;
  }
  await ensureBackup(filePath);
  await fs.writeFile(filePath, out, 'utf8');
  console.log(`  ✓ wrote ${path.basename(filePath)} (${touched} figures reverted to ai-image placeholders)`);
}

interface SlideRecord {
  title?: string;
  imagePrompt?: string;
  [k: string]: unknown;
}

async function processSlides(filePath: string, rewrites: Record<string, RewriteValue>, opts: Options): Promise<void> {
  const json = await fs.readFile(filePath, 'utf8');
  const slides = JSON.parse(json) as SlideRecord[];
  if (!Array.isArray(slides)) {
    console.error(`  ${path.basename(filePath)}: expected an array of slides`);
    return;
  }
  console.log(`  ${slides.length} slide(s) in file; ${Object.keys(rewrites).length} rewrite(s) supplied`);

  let touched = 0;
  for (const key of Object.keys(rewrites)) {
    const idx = parseInt(key, 10);
    if (!Number.isInteger(idx) || idx < 0 || idx >= slides.length) {
      console.warn(`    [${key}] (skipped — out of range)`);
      continue;
    }
    const slide = slides[idx];
    const before = (slide.imagePrompt as string | undefined) ?? '';
    const rv = rewrites[key];
    if (typeof rv !== 'string') {
      console.warn(`    [${idx}] (skipped — slide rewrites must be plain strings)`);
      continue;
    }
    console.log(`    [${idx}] ${slide.title?.slice(0, 60) ?? ''}`);
    console.log(`        BEFORE (${before.length} chars): ${before.slice(0, 160)}…`);
    console.log(`        AFTER  (${rv.length} chars): ${rv.slice(0, 160)}…`);
    slides[idx].imagePrompt = rv;
    touched += 1;
  }

  if (touched === 0) {
    console.log('  nothing to write');
    return;
  }
  if (opts.dry) {
    console.log(`  (dry) would patch ${touched} imagePrompt(s) in ${path.basename(filePath)}`);
    return;
  }
  await ensureBackup(filePath);
  await fs.writeFile(filePath, JSON.stringify(slides, null, 2) + '\n', 'utf8');
  console.log(`  ✓ wrote ${path.basename(filePath)} (${touched} imagePrompts patched)`);
}

async function main() {
  const { target, opts } = parseArgs(process.argv.slice(2));
  if (!target || !opts.rewritesPath) {
    console.error('usage: tsx rewrite-image-prompts.ts <file.html|file.json> --rewrites <rewrites.json> [--dry]');
    process.exit(2);
  }
  const abs = path.resolve(target);
  const ext = path.extname(abs).toLowerCase();
  const rewrites = await loadRewrites(opts.rewritesPath);
  console.log(`→ ${path.relative(process.cwd(), abs) || abs}${opts.dry ? ' (DRY — no writes)' : ''}`);
  if (ext === '.html') {
    await processChapter(abs, rewrites, opts);
  } else if (ext === '.json') {
    await processSlides(abs, rewrites, opts);
  } else {
    console.error(`unrecognised extension: ${ext}`);
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
