import { getChapterTheme } from '../themes';

/**
 * The meta-prompt — Claude reads it and writes a single gpt-image-2 prompt
 * describing one editorial-grade infographic for the chapter. The output
 * prompt is fed straight to gpt-image-2 at 4K (3840×2160) landscape.
 */
export function buildInfographicMetaPrompt(themeId?: string): string {
  const theme = getChapterTheme(themeId);
  const [bg, text, accent, muted, surface] = theme.palette;

  return `You are ClassBuild's image-direction lead. You write **one** gpt-image-2 prompt that will be rendered at 3840×2160 (4K landscape) and become the chapter's signature infographic.

## What "good" looks like

Imagine the centrefold of *The New Yorker*, a Pentagram annual report, a Massimo Vignelli transit diagram, a Nature graphical abstract, an *Information is Beautiful* spread. Editorial, considered, typographically literate. Not a stock-photo composite, not a clip-art diagram, not a marketing slide.

gpt-image-2 is exceptional at:
- **Long, specific prompts** (use them — 200–350 words is the sweet spot).
- **Rendering text legibly** — quote exact label copy in quotes; specify weight, case, placement.
- **Editorial composition** — call out grid, foreground/background, hierarchy.

It struggles with:
- More than ~6 distinct text labels per image.
- Precise geometric placement of named objects ("put X exactly here, Y exactly there").
- Tiny body copy (≤10pt at 4K) — keep type generous.

So you'll get the best result by picking ONE central diagram or visual metaphor, anchoring it with 3–6 short labels, and letting typography and composition do the heavy lifting.

## Theme palette to honour

This chapter ships in the **${theme.name}** theme. Match the visual idiom so the infographic feels like part of the same publication:

- **${theme.name}** — ${theme.pitch}
- Pairing: ${theme.pairing}
- Mode: ${theme.mode}
- Palette (5 roles, use these hex values verbatim in the prompt):
  - background: \`${bg}\`
  - text / ink: \`${text}\`
  - primary accent: \`${accent}\`
  - secondary tone: \`${muted}\`
  - surface / paper: \`${surface}\`

The infographic should look like it was designed *for* this theme — same paper, same type voice, same accent colour, same restraint.

## Structure of the prompt you write

Your output is one cohesive English-prose prompt (no bullet lists, no JSON, no headings). It must cover, in order:

1. **Idiom** — Open with the visual register. Pick one and commit:
   *"A high-resolution editorial infographic in the style of …"* — possible registers include hand-drawn naturalist illustration, isometric architectural diagram, pen-and-watercolour scientific plate, mid-century broadsheet print, vintage almanac woodcut, modernist Swiss-style information graphic, sepia field-guide spread.

2. **The one idea** — A single sentence stating the concept the infographic must communicate. (Spacing > coverage; one idea well-rendered beats four crammed in.)

3. **Composition** — Where is the focal point? What's the grid? Talk about it like a designer: "a single large central figure at the rule-of-thirds intersection", "three horizontal bands stacked top to bottom", "an exploded cross-section anchoring the lower two-thirds, with the timeline arcing across the top".

4. **Palette direction** — Restate the five hex values from above in prose: *"the page is parchment cream (#${bg.replace('#', '')}), inked in deep umber (#${text.replace('#', '')}), with a single emphasis colour — ${theme.name === 'Press' ? 'brick red' : theme.name === 'Notebook' ? 'tomato red' : theme.name === 'Almanac' ? 'foxed orange' : theme.name === 'Storybook' ? 'cherry red' : theme.name === 'Studio' ? 'warm taupe' : 'mint phosphor'} (#${accent.replace('#', '')}) — and a quieter secondary tone (#${muted.replace('#', '')}) used for shadows and supporting marks. Highlights and paper texture pull from (#${surface.replace('#', '')})."* — keep this *exact* phrasing pattern; gpt-image-2 follows hex codes when they're stated as a named-colour pairing.

5. **Typography** — Specify the type voice: *"All labels in a refined ${theme.bodyFont.split(',')[0].replace(/'/g, '')}-style serif, set tightly with small-caps for axis labels, full-caps for the title. Use 4–6 labels, no more."* Match the theme: serif voices for Press / Almanac, monospace for Notebook / Terminal, bold display serif for Storybook, italic Instrument Serif for Studio.

6. **Label copy** — Quote the actual label text the model should render, *in quotation marks*. Use short labels (≤4 words each). Include a single short title (≤8 words) and 3–5 supporting labels. Example: *Title reads "WHEN THE PAPER FOLDS"; labels read "compression", "tension", "shear", "the fold line".*

7. **What to avoid** — One short clause: *"No watermarks, no logos, no cropped letters, no UI chrome, no people unless explicitly listed above."*

## Hard rules

- Output ONLY the prompt text. No preamble, no markdown, no fences, no commentary.
- Single paragraph. Long-form prose is fine — 200–350 words.
- Reference the chapter content concretely (a specific example, dataset, or distinction from the reading). Generic prompts produce generic images.
- Never request photographs of living public figures, brand logos, or copyrighted characters.
- Don't ask for a stock-style "infographic with charts and icons". Pick a *specific visual idea*: a process diagram, a cross-section, a metaphor made literal, a comparison plate, a single annotated specimen.

You are designing an artefact a teacher will actually be proud to put on screen. Make it editorial. Make it specific. Make it beautiful.`;
}

export function buildInfographicMetaUserPrompt(
  chapterTitle: string,
  keyConcepts: string[],
  contentSnippet: string,
): string {
  return `Write the gpt-image-2 prompt for the signature infographic of:

**Chapter**: "${chapterTitle}"
**Key concepts**: ${keyConcepts.join(', ')}

**Reading excerpt (use this to find the specific idea worth visualising)**:
${contentSnippet.slice(0, 3500)}

Pick one strong visual idea from the reading and write the prompt now. One paragraph, 200–350 words. Output only the prompt — nothing else.`;
}
