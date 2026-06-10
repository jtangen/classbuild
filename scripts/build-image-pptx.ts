/**
 * Build a full-bleed IMAGE deck (.pptx) from already-rendered slide images.
 *
 * The new slide system renders each slide as a single editorial image
 * (slides-<theme>/img/chNN/slide-MM.jpg). This packs those images — which
 * already exist on disk — into a 16:9 .pptx where each slide is the full-bleed
 * image plus the AI-written speaker notes. It does NOT call OpenAI; it reuses
 * the rendered JPEGs, so it's fast and free.
 *
 *   npx tsx scripts/build-image-pptx.ts \
 *     output/game-theory/slides-terminal/01_slides.json
 *
 * Image dir is inferred as <slides-dir>/img/ch<NN>/slide-<MM>.jpg.
 * Output .pptx is written next to the JSON: <NN>_slides.pptx.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import PptxGenJS from 'pptxgenjs';

interface Slide {
  title?: string;
  imagePrompt?: string;
  speakerNotes?: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

async function fileToDataUri(p: string): Promise<string | null> {
  try {
    const buf = await fs.readFile(p);
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

export async function buildImagePptx(jsonPath: string): Promise<string> {
  const abs = path.resolve(jsonPath);
  const slidesDir = path.dirname(abs);
  const stem = path.basename(abs, '.json').match(/^(\d+)/)?.[1] ?? '01';
  const imgDir = path.join(slidesDir, 'img', `ch${stem}`);

  const slides = JSON.parse(await fs.readFile(abs, 'utf8')) as Slide[];

  // CJS/ESM interop guard (matches the repo's existing pptxExporter).
  const Ctor = typeof PptxGenJS === 'function' ? PptxGenJS : (PptxGenJS as unknown as { default: typeof PptxGenJS }).default;
  const pptx = new Ctor();
  pptx.author = 'ClassBuild';
  pptx.layout = 'LAYOUT_WIDE'; // 13.333 × 7.5in, 16:9
  const W = 13.333, H = 7.5;

  let withImg = 0, missing = 0;
  for (let i = 0; i < slides.length; i++) {
    const s = pptx.addSlide();
    const imgPath = path.join(imgDir, `slide-${pad(i + 1)}.jpg`);
    const dataUri = await fileToDataUri(imgPath);
    if (dataUri) {
      s.addImage({ data: dataUri, x: 0, y: 0, w: W, h: H, sizing: { type: 'cover', w: W, h: H } });
      withImg++;
    } else {
      s.background = { color: 'FFF8E7' };
      s.addText(slides[i].title ?? `Slide ${i + 1}`, {
        x: 0.8, y: 0.8, w: W - 1.6, h: 1.4, fontSize: 34, fontFace: 'Georgia', color: '1C2F4A',
      });
      missing++;
    }
    if (slides[i].speakerNotes?.trim()) s.addNotes(slides[i].speakerNotes!.trim());
  }

  const outPath = path.join(slidesDir, `${stem}_slides.pptx`);
  const blob = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
  await fs.writeFile(outPath, blob);
  console.log(`✓ ${path.basename(outPath)} — ${withImg} image slides${missing ? `, ${missing} text-fallback` : ''} (${(blob.length / 1024).toFixed(0)} KB)`);
  return outPath;
}

// CLI entry: only run when invoked directly, not when imported.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.url.replace('file://', ''))) {
  const jsonPath = process.argv.slice(2).find((a) => !a.startsWith('-'));
  if (!jsonPath) { console.error('usage: tsx build-image-pptx.ts <slides.json>'); process.exit(2); }
  buildImagePptx(jsonPath).catch((err) => { console.error(err); process.exit(1); });
}
