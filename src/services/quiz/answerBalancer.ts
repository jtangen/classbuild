import type { InClassQuizQuestion } from '../../types/course';
import { streamMessage } from '../claude/streaming';
import { MODELS } from '../claude/client';

// ---------- Practice Quiz Parsing ----------

interface ParsedPracticeQuestion {
  id: number;
  question: string;
  correctAnswer: string;      // option a
  distractors: string[];       // options b, c, d
  blockStart: number;          // char offset in original markdown
  blockEnd: number;
}

function parsePracticeQuiz(markdown: string): ParsedPracticeQuestion[] {
  // Split on --- separators to get question blocks
  const blocks = markdown.split(/\n---\n/);
  const questions: ParsedPracticeQuestion[] = [];
  let offset = 0;

  for (const block of blocks) {
    const blockStart = offset;
    const blockEnd = offset + block.length;
    offset = blockEnd + 5; // account for \n---\n

    // Extract question number and text
    const qMatch = block.match(/^(\d+)\.\s*\*\*([^*]+)\*\*/m);
    if (!qMatch) continue;

    const id = parseInt(qMatch[1]);

    // Extract all options — match "a. text" through to next option or "Answer" or "**"
    const optionRegex = /\s+([a-d])\.\s+([\s\S]*?)(?=\s+[a-d]\.\s|Answer|\*\*|$)/g;
    const options: Record<string, string> = {};
    let m;
    while ((m = optionRegex.exec(block)) !== null) {
      options[m[1]] = m[2].trim();
    }

    if (!options['a']) continue;

    questions.push({
      id,
      question: qMatch[2].trim(),
      correctAnswer: options['a'] || '',
      distractors: [options['b'] || '', options['c'] || '', options['d'] || ''],
      blockStart,
      blockEnd,
    });
  }

  return questions;
}

// ---------- Audit Logic ----------

interface AuditResult {
  flaggedIndices: number[];
  excess: number;
}

function auditQuestions(
  questions: Array<{ correctAnswer: string; distractors: string[] }>
): AuditResult {
  const total = questions.length;
  if (total <= 4) return { flaggedIndices: [], excess: 0 };

  const flaggedIndices: number[] = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const correctLen = q.correctAnswer.length;
    const maxDistractorLen = Math.max(...q.distractors.map(d => d.length));
    if (correctLen > maxDistractorLen) {
      flaggedIndices.push(i);
    }
  }

  const expected = Math.round(total * 0.25);
  const excess = flaggedIndices.length - expected;

  if (excess <= 0) return { flaggedIndices: [], excess: 0 };

  // Randomly select `excess` questions from the flagged set
  const shuffled = [...flaggedIndices].sort(() => Math.random() - 0.5);
  return { flaggedIndices: shuffled.slice(0, excess), excess };
}

// ---------- Rewrite via Claude ----------

const REWRITE_SYSTEM = `You are an assessment editor. For each question below, the correct answer is currently the longest option, which is a detectable pattern. Rewrite 1-2 of the INCORRECT options so the correct answer is no longer the longest.

Rules:
- NEVER modify the correct answer. Only modify incorrect options.
- The rewritten distractor should be no more than ~30% longer than the correct answer. Aim for comparable length, not dramatically longer.
- Add ONE specific detail, qualifying clause, or named example. Do not add multiple subordinate clauses or turn a single sentence into a paragraph.
- Lengthening must be SUBSTANTIVE: a specific mechanism, named theory, concrete example, or realistic-sounding caveat. NOT filler like "including several additional related factors."
- The rewritten distractor should be MORE seductive — a better wrong answer, not just a longer one.
- Read back all four options together. If the rewritten distractor visually stands out as much longer than the others, you've gone too far — trim it.
- You don't need to rewrite all distractors — just enough so the correct answer is no longer the longest option.
- Return ONLY the JSON array.

Input format:
[
  {
    "id": 3,
    "question": "What is...?",
    "correctAnswer": "The correct text",
    "distractors": ["Wrong 1", "Wrong 2", "Wrong 3"]
  }
]

Output format (same structure, only distractors changed):
[
  {
    "id": 3,
    "distractors": ["Elaborated wrong 1 with more detail", "Wrong 2", "Elaborated wrong 3"]
  }
]`;

