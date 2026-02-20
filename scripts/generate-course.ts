#!/usr/bin/env node
/**
 * Headless CLI course generator for ClassBuild — v2.
 *
 * Changes from v1:
 *   - Parallel research (3 chapters concurrently)
 *   - Parallel material generation per chapter (quizzes + Sonnet tasks)
 *   - DOCX output for discussion, activities, transcript, research
 *   - No JSON output except course.json and syllabus.json
 *   - ffmpeg remux for correct MP3 duration headers
 *   - --notes flag for learner notes (e.g. Australian perspective)
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/generate-course.ts \
 *     --topic "The Psychology of Prejudice" \
 *     --chapters 12 \
 *     --level advanced-undergrad \
 *     --notes "University of Queensland, Brisbane, Australia. Use international and Australian examples." \
 *     --output ./output/prejudice
 */

import { writeFile, mkdir, readFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs, promisify } from 'node:util';
import { execFile } from 'node:child_process';

import { streamWithRetry } from '../src/services/claude/streaming';
import { MODELS } from '../src/services/claude/client';
import { buildSyllabusPrompt, parseSyllabusResponse } from '../src/prompts/syllabus';
import { buildChapterPrompt, buildChapterUserPrompt } from '../src/prompts/chapter';
import { replaceGeminiImagePlaceholdersNode } from './lib/node-image-placer';
import { buildPracticeQuizPrompt, buildPracticeQuizUserPrompt } from '../src/prompts/practiceQuiz';
import { buildInClassQuizPrompt, buildInClassQuizUserPrompt } from '../src/prompts/inClassQuiz';
import { buildDiscussionPrompt, buildDiscussionUserPrompt } from '../src/prompts/discussion';
import { buildActivitiesPrompt, buildActivitiesUserPrompt } from '../src/prompts/activities';
import { buildAudioTranscriptPrompt, buildAudioTranscriptUserPrompt } from '../src/prompts/audioTranscript';
import { buildSlidesPrompt, buildSlidesUserPrompt } from '../src/prompts/slides';
import { buildInfographicMetaPrompt, buildInfographicMetaUserPrompt } from '../src/prompts/infographic';
import { RESEARCH_SYSTEM_PROMPT, buildResearchUserPrompt, parseResearchResponse } from '../src/prompts/research';
import { balancePracticeQuiz, balanceInClassQuiz } from '../src/services/quiz/answerBalancer';
import { buildQuizHtml } from '../src/templates/quizTemplate';
import { generateQuizDocPackage } from '../src/services/export/quizDocExporter';
import { generatePptx } from '../src/services/export/pptxExporter';
import { validateDois } from '../src/utils/doiValidator';
import { generateInfographicNode } from './lib/node-image';
import { buildDiscussionDocx, buildActivitiesDocx, buildTranscriptDocx, buildResearchDocx, buildSyllabusDocx } from './lib/docx-helpers';

import type {
  CourseSetup,
  Syllabus,
  ChapterSyllabus,
  ResearchDossier,
  InClassQuizQuestion,
  SlideData,
  EducationLevel,
  ChapterLength,
} from '../src/types/course';

const execFileAsync = promisify(execFile);

// ─── CLI Arg Parsing ──────────────────────────────────────────────

const { values } = parseArgs({
  options: {
    topic: { type: 'string' },
    chapters: { type: 'string', default: '12' },
    level: { type: 'string', default: 'advanced-undergrad' },
    output: { type: 'string', default: './output' },
    theme: { type: 'string', default: 'midnight' },
    length: { type: 'string', default: 'standard' },
    widgets: { type: 'string', default: '3' },
    cohort: { type: 'string', default: '60' },
    'specific-topics': { type: 'string' },
    'avoid-topics': { type: 'string' },
    textbook: { type: 'string' },
    notes: { type: 'string' },
    'voice-id': { type: 'string' },
    environment: { type: 'string', default: 'lecture-theatre' },
    'stop-after': { type: 'string' }, // 'syllabus' | 'research' — stop early for review
    'no-publish': { type: 'boolean', default: false },
    syllabus: { type: 'string' }, // path to existing syllabus.json to skip regeneration
  },
  strict: true,
});

if (!values.topic) {
  console.error('Error: --topic is required');
  console.error(
    'Usage: ANTHROPIC_API_KEY=sk-... npx tsx scripts/generate-course.ts --topic "Your Topic" --chapters 12 --output ./output/dir'
  );
  process.exit(1);
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is required');
  process.exit(1);
}

