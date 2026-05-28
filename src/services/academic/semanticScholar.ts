/**
 * Semantic Scholar Academic Graph API — free, CORS-friendly, no key required
 * for low rates (~100 req / 5 min anonymous; 1 RPS with a key on request).
 * https://api.semanticscholar.org/api-docs/graph
 */

const BASE = 'https://api.semanticscholar.org/graph/v1';
const FIELDS =
  'title,authors,year,journal,externalIds,openAccessPdf,tldr,abstract';

export interface SsPaper {
  paperId: string;
  title: string;
  authors: Array<{ name: string }>;
  year: number | null;
  journal?: { name?: string } | null;
  externalIds?: { DOI?: string; ArXiv?: string; PubMed?: string };
  openAccessPdf?: { url: string } | null;
  tldr?: { text: string } | null;
  abstract?: string | null;
}

export async function searchPapers(
  query: string,
  limit = 3,
): Promise<SsPaper[]> {
  const url = `${BASE}/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=${FIELDS}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.data) ? (data.data as SsPaper[]) : [];
  } catch {
    return [];
  }
}

export async function getPaperByDoi(doi: string): Promise<SsPaper | null> {
  const url = `${BASE}/paper/DOI:${encodeURIComponent(doi)}?fields=${FIELDS}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as SsPaper;
  } catch {
    return null;
  }
}
