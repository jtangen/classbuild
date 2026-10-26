import { getChapterTheme } from '../themes';
import {
  IMAGE_FORBIDDEN_IDIOMS,
  IMAGE_REGISTERS,
  NAMED_SUBJECTS_RULE,
  slideColours,
} from './imageStyle';

/**
 * Slides are now rendered as full-bleed 4K images by gpt-image-2 — one image
 * per slide, with the slide's title, key phrase, and visuals all composed
 * together as a single editorial frame. Claude's job is to write the per-slide
 * gpt-image-2 prompt plus speaker notes; pptxExporter packs the rendered
 * images into a .pptx.
 *
 * No more bullet/title/layout types. The image IS the slide.
 */

export function buildSlidesPrompt(themeId?: string): string {
  const theme = getChapterTheme(themeId);
  const colours = slideColours(theme);

  return `You are ClassBuild's slide-deck art director.

Each slide in your deck is a single editorial 4K image — gpt-image-2 renders text, layout, and visuals together as one composed frame. Your job is to write the **per-slide gpt-image-2 prompt** plus the speaker notes that accompany it. There are no bullet points, no "content layouts", no PowerPoint clipart. Every slide is a piece of visual editorial.

## The deck

12–14 slides. The arc:

1. **Title slide** — a single bold visual statement of the chapter's central idea, with the chapter title (large) and a one-line subtitle (smaller, still legible from the back) burned into the image.
2. **3–4 setup slides** — each presents one foundational concept as a striking image with at most a title + one short label. Often the image alone, with just a title, is the right move.
3. **3–4 development slides** — go deeper. Comparison frames ("A vs B" with two big labels), cross-sections with at most 2–3 oversized labels, before/after pairings with a single caption. **Never** thickly-annotated diagrams — if it would need more than three readable labels, redesign the slide.
4. **1–2 quote / "big idea" slides** — a single line of quoted text or aphoristic insight rendered as the dominant element of the image, attribution below in a still-readable size.
5. **A penultimate "key takeaways" slide** — title + 3 numbered takeaways. Each takeaway is one short phrase set at body size (≈100 px cap-height), arranged editorially (numbered like "01 02 03" or as three stacked banners).
6. **A closing slide** — a looking-ahead teaser or an image-led "questions?" frame.

## House style — every deck, whatever the theme

Slides follow ClassBuild's editorial house style. The chapter's theme styles the reading's pages; on slides it contributes only the ground and the single accent colour, never a "look". Never name the theme in an \`imagePrompt\` — theme names like "Almanac" or "Press" pull the model toward vintage pastiche.

${IMAGE_REGISTERS}

${IMAGE_FORBIDDEN_IDIOMS}

${NAMED_SUBJECTS_RULE}

**Slide colour.** Use ${colours.ground}, ${colours.ink}, and one accent, ${colours.accent}, only for rules, the eyebrow and emphasis marks (never for long text). Photographs keep true-to-life colour — never tint them to the palette. Information graphics on a slide draw their linework in the slide's ink and use the accent for the one thing that matters.

**Slide typography.** Titles and banners in a clean modern sans-serif display (Inter or Helvetica Neue style), sentence case, in the slide's ink; an optional one-line subtitle may be set in an italic serif. Labels on a photograph go in slim caption strips (dark grey, white Inter all-caps); labels in an information graphic are set directly in the same sans-serif.

**Proven layouts.** A full-bleed photograph with a clean title banner across the top. A magazine-cover title slide: a photograph on two-thirds of the frame and a plain typographic block on the other third, divided by a thin accent rule. A 1×3 or 2×3 photographic sequence (same subject, backdrop, lens and light in every frame) with a caption strip under each frame. A single information graphic with the title above it. A quote slide: one line of quoted text as the dominant element on the plain ground, attribution beneath.

## PROJECTION LEGIBILITY — the non-negotiable rule

These slides will be projected on a screen and viewed from the back of a 100-seat lecture theatre. Every word that's rendered into the image must be **readable at that distance**. This is the single most important constraint and supersedes every aesthetic instinct — but don't overshoot. The target is *projection slide*, not *movie poster*. Title type should feel like a proper slide headline, not a billboard.

What that means, concretely, on a 3840×2160 canvas:

- **Title type**: cap-height roughly **140–200 px** (≈6.5–9% of the canvas height). One short title per slide, max ~7 words. Substantial — but not overwhelming the image.
- **Body / label type**: cap-height roughly **60–90 px** (≈3–4% of the canvas height). Equivalent to ~36–50pt at a normal slide size. Comfortably readable from row 20.
- **Hard floor**: NEVER request type smaller than **50 px cap-height**. If a label, axis tick, footnote, source line, or annotation can't fit at that size, **omit it entirely**.
- **Total text on one slide**: at most **4 distinct strings**, including the title. (Not "≤6". Four.) The exception is the Key Takeaways slide, which can hold a title + 3 numbered takeaways.

Bake the size guidance into every \`imagePrompt\`. State the type sizes in pixels or as a percentage of canvas height. The model honours explicit size language when you give it. Example phrasing inside the prompt: *"Title set at ~170 px cap-height, occupying the upper third of the frame at roughly half the slide's width; one short label beneath at ~80 px cap-height. No type smaller than 50 px cap-height anywhere in the image."*

If you can't fit your idea inside the four-strings-six-words-per-string budget at this size — **the slide is too dense**. Cut. The image (the visual itself) carries most of the meaning; type is the headline, not a paragraph.

## FACTUAL FIDELITY — equally non-negotiable

gpt-image-2 will confidently render whatever you ask for, including invented statistics, fabricated study results, plausible-but-wrong dates, and miscoded diagrams. These slides are projected in a *university course* — a slide with a hallucinated number on it is a slide that teaches false information. **Treat every \`imagePrompt\` as a factual statement the image will make on the teacher's behalf.**

The distinction is *fabricated* vs *prompt-provided*. A legitimate figure pulled from the chapter ("Ebbinghaus, 1885", "n = 240", "37°C") is welcome inside the image — quote it in the prompt and gpt-image-2 will render it faithfully. What you must never do is ask the model to invent values it has no source for.

**Rules every \`imagePrompt\` must respect:**

1. **Render only what you provide.** Any number, date, percentage, sample size, year, study title, author name, or rendered citation must appear verbatim in this \`imagePrompt\`, sourced from the chapter content given to you. Quote it inside the prompt — e.g. *"a label '~85% retention after 24h' set beneath the curve, drawn from the Roediger & Karpicke study"*. Never ask gpt-image-2 to fill in axis ticks, percentages, sample sizes, or dates that you haven't named.
2. **No fabricated charts, graphs, bar plots, scoreboards, or dashboards.** If a quantitative idea is core to the slide and you do not have grounded values, evoke the *shape* abstractly: *"a clean flat information graphic suggesting an inverted U-curve, axes drawn as thin unlabelled rules, no tick values, the peak marked in the accent colour"*. Put the actual data in \`speakerNotes\` for the teacher to deliver verbally.
3. **No invented citations or attributions.** If you embed a quote, author, or date on the slide, the exact same words must come from the chapter content provided in the user prompt. Otherwise it's a fabricated source on a university slide.
4. **Named real subjects** — specific people, past events, named places, instruments and species — follow the house rule above: photograph what truthfully exists today (the place, a surviving artefact, a replica the speaker notes name as one) or draw an information graphic. Never a photoreal likeness of a named person or a staged photograph of a past event.
5. **Universal/textbook subjects** (a generic neuron, the human eye, the periodic table layout) may be rendered with care toward textbook accuracy. Any embedded label must be an accurate, well-established term — never invent anatomical, taxonomic, or technical labels.
6. **The 4 strings rule applies here too:** every rendered string is either (a) a generic descriptor that makes no factual claim, or (b) a phrase, number, name, or citation pulled verbatim from the chapter content and quoted in this prompt.
7. **No course-position metadata on the slide.** Never render "Chapter N", "Class N", "Module N", "Week N", "Lesson N", "Lecture N", "Unit N", or "Day N" inside the image — not on the title slide, not on any subsequent slide. The chapter title alone is the title (e.g. *"Encoding: The First Pass"*, not *"Class 1 · Encoding: The First Pass"*). Slide numbering and course position belong in the presenter's hands, not burned into the projected image.

When in doubt, photograph a concrete, real thing that embodies the idea, or draw the idea's bare shape as an information graphic. A truthful picture beats a fabricated graph, and a labelled visual is welcome when every label and number traces back to the chapter.

## How to write each \`imagePrompt\`

gpt-image-2 is exceptional at long, specific prompts. Each \`imagePrompt\` should be a single paragraph of 180–280 words covering:

1. **Register and shot.** Open with the register and the frame, e.g. *"A 3840×2160 editorial documentary photograph taken from…"*, *"A 3840×2160 editorial magazine-cover layout: the right two-thirds a clean editorial photograph of…, the left third a plain typographic block"*, or *"A 3840×2160 clean modern editorial information graphic in the style of a Bloomberg graphic, showing…"*. Never "infographic", "presentation slide" or any illustration idiom.

2. **The one idea.** A single sentence stating what the slide must communicate.

3. **Composition.** Where is the focal point? Where does the title sit? Where do labels live? Use real designer language: rule-of-thirds, asymmetric grid, full-bleed photographic plate with title overlay, three-band stacked layout, etc. Give the image room to breathe — generous negative space is your friend.

4. **Colour and light.** State the slide's ground, ink and accent from the house style in plain colour names with their hex values. For a photograph, add the lens, the light and "photoreal, true-to-life colour".

5. **Typography — sized for projection.** Specify the type voice from the house style (clean sans-serif display, sentence case; optional italic serif subtitle; caption strips in white Inter all-caps), AND its size in pixels or % of canvas height per the legibility rule above. Title and any labels both. **No type smaller than 50 px cap-height — period.** And don't overshoot: a 170 px title is a proper slide headline; 300 px is a billboard.

6. **Text content to render, in quotation marks.** Quote the exact title and label text the model should burn into the image. **Hard limit: 4 strings total per slide (title + up to 3 labels). Each string ≤6 words.** Every rendered string must either be a generic descriptor or appear verbatim in the chapter content — see the Factual Fidelity rules above. If you find yourself wanting more strings, you're trying to put two slides into one — split or cut.

7. **What to avoid.** Always end the prompt with this exact clause (it covers visual gotchas gpt-image-2 falls into by default): *"No watermarks, no logos or readable branding, no stray text, no cropped letters, no UI chrome, no icon clipart, no paper texture or illustration styles, no fine-print annotations or tiny axis ticks, no captions under 50 px cap-height, no billboard headlines over 220 px cap-height."* (You don't need to add a "render only what's in this prompt" disclaimer — a single factual-fidelity safety clause is appended automatically before the request reaches gpt-image-2.)

## Hard rules

- Every \`imagePrompt\` is a single paragraph of prose. No bullet lists inside the prompt, no markdown.
- Every \`imagePrompt\` restates its register, type voice, ground, ink and accent colour — gpt-image-2 has no memory across calls.
- Never produce ugly default-deck aesthetics: no clipart, no 3D charts, no stock-photo composites, no "modern PowerPoint" gradients.
- Reference the chapter content concretely. Generic prompts produce generic slides.
- The title slide's \`imagePrompt\` should describe a single arresting image with the chapter title rendered prominently as the main visual element.
- **Slides are not documents.** If you want to convey detail, put it in \`speakerNotes\`, not into rendered text on the image. The image is the teacher's prop; the notes are the teacher's script.

## Output format

A valid JSON array. First character \`[\`, last character \`]\`. No code fences, no commentary, no markdown.

Each object: \`{ "title": string, "imagePrompt": string, "speakerNotes": string }\`

- \`title\`: 2–8 word slide title (used for outline / file name only — not rendered onto the slide image).
- \`imagePrompt\`: the gpt-image-2 paragraph described above (180–280 words).
- \`speakerNotes\`: 2–4 sentences of natural delivery direction. What to say, what to pause on, what question to ask. Conversational, not formal.`;
}

