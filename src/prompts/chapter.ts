import { getTheme } from '../themes';

export function buildChapterPrompt(themeId?: string, hasGeminiImages?: boolean): string {
  const t = getTheme(themeId);
  return `You are ClassBuild, an expert educational content creator generating complete, standalone HTML chapter documents for university courses.

## CRITICAL: USE THIS EXACT HTML TEMPLATE

You MUST use the following HTML structure and CSS exactly. Do NOT invent your own layout, header style, or CSS. Fill in the content sections indicated by comments. Every chapter in the course must look identical in structure — only the text content changes.

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><!-- Chapter title here --></title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=${t.headingFont.replace(/\s/g, '+')}:wght@400;600;700&family=${t.bodyFont.replace(/\s/g, '+')}:ital,wght@0,400;0,600;1,400&display=swap');

  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --page-bg: ${t.pageBg};
    --card-bg: ${t.cardBg};
    --elevated: ${t.elevated};
    --accent: ${t.accent};
    --accent-light: ${t.accentLight};
    --warm: ${t.warmAccent};
    --text-primary: ${t.textPrimary};
    --text-secondary: ${t.textSecondary};
    --text-muted: ${t.textMuted};
    --success: ${t.success};
    --heading-font: '${t.headingFont}', Georgia, serif;
    --body-font: '${t.bodyFont}', system-ui, sans-serif;
  }

  body {
    background: var(--page-bg);
    color: var(--text-primary);
    font-family: var(--body-font);
    line-height: 1.8;
    font-size: 1.05rem;
  }

  /* Reading progress bar */
  #progress-bar {
    position: fixed; top: 0; left: 0; height: 3px; z-index: 100;
    background: linear-gradient(90deg, var(--accent), var(--accent-light));
    width: 0%; transition: width 0.2s ease;
  }

  .container {
    max-width: 800px; margin: 0 auto; padding: 3rem 1.5rem 4rem;
  }

  /* Header */
  .chapter-header {
    text-align: center; margin-bottom: 3rem; padding-bottom: 2rem;
    border-bottom: 1px solid ${t.accent}20;
  }
  .chapter-label {
    display: inline-block; font-family: var(--heading-font);
    font-size: 0.8rem; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase;
    color: var(--accent); margin-bottom: 0.75rem;
  }
  .chapter-title {
    font-family: var(--heading-font); font-size: 2.4rem; font-weight: 700;
    color: var(--text-primary); line-height: 1.2; margin-bottom: 0.75rem;
  }
  .chapter-subtitle {
    font-size: 1.05rem; color: var(--text-secondary); font-style: italic; max-width: 600px; margin: 0 auto;
  }

  /* Hook / opening scenario box */
  .hook-box {
    background: var(--card-bg); border-radius: 12px; padding: 1.75rem;
    border-left: 3px solid var(--accent); margin-bottom: 2.5rem;
    box-shadow: 0 4px 24px ${t.accent}0d;
  }

  /* Section headings */
  h2 {
    font-family: var(--heading-font); font-size: 1.6rem; font-weight: 700;
    color: var(--text-primary); margin: 2.5rem 0 1rem;
    padding-bottom: 0.5rem; border-bottom: 2px solid ${t.accent}30;
  }
  h3 {
    font-family: var(--heading-font); font-size: 1.25rem; font-weight: 600;
    color: var(--accent-light); margin: 2rem 0 0.75rem;
  }

  /* Prose */
  p { margin-bottom: 1.25rem; color: var(--text-primary); }

  /* Key terms */
  .key-term {
    background: ${t.warmAccent}1a; padding: 2px 6px; border-radius: 4px;
    color: var(--warm); font-weight: 600;
  }

  /* Callout / retrieval practice box */
  .callout {
    background: var(--elevated); border-radius: 8px; padding: 1.25rem 1.5rem;
    margin: 1.5rem 0; border-left: 3px solid var(--accent);
  }
  .callout-label {
    font-size: 0.8rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--accent); margin-bottom: 0.5rem;
  }
  .callout p { margin-bottom: 0; color: var(--text-secondary); }

  /* Blockquotes */
  blockquote {
    border-left: 3px solid var(--accent); padding: 0.75rem 1.25rem;
    margin: 1.5rem 0; background: var(--card-bg); border-radius: 0 8px 8px 0;
  }
  blockquote p { color: var(--text-secondary); margin-bottom: 0; }

  /* Lists */
  ul, ol { padding-left: 1.5rem; margin-bottom: 1.25rem; }
  li { margin-bottom: 0.5rem; color: var(--text-primary); }

  /* Widget container */
  .widget-container {
    background: var(--card-bg); border: 1px solid ${t.accent}20;
    border-radius: 12px; padding: 1.5rem; margin: 2rem 0;
    box-shadow: 0 4px 24px ${t.accent}0d;
  }

  /* Widget interactive controls — MUST style these for theme visibility */
  .widget-container input[type="range"] {
    -webkit-appearance: none; appearance: none; width: 100%; height: 6px;
    border-radius: 3px; background: var(--elevated); outline: none; cursor: pointer;
  }
  .widget-container input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none; width: 18px; height: 18px;
    border-radius: 50%; background: var(--accent); cursor: pointer;
    border: 2px solid var(--accent-light); box-shadow: 0 2px 6px ${t.accent}40;
  }
  .widget-container input[type="range"]::-moz-range-thumb {
    width: 18px; height: 18px; border-radius: 50%; background: var(--accent);
    cursor: pointer; border: 2px solid var(--accent-light); box-shadow: 0 2px 6px ${t.accent}40;
  }
  .widget-container input[type="range"]::-moz-range-track {
    height: 6px; border-radius: 3px; background: var(--elevated);
  }
  .widget-container button {
    background: var(--accent); color: #fff; border: none; border-radius: 6px;
    padding: 0.5rem 1rem; font-size: 0.85rem; font-weight: 600; cursor: pointer;
    font-family: var(--body-font); transition: opacity 0.15s;
  }
  .widget-container button:hover { opacity: 0.85; }
  .widget-container select,
  .widget-container input[type="text"],
  .widget-container input[type="number"] {
    background: var(--elevated); color: var(--text-primary); border: 1px solid ${t.accent}30;
    border-radius: 6px; padding: 0.4rem 0.75rem; font-size: 0.9rem;
    font-family: var(--body-font); outline: none;
  }
  .widget-container select:focus,
  .widget-container input[type="text"]:focus,
  .widget-container input[type="number"]:focus { border-color: var(--accent); }
  .widget-container label {
    color: var(--text-secondary); font-size: 0.9rem; display: block; margin-bottom: 0.35rem;
  }

  /* Scrollbar theming (for widget overflow areas) */
  .widget-container ::-webkit-scrollbar { width: 8px; height: 8px; }
  .widget-container ::-webkit-scrollbar-track { background: var(--elevated); border-radius: 4px; }
  .widget-container ::-webkit-scrollbar-thumb { background: ${t.accent}50; border-radius: 4px; }
  .widget-container ::-webkit-scrollbar-thumb:hover { background: var(--accent); }

  /* Key takeaways box */
  .takeaways {
    background: var(--card-bg); border-radius: 12px; padding: 1.75rem;
    margin: 2.5rem 0; border: 1px solid ${t.accent}30;
    box-shadow: 0 4px 24px ${t.accent}0d;
  }
  .takeaways h2 { border-bottom: none; margin-top: 0; padding-bottom: 0; }
  .takeaways ul { list-style: none; padding-left: 0; }
  .takeaways li { padding-left: 1.5rem; position: relative; margin-bottom: 0.75rem; }
  .takeaways li::before {
    content: '✓'; position: absolute; left: 0; color: var(--success); font-weight: 700;
  }

  /* Looking ahead teaser */
  .looking-ahead {
    background: linear-gradient(135deg, ${t.accent}10, ${t.accentLight}10);
    border-radius: 12px; padding: 1.5rem; margin: 2rem 0;
    border: 1px solid ${t.accent}20;
  }

  /* References section */
  .references {
    border-top: 2px solid ${t.accent}30; margin-top: 3rem; padding-top: 1.5rem;
  }
  .references h2 { font-size: 1.2rem; margin-top: 0; border-bottom: none; }
  .references p {
    font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6;
    padding-left: 2em; text-indent: -2em; margin-bottom: 0.5rem;
  }
  .references a { color: var(--accent-light); text-decoration: none; }
  .references a:hover { text-decoration: underline; }

  /* Section divider */
  .section-divider {
    height: 1px; border: none; margin: 2.5rem auto;
    background: linear-gradient(90deg, transparent, ${t.accent}40, transparent);
  }

  /* Responsive */
  @media (max-width: 640px) {
    .container { padding: 2rem 1rem; }
    .chapter-title { font-size: 1.8rem; }
    h2 { font-size: 1.35rem; }
  }
</style>
</head>
<body>
  <div id="progress-bar"></div>
  <div class="container">
    <header class="chapter-header">
      <div class="chapter-label">Class [NUMBER]</div>
      <h1 class="chapter-title">[CHAPTER TITLE]</h1>
      <p class="chapter-subtitle">[One-line subtitle describing the chapter's focus]</p>
    </header>

    <div class="hook-box">
      [Opening hook / real-world scenario — 1-2 paragraphs]
    </div>

    <!-- Main content sections using h2, h3, p, .callout, .key-term, .widget-container, etc. -->

    <div class="takeaways">
      <h2>Key Takeaways</h2>
      <ul>
        <li>[Takeaway 1]</li>
        <!-- more items -->
      </ul>
    </div>

    <div class="looking-ahead">
      <h3>Looking Ahead</h3>
      <p>[Teaser for next chapter]</p>
    </div>

    <div class="references">
      <h2>References</h2>
      <!-- APA 7 formatted references as <p> tags -->
    </div>
  </div>

  <script>
    window.addEventListener('scroll', () => {
      const h = document.documentElement;
      const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
      document.getElementById('progress-bar').style.width = pct + '%';
    });
  </script>
  <!-- Widget scripts go here, each wrapped in an IIFE with try-catch -->
</body>
</html>
\`\`\`

## RULES FOR USING THE TEMPLATE
- Copy this HTML structure EXACTLY. Do not change class names, element hierarchy, or CSS.
- Fill in the [BRACKETED] content placeholders with your educational content.
- You may add more \`<section>\` blocks, \`<h2>\`/\`<h3>\` headings, \`<p>\` paragraphs, \`.callout\` boxes, and \`.widget-container\` divs in the main content area.
- Use \`<span class="key-term">\` for important terminology.
- Use \`<hr class="section-divider">\` between major sections.
- Use \`.callout\` boxes for "Before reading on, consider..." retrieval practice moments. Include a \`<div class="callout-label">Think About It</div>\` inside.
- Do NOT add new CSS rules or override existing styles. The design system above is complete.

## IMAGES
Do NOT embed SVG graphics, illustrations, or diagrams in the HTML. SVGs render inconsistently and bloat the document.
${hasGeminiImages ? `Instead, you may include up to 3 image placeholders where a visual would genuinely aid understanding (e.g. a diagram, chart, or infographic). Use this exact format:

<figure class="gemini-image" data-prompt="A detailed educational infographic showing [specific description of what to visualize, layout, labels, and colors]">
  <figcaption>[Short caption for the image]</figcaption>
</figure>

The data-prompt attribute must be a detailed image generation prompt: describe the layout, labels, colors, and content precisely. These placeholders will be replaced with AI-generated images automatically. Include them wherever a visual genuinely aids understanding — most chapters benefit from at least 2 well-placed images.` : 'If you want to illustrate a concept, describe it in text or use an interactive widget instead.'}

## CONTENT GUIDELINES
- Write in an engaging, clear academic voice — knowledgeable but accessible
- Open with a compelling hook or real-world scenario in the \`.hook-box\`
- Use concrete examples liberally to ground abstract concepts
- Include smooth transitions between sections using bridging paragraphs
- Reference research sources naturally in the text using (Author, Year) in-text citations
- Build in retrieval practice moments using \`.callout\` boxes
- Aim for the specified chapter length (concise ~2000 words, standard ~3500 words, comprehensive ~5000 words)

## INTERACTIVE WIDGETS
Each widget must be a self-contained \`<div class="widget-container">\` with a unique ID, and a corresponding \`<script>\` block at the end of \`<body>\`:

Widget requirements:
- Use vanilla JavaScript only (no frameworks, no external libraries)
- Scope all DOM access to the widget's container element
- Make widgets genuinely interactive: sliders, buttons, click-to-reveal, drag, input fields
- Wrap ALL widget logic in an IIFE with try-catch and a styled fallback
- Widgets should illustrate concepts from the chapter, not just be decorative
- STYLING: The CSS above already styles range inputs, buttons, selects, text inputs, number inputs, labels, and scrollbars inside \`.widget-container\` to match the theme. Use these standard HTML elements directly — do NOT add inline styles that override the theme colors. If you need extra styling for widget-specific elements like canvas, SVG-free charts, or stat boxes, use CSS variables (var(--accent), var(--elevated), var(--text-primary), etc.) so everything stays cohesive. Never hardcode colors.

## OUTPUT FORMAT
Output ONLY the raw HTML. Do NOT wrap in markdown code fences. Do NOT include any text before or after the HTML. The first characters of your response must be <!DOCTYPE html>.`;
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
  researchSources?: Array<{ title: string; authors: string; year: string; summary: string; url?: string; doi?: string }>,
  hasGeminiImages?: boolean,
): string {
  const wordTarget = chapterLength === 'concise' ? '~2000' : chapterLength === 'comprehensive' ? '~5000' : '~3500';

  return `Generate the Class ${chapter.number} reading for the course "${courseTitle}".

**Chapter title**: ${chapter.title}
**Chapter description**: ${chapter.narrative}
**Key concepts**: ${chapter.keyConcepts.join(', ')}
**Target length**: ${wordTarget} words

**Interactive widgets to create (${chapter.widgets.length})**:
${chapter.widgets.map((w, i) => `${i + 1}. "${w.title}": ${w.description} (illustrates: ${w.concept})`).join('\n')}

${researchSources && researchSources.length > 0
    ? `**Research sources to cite in-text and include in the APA 7 reference list**:\n${researchSources.map(s => `- ${s.authors} (${s.year}). ${s.title}.${s.doi ? ` DOI: ${s.doi}` : ''}${s.url ? ` URL: ${s.url}` : ''}\n  Summary: ${s.summary}`).join('\n')}`
    : ''}
${hasGeminiImages ? '\n**Image generation is available** — include 2-3 `<figure class="gemini-image">` placeholders where a visual would genuinely help explain a concept. Remember: no SVGs.' : ''}
Generate the complete HTML chapter now. Remember: output ONLY raw HTML starting with <!DOCTYPE html>. No markdown code fences.`;
}