interface RewriteInput {
  id: number;
  question: string;
  correctAnswer: string;
  distractors: string[];
}

interface RewriteOutput {
  id: number;
  distractors: string[];
}

async function requestRewrites(
  questions: RewriteInput[],
  apiKey: string
): Promise<RewriteOutput[]> {
  const fullText = await streamMessage(
    {
      apiKey,
      model: MODELS.haiku,
      system: REWRITE_SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(questions, null, 2) }],
      thinkingBudget: 'low',
      maxTokens: 4000,
    },
    {} // no streaming callbacks needed
  );

  // Parse the JSON response
  let jsonStr = fullText;
  const match = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (match) jsonStr = match[1];
  const first = jsonStr.indexOf('[');
  const last = jsonStr.lastIndexOf(']');
  if (first !== -1 && last !== -1) jsonStr = jsonStr.slice(first, last + 1);

  return JSON.parse(jsonStr) as RewriteOutput[];
}

// ---------- Public: Practice Quiz ----------

export async function balancePracticeQuiz(
  quizMarkdown: string,
  apiKey: string
): Promise<string> {
  try {
    const questions = parsePracticeQuiz(quizMarkdown);
    const auditInput = questions.map(q => ({
      correctAnswer: q.correctAnswer,
      distractors: q.distractors,
    }));

    const { flaggedIndices, excess } = auditQuestions(auditInput);
    if (excess <= 0) {
      return quizMarkdown;
    }

    // Build rewrite request for flagged questions
    const rewriteInput: RewriteInput[] = flaggedIndices.map(idx => ({
      id: questions[idx].id,
      question: questions[idx].question,
      correctAnswer: questions[idx].correctAnswer,
      distractors: questions[idx].distractors,
    }));

    const rewrites = await requestRewrites(rewriteInput, apiKey);

    // Split markdown into question blocks for scoped replacement
    const parts = quizMarkdown.split(/(\n---\n)/);
    const rewriteMap = new Map<number, RewriteOutput>();
    for (const rw of rewrites) {
      rewriteMap.set(rw.id, rw);
    }

    // Merge rewrites into the markdown
    let result = '';
    for (const part of parts) {
      const qMatch = part.match(/^(\d+)\.\s*\*\*/m);
      if (qMatch) {
        const qId = parseInt(qMatch[1]);
        const rw = rewriteMap.get(qId);
        if (rw) {
          // Find the original question to get original distractors
          const origQ = questions.find(q => q.id === qId);
          if (origQ) {
            let modified = part;
            for (let i = 0; i < origQ.distractors.length; i++) {
              if (rw.distractors[i] && rw.distractors[i] !== origQ.distractors[i]) {
                modified = modified.replace(origQ.distractors[i], rw.distractors[i]);
              }
            }
            result += modified;
            continue;
          }
        }
      }
      result += part;
    }

    return result;
  } catch {
    return quizMarkdown;
  }
}

// ---------- Public: In-Class Quiz ----------

export async function balanceInClassQuiz(
  quiz: InClassQuizQuestion[],
  apiKey: string
): Promise<InClassQuizQuestion[]> {
  try {
    const auditInput = quiz.map(q => ({
      correctAnswer: q.correctAnswer,
      distractors: q.distractors.map(d => d.text),
    }));

    const { flaggedIndices, excess } = auditQuestions(auditInput);
    if (excess <= 0) {
      return quiz;
    }

    const rewriteInput: RewriteInput[] = flaggedIndices.map(idx => ({
      id: idx,
      question: quiz[idx].question,
      correctAnswer: quiz[idx].correctAnswer,
      distractors: quiz[idx].distractors.map(d => d.text),
    }));

    const rewrites = await requestRewrites(rewriteInput, apiKey);

    // Merge rewrites back into the quiz array
    const result = quiz.map((q, i) => {
      const rw = rewrites.find(r => r.id === i);
      if (!rw) return q;
      return {
        ...q,
        distractors: q.distractors.map((d, di) => ({
          ...d,
          text: rw.distractors[di] || d.text,
        })),
      };
    });

    return result;
  } catch {
    return quiz;
  }
}
