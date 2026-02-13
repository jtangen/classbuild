import type { Syllabus, CurriculumMap, BloomLevel, AlignmentLevel, LearningObjective } from '../types/course';

export function buildLearningObjectivesPrompt(): string {
  return `You are an expert curriculum designer specializing in constructive alignment and Bloom's taxonomy. You create precise, measurable learning objectives and map them to a curriculum alignment matrix showing where each objective is Introduced (I), Developed (D), and Mastered (M) across chapters.

## Rules

1. Each objective MUST start with an action verb from Bloom's taxonomy (no "Students will be able to..." prefix).
2. Assign the correct bloomLevel from: remember, understand, apply, analyze, evaluate, create.
3. Each objective must appear in at least 3 chapters.
4. Alignment progression must follow: Introduced → Developed → Mastered (I before D before M).
5. Early chapters should have more "introduced" entries; later chapters more "mastered" entries.
6. Generate 8-15 objectives that collectively cover the entire course.
7. Every chapter must have at least one alignment entry.

## Output

Respond with ONLY valid JSON (no markdown code fences, no commentary). Match this structure exactly:

{
  "objectives": [
    {
      "id": 1,
      "text": "Analyze the relationship between X and Y",
      "bloomLevel": "analyze",
      "alignments": { "1": "introduced", "3": "developed", "8": "mastered" }
    }
  ]
}`;
}

export function buildLearningObjectivesUserPrompt(syllabus: Syllabus): string {
  const overview = syllabus.courseOverview.length > 500
    ? syllabus.courseOverview.slice(0, 500) + '...'
    : syllabus.courseOverview;

  const chapterSummaries = syllabus.chapters.map((ch) => {
    const narrative = ch.narrative.length > 300
      ? ch.narrative.slice(0, 300) + '...'
      : ch.narrative;
    return `Chapter ${ch.number}: ${ch.title}\nKey Concepts: ${ch.keyConcepts.join(', ')}\nNarrative: ${narrative}`;
  }).join('\n\n');

  return `Generate a curriculum alignment matrix for this course.

Course: ${syllabus.courseTitle}
Overview: ${overview}

${chapterSummaries}`;
}

const VALID_BLOOM_LEVELS = new Set<BloomLevel>(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']);
const VALID_ALIGNMENT_LEVELS = new Set<AlignmentLevel>(['introduced', 'developed', 'mastered']);

export function parseCurriculumMapResponse(text: string): CurriculumMap | null {
  try {
    // Strip code fences
    let json = text;
    const codeMatch = json.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeMatch) json = codeMatch[1];

    // Find JSON object boundaries
    const firstBrace = json.indexOf('{');
    const lastBrace = json.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) return null;
    json = json.slice(firstBrace, lastBrace + 1);

    // Clean trailing commas
    json = json.replace(/,\s*([}\]])/g, '$1');

    const parsed = JSON.parse(json);
    if (!parsed.objectives || !Array.isArray(parsed.objectives)) return null;

    const objectives: LearningObjective[] = [];
    for (const obj of parsed.objectives) {
      if (!obj.text || !obj.bloomLevel || !obj.alignments) continue;

      const bloomLevel = String(obj.bloomLevel).toLowerCase() as BloomLevel;
      if (!VALID_BLOOM_LEVELS.has(bloomLevel)) continue;

      const alignments: Record<number, AlignmentLevel> = {};
      for (const [key, value] of Object.entries(obj.alignments)) {
        const chapterNum = parseInt(key, 10);
        if (isNaN(chapterNum)) continue;
        const level = String(value).toLowerCase() as AlignmentLevel;
        if (!VALID_ALIGNMENT_LEVELS.has(level)) continue;
        alignments[chapterNum] = level;
      }

      if (Object.keys(alignments).length === 0) continue;

      objectives.push({
        id: typeof obj.id === 'number' ? obj.id : objectives.length + 1,
        text: String(obj.text),
        bloomLevel,
        alignments,
      });
    }

    if (objectives.length === 0) return null;

    return {
      objectives,
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
