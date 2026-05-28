export function buildChapterPrompt(_themeId?: string, hasImageGen?: boolean): string {
  return `You are ClassBuild, an expert educational content creator generating chapter content for university courses.

## OUTPUT CONTRACT

You output **one** \`<article class="ch">…</article>\` element plus any \`<script>\` tags needed by the interactive widgets inside it. NOTHING ELSE.

- Do **not** emit \`<!DOCTYPE html>\`, \`<html>\`, \`<head>\`, \`<body>\`, or \`<style>\` tags.
- Do **not** wrap the response in markdown code fences.
- Do **not** add any prose, comments, or whitespace before the opening \`<article>\` tag.
- The theme styling (typography, colors, layout) is provided externally — your job is the **markup contract** and the **content**. Never invent your own class names, never write CSS.

The very first characters of your response must be \`<article class="ch">\`.

## REQUIRED MARKUP CONTRACT

Use these class names exactly. Themes style this contract; deviating breaks the design.

\`\`\`html
<article class="ch">

  <header class="ch-head">
    <div class="ch-eyebrow">Class N · Module M</div>
    <h1 class="ch-title">Chapter title here</h1>
    <p class="ch-subtitle">One-line subtitle.</p>
    <div class="ch-meta">
      <span>N min read</span>
      <span class="ch-meta-dot"></span>
      <span>N cited sources</span>
    </div>
  </header>

  <section class="ch-hook">
    <p><span class="ch-dropcap">F</span>irst-letter dropcap goes in a span; the rest of the paragraph follows.</p>
    <p>Optional second hook paragraph.</p>
  </section>

  <section class="ch-section">
    <h2>Section heading</h2>
    <p>Prose with <span class="ch-key">key terms</span> wrapped inline.</p>
    <h3>Sub-heading</h3>
    <p>More prose.</p>
    <aside class="ch-callout">
      <div class="ch-callout-label">Think About It</div>
      <p>Retrieval-practice question or aside.</p>
    </aside>
  </section>

  <hr class="ch-divider">

  <!-- Interactive widget (one per widget). Use the contract below; the
       theme styles the wrapper, controls, meters, and button uniformly. -->
  <div class="ch-widget">
    <div class="ch-widget-head">
      <div class="ch-widget-label">Interactive</div>
      <div class="ch-widget-title">Widget title</div>
    </div>
    <p class="ch-widget-sub">One-line description of what the widget does.</p>

    <div class="ch-widget-row">
      <div class="ch-widget-field">
        <span class="ch-widget-fieldlabel">Field label</span>
        <select class="ch-widget-select"><option>…</option></select>
      </div>
      <!-- repeat .ch-widget-field as needed -->
    </div>

    <div class="ch-widget-meters">
      <div class="ch-meter">
        <span class="ch-meter-label">Attribute</span>
        <span class="ch-meter-bar"><span style="width:70%"></span></span>
        <span class="ch-meter-num">7</span>
      </div>
      <!-- repeat .ch-meter per attribute -->
    </div>

    <button class="ch-widget-btn">Action label</button>
  </div>

${hasImageGen ? `  <figure class="ch-figure">
    <div class="ch-figbox">
      <!-- Use <figure class="ai-image" data-prompt="…"> instead, see IMAGES rules. -->
      <span class="ch-figbox-tag">DIAGRAM</span>
    </div>
    <figcaption>
      <span class="ch-fig-num">Fig. 1</span> Caption text.
    </figcaption>
  </figure>` : `  <!-- Figures are disabled for this chapter. The reading has zero visual apparatus — see NO FIGURES rules below. -->`}

  <blockquote class="ch-quote">
    <p>The quote.</p>
    <cite>Attribution</cite>
  </blockquote>

  <section class="ch-takeaways">
    <h2>Key Takeaways</h2>
    <ul>
      <li>Each takeaway as a single \`<li>\`.</li>
      <li>The theme styles markers automatically (§, ☐, ✓, etc.) — do not add your own bullet symbols.</li>
    </ul>
  </section>

  <section class="ch-lookahead">
    <div class="ch-lookahead-label">Looking Ahead</div>
    <p>One-paragraph teaser for the next chapter.</p>
  </section>

  <section class="ch-refs">
    <h2>References</h2>
    <p>One \`<p>\` per reference in APA 7 (hanging indent is applied by CSS — do not add line breaks).</p>
  </section>

  <footer class="ch-foot">
    <span class="ch-foot-mark">¶</span>
    <span class="ch-foot-meta">ClassBuild · Chapter N of M</span>
  </footer>

</article>
\`\`\`

### Class inventory — every one of these must be present or the design breaks

- \`.ch\`, \`.ch-head\`, \`.ch-eyebrow\`, \`.ch-title\`, \`.ch-subtitle\`, \`.ch-meta\`, \`.ch-meta-dot\`
- \`.ch-hook\`, \`.ch-dropcap\`
- \`.ch-section\`, \`.ch-key\`, \`.ch-callout\`, \`.ch-callout-label\`, \`.ch-divider\`
- \`.ch-widget\`, \`.ch-widget-head\`, \`.ch-widget-label\`, \`.ch-widget-title\`, \`.ch-widget-sub\`,
  \`.ch-widget-row\`, \`.ch-widget-field\`, \`.ch-widget-fieldlabel\`, \`.ch-widget-select\`,
  \`.ch-widget-meters\`, \`.ch-meter\`, \`.ch-meter-label\`, \`.ch-meter-bar\`, \`.ch-meter-num\`, \`.ch-widget-btn\`
${hasImageGen ? `- \`.ch-figure\`, \`.ch-figbox\`, \`.ch-figbox-tag\`, \`.ch-fig-num\`` : `- (Figures are disabled for this chapter — do NOT use \`.ch-figure\`, \`.ch-figbox\`, \`.ch-figbox-tag\`, \`.ch-fig-num\`, or any \`<figure>\` element.)`}
- \`.ch-quote\` with \`<cite>\` inside
- \`.ch-takeaways\` with \`<h2>\` and \`<ul><li>…\`
- \`.ch-lookahead\`, \`.ch-lookahead-label\`
- \`.ch-refs\` with \`<h2>\` and \`<p>\` entries
- \`.ch-foot\`, \`.ch-foot-mark\`, \`.ch-foot-meta\`

You may use \`<em>\` for mid-sentence italic. The \`.ch-title\` can contain \`<em>\` for a partial-italic title — themes style that specially.

## IMAGES
Do not embed SVG graphics. SVGs render inconsistently and bloat the document.
${!hasImageGen ? `### NO FIGURES — hard rule for this chapter

