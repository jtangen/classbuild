/**
 * Assembles a static publish/ directory from CLI output.
 *
 * Reads the output directory, collects all generated materials,
 * builds index.html via coursePackageTemplate, and copies assets.
 */

import { readFile, mkdir, copyFile, readdir, stat, cp } from 'node:fs/promises';
import { writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

import type {
  Syllabus,
  ResearchDossier,
  InClassQuizQuestion,
  SlideData,
} from '../../src/types/course';
import { buildCoursePackageHtml } from './coursePackageTemplate';
import type { ChapterPackageData } from './coursePackageTemplate';
import { buildCodexViewerHtml } from './codexViewerTemplate';
import type { CodexChapterData } from './codexViewerTemplate';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readText(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf-8');
  } catch {
    return null;
  }
}

// Injected into chapter/quiz HTML when copied into the publish package so the
// wrapper can size their sandboxed iframes via postMessage. Required because
// coursePackageTemplate drops `allow-same-origin` from those iframes.
const RESIZE_SHIM = '<script>(function(){function p(){try{parent.postMessage({__cbResize:1,h:document.documentElement.scrollHeight},"*")}catch(e){}}window.addEventListener("load",p);if(window.ResizeObserver){try{new ResizeObserver(p).observe(document.documentElement)}catch(e){}}})();</script>';

async function copyHtmlWithResizeShim(src: string, dest: string): Promise<void> {
  const html = await readFile(src, 'utf-8');
  await writeFile(dest, html + RESIZE_SHIM, 'utf-8');
}

/** Find the first file in a directory matching a prefix pattern. */
async function findFile(dir: string, prefix: string, ext: string): Promise<string | null> {
  try {
    const files = await readdir(dir);
    const match = files.find(f => f.startsWith(prefix) && f.endsWith(ext));
    return match ? join(dir, match) : null;
  } catch {
    return null;
  }
}

/** Find any file in a directory matching prefix with any of the given extensions. */
async function findFileAnyExt(dir: string, prefix: string, exts: string[]): Promise<string | null> {
  try {
    const files = await readdir(dir);
    for (const ext of exts) {
      const match = files.find(f => f.startsWith(prefix) && f.endsWith(ext));
      if (match) return join(dir, match);
    }
    return null;
  } catch {
    return null;
  }
}

export interface AssembleOptions {
  /** Themed chapter HTML dir (default: <outputDir>/chapters). */
  chaptersDir?: string;
  /** Themed slides JSON dir (default: <outputDir>/slides). */
  slidesDir?: string;
  /** Chapter figure images dir (default: <chaptersDir>/img). Copied to publish/chapters/img. */
  chapterImgDir?: string;
  /** Root of per-chapter slide images ch<NN>/slide-<MM>.jpg (default: <slidesDir>/img). */
  slideImgRootDir?: string;
  /** Dir holding regenerated <NN>_slides.pptx (default: <slidesDir>). */
  pptxSrcDir?: string;
  /** Dir holding weekly-challenge HTML (<NN>_challenge.html) (default: <outputDir>/weekly-challenge). */
  challengeDir?: string;
  /** Human label for the course's chapter theme, shown in the viewer sidebar (e.g. "Terminal"). */
  themeLabel?: string;
  /** Use the Codex showcase viewer instead of the legacy course package viewer. */
  codex?: boolean;
}

