function buildEnvironmentBlock(environment?: string, notes?: string): string {
  const labels: Record<string, string> = {
    'lecture-theatre': 'Lecture theatre (tiered/fixed seating — students cannot easily move or form groups)',
    'active-classroom': 'Active classroom (students can form groups easily — either moveable desks/rows that rearrange, or pre-arranged group tables; either way, group work, station rotation, and small-team activities are all feasible)',
    'online': 'Online/hybrid (breakout rooms, shared docs, chat — no physical space)',
    // Legacy values from the four-tile picker map to the consolidated label.
    'collaborative': 'Active classroom (students can form groups easily — pre-arranged group tables in the original setup)',
    'flat-classroom': 'Active classroom (students can form groups easily — moveable desks that can be rearranged)',
  };
  // When the instructor didn't pick an environment, default to the most
  // conservative format — a tiered lecture theatre where students stay seated.
  // This guarantees the model produces activities that can run anywhere, and
  // never invents furniture rearrangement or movement that isn't possible.
  if (!environment) {
    return (
      `\n**Teaching environment**: Not specified — default to classic LECTURE FORMAT.` +
      `\n**Default mode**: Assume tiered/fixed seating, students cannot easily move or form groups. ` +
      `Prefer turn-and-talks with the person next to them, hand-raise polls, think-pair-share without movement, ` +
      `live online polling (Slido / Mentimeter / Padlet), and chalk-talk demonstrations. ` +
      `Avoid anything that requires furniture rearrangement, students moving around the room, ` +
      `or forming circles/stations.`
    );
  }
  let block = `\n**Teaching environment**: ${labels[environment] || environment}`;
  if (notes) block += `\n**Room details**: ${notes}`;
  return block;
}

export function buildActivitiesPrompt(): string {
  return `You are an expert instructional designer creating in-class activity suggestions. These activities transform live class time into dynamic, social, applied learning experiences.

## Design Principles
- Activities should be things worth showing up for — NOT things students could do alone
- Prioritize social interaction, debate, application, and problem-solving
- Activities should be feasible within a class period (5-20 minutes each)
- Include time estimates and material requirements
- Scale appropriately for the given cohort size
- CRITICAL: Activities MUST be physically possible in the teaching environment. If students are in fixed tiered seating, don't ask them to move furniture or form circles. If online, use breakout rooms and shared docs instead of physical movement.

## Output Format

Output as a JSON array:
[
  {
    "title": "Activity name",
    "duration": "10-15 minutes",
    "description": "A clear walkthrough of the activity: what the instructor sets up, what students do in each phase, what they produce or discuss, and how it wraps up. Write 3-5 sentences minimum — enough that an instructor could run this without guessing at the gaps.",
    "materials": "Any required materials (or 'None')",
    "learningGoal": "What this activity reinforces",
    "scalingNotes": "How to adapt for different class sizes"
  }
]

Generate 4-6 activities. Output ONLY valid JSON.`;
}

export function buildActivitiesUserPrompt(
  chapterTitle: string,
  keyConcepts: string[],
  cohortSize: number,
  environment?: string,
  environmentNotes?: string,
): string {
  return `Generate in-class activity suggestions for:

**Class**: "${chapterTitle}"
**Key concepts**: ${keyConcepts.join(', ')}
**Cohort size**: ~${cohortSize} students${buildEnvironmentBlock(environment, environmentNotes)}

Generate 4-6 engaging in-class activities. Make them social, dynamic, and genuinely worth showing up for.`;
}

export function buildActivityDetailPrompt(): string {
  return `You are an expert instructional designer creating detailed, ready-to-run activity plans for university instructors. You take a brief activity summary and flesh it out into a complete facilitation guide.

## Output Format

Output as a JSON object:
{
  "steps": [
    {
      "step": 1,
      "timing": "0:00–2:00",
      "instruction": "What the instructor does/says at this step",
      "studentAction": "What students are doing"
    }
  ],
  "facilitationTips": ["Practical tip for running this well"],
  "commonPitfalls": ["What can go wrong and how to handle it"],
  "debriefGuide": "How to wrap up and connect back to the learning goal",
  "variations": ["Alternative version or extension of this activity"],
  "assessmentIdeas": "Optional ways to assess learning from this activity"
}

## JSON Rules
- Output ONLY valid JSON — no markdown fences, no commentary
- NEVER use literal double quotes inside string values. Use single quotes instead (e.g., 'like this' not "like this")
- No trailing commas`;
}

export function buildActivityDetailUserPrompt(
  activity: { title: string; duration: string; description: string; materials: string; learningGoal: string; scalingNotes: string },
  chapterTitle: string,
  cohortSize: number,
  environment?: string,
  environmentNotes?: string,
): string {
  return `Flesh out this activity into a complete, ready-to-run facilitation guide:

**Class**: "${chapterTitle}"
**Cohort size**: ~${cohortSize} students${buildEnvironmentBlock(environment, environmentNotes)}

**Activity**: ${activity.title}
**Duration**: ${activity.duration}
**Summary**: ${activity.description}
**Materials**: ${activity.materials}
**Learning Goal**: ${activity.learningGoal}
**Scaling**: ${activity.scalingNotes}

Provide detailed step-by-step instructions with timing, facilitation tips, common pitfalls, a debrief guide, variations, and assessment ideas. Make this immediately usable by an instructor who has never run this activity before.`;
}