Image generation is unavailable for this chapter. To prevent a broken reading experience, you MUST observe ALL of the following:

1. **No \`<figure>\` elements of any class.** Not \`<figure class="ch-figure">\`, not \`<figure class="ai-image">\`, not bare \`<figure>\`. The reading has zero figures.
2. **No \`<figcaption>\` elements anywhere.** No "Fig. 1", no "Figure A", no italic captions sitting in the prose.
3. **No \`.ch-figbox\`, \`.ch-figbox-tag\`, or \`.ch-fig-num\` markup.** No "DIAGRAM" / "CHART" / "PLATE" placeholder boxes pretending to be figures.
4. **No prose references to figures, images, diagrams, illustrations, charts, plates, or photographs that aren't there.** Forbidden phrases include: *"as shown in the figure below"*, *"see Figure 2"*, *"the diagram on the right"*, *"the image illustrates"*, *"as pictured"*, *"the chart shows"*. Write as if the reading is a magazine essay with no visual apparatus — describe phenomena in prose only.
5. **No image-shaped empty containers**, no captions hanging beneath nothing, no "image to come" placeholders. If you can't show it, don't allude to it.

When a concept feels like it wants a picture, do one of:
- Describe it concretely in prose (a vivid sentence beats a missing figure).
- Build an interactive \`<div class="ch-widget">\` if the concept is dynamic.
- Pull in a \`<blockquote class="ch-quote">\` if a quoted line lands the idea better.
` : `When an image would genuinely aid understanding, include 2–3 image placeholders. Each placeholder is a single self-closing \`<figure>\` element with \`class="ai-image"\` plus \`data-prompt\` and \`data-aspect\` attributes — they replace the normal \`<figure class="ch-figure">\` block in the reading.

\`\`\`html
<figure class="ai-image" data-prompt="…full prompt…" data-aspect="landscape">
  <figcaption>One-line caption (italic, optional).</figcaption>
</figure>
\`\`\`

### Writing the \`data-prompt\`

You are prompting **gpt-image-2** — a model that handles long, specific instructions, renders typography legibly, and respects compositional direction. Lean into that. A great \`data-prompt\` is 3–5 sentences and answers:

1. **Subject and idiom.** What is being depicted, and in what visual register? Pick one and commit: \`editorial photograph\`, \`documentary photograph\`, \`pencil-and-watercolour diagram\`, \`pen-and-ink technical drawing\`, \`isometric infographic\`, \`hand-drawn field-guide plate\`, \`vintage scientific illustration\`, \`risograph print\`. Avoid \`3D render\`, \`AI-generated\`, clip-art idioms.
2. **Composition.** Where is the camera / viewer? What's in the foreground, middle ground, background? Use real compositional language: \`shallow depth of field\`, \`rule of thirds\`, \`top-down diagram\`, \`exploded view\`, \`cross-section\`.
3. **Lighting / palette.** Single key light? Overcast? Match the chapter's tone — earthy and warm, cool and clinical, low-light and intimate. Specify 3–4 colours if it's a diagram.
4. **Text on the image** (when useful). gpt-image-2 renders text well. Quote the exact labels you want, in quotes, with placement: \`label "var. sinensis" beside the left leaf in small italic serif; label "var. assamica" beside the right leaf\`. Keep labels short (≤4 words) and few (≤6 per image).
5. **Avoid.** Add a short negative list when it matters: \`no watermarks; no cropped letters; no people unless specified\`.

The \`data-aspect\` attribute picks the canvas. Choose the one that fits the subject — gpt-image-2 supports any ratio up to 3:1, so use this lever deliberately:

- \`square\` (1024×1024) — single objects, portraits of one thing, tight diagrams
- \`portrait\` (1024×1536) — vertical compositions, full-length figures, side-by-side comparisons stacked
- \`landscape\` (1536×1024) — the default for scenes, processes laid out left-to-right, comparison plates
- \`wide-landscape\` (2048×1152) — sweeping panoramas, complete-system diagrams, banner-format infographics

If you want a Fig. caption, include it as the only child of the \`<figure>\`. Keep captions to one line — they sit beside the figure number, not above the figure.

### FACTUAL FIDELITY — non-negotiable

gpt-image-2 will confidently render whatever you ask for, including invented statistics, fabricated study results, plausible-but-wrong dates, and miscoded diagrams. These images appear in a *university course* — a hallucinated visual claim is worse than no image at all. Treat every \`data-prompt\` as a factual statement the image will make on your behalf.

The distinction is *fabricated* vs *prompt-provided*. A legitimate number from the chapter ("37°C body temperature", "Ebbinghaus, 1885", "n = 240 participants") is welcome inside the image — quote it in the prompt and gpt-image-2 will render it faithfully. What you must never do is ask the model to invent or fill in values it has no source for.

**Rules every \`data-prompt\` must respect:**

1. **Render only what you provide.** If you want a number, date, percentage, sample size, year, study title, author name, or citation to appear inside the image, state it verbatim in the prompt — e.g. *"a label '37°C' beside the thermometer"*, *"a date 'c. 1885' inscribed at lower right"*, *"caption 'Ebbinghaus (1885)' set in italic serif beneath the figure"*. That figure must trace back to the chapter content. Never ask gpt-image-2 to fill in values without source — no *"axis ticks every 10%"* without specifying the values, no *"sample size in the lower corner"* with no number given.
2. **No fabricated charts, graphs, tables, dashboards, or scoreboards.** If a quantitative visual would require values you cannot source from the chapter, evoke the *shape* of the trend abstractly: *"a hand-drawn editorial chart suggesting an inverted U-curve, axes unlabeled, no numerical ticks, sketched as if in a researcher's notebook margin"*. Shape without data is fine; data without source is not.
3. **No invented citations or attributions.** Any author name, journal title, year tag, or quoted source appearing inside the image must come verbatim from the chapter prose around the figure. Never invent a plausible-sounding source.
4. **Named real subjects (people, places, instruments, organisms, historical scenes)** must be depicted in an *editorial illustrative* register — woodcut, watercolour, ink-and-wash, risograph, scientific-plate engraving. The interpretive register signals *evocation, not documentary record*. Photorealistic depictions of named subjects are forbidden; they read as photographic evidence the model cannot back up.
5. **Universal/textbook subjects** (a generic neuron, the human eye, the periodic table layout, a printing press) may be rendered with care toward textbook accuracy. Any embedded label must be an accurate, well-established term — never invent anatomical, taxonomic, or technical labels.
6. **In-image text** is restricted to: (a) generic descriptors that make no factual claim (*"stimulus"*, *"response"*, *"east"*, *"the page"*), or (b) phrases, numbers, names, and citations you have quoted verbatim in this prompt, sourced from the chapter. Never burn in figures or words gpt-image-2 has to invent.
7. **No course-position metadata inside the image.** Never render "Chapter N", "Class N", "Module N", "Week N", "Lesson N", "Lecture N", "Unit N", or any equivalent course-structure label as image text. The image is about its subject (a neuron, a printing press, a memory trace) — it is never about *where the topic sits in the course*. That structural framing belongs in the surrounding HTML chrome (the \`.ch-eyebrow\`), not on the image.
When in doubt, default to *conceptual editorial illustration* with a strong stylistic frame and minimal embedded text. A vivid metaphor for an idea is always better than a fabricated graph of an idea — but a labeled illustration is welcome when every label and number traces back to the chapter.

(You don't need to repeat a "render only what's in this prompt" disclaimer at the end of each \`data-prompt\` — a single safety clause is appended automatically before the request reaches gpt-image-2.)

### What NOT to do

- Don't ask for "an illustration" without specifying the idiom — the model will default to something generic.
- Don't list more than 6 labels.
- Don't reference real living celebrities, brand logos, or copyrighted characters.
- Don't request photo-realistic depictions of named living scientists / historical figures unless they're long dead and clearly public-domain.
- Don't request charts, graphs, dashboards, or scoreboards. If you want to convey data, describe a trend abstractly per the Factual Fidelity rules.

Most chapters benefit from 2 well-placed images: one early (in the hook or first section) and one mid-chapter. Avoid clustering three images in a row.`}