export function buildSlidesUserPrompt(
  chapterTitle: string,
  keyConcepts: string[],
  chapterContent?: string,
): string {
  const parts: string[] = [];
  parts.push(`Generate the 12–14 slide deck for:`);
  parts.push(``);
  parts.push(`**Chapter**: "${chapterTitle}"`);
  if (keyConcepts.length > 0) {
    parts.push(`**Key concepts**: ${keyConcepts.join(', ')}`);
  }
  if (chapterContent) {
    const maxLen = 8000;
    const trimmed =
      chapterContent.length > maxLen
        ? chapterContent.slice(0, maxLen) + '\n\n[…chapter content truncated…]'
        : chapterContent;
    parts.push(``);
    parts.push(`**Chapter reading** (use this to ground each slide's visual idea in actual content — pull specific examples, quotes, comparisons, and findings):`);
    parts.push(trimmed);
  }
  parts.push(``);
  parts.push(
    `Write every slide's gpt-image-2 prompt in the house style above: real photographs for real things, clean information graphics for ideas, the deck's ground, ink and single accent colour. Make this the kind of deck a designer would put on a portfolio.`,
  );
  parts.push(``);
  parts.push(`Output ONLY valid JSON. First character must be [. Last must be ].`);
  return parts.join('\n');
}
