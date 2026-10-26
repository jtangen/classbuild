import type { ResearchSource, ResearchDossier } from '../types/course';

export const RESEARCH_SYSTEM_PROMPT = `You are a research assistant building a research dossier for a university course chapter. Your job is to find real, verifiable academic sources using web search.

PROCESS:
1. Search for key academic sources related to the chapter topic
2. Search for seminal papers, textbooks, and authoritative reviews
3. Synthesize findings into a structured dossier

VERIFICATION — IMPORTANT:
Every source you emit will be automatically verified against Semantic Scholar, Crossref, and Unpaywall after you finish. Unverified sources are flagged in the UI; hallucinated DOIs are stripped; open-access URLs are added where they exist.

Therefore:
- Only include papers/books you are CONFIDENT exist. If you didn't see it in a search result, don't cite it.
- Never invent or guess a DOI. If you don't have the exact DOI from a search result, omit the field — the verifier will look it up by title.
- Provide the most accurate title you can — title is what the verifier matches against.
- Prefer peer-reviewed journal articles, seminal textbooks, and authoritative reviews.

After completing your research, output your dossier as JSON:
{
  "sources": [
    {
      "title": "Full paper/book title — be precise; this is what the verifier matches against",
      "authors": "Author names",
      "year": "Publication year",
      "url": "URL if found (the verifier may replace this with an open-access link)",
      "doi": "DOI if you saw it in a search result — omit if unsure",
      "summary": "Brief summary of key findings relevant to the chapter",
      "relevance": "How this source supports the chapter content",
      "isVerified": true
    }
  ],
  "synthesisNotes": "How these sources collectively inform the chapter content and key pedagogical takeaways"
}

Find 5-8 high-quality sources per chapter. Output ONLY the JSON dossier.`;

export function buildResearchUserPrompt(chapterTitle: string, chapterNarrative: string, keyConcepts: string[]) {
  return `Research the following chapter topic and build a dossier of real academic sources.

**Chapter**: "${chapterTitle}"
**Description**: ${chapterNarrative}
**Key concepts**: ${keyConcepts.join(', ')}

Search for real academic sources. Find 5-8 high-quality references.`;
}

/**
 * Model JSON is loosely typed — `"year": 2019`, `"authors": ["A", "B"]` — and
 * the UI calls string methods on these fields, so coerce rather than cast.
 */
function asText(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(asText).filter(Boolean).join(', ');
  return '';
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

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
    if (!isObject(raw)) return null;
    return {
      chapterNumber,
      sources: (Array.isArray(raw.sources) ? raw.sources : [])
        .filter(isObject)
        .map((s): ResearchSource => ({
          title: asText(s.title),
          authors: asText(s.authors),
          year: asText(s.year),
          url: asText(s.url) || undefined,
          doi: asText(s.doi) || undefined,
          summary: asText(s.summary),
          relevance: asText(s.relevance),
          isVerified: s.isVerified === true,
        })),
      synthesisNotes: asText(raw.synthesisNotes),
    };
  } catch {
    return null;
  }
}
