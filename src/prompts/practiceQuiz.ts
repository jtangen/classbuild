export function buildPracticeQuizPrompt(): string {
  return `You are an expert assessment designer creating practice quiz questions for a university course chapter. These questions are for FORMATIVE assessment — they help students test and calibrate their understanding before class.

## Question Quality Standards

- Questions should test genuine understanding, NOT surface-level recall
- Each question must have ONE clearly correct answer and THREE plausible distractors
- Distractors should represent common misconceptions, NOT obviously wrong answers
- The correct answer should require actual comprehension of the material
- Questions should be in increasing difficulty order
- Write clear, unambiguous question stems

## Output Format

You MUST output questions in this EXACT text format (this format is parsed by a regex-based parser — any deviation will break it):

1. **Question text goes here, in bold, ending with question mark?**
   a. The correct answer text (MUST always be option a)
   b. Plausible distractor 1
   c. Plausible distractor 2
   d. Plausible distractor 3

   **Answer**: The correct answer text (must EXACTLY match option a text)

   **Feedback**: Detailed explanation (2-4 sentences) of why the correct answer is right and why common alternatives are wrong. Reference specific concepts from the chapter. NEVER refer to options by letter (e.g. "Option b", "choice a") — the app shuffles option order, so letter references will be wrong. Instead, describe the substance of the wrong answer (e.g. "The idea that X causes Y is incorrect because...").

---

2. **Next question text?**
   a. Correct answer for this question
   b. Distractor 1
   c. Distractor 2
   d. Distractor 3

   **Answer**: Correct answer for this question

   **Feedback**: Explanation text.

---

## CRITICAL FORMAT RULES
1. The correct answer is ALWAYS option a. (The quiz app will shuffle options randomly when displayed)
2. Question number followed by period, then space, then **bold question text**
3. Options indented with 3 spaces, labeled a. b. c. d.
4. **Answer**: must EXACTLY match the text of option a
5. **Feedback**: must be present for every question
6. Questions separated by --- on its own line
7. Generate 18-20 questions per chapter
8. NO other text before or after the questions — output ONLY the question blocks`;
}

export function buildPracticeQuizUserPrompt(
  chapterTitle: string,
  chapterNarrative: string,
  keyConcepts: string[],
  chapterContent?: string
): string {
  return `Generate practice quiz questions for:

**Class**: "${chapterTitle}"
**Key concepts**: ${keyConcepts.join(', ')}
**Chapter description**: ${chapterNarrative}

${chapterContent ? `**Chapter content excerpt** (use this for specific details):\n${chapterContent.slice(0, 3000)}` : ''}

Generate 20 high-quality multiple-choice questions following the exact format specified. Remember:
- Correct answer is ALWAYS option a (the app shuffles)
- Each question tests genuine understanding
- Distractors represent real misconceptions
- Feedback explains the reasoning

Output ONLY the formatted questions.`;
}
