/**
 * Rebuild the 6 example-course bundles from their themed content (new editorial
 * chapter figures + slide images) into a STAGING dir — tmp/staging-deploy/ —
 * without touching the live deploy-courses/. Review staging, then promote.
 *
 *   npx tsx --import ./scripts/raw-loader.mjs scripts/build-staging.ts              # all 6 courses
 *   npx tsx --import ./scripts/raw-loader.mjs scripts/build-staging.ts game-theory  # one course
 *
 * Per course: build full-bleed image PPTX decks from rendered slide images,
 * assemble the publish package from the themed chapter/slide dirs (copying
 * chapter figure images + slide images into the bundle), and copy the result
 * into the staging tree. Finally copies the landing index.html + thumbnails.
 *
 * Guards (exit 1, nothing staged for that course):
 *   - a chapter with no reading or no slides, or a deck missing slide images.
 *     Pass --allow-partial to stage it anyway.
 *   - one-course mode first copies every other course that is missing from
 *     staging out of deploy-courses/, and refuses to run if it can't, so a
 *     promote with `rsync --delete` never removes the other courses.
 */
import { assemblePublishPackage } from './lib/publish';
import { buildImagePptx } from './build-image-pptx';
import { buildLandingHtml } from './lib/codexLandingTemplate';
import { cp, rm, mkdir, readdir, access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

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

/** The tree that gets promoted to (rsync) and deployed from (wrangler). */
const LIVE = 'deploy-courses';

/** Materials every staged chapter must have. */
const REQUIRED_MATERIALS = ['reading', 'slides'];

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * One-course mode: make sure every other course is already in staging (copied
 * from the live tree when missing), so promoting staging can't delete it.
 */
async function seedStagingFromLive(only: string): Promise<void> {
  const unavailable: string[] = [];
  for (const c of COURSES) {
    if (c.slug === only || await exists(`${STAGING}/${c.slug}`)) continue;
    if (await exists(`${LIVE}/${c.slug}`)) {
      await mkdir(STAGING, { recursive: true });
      await cp(`${LIVE}/${c.slug}`, `${STAGING}/${c.slug}`, { recursive: true });
      console.log(`Seeded ${STAGING}/${c.slug} from ${LIVE}/`);
    } else {
      unavailable.push(c.slug);
    }
  }
  if (unavailable.length > 0) {
    throw new Error(
      `Neither ${STAGING}/ nor ${LIVE}/ has: ${unavailable.join(', ')}. ` +
      'Promoting a one-course build would drop those courses from the site; run a full build instead.',
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const allowPartial = args.includes('--allow-partial');
  const only = args.find((a) => !a.startsWith('-'));
  if (only && !COURSES.some((c) => c.slug === only)) {
    console.error(`Unknown course "${only}". Expected one of: ${COURSES.map((c) => c.slug).join(', ')}`);
    process.exit(2);
  }

  if (only) await seedStagingFromLive(only);

  // Build themed practice-quiz + weekly-challenge HTML in each course's CHAPTER
  // theme via the SPA templates (run under Vite so the theme ?raw CSS imports
  // resolve). Codex is the viewer chrome only — never a downloadable output.
  console.log('Rendering themed quiz + challenge HTML (SPA templates via Vite)…');
  execFileSync(process.execPath, ['tools/render-themed-artifacts.mjs', ...(only ? [only] : [])], {
    cwd: '../classbuild',
    stdio: 'inherit',
  });

  for (const c of COURSES) {
    if (only && c.slug !== only) continue;
    const outputDir = `output/${c.slug}`;
    const chaptersDir = `${outputDir}/chapters-${c.theme}`;
    const slidesDir = `${outputDir}/${c.slidesSub}`;
    console.log(`\n======== ${c.slug} (${c.theme}) ========`);
    const problems: string[] = [];

    // 1. Build full-bleed image PPTX for each deck from rendered slide images.
    const deckFiles = (await readdir(slidesDir)).filter((f) => /^\d+_slides\.json$/.test(f)).sort();
    for (const d of deckFiles) {
      const { missing } = await buildImagePptx(join(slidesDir, d));
      if (missing > 0) problems.push(`${d}: ${missing} slide image(s) missing`);
    }

    // 2. Assemble the Codex showcase package from themed content.
    const { publishDir, chapters } = await assemblePublishPackage(outputDir, undefined, {
      codex: true,
      themeLabel: c.label,
      chaptersDir,
      slidesDir,
      chapterImgDir: `${chaptersDir}/img`,
      slideImgRootDir: `${slidesDir}/img`,
      pptxSrcDir: slidesDir,
    });
    for (const ch of chapters) {
      const lacking = REQUIRED_MATERIALS.filter((m) => !ch.available.includes(m));
      if (lacking.length > 0) problems.push(`Ch ${pad(ch.number)} "${ch.title}": no ${lacking.join(' or ')}`);
    }

    if (problems.length > 0) {
      const report = `${c.slug} is incomplete:\n  - ${problems.join('\n  - ')}`;
      if (!allowPartial) {
        throw new Error(`${report}\nNot staged. Fill the gaps, or pass --allow-partial to stage it anyway.`);
      }
      console.warn(`\nWARNING (--allow-partial): ${report}`);
    }

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
