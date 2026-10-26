import type { CourseSetup, Syllabus, ChapterSyllabus, ScienceAnnotation, SciencePrinciple } from '../types/course';

/** Normalize LLM-generated principle names to canonical keys */
function normalizePrinciple(raw: string): SciencePrinciple {
  const s = String(raw).toLowerCase().trim().replace(/[_\s]+/g, '-');
  if (s.includes('spacing') || s.includes('distributed')) return 'spacing';
  if (s.includes('interleav')) return 'interleaving';
  if (s.includes('retrieval') || s.includes('testing-effect') || s.includes('test-effect')) return 'retrieval';
  if (s.includes('example') || s.includes('concrete') || s.includes('analogy') || s.includes('case-stud')) return 'examples';
  if (s.includes('dual') || s.includes('visual')) return 'dual-coding';
  return 'spacing'; // safe fallback
}

export function buildSyllabusPrompt(
  setup: CourseSetup,
  refinementFeedback?: string,
): { systemPrompt: string; userMessage: string } {
  // If the user supplied a free-text reading length brief, pass it verbatim
  // to the model. Otherwise fall back to the enum-derived word/time targets.
  const briefTrimmed = setup.chapterLengthBrief?.trim();
  const wordCount = briefTrimmed
    ? briefTrimmed
    : setup.chapterLength === 'concise' ? '2,000' : setup.chapterLength === 'standard' ? '4,000' : '6,000';
  const readTime = briefTrimmed
    ? '(see brief above)'
    : setup.chapterLength === 'concise' ? '10' : setup.chapterLength === 'standard' ? '20' : '30';

  const systemPrompt = `You are ClassBuild, an expert course architect that designs pedagogically-principled university courses. You combine deep subject matter expertise with decades of evidence-based learning science research.

You are designing a course that will be used to generate complete chapter content, interactive widgets, practice quizzes, in-class quizzes, discussion questions, activity suggestions, audiobook narrations, and presentation slides. The syllabus you create is the architectural blueprint for ALL of these downstream outputs, so it must be extraordinarily well-designed.

## Learning Science Principles

Your designs MUST embed ALL FIVE of these evidence-based learning principles throughout:

1. **Spacing** (Distributed Practice): Key concepts must reappear across multiple chapters with increasing complexity. Early concepts should be revisited and deepened in later chapters. Map specific spacing connections between chapters.

2. **Interleaving**: Related topics from different chapters should be mixed in practice, review, and examples. Don't block all of one topic together — weave complementary ideas across the course arc.

3. **Retrieval Practice** (Testing Effect): Every chapter must include built-in moments where learners actively recall information before receiving it. Design "predict before you peek" moments, self-test opportunities, and reflection prompts.

4. **Concrete Examples**: Every abstract concept must be grounded with vivid, memorable, real-world examples. Use analogies, case studies, and scenarios that make theory tangible and relatable.

5. **Dual Coding**: Concepts should be presented both verbally AND visually. Interactive widgets, diagrams, and visual demonstrations are not decorations — they are essential for encoding information through multiple channels.

## Output Format

You MUST respond with ONLY valid JSON (no markdown code fences, no commentary before or after). The JSON must match this exact structure:

{
  "courseTitle": "A compelling, specific course title — evocative, not generic",
  "courseOverview": "2-3 paragraphs explaining the pedagogical philosophy, how the course arc works, and what makes this course special. Written for the instructor.",
  "chapters": [
    {
      "number": 1,
      "title": "Compelling chapter title — specific and evocative, NOT 'Chapter 1: Introduction'",
      "narrative": "2-3 rich paragraphs: what this chapter covers, why it matters, its place in the course arc, how it connects to other chapters, what students will be able to do after completing it",
      "keyConcepts": ["concept1", "concept2", "concept3", "concept4"],
      "widgets": [
        {
          "title": "Specific widget name",
          "description": "Exactly what the widget does: what the user interacts with, what they see, what changes. Must be specific enough to implement as HTML/JS.",
          "concept": "Which concept this illustrates",
          "rationale": "Why this interactive experience is more effective than static text for this concept"
        }
      ],
      "scienceAnnotations": [
        {
          "principle": "spacing",
          "description": "Specific description of how this principle is implemented in this chapter",
          "relatedChapters": [3, 5]
        }
      ],
      "spacingConnections": []
    }
  ]
}

## Critical Requirements

- **Chapter titles**: Evocative and specific. "The Replication Crisis" not "Chapter 8: Research Methods Issues". "When Intuition Fails" not "Chapter 3: Cognitive Biases". The title should make someone curious.
- **Narratives**: Rich, detailed, written with genuine enthusiasm for the subject. Show how each chapter fits the course story arc. Narratives are ARCHITECTURAL — they describe what students will explore, why it matters, and how the chapter connects to the course arc. They should NAME examples ("Google PageRank, bridge vibrations, population ecology") but NEVER work through them. NEVER include calculations, formulas, worked problems, numerical examples, or pseudo-code in chapter descriptions. Those belong in the generated chapters themselves, not in the syllabus.
- **Science annotations**: MINIMUM 3 per chapter, covering different principles. Later chapters should have MORE annotations as spacing and interleaving connections accumulate.
- **Spacing connections**: spacingConnections array should list chapter numbers that THIS chapter revisits/builds on. Chapter 1 has none; by Chapter 8+, there should be 2-4 connections back to earlier chapters.
- **Widgets**: ${setup.widgetsPerChapter} per chapter. Each must be a genuinely interactive experience (not just "click to reveal text"). Think: sliders, simulations, drag-and-drop, parameter exploration, prediction→feedback loops, interactive visualizations.
- **JSON validity**: No trailing commas. No comments. No text outside the JSON object. Must parse with JSON.parse().`;

  let userMessage: string;

  if (refinementFeedback) {
    userMessage = `The instructor has reviewed the syllabus and requests the following changes:

"${refinementFeedback}"

IMPORTANT REFINEMENT RULES:
1. Revise the ENTIRE syllabus incorporating this feedback.
2. Keep chapter narratives ARCHITECTURAL — describe themes, approach, and significance. Name examples but never work through them. No calculations, formulas, or worked problems in narratives.
3. If the feedback relates to ANY learning science principle (spacing, interleaving, retrieval practice, concrete examples, dual coding), you MUST update the scienceAnnotations on relevant chapters accordingly. For example, if the user asks for "more concrete examples", add "examples" annotations to chapters that currently lack them. The annotation counts should visibly reflect the requested changes.
4. Maintain the same JSON output format. Output ONLY the complete revised JSON — no commentary before or after.`;
  } else {
    userMessage = `Design a complete course syllabus for:

**Topic**: ${setup.topic}
${setup.specificTopics ? `**Required topics**: ${setup.specificTopics}` : ''}
${setup.avoidTopics ? `**Exclude**: ${setup.avoidTopics}` : ''}
${setup.textbookReference ? `**Reference text**: ${setup.textbookReference}` : ''}

**Audience**: ${setup.educationLevel.replace(/-/g, ' ')} students
**Prior knowledge**: ${setup.priorKnowledge === 'none' ? 'Complete beginners — no prior knowledge assumed' : setup.priorKnowledge === 'some' ? 'Some foundational knowledge — basic concepts understood' : 'Significant background — ready for advanced material'}
**Cohort size**: ~${setup.cohortSize} students (${setup.cohortSize < 30 ? 'small seminar — activities can be intimate and discussion-heavy' : setup.cohortSize < 100 ? 'medium class — mix of small group and larger activities' : 'large lecture — activities should scale, use think-pair-share, polling, etc.'})
${setup.learnerNotes ? `**Additional learner context**: ${setup.learnerNotes}` : ''}

**Course structure**: ${setup.numChapters} classes
${briefTrimmed
  ? `**Reading length** (verbatim from the teacher's brief): ${wordCount}`
  : `**Reading length**: ~${wordCount} words each (~${readTime} min reading time)`}
**Interactive widgets per chapter**: ${setup.widgetsPerChapter}

Design a pedagogically outstanding course. The chapter sequence should tell a coherent intellectual story, building knowledge progressively while weaving in spaced review of earlier concepts. Each chapter should feel like it was crafted by an instructor who deeply cares about their students' learning.

Output ONLY valid JSON.`;
  }

  return { systemPrompt, userMessage };
}

/**
 * Progressive parser: extracts partially-streamed chapters from incomplete JSON.
 * This allows chapter cards to appear in the UI as they stream in.
 */
export function parsePartialChapters(text: string): {
  title: string;
  overview: string;
  chapters: ChapterSyllabus[];
} {
  const result: { title: string; overview: string; chapters: ChapterSyllabus[] } = {
    title: '',
    overview: '',
    chapters: [],
  };

  // Try to extract courseTitle
  const titleMatch = text.match(/"courseTitle"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (titleMatch) result.title = titleMatch[1].replace(/\\"/g, '"');

  // Try to extract courseOverview
  const overviewMatch = text.match(/"courseOverview"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (overviewMatch) result.overview = overviewMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');

  // Try to extract complete chapter objects
  // Find all complete chapter blocks by looking for balanced braces within the chapters array
  const chaptersStart = text.indexOf('"chapters"');
  if (chaptersStart === -1) return result;

  const afterChapters = text.slice(chaptersStart);
  const arrayStart = afterChapters.indexOf('[');
  if (arrayStart === -1) return result;

  const chapterArrayText = afterChapters.slice(arrayStart + 1);

  // Extract individual chapter objects by tracking brace depth
  let depth = 0;
  let chapterStart = -1;
  for (let i = 0; i < chapterArrayText.length; i++) {
    const char = chapterArrayText[i];
    if (char === '{') {
      if (depth === 0) chapterStart = i;
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0 && chapterStart !== -1) {
        const chapterJson = chapterArrayText.slice(chapterStart, i + 1);
        try {
          const ch = JSON.parse(chapterJson);
          result.chapters.push({
            number: ch.number || result.chapters.length + 1,
            title: ch.title || `Chapter ${result.chapters.length + 1}`,
            narrative: ch.narrative || '',
            keyConcepts: ch.keyConcepts || [],
            widgets: (ch.widgets || []).map((w: Record<string, string>) => ({
              title: w.title || '',
              description: w.description || '',
              concept: w.concept || '',
              rationale: w.rationale || '',
            })),
            scienceAnnotations: (ch.scienceAnnotations || []).map((a: Record<string, unknown>): ScienceAnnotation => ({
              principle: normalizePrinciple(a.principle as string),
              description: (a.description as string) || '',
              relatedChapters: (a.relatedChapters as number[]) || [],
            })),
            spacingConnections: ch.spacingConnections || [],
          });
        } catch {
          // Incomplete chapter JSON, skip
        }
        chapterStart = -1;
      }
    }
  }

  return result;
}

/** Minimum topic length Setup accepts — and the floor for any paid syllabus call. */
export function isBriefReady(setup: CourseSetup): boolean {
  return typeof setup.topic === 'string' && setup.topic.trim().length > 10;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const asText = (v: unknown): string =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '';
const asNumbers = (v: unknown): number[] =>
  asList(v)
    .map((n) => (typeof n === 'string' ? Number(n) : n))
    .filter((n): n is number => typeof n === 'number' && Number.isFinite(n));

/**
 * Coerce one syllabus chapter — from model output or an imported project
 * file — so every field the UI maps over or measures is present and typed.
 */
export function normalizeSyllabusChapter(ch: Record<string, unknown>, i: number): ChapterSyllabus {
  return {
    number: typeof ch.number === 'number' && Number.isFinite(ch.number) ? ch.number : i + 1,
    title: asText(ch.title) || `Chapter ${i + 1}`,
    narrative: asText(ch.narrative),
    keyConcepts: asList(ch.keyConcepts).map(asText).filter(Boolean),
    widgets: asList(ch.widgets).filter(isObject).map((w) => ({
      title: asText(w.title),
      description: asText(w.description),
      concept: asText(w.concept),
      rationale: asText(w.rationale),
    })),
    scienceAnnotations: asList(ch.scienceAnnotations).filter(isObject).map((a): ScienceAnnotation => ({
      principle: normalizePrinciple(asText(a.principle)),
      description: asText(a.description),
      relatedChapters: asNumbers(a.relatedChapters),
    })),
    spacingConnections: asNumbers(ch.spacingConnections),
  };
}

/** Coerce a parsed syllabus object. Null when it has no usable chapters. */
export function normalizeSyllabus(raw: unknown): Syllabus | null {
  if (!isObject(raw)) return null;
  const chapters = asList(raw.chapters).filter(isObject).map(normalizeSyllabusChapter);
  if (chapters.length === 0) return null;
  return {
    courseTitle: asText(raw.courseTitle) || 'Untitled Course',
    courseOverview: asText(raw.courseOverview),
    chapters,
  };
}

/**
 * The prompt asks for bare JSON, so try that first. Only then cut the object
 * out of surrounding prose, and only then look inside a code fence — running
 * the fence regex first would match a ``` inside a string value (a
 * code-flavoured widget description) and throw the real object away.
 */
function extractJsonObject(text: string): unknown {
  const sliceObject = (s: string) => {
    const first = s.indexOf('{');
    const last = s.lastIndexOf('}');
    return first !== -1 && last > first ? s.slice(first, last + 1) : s;
  };
  const attempts = [text.trim(), sliceObject(text)];
  const fence = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fence) attempts.push(sliceObject(fence[1]));
  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

export function parseSyllabusResponse(text: string): Syllabus | null {
  try {
    const syllabus = normalizeSyllabus(extractJsonObject(text));
    // Zero chapters (e.g. the object came back wrapped under another key) is
    // a failed parse, not an empty course.
    if (!syllabus) console.error('Failed to parse syllabus response: no chapters found.');
    return syllabus;
  } catch (e) {
    console.error('Failed to parse syllabus response:', e);
    return null;
  }
}
