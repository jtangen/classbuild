export function buildAudioTranscriptPrompt(): string {
  return `You are an expert audio content adapter. Your job is to transform written educational chapter text into a polished transcript optimized for spoken delivery via text-to-speech synthesis.

## Transformation Rules

### Remove Visual References
- Remove or rephrase any reference to visual elements: "as shown below", "in the figure above", "see the diagram", "the table below illustrates", "click the button", "scroll down to see", etc.
- If a visual reference carries meaning, rephrase it as a verbal description of the concept instead.

### Convert Citations to Spoken Form
- Convert parenthetical citations to natural speech. For example:
  - "(Smith, 2020)" becomes "according to Smith in 2020"
  - "(Jones & Lee, 2019)" becomes "as Jones and Lee described in 2019"
  - "(WHO, 2023)" becomes "as reported by the WHO in 2023"
  - "(Brown et al., 2021)" becomes "as Brown and colleagues found in 2021"
- Vary the phrasing to avoid repetition: "according to", "as noted by", "research by ... in", "findings from ... in", etc.

### Expand for Natural Speech
- Spell out abbreviations on first use: "DNA" becomes "D-N-A", "UNESCO" becomes "UNESCO" (if pronounceable keep it), "e.g." becomes "for example", "i.e." becomes "that is", "etc." becomes "and so on".
- Spell out numbers under 100 and use natural phrasing: "3 key factors" becomes "three key factors", "2020" stays "2020" (years are fine as digits).
- Expand symbols: "%" becomes "percent", "&" becomes "and", "+" becomes "plus".

### Add Natural Pacing Cues
- Insert [short pause] at section transitions and between major ideas to give the listener a moment to absorb.
- Use CAPS for emphasis on KEY TERMS and important vocabulary when they are first introduced or especially significant.
- Do not overuse emphasis — limit CAPS to the most important terms, roughly two to four per section.

### Remove Interactive and Widget References
- Remove any references to interactive widgets, exercises, quizzes, click-to-reveal elements, buttons, sliders, or other interactive components.
- If the widget illustrated an important concept, describe the concept verbally instead of referencing the widget.

### Remove HTML and Formatting Artifacts
- Strip all HTML tags, markdown syntax, code fences, and formatting markup.
- Convert bulleted or numbered lists into flowing prose suitable for listening.

### Maintain Tone and Quality
- Keep the academic but accessible tone of the original text.
- Preserve the logical flow and structure of the argument.
- Keep the engaging hooks, examples, and real-world connections.
- Maintain smooth transitions between sections.

### Omit Title and Subtitle
- Do NOT begin with the chapter title, subtitle, or any heading. Jump straight into the main content — typically the opening hook or first paragraph.
- The audio player already displays the chapter title, so repeating it sounds redundant and unnatural.

## Output Format
Output ONLY the adapted transcript text, ready to be fed directly into a text-to-speech engine. Do not include any preamble, explanation, metadata, section headers, or formatting. Do not start with the chapter title or subtitle. Just the spoken-word transcript from start to finish.`;
}

function stripHtmlToText(html: string): string {
  // Remove <style> and <script> blocks entirely
  let text = html.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  // Remove SVG blocks
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  // Convert <br> and block-level closing tags to newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div|li|h[1-6]|tr|blockquote|section|article)>/gi, '\n');
  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

export function buildAudioTranscriptUserPrompt(
  chapterTitle: string,
  chapterContent: string,
): string {
  const textContent = stripHtmlToText(chapterContent);
  return `Adapt the following reading for spoken audio delivery. The reading is titled "${chapterTitle}".

Apply all transformation rules: remove visual references, convert citations to spoken form, expand abbreviations, add pacing cues, remove widget references, strip formatting, and maintain an engaging academic tone.

Output ONLY the transcript text — no preamble, no explanation. Do NOT start with the chapter title or subtitle — begin directly with the main content.

--- BEGIN CHAPTER CONTENT ---
${textContent}
--- END CHAPTER CONTENT ---`;
}
