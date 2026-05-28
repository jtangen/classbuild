/**
 * Crossref REST API — free, CORS-friendly, no key. The polite pool wants a
 * User-Agent identifier, but browsers don't let us set it; Crossref still
 * answers, just on the anonymous queue.
 * https://api.crossref.org/swagger-ui/index.html
 */

export interface CrossrefWork {
  doi: string;
  title: string;
  authors: string;
  year: string;
  container: string;
  url?: string;
}

export function normalizeDoi(doi: string): string {
  let d = doi.trim();
  d = d.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  d = d.replace(/^doi:\s*/i, '');
  d = d.replace(/[.,;]+$/, '');
  return d;
}

interface CrossrefAuthor {
  given?: string;
  family?: string;
  literal?: string;
}

interface CrossrefRaw {
  DOI?: string;
  title?: string[];
  author?: CrossrefAuthor[];
  issued?: { 'date-parts'?: number[][] };
  'container-title'?: string[];
  URL?: string;
}

function formatAuthors(authors?: CrossrefAuthor[]): string {
  if (!authors || authors.length === 0) return '';
  const names = authors.map((a) => {
    if (a.literal) return a.literal;
    const family = a.family ?? '';
    const given = a.given ? a.given[0] + '.' : '';
    return family && given ? `${family}, ${given}` : family || given;
  });
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]} et al.`;
}

export async function fetchCrossrefWork(
  doi: string,
): Promise<CrossrefWork | null> {
  const normalized = normalizeDoi(doi);
  if (!normalized || !normalized.includes('/')) return null;
  try {
    const res = await fetch(
      `https://api.crossref.org/works/${encodeURIComponent(normalized)}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const m: CrossrefRaw = data?.message ?? {};
    return {
      doi: m.DOI || normalized,
      title: m.title?.[0] ?? '',
      authors: formatAuthors(m.author),
      year: m.issued?.['date-parts']?.[0]?.[0]?.toString() ?? '',
      container: m['container-title']?.[0] ?? '',
      url: m.URL,
    };
  } catch {
    return null;
  }
}