const OUTPUT_DIR = values.output!;

const setup: CourseSetup = {
  topic: values.topic,
  numChapters: parseInt(values.chapters!, 10),
  educationLevel: values.level as EducationLevel,
  chapterLength: values.length as ChapterLength,
  widgetsPerChapter: parseInt(values.widgets!, 10),
  cohortSize: parseInt(values.cohort!, 10),
  priorKnowledge: 'some',
  teachingEnvironment: (values.environment as CourseSetup['teachingEnvironment']) || 'lecture-theatre',
  themeId: values.theme,
  voiceId: values['voice-id'],
  specificTopics: values['specific-topics'],
  avoidTopics: values['avoid-topics'],
  textbookReference: values.textbook,
  learnerNotes: values.notes,
};

const STOP_AFTER = values['stop-after'] as 'syllabus' | 'research' | undefined;

// ─── Helpers ──────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function extractHtml(text: string): string {
  const htmlMatch = text.match(/```html\s*\n?([\s\S]*?)\n?```/);
  if (htmlMatch) return htmlMatch[1];
  const trimmed = text.trim();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) return trimmed;
  const docIdx = text.indexOf('<!DOCTYPE');
  const htmlIdx = text.indexOf('<html');
  const startIdx = docIdx !== -1 ? docIdx : htmlIdx;
  if (startIdx !== -1) {
    const endIdx = text.lastIndexOf('</html>');
    if (endIdx !== -1) return text.slice(startIdx, endIdx + 7);
    return text.slice(startIdx);
  }
  return text;
}

function parseJson(text: string, wrapType: '[' | '{' = '['): unknown {
  let jsonStr = text;
  const match = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (match) jsonStr = match[1];
  const open = wrapType;
  const close = wrapType === '[' ? ']' : '}';
  const first = jsonStr.indexOf(open);
  const last = jsonStr.lastIndexOf(close);
  if (first !== -1 && last !== -1) jsonStr = jsonStr.slice(first, last + 1);
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      if (e instanceof SyntaxError) {
        const posMatch = e.message.match(/position (\d+)/);
        if (posMatch) {
          const pos = parseInt(posMatch[1]);
          if (pos > 0 && pos < jsonStr.length && jsonStr[pos] === '"') {
            jsonStr = jsonStr.slice(0, pos) + '\\"' + jsonStr.slice(pos + 1);
            continue;
          }
        }
      }
      throw e;
    }
  }
  return JSON.parse(jsonStr);
}

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

async function save(filePath: string, content: string | Buffer) {
  await ensureDir(join(filePath, '..'));
  await writeFile(filePath, content);
}

function log(msg: string) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

// ─── Concurrency helper ──────────────────────────────────────────

interface Task<T> {
  label: string;
  fn: () => Promise<T>;
}