export async function assemblePublishPackage(
  outputDir: string,
  themeId?: string,
  opts: AssembleOptions = {},
): Promise<string> {
  const publishDir = join(outputDir, 'publish');

  const chaptersDir = opts.chaptersDir ?? join(outputDir, 'chapters');
  const slidesDir = opts.slidesDir ?? join(outputDir, 'slides');
  const chapterImgDir = opts.chapterImgDir ?? join(chaptersDir, 'img');
  const slideImgRootDir = opts.slideImgRootDir ?? join(slidesDir, 'img');
  const pptxSrcDir = opts.pptxSrcDir ?? slidesDir;
  const challengeDir = opts.challengeDir ?? join(outputDir, 'weekly-challenge');
  const challengePaths: Record<number, string> = {};

  // Create directory structure
  const subdirs = ['chapters', 'quizzes', 'audio', 'img', 'downloads', 'slides', 'challenges'];
  for (const sub of subdirs) {
    await mkdir(join(publishDir, sub), { recursive: true });
  }

  // Copy chapter figure images. Chapter HTML references them as img/chNN-figMM.jpg;
  // loaded in the viewer's iframe (base = chapters/NN.html) they resolve to chapters/img/.
  if (await exists(chapterImgDir)) {
    await cp(chapterImgDir, join(publishDir, 'chapters', 'img'), { recursive: true });
  }

  // ── Load syllabus ──────────────────────────────────────────────
  let syllabus: Syllabus | null = null;
  let dossiers: ResearchDossier[] = [];

  // Try course.json first (has everything)
  const courseJsonPath = join(outputDir, 'course.json');
  if (await exists(courseJsonPath)) {
    const course = await readJson<{ syllabus: Syllabus; researchDossiers?: ResearchDossier[] }>(courseJsonPath);
    if (course) {
      syllabus = course.syllabus;
      dossiers = course.researchDossiers || [];
    }
  }

  // Fall back to syllabus.json
  if (!syllabus) {
    syllabus = await readJson<Syllabus>(join(outputDir, 'syllabus.json'));
  }

  if (!syllabus) {
    throw new Error('No syllabus.json or course.json found in output directory');
  }

  console.log(`Assembling publish package for "${syllabus.courseTitle}" (${syllabus.chapters.length} chapters)`);

  // ── Per-chapter data collection ────────────────────────────────
  const chaptersData: ChapterPackageData[] = [];

  for (const ch of syllabus.chapters) {
    const prefix = pad(ch.number);
    const downloadLinks: ChapterPackageData['downloadLinks'] = [];

    // -- Chapter HTML --
    let chapterHtmlPath: string | undefined;
    const chapterSrc = await findFile(chaptersDir, prefix, '.html');
    if (chapterSrc) {
      const destName = `${prefix}.html`;
      await copyHtmlWithResizeShim(chapterSrc, join(publishDir, 'chapters', destName));
      chapterHtmlPath = `chapters/${destName}`;
    }

    // -- Practice Quiz HTML --
    let quizHtmlPath: string | undefined;
    const quizSrc = await findFile(join(outputDir, 'quizzes'), `${prefix}_practice`, '.html');
    if (quizSrc) {
      const destName = `${prefix}.html`;
      await copyHtmlWithResizeShim(quizSrc, join(publishDir, 'quizzes', destName));
      quizHtmlPath = `quizzes/${destName}`;
    }

    // -- Weekly Challenge HTML --
    const challengeSrc = await findFile(challengeDir, `${prefix}_challenge`, '.html');
    if (challengeSrc) {
      await copyFile(challengeSrc, join(publishDir, 'challenges', `${prefix}.html`));
      challengePaths[ch.number] = `challenges/${prefix}.html`;
    }

    // -- Audio MP3 --
    let audioPath: string | undefined;
    const audioSrc = await findFileAnyExt(join(outputDir, 'audio'), prefix, ['.mp3']);
    if (audioSrc && !audioSrc.includes('_transcript')) {
      const destName = `${prefix}.mp3`;
      await copyFile(audioSrc, join(publishDir, 'audio', destName));
      audioPath = `audio/${destName}`;
    }

    // -- Transcript --
    let transcript: string | null = null;
    const transcriptPath = await findFileAnyExt(join(outputDir, 'audio'), `${prefix}_transcript`, ['.md', '.txt']);
    if (transcriptPath) {
      transcript = await readText(transcriptPath);
    }

    // -- Infographic --
    let infographicPath: string | undefined;
    const imgSrc = await findFileAnyExt(join(outputDir, 'infographic'), prefix, ['.jpg', '.jpeg', '.png', '.webp']);
    if (imgSrc) {
      const ext = extname(imgSrc);
      const destName = `${prefix}${ext}`;
      await copyFile(imgSrc, join(publishDir, 'img', destName));
      infographicPath = `img/${destName}`;
    }

    // -- Discussion JSON --
    const discussion = await readJson<Array<{ prompt: string; hook: string }>>(
      join(outputDir, 'discussion', `${prefix}_discussion.json`)
    );

    // -- Activities JSON --
    const activities = await readJson<Array<{ title: string; duration: string; description: string; materials: string; learningGoal: string; scalingNotes: string }>>(
      join(outputDir, 'activities', `${prefix}_activities.json`)
    );

    // -- Slides JSON --
    const slides = await readJson<SlideData[]>(
      join(slidesDir, `${prefix}_slides.json`)
    );

    // -- Slide images for viewer cards (slides/chNN/slide-MM.jpg, relative to index.html) --
    const slideImgSrc = join(slideImgRootDir, `ch${prefix}`);
    if (slides && await exists(slideImgSrc)) {
      await cp(slideImgSrc, join(publishDir, 'slides', `ch${prefix}`), { recursive: true });
    }

    // -- In-Class Quiz JSON --
    const inClassQuiz = await readJson<InClassQuizQuestion[]>(
      join(outputDir, 'quizzes', `${prefix}_inclass.json`)
    );

    // -- Research dossier --
    const research = dossiers.find(d => d.chapterNumber === ch.number) || null;

    // -- Collect downloadable files --
    // Slides PPTX
    const pptxSrc = await findFile(pptxSrcDir, `${prefix}_slides`, '.pptx');
    if (pptxSrc) {
      const destName = `${prefix}_slides.pptx`;
      await copyFile(pptxSrc, join(publishDir, 'downloads', destName));
      downloadLinks.push({ label: 'Slides (PPTX)', path: `downloads/${destName}` });
    }

    // Discussion DOCX
    const discDocx = await findFile(join(outputDir, 'discussion'), `${prefix}_discussion`, '.docx');
    if (discDocx) {
      const destName = `${prefix}_discussion.docx`;
      await copyFile(discDocx, join(publishDir, 'downloads', destName));
      downloadLinks.push({ label: 'Discussion (DOCX)', path: `downloads/${destName}` });
    }

    // Activities DOCX
    const actDocx = await findFile(join(outputDir, 'activities'), `${prefix}_activities`, '.docx');
    if (actDocx) {
      const destName = `${prefix}_activities.docx`;
      await copyFile(actDocx, join(publishDir, 'downloads', destName));
      downloadLinks.push({ label: 'Activities (DOCX)', path: `downloads/${destName}` });
    }

    // In-class quiz ZIP
    const icqZip = await findFile(join(outputDir, 'quizzes'), `${prefix}_inclass_versions`, '.zip');
    if (icqZip) {
      const destName = `${prefix}_inclass_versions.zip`;
      await copyFile(icqZip, join(publishDir, 'downloads', destName));
      downloadLinks.push({ label: 'Quiz Versions (ZIP)', path: `downloads/${destName}` });
    }

    // Research DOCX
    const resDocx = await findFile(join(outputDir, 'research'), `${prefix}_research`, '.docx');
    if (resDocx) {
      const destName = `${prefix}_research.docx`;
      await copyFile(resDocx, join(publishDir, 'downloads', destName));
      downloadLinks.push({ label: 'Research (DOCX)', path: `downloads/${destName}` });
    }

    // Transcript DOCX
    const transDocx = await findFile(join(outputDir, 'audio'), `${prefix}_transcript`, '.docx');
    if (transDocx) {
      const destName = `${prefix}_transcript.docx`;
      await copyFile(transDocx, join(publishDir, 'downloads', destName));
      downloadLinks.push({ label: 'Transcript (DOCX)', path: `downloads/${destName}` });
    }

    // Count available materials
    const available: string[] = [];
    if (chapterHtmlPath) available.push('reading');
    if (quizHtmlPath) available.push('quiz');
    if (discussion) available.push('discussion');
    if (activities) available.push('activities');
    if (slides) available.push('slides');
    if (audioPath) available.push('audio');
    if (research && research.sources.length > 0) available.push('research');
    if (infographicPath) available.push('infographic');
    if (inClassQuiz) available.push('inclass-quiz');

    console.log(`  Ch ${prefix}: ${available.join(', ') || 'no materials found'}`);

    chaptersData.push({
      number: ch.number,
      title: ch.title,
      narrative: ch.narrative,
      chapterHtmlPath,
      quizHtmlPath,
      audioPath,
      infographicPath,
      discussion: discussion || undefined,
      activities: activities || undefined,
      slides: slides || undefined,
      inClassQuiz: inClassQuiz || undefined,
      transcript: transcript || undefined,
      research: research || undefined,
      downloadLinks,
    });
  }

  // ── Copy syllabus-level downloads ──────────────────────────────
  const syllabusDocx = join(outputDir, 'syllabus.docx');
  if (await exists(syllabusDocx)) {
    await copyFile(syllabusDocx, join(publishDir, 'downloads', 'syllabus.docx'));
  }

  // ── Build index.html ───────────────────────────────────────────
  let html: string;
  if (opts.codex) {
    const codexChapters: CodexChapterData[] = chaptersData.map((c) => ({
      number: c.number,
      title: c.title,
      narrative: c.narrative,
      chapterHtmlPath: c.chapterHtmlPath,
      quizHtmlPath: c.quizHtmlPath,
      challengeHtmlPath: challengePaths[c.number],
      audioPath: c.audioPath,
      transcript: c.transcript,
      slides: c.slides,
      discussion: c.discussion,
      activities: c.activities,
      downloadLinks: c.downloadLinks,
    }));
    html = buildCodexViewerHtml(
      {
        courseTitle: syllabus.courseTitle,
        courseOverview: syllabus.courseOverview ?? '',
        themeLabel: opts.themeLabel,
      },
      codexChapters,
    );
  } else {
    html = buildCoursePackageHtml(syllabus, chaptersData, themeId);
  }
  await writeFile(join(publishDir, 'index.html'), html);

  const sizeKb = Math.round(Buffer.byteLength(html) / 1024);
  console.log(`\nPublish package assembled: ${publishDir}`);
  console.log(`  index.html: ${sizeKb} KB`);
  console.log(`  ${chaptersData.length} chapters`);

  return publishDir;
}
