/**
 * Render every slide imagePrompt in a slides.json file via OpenAI gpt-image-2
 * and write the JPEGs out as slide-NN.jpg into an adjacent ./img/ directory.
 *
 *   OPENAI_API_KEY=sk-… npx tsx scripts/render-slides.ts \
 *     output/science-and-art-of-tea/slides-new/01_slides.json
 *
 * --dry prints the prompts without spending money. --concurrency=N runs N
 * renders in flight at once (default 3 — OpenAI tolerates this politely).
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const ENDPOINT = 'https://api.openai.com/v1/images/generations';
const MODEL = 'gpt-image-2';
const SLIDE_SIZE = '2048x1152'; // wide-landscape 16:9 — gpt-image-2's largest 16:9
const SAFETY_CLAUSE =
  ' Render only text, numbers, dates, names, and citations that appear verbatim earlier in this prompt. Do not invent values: no made-up axis numbers, percentages, sample sizes, dates, author names, or journal titles. If a chart or label would require data that is not in this prompt, omit the values entirely and render the visual as an unlabelled abstract trend.';

interface Slide {
  title: string;
  imagePrompt: string;
  speakerNotes: string;
}

async function renderImageOnce(prompt: string, apiKey: string): Promise<Buffer> {
  const body = {
    model: MODEL,
    prompt: prompt.trimEnd() + SAFETY_CLAUSE,
    n: 1,
    size: SLIDE_SIZE,
    quality: 'high',
    output_format: 'jpeg',
    output_compression: 90,
  };
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 400)}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const json = await res.json() as { data?: Array<{ b64_json?: string }> };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image in response');
  return Buffer.from(b64, 'base64');
}

/** Retry on transient 5xx / 429 / network blips with exponential backoff. */
async function renderImage(prompt: string, apiKey: string, maxRetries = 3): Promise<Buffer> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await renderImageOnce(prompt, apiKey);
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

async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const i = cursor++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const force = args.includes('--force');
  const concArg = args.find((a) => a.startsWith('--concurrency='));
  const concurrency = concArg ? Math.max(1, Math.min(6, parseInt(concArg.split('=')[1], 10) || 3)) : 3;
  const jsonPath = args.find((a) => !a.startsWith('-'));
  if (!jsonPath) {
    console.error('usage: tsx render-slides.ts <slides.json> [--dry] [--concurrency=N]');
    process.exit(2);
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey && !dry) { console.error('OPENAI_API_KEY not set'); process.exit(2); }

  const abs = path.resolve(jsonPath);
  const slides = JSON.parse(await fs.readFile(abs, 'utf8')) as Slide[];
  const stem = path.basename(abs, '.json').match(/^(\d+)/)?.[1] ?? '01';
  const imgDir = path.join(path.dirname(abs), 'img', `ch${stem}`);
  await fs.mkdir(imgDir, { recursive: true });

  console.log(`${slides.length} slide(s), concurrency=${concurrency}, size=${SLIDE_SIZE}`);
  console.log(`output dir: ${imgDir}`);

  const t0 = Date.now();
  let done = 0;

  const tasks = slides.map((slide, i) => async () => {
    const n = String(i + 1).padStart(2, '0');
    const filename = `slide-${n}.jpg`;
    const filePath = path.join(imgDir, filename);
    if (dry) {
      console.log(`[${i + 1}/${slides.length}] DRY · ${slide.title}`);
      return null;
    }
    // Idempotent: if the file already exists and is non-empty, skip it
    // (unless --force was passed, e.g. to re-render after a prompt rewrite).
    if (!force) {
      try {
        const st = await fs.stat(filePath);
        if (st.size > 1000) {
          done += 1;
          console.log(`[${done}/${slides.length}] · ${filename} already rendered, skipping`);
          return filename;
        }
      } catch { /* file doesn't exist, fall through to render */ }
    }
    const slideStart = Date.now();
    try {
      const buf = await renderImage(slide.imagePrompt, apiKey!);
      await fs.writeFile(filePath, buf);
      done += 1;
      const secs = ((Date.now() - slideStart) / 1000).toFixed(1);
      const kb = (buf.length / 1024).toFixed(0);
      const elapsedMin = ((Date.now() - t0) / 60000).toFixed(1);
      console.log(`[${done}/${slides.length}] ✓ ${filename} · ${kb} KB · ${secs}s · ${elapsedMin}min total`);
      return filename;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${i + 1}/${slides.length}] ✗ ${slide.title} — ${msg}`);
      return null;
    }
  });

  await runWithConcurrency(tasks, concurrency);

  const totalMin = ((Date.now() - t0) / 60000).toFixed(1);
  console.log(`\nDone in ${totalMin} min · ${done}/${slides.length} successful`);
}

main().catch((err) => { console.error(err); process.exit(1); });
