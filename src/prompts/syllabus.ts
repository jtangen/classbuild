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
  _conversationHistory?: Array<{ role: string; content: string }>
): { systemPrompt: string; userMessage: string } {
  const wordCount = setup.chapterLength === 'concise' ? '2,000' : setup.chapterLength === 'standard' ? '4,000' : '6,000';
  const readTime = setup.chapterLength === 'concise' ? '10' : setup.chapterLength === 'standard' ? '20' : '30';

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
**Reading length**: ~${wordCount} words each (~${readTime} min reading time)
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

export function parseSyllabusResponse(text: string): Syllabus | null {
  try {
    // Strip markdown code fences if present
    let jsonStr = text.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }

    // Also strip any leading/trailing non-JSON text
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }

    const raw = JSON.parse(jsonStr);

    const syllabus: Syllabus = {
      courseTitle: raw.courseTitle || 'Untitled Course',
      courseOverview: raw.courseOverview || '',
      chapters: (raw.chapters || []).map((ch: Record<string, unknown>, i: number): ChapterSyllabus => ({
        number: (ch.number as number) || i + 1,
        title: (ch.title as string) || `Chapter ${i + 1}`,
        narrative: (ch.narrative as string) || '',
        keyConcepts: (ch.keyConcepts as string[]) || [],
        widgets: ((ch.widgets as Array<Record<string, string>>) || []).map((w) => ({
          title: w.title || '',
          description: w.description || '',
          concept: w.concept || '',
          rationale: w.rationale || '',
        })),
        scienceAnnotations: ((ch.scienceAnnotations as Array<Record<string, unknown>>) || []).map((a): ScienceAnnotation => ({
          principle: normalizePrinciple(a.principle as string),
          description: (a.description as string) || '',
          relatedChapters: (a.relatedChapters as number[]) || [],
        })),
        spacingConnections: (ch.spacingConnections as number[]) || [],
      })),
    };

    return syllabus;
  } catch (e) {
    console.error('Failed to parse syllabus response:', e);
    return null;
  }
}