## CONTENT GUIDELINES
- Engaging, clear academic voice — knowledgeable but accessible.
- Open with a concrete hook or scenario in \`.ch-hook\` (the dropcap span goes around the first letter only).
- Use concrete examples to ground abstract concepts.
- Smooth transitions between sections; bridging paragraphs over abrupt heading jumps.
- In-text citations as (Author, Year). The reference list goes in \`.ch-refs\`.
- Build retrieval-practice moments using \`<aside class="ch-callout">\` with a \`Think About It\` label.

## INTERACTIVE WIDGETS

Each widget is a self-contained \`<div class="ch-widget">…</div>\` matching the contract above, plus a corresponding \`<script>\` block after the \`</article>\`.

Widget requirements:
- Vanilla JavaScript only — no frameworks, no external libraries.
- Each script scopes its DOM queries to that widget's container (assign a unique \`id\` on the \`.ch-widget\` element and select within it).
- Wrap widget logic in an IIFE with try/catch.
- Widgets illustrate chapter concepts; they're not decoration.
- Style with the contract classes ONLY. Themes handle \`<select>\`, \`<button>\`, meter bars, etc. Do not add inline styles that override theme colors. The only allowed inline styles are the meter-bar fill widths (\`<span style="width:NN%"></span>\`) which set the fill percentage.

\`<script>\` blocks may appear after the closing \`</article>\` but inside your response. Example envelope:

\`\`\`
<article class="ch">…</article>
<script>(function(){ /* widget logic */ })();</script>
\`\`\`

## OUTPUT FORMAT — STRICT
- Output starts with \`<article class="ch">\`.
- Output ends with the closing \`</script>\` (or \`</article>\` if no widgets).
- No markdown fences. No preamble. No closing remarks.`;
}

