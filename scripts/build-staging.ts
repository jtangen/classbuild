/**
 * Rebuild the 6 example-course bundles from their themed content (new editorial
 * chapter figures + slide images) into a STAGING dir — tmp/staging-deploy/ —
 * without touching the live deploy-courses/. Review staging, then promote.
 *
 *   npx tsx scripts/build-staging.ts              # all 6 courses
 *   npx tsx scripts/build-staging.ts game-theory  # one course
 *
 * Per course: build full-bleed image PPTX decks from rendered slide images,
 * assemble the publish package from the themed chapter/slide dirs (copying
 * chapter figure images + slide images into the bundle), and copy the result
 * into the staging tree. Finally copies the landing index.html + thumbnails.
 */
import { assemblePublishPackage } from './lib/publish';
import { buildImagePptx } from './build-image-pptx';
import { buildLandingHtml } from './lib/codexLandingTemplate';
import { cp, rm, mkdir, readdir, access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

interface Course { slug: string; theme: string; label: string; slidesSub: string; }

const COURSES: Course[] = [
  { slug: 'game-theory', theme: 'terminal', label: 'Terminal', slidesSub: 'slides-terminal' },
  { slug: 'leadership-through-crisis', theme: 'studio', label: 'Studio', slidesSub: 'slides-studio' },
  { slug: 'raising-a-puppy', theme: 'almanac', label: 'Almanac', slidesSub: 'slides-almanac' },
  { slug: 'science-and-art-of-tea', theme: 'press', label: 'Press', slidesSub: 'slides-new' },
  { slug: 'training-for-your-first-marathon', theme: 'storybook', label: 'Storybook', slidesSub: 'slides-storybook' },
  { slug: 'understanding-your-sleep', theme: 'notebook', label: 'Notebook', slidesSub: 'slides-notebook' },
];

const THUMBS_DIR = '../classbuild/public/courses';

const STAGING = 'tmp/staging-deploy';

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

async function main() {
  const only = process.argv.slice(2).find((a) => !a.startsWith('-'));

  // Build themed practice-quiz + weekly-challenge HTML in each course's CHAPTER
  // theme via the SPA templates (run under Vite so the theme ?raw CSS imports
  // resolve). Codex is the viewer chrome only — never a downloadable output.
  console.log('Rendering themed quiz + challenge HTML (SPA templates via Vite)…');
  execSync(`node tools/render-themed-artifacts.mjs ${only ?? ''}`.trim(), {
    cwd: '../classbuild',
    stdio: 'inherit',
  });

  for (const c of COURSES) {
    if (only && c.slug !== only) continue;
    const outputDir = `output/${c.slug}`;
    const chaptersDir = `${outputDir}/chapters-${c.theme}`;
    const slidesDir = `${outputDir}/${c.slidesSub}`;
    console.log(`\n======== ${c.slug} (${c.theme}) ========`);

    // 1. Build full-bleed image PPTX for each deck from rendered slide images.
    const deckFiles = (await readdir(slidesDir)).filter((f) => /^\d+_slides\.json$/.test(f)).sort();
    for (const d of deckFiles) {
      await buildImagePptx(join(slidesDir, d));
    }

    // 2. Assemble the Codex showcase package from themed content.
    const publishDir = await assemblePublishPackage(outputDir, undefined, {
      codex: true,
      themeLabel: c.label,
      chaptersDir,
      slidesDir,
      chapterImgDir: `${chaptersDir}/img`,
      slideImgRootDir: `${slidesDir}/img`,
      pptxSrcDir: slidesDir,
    });

    // 3. Copy into the staging tree (fresh).
    const dest = `${STAGING}/${c.slug}`;
    await rm(dest, { recursive: true, force: true });
    await mkdir(dest, { recursive: true });
    await cp(publishDir, dest, { recursive: true });
    console.log(`→ staged ${dest}`);
  }

  // Codex landing page + new thumbnails.
  await mkdir(STAGING, { recursive: true });
  await writeFile(`${STAGING}/index.html`, buildLandingHtml(), 'utf8');
  for (const c of COURSES) {
    const thumb = `${THUMBS_DIR}/${c.slug}.jpg`;
    if (await exists(thumb)) await cp(thumb, `${STAGING}/${c.slug}.jpg`);
  }
  console.log(`\nStaging tree ready at ${STAGING}/`);
}

main().catch((err) => { console.error(err); process.exit(1); });
