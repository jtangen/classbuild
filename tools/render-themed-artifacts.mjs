/**
 * Rebuild each example course's practice-quiz and weekly-challenge HTML in its
 * CHAPTER theme (Terminal/Studio/Almanac/Press/Storybook/Notebook), so the
 * downloadable reading + quiz + challenge all share one theme. Codex is the
 * ClassBuild site chrome only — never a course output.
 *
 * Runs the SPA's own templates via Vite SSR (so the theme `?raw` CSS imports
 * resolve). Reads quiz data from <cli>/output/<slug>/quizzes/NN_practice.md and
 * challenge data from weekly-challenge/NN_challenge.json; overwrites the .html.
 *
 *   node tools/render-themed-artifacts.mjs [slug]
 */
import { createServer } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(HERE, '../../classbuild-cli');

const COURSES = [
  { slug: 'game-theory', theme: 'terminal' },
  { slug: 'leadership-through-crisis', theme: 'studio' },
  { slug: 'raising-a-puppy', theme: 'almanac' },
  { slug: 'science-and-art-of-tea', theme: 'press' },
  { slug: 'training-for-your-first-marathon', theme: 'storybook' },
  { slug: 'understanding-your-sleep', theme: 'notebook' },
];

const only = process.argv.slice(2).find((a) => !a.startsWith('-'));
const pad = (n) => String(n).padStart(2, '0');

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'warn' });
const { buildQuizHtml } = await vite.ssrLoadModule('/src/templates/quizTemplate.ts');
const { buildWeeklyChallengeHtml } = await vite.ssrLoadModule('/src/templates/weeklyChallengeTemplate.ts');

for (const c of COURSES) {
  if (only && c.slug !== only) continue;
  const out = path.join(CLI, 'output', c.slug);
  const course = JSON.parse(await fs.readFile(path.join(out, 'course.json'), 'utf8'));
  const courseTitle = course.syllabus.courseTitle;
  const chTitle = (n) => course.syllabus.chapters.find((x) => x.number === n)?.title ?? `Chapter ${n}`;

  let q = 0, w = 0;
  const qDir = path.join(out, 'quizzes');
  for (const f of (await fs.readdir(qDir)).filter((f) => /^\d+_practice\.md$/.test(f)).sort()) {
    const num = parseInt(f, 10);
    const data = await fs.readFile(path.join(qDir, f), 'utf8');
    const html = buildQuizHtml(chTitle(num), data, courseTitle, c.theme);
    await fs.writeFile(path.join(qDir, `${pad(num)}_practice.html`), html);
    q++;
  }
  const wDir = path.join(out, 'weekly-challenge');
  for (const f of (await fs.readdir(wDir)).filter((f) => /^\d+_challenge\.json$/.test(f)).sort()) {
    const num = parseInt(f, 10);
    const cdata = JSON.parse(await fs.readFile(path.join(wDir, f), 'utf8'));
    const title = `Week ${num} Challenge — ${chTitle(num)}`;
    const html = buildWeeklyChallengeHtml(title, cdata, courseTitle, c.theme);
    await fs.writeFile(path.join(wDir, `${pad(num)}_challenge.html`), html);
    w++;
  }
  console.log(`${c.slug.padEnd(34)} → ${c.theme}: ${q} quizzes, ${w} challenges`);
}

await vite.close();