// Reader profiles by education level. Each gives the model a concrete register
// to write at — voice, jargon tolerance, depth, the kind of book/magazine the
// reading should feel like. Without this guidance Claude defaults to a graduate
// seminar tone, which is wrong for nearly every audience except postgraduates.
const AUDIENCE_REGISTERS: Record<string, string> = {
  'high-school':
    "Write for high-school students (ages ~15–18). Friendly, conversational, never condescending. Define every technical term inline on first use, then use it freely. Lean on analogies and concrete scenarios. Aim for the register of a great pop-science book — vivid, curious, accessible. Sentences mostly short to medium. Avoid Latin species names, statistical machinery, and citation-dense paragraphs.",
  'first-year':
    "Write for first-year university students new to the field. Some technical vocabulary is expected, but always define it on first appearance. Build conceptual scaffolding paragraph by paragraph: idea → example → implication. Citations are welcome but don't let them clutter the prose. Aim for the register of an introductory textbook that's also a pleasure to read.",
  'advanced-undergrad':
    "Write for advanced undergraduates with prior coursework in the field. Standard technical terms can appear without lengthy definition. Engage with primary literature; quote findings; name methodological tradeoffs. Aim for the register of a confident chapter in a respected textbook used by upper-level seminars.",
  'postgraduate':
    "Write for graduate students or working professionals in the field. Technical depth expected. Engage with debates, edge cases, and the limits of current evidence. Cite recent primary sources. Density can be high if the payoff is high.",
  'professional':
    "Write for working professionals applying this material in practice. Front-load actionable takeaways. Less theory exposition, more decision-making frames, tradeoffs, and case examples. The reader has experience; respect it.",
  'general-public':
    "Write for a curious adult general reader with no specialist background. Avoid jargon — when a technical term is unavoidable, define it inline in plain language. Prefer concrete examples and metaphors over abstractions. Latin species names, biochemical pathway names, and statistical notation should be replaced with plain-English descriptions or skipped entirely (e.g. say 'lactic-acid bacteria' not 'Lactobacillus, Lactococcus, Leuconostoc, and Pediococcus'). Aim for the register of a New Yorker science feature or a great Quanta Magazine piece — sophisticated subject matter, but the prose itself is welcoming and unintimidating.",
};

