import type { ResearchSource, ResearchDossier } from '../types/course';

export const RESEARCH_SYSTEM_PROMPT = `You are a research assistant building a research dossier for a university course chapter. Your job is to find real, verifiable academic sources using web search.

PROCESS:
1. Search for key academic sources related to the chapter topic
2. Search for seminal papers, textbooks, and authoritative reviews
3. Synthesize findings into a structured dossier

After completing your research, output your dossier as JSON:
{
  "sources": [
    {
      "title": "Full paper/book title",
      "authors": "Author names",
      "year": "Publication year",
      "url": "URL if found",
      "doi": "DOI if available",
      "summary": "Brief summary of key findings relevant to the chapter",
      "relevance": "How this source supports the chapter content",
      "isVerified": true
    }
  ],
  "synthesisNotes": "How these sources collectively inform the chapter content and key pedagogical takeaways"
}

Find 5-8 high-quality sources per chapter. Prefer peer-reviewed journal articles, seminal textbooks, and authoritative reviews. Output ONLY the JSON dossier.`;

export function buildResearchUserPrompt(chapterTitle: string, chapterNarrative: string, keyConcepts: string[]) {
  return `Research the following chapter topic and build a dossier of real academic sources.

**Chapter**: "${chapterTitle}"
**Description**: ${chapterNarrative}
**Key concepts**: ${keyConcepts.join(', ')}

Search for real academic sources. Find 5-8 high-quality references.`;
}

export function parseResearchResponse(text: string, chapterNumber: number): ResearchDossier | null {
  try {
    let jsonStr = text;
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) jsonStr = codeBlockMatch[1];

    // Try to extract JSON object from text
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);

    const raw = JSON.parse(jsonStr);
    return {
      chapterNumber,
      sources: (raw.sources || []).map((s: Record<string, unknown>): ResearchSource => ({
        title: (s.title as string) || '',
        authors: (s.authors as string) || '',
        year: (s.year as string) || '',
        url: s.url as string | undefined,
        doi: s.doi as string | undefined,
        summary: (s.summary as string) || '',
        relevance: (s.relevance as string) || '',
        isVerified: (s.isVerified as boolean) ?? false,
      })),
      synthesisNotes: (raw.synthesisNotes as string) || '',
    };
  } catch {
    return null;
  }
}
