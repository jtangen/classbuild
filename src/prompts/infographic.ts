import { getTheme } from '../themes';

export function buildInfographicMetaPrompt(themeId?: string): string {
  const t = getTheme(themeId);
  return `You are ClassBuild, an expert at writing image generation prompts for educational infographics.

Given a class title, key concepts, and a snippet of the reading content, write a single, detailed prompt for an AI image generator (Gemini) to create a beautiful educational infographic.

## Prompt Requirements
- Describe a clear INFOGRAPHIC or DIAGRAM layout (NOT an illustration or photo)
- Specify exact text labels to include (short, readable)
- Describe the visual hierarchy: headers, sections, arrows, icons
- Specify the color palette: primary accent ${t.accent}, secondary ${t.accentLight}, warm accent ${t.warmAccent}, background ${t.isDark ? 'dark (#1a1a2e)' : 'light (#faf8f5)'}
- Request 16:9 landscape aspect ratio
- Focus on ONE core concept or relationship from the chapter
- Include specific data points, steps, or comparisons from the content
- Keep text on the infographic short (labels, not paragraphs)

## Output
Respond with ONLY the image generation prompt. No commentary, no markdown, no code fences. Just the prompt text.`;
}

export function buildInfographicMetaUserPrompt(
  chapterTitle: string,
  keyConcepts: string[],
  contentSnippet: string,
): string {
  return `Write an infographic generation prompt for:

**Class**: "${chapterTitle}"
**Key concepts**: ${keyConcepts.join(', ')}

**Content excerpt**:
${contentSnippet.slice(0, 3000)}

Write a detailed, specific prompt that will produce an educational infographic visualizing the most important concept or relationship from this class.`;
}