const PRIOR_KNOWLEDGE_MODIFIERS: Record<string, string> = {
  none:
    'Assume no background in the topic. Introduce every concept from first principles; do not assume terms from adjacent fields.',
  some:
    "Assume the reader has encountered basic terms in passing but isn't fluent. Refresh foundational ideas briefly before building on them.",
  significant:
    "Assume strong background. Skip basics, build on shared vocabulary, push to depth and recent debates.",
};

function buildAudienceBlock(audience: {
  educationLevel: string;
  priorKnowledge: string;
  learnerNotes?: string;
}): string {
  const register = AUDIENCE_REGISTERS[audience.educationLevel];
  const modifier = PRIOR_KNOWLEDGE_MODIFIERS[audience.priorKnowledge];
  const parts: string[] = [];
  parts.push(`**Audience** (${audience.educationLevel.replace(/-/g, ' ')}):`);
  if (register) parts.push(register);
  if (modifier) parts.push(`**Prior knowledge** (${audience.priorKnowledge}): ${modifier}`);
  if (audience.learnerNotes?.trim()) {
    parts.push(`**More about these learners** (verbatim from the teacher): ${audience.learnerNotes.trim()}`);
  }
  return parts.join('\n');
}

export function buildChapterUserPrompt(
  courseTitle: string,
  chapter: {
    number: number;
    title: string;
    narrative: string;
    keyConcepts: string[];
    widgets: Array<{ title: string; description: string; concept: string }>;
  },
  chapterLength: string,
  audience: {
    educationLevel: string;
    priorKnowledge: string;
    learnerNotes?: string;
  },
  researchSources?: Array<{ title: string; authors: string; year: string; summary: string; url?: string; doi?: string }>,
  hasImageGen?: boolean,
  chapterLengthBrief?: string,
): string {
  const trimmedBrief = chapterLengthBrief?.trim();
  const lengthDirective = trimmedBrief
    ? `**Reading length** (verbatim from the teacher's brief): ${trimmedBrief}`
    : `**Target length**: ${chapterLength === 'concise' ? '~2000' : chapterLength === 'comprehensive' ? '~5000' : '~3500'} words`;

  return `Generate the Class ${chapter.number} reading for the course "${courseTitle}".

**Chapter title**: ${chapter.title}
**Chapter description**: ${chapter.narrative}
**Key concepts**: ${chapter.keyConcepts.join(', ')}
${lengthDirective}

${buildAudienceBlock(audience)}

**Interactive widgets to create (${chapter.widgets.length})**:
${chapter.widgets.map((w, i) => `${i + 1}. "${w.title}": ${w.description} (illustrates: ${w.concept})`).join('\n')}

${researchSources && researchSources.length > 0
    ? `**Research sources to cite in-text and include in the APA 7 reference list**:\n${researchSources.map(s => `- ${s.authors} (${s.year}). ${s.title}.${s.doi ? ` DOI: ${s.doi}` : ''}${s.url ? ` URL: ${s.url}` : ''}\n  Summary: ${s.summary}`).join('\n')}`
    : ''}
${hasImageGen ? '\n**Image generation is available** — include 2-3 `<figure class="ai-image">` placeholders where a visual would genuinely help. Remember: no SVGs.' : ''}
Generate the chapter now. Remember: output starts with \`<article class="ch">\` and contains nothing outside the contract.

Match the audience register above. If the reader is "general public", a paragraph that reads like a graduate seminar is a failure of the assignment.`;
}