async function runWithConcurrency<T>(tasks: Task<T>[], limit: number): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const idx = nextIndex++;
      const task = tasks[idx];
      try {
        const value = await task.fn();
        results[idx] = { status: 'fulfilled', value };
      } catch (reason) {
        results[idx] = { status: 'rejected', reason };
        log(`  [${task.label}] ERROR: ${reason instanceof Error ? reason.message : String(reason)}`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ─── ffmpeg MP3 remux ────────────────────────────────────────────

async function remuxMp3(rawPath: string): Promise<string> {
  const fixedPath = rawPath.replace(/\.mp3$/, '_fixed.mp3');
  try {
    await execFileAsync('ffmpeg', ['-y', '-i', rawPath, '-c', 'copy', fixedPath]);
    // Replace raw with fixed
    await unlink(rawPath);
    await rename(fixedPath, rawPath);
    return rawPath;
  } catch {
    log('    Warning: ffmpeg not available — MP3 duration metadata may be incorrect');
    // Clean up partial fixed file if it exists
    try { await unlink(fixedPath); } catch { /* ignore */ }
    return rawPath;
  }
}

// ─── Human-readable formatters ────────────────────────────────────

function formatSyllabusMd(syllabus: Syllabus): string {
  const lines: string[] = [];
  lines.push(`# ${syllabus.courseTitle}`, '');
  lines.push('## Course Overview', '', syllabus.courseOverview, '');
  for (const ch of syllabus.chapters) {
    lines.push(`## Chapter ${ch.number}: ${ch.title}`, '', ch.narrative, '');
    lines.push(`**Key Concepts:** ${ch.keyConcepts.join(', ')}`, '');
    if (ch.widgets.length > 0) {
      lines.push('### Interactive Widgets', '');
      for (const w of ch.widgets) {
        lines.push(`**${w.title}**`, '', w.description, '');
      }
    }
    if (ch.scienceAnnotations.length > 0) {
      lines.push('### Learning Science Annotations', '');
      for (const ann of ch.scienceAnnotations) {
        lines.push(`- **[${ann.principle}]** ${ann.description}`);
      }
      lines.push('');
    }
    lines.push('---', '');
  }
  return lines.join('\n');
}

function formatResearchMd(dossier: ResearchDossier, chapterTitle: string): string {
  const lines = [`# Research Dossier — ${chapterTitle}`, ''];
  if (dossier.synthesisNotes) {
    lines.push('## Synthesis Notes', '', dossier.synthesisNotes, '');
  }
  lines.push(`## Sources (${dossier.sources.length})`, '');
  dossier.sources.forEach((s, i) => {
    lines.push(`### ${i + 1}. ${s.title}`);
    lines.push('');
    lines.push(`**${s.authors} (${s.year})**`);
    if (s.doi) lines.push(`DOI: ${s.doi}`);
    if (s.url) lines.push(`URL: ${s.url}`);
    lines.push('');
    lines.push(s.summary);
    if (s.relevance) lines.push('', `*Relevance:* ${s.relevance}`);
    lines.push('', '---', '');
  });
  return lines.join('\n');
}

function formatDiscussionMd(discussions: Array<{ prompt: string; hook: string }>, chapterTitle: string): string {
  const lines = [`# Conversation Starters — ${chapterTitle}`, ''];
  discussions.forEach((d, i) => {
    lines.push(`## ${i + 1}. ${d.hook}`);
    lines.push('');
    lines.push(d.prompt);
    lines.push('');
  });
  return lines.join('\n');
}

function formatActivitiesMd(activities: Array<{ title: string; duration: string; description: string; materials: string; learningGoal: string; scalingNotes: string }>, chapterTitle: string): string {
  const lines = [`# Activities — ${chapterTitle}`, ''];
  activities.forEach((a, i) => {
    lines.push(`## ${i + 1}. ${a.title} (${a.duration})`);
    lines.push('');
    lines.push(a.description);
    lines.push('');
    if (a.materials) lines.push(`**Materials:** ${a.materials}`, '');
    if (a.learningGoal) lines.push(`**Learning Goal:** ${a.learningGoal}`, '');
    if (a.scalingNotes) lines.push(`**Scaling Notes:** ${a.scalingNotes}`, '');
    lines.push('---', '');
  });
  return lines.join('\n');
}

function formatInClassQuizMd(questions: InClassQuizQuestion[], chapterTitle: string): string {
  const lines = [`# In-Class Quiz — ${chapterTitle}`, ''];
  questions.forEach((q, i) => {
    lines.push(`## Question ${i + 1}`);
    lines.push('');
    lines.push(q.question);
    lines.push('');
    const allOptions = [
      { text: q.correctAnswer, correct: true },
      ...q.distractors.map(d => ({ text: d.text, correct: false })),
    ];
    const labels = ['A', 'B', 'C', 'D'];
    allOptions.forEach((opt, j) => {
      const marker = opt.correct ? ' *' : '';
      lines.push(`${labels[j]}. ${opt.text}${marker}`);
    });
    lines.push('');
    lines.push(`**Correct:** ${labels[allOptions.findIndex(o => o.correct)]}`);
    if (q.correctFeedback) lines.push(`**Feedback:** ${q.correctFeedback}`);
    lines.push('');
    q.distractors.forEach((d) => {
      if (d.feedback) lines.push(`**If ${labels[allOptions.findIndex(o => o.text === d.text)]}:** ${d.feedback}`);
    });
    lines.push('', '---', '');
  });
  return lines.join('\n');
}

function formatSlidesMd(slides: SlideData[], chapterTitle: string): string {
  const lines = [`# Slides — ${chapterTitle}`, ''];
  slides.forEach((s, i) => {
    const layoutTag = s.layout ? ` [${s.layout}]` : '';
    lines.push(`## Slide ${i + 1}: ${s.title}${layoutTag}`);
    lines.push('');
    if (s.bodyText) {
      lines.push(`> ${s.bodyText}`);
      lines.push('');
    }
    if (s.bullets.length > 0) {
      s.bullets.forEach(b => lines.push(`- ${b}`));
      lines.push('');
    }
    if (s.speakerNotes) {
      lines.push(`*Speaker Notes:* ${s.speakerNotes}`);
      lines.push('');
    }
    lines.push('---', '');
  });
  return lines.join('\n');
}

// ─── Material generators (per chapter) ───────────────────────────

async function generatePracticeQuiz(
  ch: ChapterSyllabus,
  chapterHtml: string,
  syllabus: Syllabus,
  prefix: string,
) {
  log(`  Ch ${prefix} Practice quiz...`);
  const quizText = await streamWithRetry(
    {
      apiKey: ANTHROPIC_API_KEY!,
      model: MODELS.opus,
      system: buildPracticeQuizPrompt(),
      messages: [{
        role: 'user',
        content: buildPracticeQuizUserPrompt(
          ch.title, ch.narrative, ch.keyConcepts, chapterHtml.slice(0, 3000),
        ),
      }],
      thinkingBudget: 'high',
      maxTokens: 8000,
    },
    { onThinking: () => process.stdout.write('.'), onText: () => process.stdout.write('+') },
  );
  console.log('');

  const balancedQuiz = await balancePracticeQuiz(quizText, ANTHROPIC_API_KEY!);
  await save(join(OUTPUT_DIR, 'quizzes', `${prefix}_practice.md`), balancedQuiz);

  try {
    const quizHtml = buildQuizHtml(ch.title, balancedQuiz, syllabus.courseTitle, setup.themeId);
    await save(join(OUTPUT_DIR, 'quizzes', `${prefix}_practice.html`), quizHtml);
  } catch {
    log(`    Ch ${prefix} Warning: Quiz HTML generation failed, markdown saved`);
  }
  log(`    Ch ${prefix} Saved practice quiz`);
}

async function generateInClassQuiz(
  ch: ChapterSyllabus,
  chapterHtml: string,
  syllabus: Syllabus,
  prefix: string,
) {
  log(`  Ch ${prefix} In-class quiz...`);
  const icqText = await streamWithRetry(
    {
      apiKey: ANTHROPIC_API_KEY!,
      model: MODELS.opus,
      system: buildInClassQuizPrompt(),
      messages: [{
        role: 'user',
        content: buildInClassQuizUserPrompt(
          ch.title, ch.narrative, ch.keyConcepts, chapterHtml.slice(0, 3000),
        ),
      }],
      thinkingBudget: 'high',
      maxTokens: 8000,
    },
    { onThinking: () => process.stdout.write('.'), onText: () => process.stdout.write('+') },
  );
  console.log('');

  const parsed = parseJson(icqText) as InClassQuizQuestion[];
  const balanced = await balanceInClassQuiz(parsed, ANTHROPIC_API_KEY!);
  await save(join(OUTPUT_DIR, 'quizzes', `${prefix}_inclass.md`), formatInClassQuizMd(balanced, ch.title));
  await save(join(OUTPUT_DIR, 'quizzes', `${prefix}_inclass.json`), JSON.stringify(balanced, null, 2));

  try {
    const zipBlob = await generateQuizDocPackage(balanced, syllabus.courseTitle, ch.title);
    const zipBuffer = Buffer.from(await zipBlob.arrayBuffer());
    await save(join(OUTPUT_DIR, 'quizzes', `${prefix}_inclass_versions.zip`), zipBuffer);
    log(`    Ch ${prefix} Saved in-class quiz (+ 5 DOCX versions)`);
  } catch (docxErr) {
    log(`    Ch ${prefix} DOCX export error: ${docxErr instanceof Error ? docxErr.message : String(docxErr)}`);
  }
}

async function generateDiscussion(
  ch: ChapterSyllabus,
  syllabus: Syllabus,
  prefix: string,
) {
  log(`  Ch ${prefix} Discussion...`);
  const discText = await streamWithRetry(
    {
      apiKey: ANTHROPIC_API_KEY!,
      system: buildDiscussionPrompt(),
      messages: [{
        role: 'user',
        content: buildDiscussionUserPrompt(
          ch.title, ch.keyConcepts, setup.cohortSize, setup.teachingEnvironment,
        ),
      }],
      thinkingBudget: 'medium',
      maxTokens: 4000,
    },
    { onThinking: () => process.stdout.write('.'), onText: () => process.stdout.write('+') },
  );
  console.log('');

  const discussions = parseJson(discText) as Array<{ prompt: string; hook: string }>;
  await save(join(OUTPUT_DIR, 'discussion', `${prefix}_discussion.md`), formatDiscussionMd(discussions, ch.title));
  await save(join(OUTPUT_DIR, 'discussion', `${prefix}_discussion.json`), JSON.stringify(discussions, null, 2));

  try {
    const docxBuf = await buildDiscussionDocx(discussions, syllabus.courseTitle, ch.title);
    await save(join(OUTPUT_DIR, 'discussion', `${prefix}_discussion.docx`), docxBuf);
  } catch (err) {
    log(`    Ch ${prefix} Discussion DOCX error: ${err instanceof Error ? err.message : String(err)}`);
  }
  log(`    Ch ${prefix} Saved discussion`);
}

async function generateActivities(
  ch: ChapterSyllabus,
  syllabus: Syllabus,
  prefix: string,
) {
  log(`  Ch ${prefix} Activities...`);
  const actText = await streamWithRetry(
    {
      apiKey: ANTHROPIC_API_KEY!,
      system: buildActivitiesPrompt(),
      messages: [{
        role: 'user',
        content: buildActivitiesUserPrompt(
          ch.title, ch.keyConcepts, setup.cohortSize, setup.teachingEnvironment, setup.environmentNotes,
        ),
      }],
      thinkingBudget: 'medium',
      maxTokens: 4000,
    },
    { onThinking: () => process.stdout.write('.'), onText: () => process.stdout.write('+') },
  );
  console.log('');

  const activities = parseJson(actText) as Array<{ title: string; duration: string; description: string; materials: string; learningGoal: string; scalingNotes: string }>;
  await save(join(OUTPUT_DIR, 'activities', `${prefix}_activities.md`), formatActivitiesMd(activities, ch.title));
  await save(join(OUTPUT_DIR, 'activities', `${prefix}_activities.json`), JSON.stringify(activities, null, 2));

  try {
    const docxBuf = await buildActivitiesDocx(activities, syllabus.courseTitle, ch.title);
    await save(join(OUTPUT_DIR, 'activities', `${prefix}_activities.docx`), docxBuf);
  } catch (err) {
    log(`    Ch ${prefix} Activities DOCX error: ${err instanceof Error ? err.message : String(err)}`);
  }
  log(`    Ch ${prefix} Saved activities`);
}

async function generateAudio(
  ch: ChapterSyllabus,
  chapterHtml: string,
  syllabus: Syllabus,
  prefix: string,
) {
  log(`  Ch ${prefix} Audio transcript...`);
  const transcriptText = await streamWithRetry(
    {
      apiKey: ANTHROPIC_API_KEY!,
      system: buildAudioTranscriptPrompt(),
      messages: [{
        role: 'user',
        content: buildAudioTranscriptUserPrompt(ch.title, chapterHtml),
      }],
      thinkingBudget: 'medium',
      maxTokens: 8000,
    },
    { onThinking: () => process.stdout.write('.'), onText: () => process.stdout.write('+') },
  );
  console.log('');

  await save(join(OUTPUT_DIR, 'audio', `${prefix}_transcript.md`), transcriptText);

  try {
    const docxBuf = await buildTranscriptDocx(transcriptText, syllabus.courseTitle, ch.title);
    await save(join(OUTPUT_DIR, 'audio', `${prefix}_transcript.docx`), docxBuf);
  } catch (err) {
    log(`    Ch ${prefix} Transcript DOCX error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // TTS if ElevenLabs key available
  if (ELEVENLABS_API_KEY) {
    log(`    Ch ${prefix} Synthesizing audio with ElevenLabs...`);
    try {
      const { generateAudiobook } = await import('../src/services/elevenlabs/tts');
      const audioBlob = await generateAudiobook(transcriptText, ELEVENLABS_API_KEY, {
        voiceId: setup.voiceId,
        onProgress: (current, total) => log(`      Ch ${prefix} TTS chunk ${current}/${total}`),
      });
      const arrayBuffer = await audioBlob.arrayBuffer();
      const mp3Path = join(OUTPUT_DIR, 'audio', `${prefix}.mp3`);
      await save(mp3Path, Buffer.from(arrayBuffer));
      // Remux to fix duration metadata
      await remuxMp3(mp3Path);
      log(`    Ch ${prefix} Saved MP3 audio`);
    } catch (err) {
      log(`    Ch ${prefix} TTS error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  log(`    Ch ${prefix} Saved transcript`);
}

async function generateSlides(
  ch: ChapterSyllabus,
  chapterHtml: string,
  syllabus: Syllabus,
  prefix: string,
) {
  log(`  Ch ${prefix} Slides...`);
  const slidesText = await streamWithRetry(
    {
      apiKey: ANTHROPIC_API_KEY!,
      system: buildSlidesPrompt(),
      messages: [{
        role: 'user',
        content: buildSlidesUserPrompt(ch.title, ch.keyConcepts, chapterHtml),
      }],
      thinkingBudget: 'medium',
      maxTokens: 4000,
    },
    { onThinking: () => process.stdout.write('.'), onText: () => process.stdout.write('+') },
  );
  console.log('');

  const slides = parseJson(slidesText) as SlideData[];
  await save(join(OUTPUT_DIR, 'slides', `${prefix}_slides.md`), formatSlidesMd(slides, ch.title));
  await save(join(OUTPUT_DIR, 'slides', `${prefix}_slides.json`), JSON.stringify(slides, null, 2));

  try {
    const pptxBlob = await generatePptx(slides, syllabus.courseTitle, ch.title, setup.themeId);
    const pptxBuffer = Buffer.from(await pptxBlob.arrayBuffer());
    await save(join(OUTPUT_DIR, 'slides', `${prefix}_slides.pptx`), pptxBuffer);
    log(`    Ch ${prefix} Saved slides (+ PPTX)`);
  } catch (pptxErr) {
    log(`    Ch ${prefix} PPTX export error: ${pptxErr instanceof Error ? pptxErr.message : String(pptxErr)}`);
  }
}

async function generateInfographic(
  ch: ChapterSyllabus,
  chapterHtml: string,
  prefix: string,
) {
  if (!GEMINI_API_KEY) return;

  log(`  Ch ${prefix} Infographic...`);
  // Phase 1: generate the prompt
  const promptText = await streamWithRetry(
    {
      apiKey: ANTHROPIC_API_KEY!,
      model: MODELS.opus,
      system: buildInfographicMetaPrompt(setup.themeId),
      messages: [{
        role: 'user',
        content: buildInfographicMetaUserPrompt(ch.title, ch.keyConcepts, chapterHtml),
      }],
      thinkingBudget: 'medium',
      maxTokens: 2000,
    },
    { onThinking: () => process.stdout.write('.'), onText: () => process.stdout.write('+') },
  );
  console.log('');

  // Phase 2: generate the image
  const { base64, mimeType } = await generateInfographicNode(promptText, GEMINI_API_KEY);
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  await save(
    join(OUTPUT_DIR, 'infographic', `${prefix}.${ext}`),
    Buffer.from(base64, 'base64'),
  );
  log(`    Ch ${prefix} Saved infographic (.${ext})`);
}

// ─── Per-chapter material generation ─────────────────────────────

async function generateChapterMaterials(
  ch: ChapterSyllabus,
  chapterHtml: string,
  syllabus: Syllabus,
  prefix: string,
) {
  // Parallel batch 1: Opus tasks (quizzes)
  const opusTasks: Task<void>[] = [
    { label: `Ch${prefix}-practice-quiz`, fn: () => generatePracticeQuiz(ch, chapterHtml, syllabus, prefix) },
    { label: `Ch${prefix}-inclass-quiz`, fn: () => generateInClassQuiz(ch, chapterHtml, syllabus, prefix) },
  ];

  // Parallel batch 2: Sonnet/Gemini tasks
  const sonnetTasks: Task<void>[] = [
    { label: `Ch${prefix}-discussion`, fn: () => generateDiscussion(ch, syllabus, prefix) },
    { label: `Ch${prefix}-activities`, fn: () => generateActivities(ch, syllabus, prefix) },
    { label: `Ch${prefix}-audio`, fn: () => generateAudio(ch, chapterHtml, syllabus, prefix) },
    { label: `Ch${prefix}-slides`, fn: () => generateSlides(ch, chapterHtml, syllabus, prefix) },
  ];
  if (GEMINI_API_KEY) {
    sonnetTasks.push({ label: `Ch${prefix}-infographic`, fn: () => generateInfographic(ch, chapterHtml, prefix) });
  }

  // Run both batches concurrently
  await Promise.all([
    runWithConcurrency(opusTasks, 2),
    runWithConcurrency(sonnetTasks, 5),
  ]);
}

// ─── Research for a single chapter ───────────────────────────────

async function researchChapter(ch: ChapterSyllabus, syllabus: Syllabus): Promise<ResearchDossier> {
  log(`  Research Ch ${pad(ch.number)}: "${ch.title}"`);
  try {
    const researchText = await streamWithRetry(
      {
        apiKey: ANTHROPIC_API_KEY!,
        system: RESEARCH_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: buildResearchUserPrompt(ch.title, ch.narrative, ch.keyConcepts),
        }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        maxTokens: 16000,
      },
      {
        onWebSearch: (q) => log(`    Ch ${pad(ch.number)} search: ${q}`),
        onText: () => process.stdout.write('+'),
      },
    );
    console.log('');

    let dossier = parseResearchResponse(researchText, ch.number);
    if (!dossier) {
      log(`    Warning: Could not parse research response for Ch ${ch.number}`);
      dossier = {
        chapterNumber: ch.number,
        sources: [],
        synthesisNotes: researchText.slice(0, 500),
      };
    }

    // Validate DOIs
    const dois = dossier.sources.map(s => s.doi).filter((d): d is string => !!d);
    if (dois.length > 0) {
      try {
        const validity = await validateDois(dois);
        dossier.sources = dossier.sources.map(s => {
          if (s.doi && validity.has(s.doi) && !validity.get(s.doi)) {
            return { ...s, doi: undefined };
          }
          return s;
        });
      } catch {
        // DOI validation failed — keep as-is
      }
    }

    const prefix = pad(ch.number);

    // Save .md
    await save(
      join(OUTPUT_DIR, 'research', `${prefix}_research.md`),
      formatResearchMd(dossier, ch.title),
    );

    // Save .docx
    try {
      const docxBuf = await buildResearchDocx(dossier, syllabus.courseTitle, ch.title);
      await save(join(OUTPUT_DIR, 'research', `${prefix}_research.docx`), docxBuf);
    } catch (err) {
      log(`    Ch ${prefix} Research DOCX error: ${err instanceof Error ? err.message : String(err)}`);
    }

    log(`    ${dossier.sources.length} sources found`);
    return dossier;
  } catch (err) {
    log(`    ERROR: ${err instanceof Error ? err.message : String(err)}`);
    const fallback: ResearchDossier = {
      chapterNumber: ch.number,
      sources: [],
      synthesisNotes: 'Research failed. Chapter will be generated from model knowledge.',
    };
    await save(
      join(OUTPUT_DIR, 'research', `${pad(ch.number)}_research.md`),
      formatResearchMd(fallback, ch.title),
    );
    return fallback;
  }
}

// ─── Pipeline ─────────────────────────────────────────────────────

async function main() {
  log(`ClassBuild CLI v2 — "${setup.topic}" (${setup.numChapters} chapters)`);
  log(`Output directory: ${OUTPUT_DIR}`);
  log(`Models: Opus=${MODELS.opus}, Sonnet=${MODELS.sonnet}`);
  if (setup.learnerNotes) log(`Notes: ${setup.learnerNotes}`);
  if (GEMINI_API_KEY) log('Gemini API key detected — infographics enabled');
  if (ELEVENLABS_API_KEY) log('ElevenLabs API key detected — TTS enabled');

  await ensureDir(OUTPUT_DIR);

  // ── Stage 1: Syllabus ───────────────────────────────────────────
  let syllabus: Syllabus;

  if (values.syllabus) {
    log('');
    log(`═══ Stage 1: Loading Syllabus from ${values.syllabus} ═══`);
    const raw = await readFile(values.syllabus, 'utf-8');
    syllabus = JSON.parse(raw) as Syllabus;
    log(`Syllabus: "${syllabus.courseTitle}" — ${syllabus.chapters.length} chapters`);
  } else {
    log('');
    log('═══ Stage 1: Generating Syllabus ═══');

    const { systemPrompt: syllabusSystem, userMessage: syllabusUser } = buildSyllabusPrompt(setup);

    const syllabusText = await streamWithRetry(
      {
        apiKey: ANTHROPIC_API_KEY,
        model: MODELS.opus,
        system: syllabusSystem,
        messages: [{ role: 'user', content: syllabusUser }],
        thinkingBudget: 'max',
        maxTokens: 16000,
      },
      {
        onThinking: () => process.stdout.write('.'),
        onText: () => process.stdout.write('+'),
      },
    );
    console.log('');

    const parsed = parseSyllabusResponse(syllabusText);
    if (!parsed) {
      console.error('Failed to parse syllabus response. Raw text saved to syllabus_raw.txt');
      await save(join(OUTPUT_DIR, 'syllabus_raw.txt'), syllabusText);
      process.exit(1);
    }
    syllabus = parsed;

    log(`Syllabus: "${syllabus.courseTitle}" — ${syllabus.chapters.length} chapters`);
    await save(join(OUTPUT_DIR, 'syllabus.json'), JSON.stringify(syllabus, null, 2));
    await save(join(OUTPUT_DIR, 'syllabus.md'), formatSyllabusMd(syllabus));
    try {
      const syllabusDocx = await buildSyllabusDocx(syllabus);
      await save(join(OUTPUT_DIR, 'syllabus.docx'), syllabusDocx);
    } catch (err) {
      log(`  Syllabus DOCX error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (STOP_AFTER === 'syllabus') {
    log('');
    log('═══ Stopped after syllabus (--stop-after syllabus) ═══');
    log(`Review: ${join(OUTPUT_DIR, 'syllabus.json')}`);
    log('Re-run without --stop-after to continue.');
    return;
  }

  // ── Stage 2: Research (3 chapters concurrently) ────────────────
  log('');
  log('═══ Stage 2: Research (3 concurrent) ═══');

  const researchTasks: Task<ResearchDossier>[] = syllabus.chapters.map(ch => ({
    label: `Research-Ch${pad(ch.number)}`,
    fn: () => researchChapter(ch, syllabus),
  }));

  const researchResults = await runWithConcurrency(researchTasks, 3);
  const dossiers: ResearchDossier[] = researchResults.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      chapterNumber: syllabus.chapters[i].number,
      sources: [],
      synthesisNotes: 'Research failed.',
    };
  });

  if (STOP_AFTER === 'research') {
    log('');
    log('═══ Stopped after research (--stop-after research) ═══');
    log(`Review: ${join(OUTPUT_DIR, 'research/')}`);
    log('Re-run without --stop-after to continue.');
    return;
  }

  // ── Stage 3: Per-chapter materials ──────────────────────────────
  log('');
  log('═══ Stage 3: Building Course Materials ═══');

  const hasGemini = !!GEMINI_API_KEY;

  for (const ch of syllabus.chapters) {
    const prefix = pad(ch.number);
    const slug = slugify(ch.title);
    const dossier = dossiers.find(d => d.chapterNumber === ch.number);
    const researchSources = dossier?.sources.map(s => ({
      title: s.title,
      authors: s.authors,
      year: s.year,
      summary: s.summary,
      url: s.url,
      doi: s.doi,
    }));

    log('');
    log(`── Chapter ${prefix}: "${ch.title}" ──`);

    // Chapter HTML must be sequential (Opus call)
    log(`  Ch ${prefix} Generating chapter HTML...`);
    let chapterHtml = '';
    try {
      const chapterText = await streamWithRetry(
        {
          apiKey: ANTHROPIC_API_KEY,
          model: MODELS.opus,
          system: buildChapterPrompt(setup.themeId, hasGemini),
          messages: [{
            role: 'user',
            content: buildChapterUserPrompt(
              syllabus.courseTitle, ch, setup.chapterLength, researchSources, hasGemini,
            ),
          }],
          thinkingBudget: 'high',
          maxTokens: 16000,
        },
        {
          onThinking: () => process.stdout.write('.'),
          onText: () => process.stdout.write('+'),
        },
      );
      console.log('');
      chapterHtml = extractHtml(chapterText);

      // Replace Gemini image placeholders with actual generated images
      if (GEMINI_API_KEY) {
        log(`    Ch ${prefix} Replacing image placeholders...`);
        chapterHtml = await replaceGeminiImagePlaceholdersNode(chapterHtml, GEMINI_API_KEY);
      }

      await save(join(OUTPUT_DIR, 'chapters', `${prefix}_${slug}.html`), chapterHtml);
      log(`    Ch ${prefix} Saved chapter HTML`);
    } catch (err) {
      log(`    Ch ${prefix} ERROR: ${err instanceof Error ? err.message : String(err)}`);
      continue; // Skip remaining materials if chapter fails
    }

    // All remaining materials in parallel
    await generateChapterMaterials(ch, chapterHtml, syllabus, prefix);
  }

  // ── Save course.json summary ────────────────────────────────────
  const course = {
    setup,
    syllabus,
    researchDossiers: dossiers,
    generatedAt: new Date().toISOString(),
  };
  await save(join(OUTPUT_DIR, 'course.json'), JSON.stringify(course, null, 2));

  // ── Stage 4: Publish Package ────────────────────────────────────
  if (!values['no-publish']) {
    log('');
    log('═══ Stage 4: Publish Package ═══');
    const { assemblePublishPackage } = await import('./lib/publish');
    const publishDir = await assemblePublishPackage(OUTPUT_DIR, setup.themeId);
    log(`Publish package: ${publishDir}`);
  }

  log('');
  log('═══ Complete ═══');
  log(`All files saved to ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
