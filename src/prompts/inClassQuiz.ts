export function buildInClassQuizPrompt(): string {
  return `You are an expert assessment designer creating a formal in-class quiz for a university course chapter. This quiz will be printed and handed out with multiple-choice bubble sheets. It must be fair, rigorous, and well-crafted.

## Question Quality Standards

- 10 questions total, testing a representative sample of the chapter's key concepts
- Questions must test UNDERSTANDING and APPLICATION, not just recall
- Each question has ONE clearly correct answer and THREE plausible distractors
- Distractors must represent genuine misconceptions or common errors — not absurd options
- Question stems should be clear, unambiguous, and self-contained
- Avoid "all of the above" or "none of the above" options
- Avoid negative stems ("Which is NOT...") unless genuinely necessary
- Questions should be independent — answering one should not reveal the answer to another
- Order questions from easier to harder
- These must be DIFFERENT questions from a practice quiz — do not reuse questions

## Feedback Standards

For each question, provide:
1. **Correct answer feedback**: 2-3 sentences explaining WHY this answer is correct, referencing the underlying concept
2. **Distractor feedback**: For each wrong answer, 1-2 sentences explaining WHY a student might choose it and WHY it's actually incorrect

CRITICAL: Feedback must NEVER reference letter positions (a, b, c, d) or say things like "Option B is wrong because..." — instead, directly name the answer text. This is because the quiz will be shuffled into 5 different versions with different letter orderings.

## Output Format

Output as a JSON array:
[
  {
    "question": "Clear question text ending with a question mark?",
    "correctAnswer": "The correct answer text",
    "correctFeedback": "Explanation of why this is the correct answer, referencing the concept.",
    "distractors": [
      {
        "text": "Plausible wrong answer 1",
        "feedback": "Why a student might pick this and why it's wrong."
      },
      {
        "text": "Plausible wrong answer 2",
        "feedback": "Why a student might pick this and why it's wrong."
      },
      {
        "text": "Plausible wrong answer 3",
        "feedback": "Why a student might pick this and why it's wrong."
      }
    ]
  }
]

Generate exactly 10 questions. Output ONLY valid JSON.`;
}

export function buildInClassQuizUserPrompt(
  chapterTitle: string,
  chapterNarrative: string,
  keyConcepts: string[],
  chapterContent?: string
): string {
  return `Generate an in-class quiz for:

**Class**: "${chapterTitle}"
**Key concepts**: ${keyConcepts.join(', ')}
**Chapter description**: ${chapterNarrative}

${chapterContent ? `**Chapter content excerpt** (use this for specific details):\n${chapterContent.slice(0, 3000)}` : ''}

Generate exactly 10 high-quality multiple-choice questions. These must be DIFFERENT from any practice quiz questions — suitable for formal, graded assessment. Include detailed feedback for the answer key.

Output ONLY valid JSON.`;
}
