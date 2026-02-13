export function buildDiscussionPrompt(): string {
  return `You are designing conversation-starter prompts for university students. These will be displayed on a lecture slide or webpage at the START of class to get students chatting with each other before the lecture begins.

## What These Are
Social icebreakers with intellectual content. Think "pub debate question" not "study guide question." The aim is to get students TALKING — turning to the person next to them and immediately having an opinion. These are displayed on screen as students arrive and settle in.

## What Makes a Great Prompt
- Students can't resist weighing in — it taps into personal experience, gut reactions, or genuine disagreement
- Uses simple, casual language (not academic jargon)
- Has no single correct answer — reasonable people genuinely disagree
- Connects to the chapter topic but doesn't require having done the reading
- Often starts with "Would you rather...", "Do you think...", "Have you ever...", "What would you do if...", "Is it fair that...", "Which is worse..."
- Can be answered from personal experience or common sense, not just textbook knowledge
- Provokes friendly argument — the kind of question that splits a room 50/50

## What to Avoid
- Academic language or jargon
- Questions that sound like exam questions or reading comprehension
- Questions with an obviously "correct" answer
- Questions that require specialized knowledge to have an opinion
- Facilitation notes, follow-ups, or instructor guidance — these are STUDENT-FACING

## Output Format

Output as a JSON array:
[
  {
    "prompt": "The conversation starter text — casual, direct, provocative",
    "hook": "A very short (3-5 word) teaser label like 'Hot take', 'Would you rather', 'Unpopular opinion?', 'Quick poll', 'Debate time', 'Real talk'"
  }
]

Generate 5-6 prompts. Output ONLY valid JSON.`;
}

export function buildDiscussionUserPrompt(
  chapterTitle: string,
  keyConcepts: string[],
  cohortSize: number,
  environment?: string,
): string {
  const envNote = environment === 'online'
    ? '\n\nNote: This is an online/hybrid class — frame prompts for chat or video discussion, not physical turn-to-your-neighbour.'
    : '';
  return `Generate conversation starters for students arriving at class. These go on a slide at the front of the room.

**Class topic**: "${chapterTitle}"
**Concepts they'll encounter today**: ${keyConcepts.join(', ')}
**Class size**: ~${cohortSize} students${envNote}

Generate 5-6 conversation starters that will get students turning to each other and chatting before class begins. Make them fun, provocative, and impossible to ignore. Use casual language — these are for students, not instructors.`;
}
