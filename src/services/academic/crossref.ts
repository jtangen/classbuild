/**
 * Crossref REST API — free, CORS-friendly, no key. The polite pool wants a
 * User-Agent identifier, but browsers don't let us set it; Crossref still
 * answers, just on the anonymous queue.
 * https://api.crossref.org/swagger-ui/index.html
 */

import { academicFetch } from './request';

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

/**
 * 'not-found' means Crossref has no such DOI (404, or not a DOI at all) — the
 * only result that justifies discarding a model-supplied DOI. 'error' (rate
 * limit, 5xx, timeout, offline) says nothing about the DOI either way.
 */
export type CrossrefLookup =
  | { status: 'found'; work: CrossrefWork }
  | { status: 'not-found' }
  | { status: 'error' };

export async function fetchCrossrefWork(
  doi: string,
  signal?: AbortSignal,
): Promise<CrossrefLookup> {
  const normalized = normalizeDoi(doi);
  if (!normalized || !normalized.includes('/')) return { status: 'not-found' };
  try {
    const res = await academicFetch(
      `https://api.crossref.org/works/${encodeURIComponent(normalized)}`,
      signal,
    );
    if (res.status === 404) return { status: 'not-found' };
    if (!res.ok) return { status: 'error' };
    const data = await res.json();
    const m: CrossrefRaw = data?.message ?? {};
    return {
      status: 'found',
      work: {
        doi: m.DOI || normalized,
        title: m.title?.[0] ?? '',
        authors: formatAuthors(m.author),
        year: m.issued?.['date-parts']?.[0]?.[0]?.toString() ?? '',
        container: m['container-title']?.[0] ?? '',
        url: m.URL,
      },
    };
  } catch {
    return { status: 'error' };
  }
}
