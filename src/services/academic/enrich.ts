/**
 * Enrich a research dossier against Semantic Scholar, Crossref, and Unpaywall.
 *
 * For each source the model emitted:
 *   - If the source has a DOI: verify it via Crossref. If the resolved title
 *     matches what the model claimed, accept it and pull metadata. If not,
 *     strip the DOI as a likely hallucination.
 *   - If the source has no DOI but has a title: search Semantic Scholar and
 *     adopt the top title-matching paper's DOI + metadata.
 *   - Either way, look up Unpaywall for a legal open-access URL.
 *
 * Network failures degrade gracefully — the source is kept as-is, just marked
 * `isVerified: false`. We never invent data.
 */

import type { ResearchDossier, ResearchSource } from '../../types/course';
import { searchPapers } from './semanticScholar';
import { fetchCrossrefWork } from './crossref';
import { findOpenAccess } from './unpaywall';

export interface EnrichmentStats {
  total: number;
  doiVerified: number;
  doiResolved: number;
  oaFound: number;
  unverified: number;
}

export interface EnrichOptions {
  /** Concurrency cap for parallel enrichment. Default 4. */
  concurrency?: number;
  onProgress?: (done: number, total: number) => void;
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titlesMatch(a: string, b: string): boolean {
  const A = normalizeTitle(a);
  const B = normalizeTitle(b);
  if (!A || !B) return false;
  if (A === B) return true;
  if (A.length >= 20 && B.length >= 20 && (A.includes(B) || B.includes(A))) {
    return true;
  }
  const tokA = new Set(A.split(' ').filter((t) => t.length > 3));
  const tokB = new Set(B.split(' ').filter((t) => t.length > 3));
  if (tokA.size === 0 || tokB.size === 0) return false;
  const intersection = [...tokA].filter((t) => tokB.has(t)).length;
  const union = new Set([...tokA, ...tokB]).size;
  return intersection / union >= 0.6;
}

async function enrichSource(
  source: ResearchSource,
  stats: EnrichmentStats,
): Promise<ResearchSource> {
  // Path A: source already claims a DOI — verify it against Crossref.
  if (source.doi) {
    const work = await fetchCrossrefWork(source.doi);
    if (work && work.title) {
      const titleOk = !source.title || titlesMatch(source.title, work.title);
      if (!titleOk) {
        // Title doesn't match the DOI's actual paper — the model likely
        // hallucinated the DOI. Strip it; keep the source unverified.
        stats.unverified++;
        return { ...source, doi: undefined, isVerified: false };
      }
      stats.doiVerified++;
      const oa = await findOpenAccess(work.doi);
      if (oa?.isOa && oa.bestOaUrl) stats.oaFound++;
      return {
        ...source,
        title: work.title || source.title,
        authors: work.authors || source.authors,
        year: work.year || source.year,
        doi: work.doi,
        url: oa?.bestOaUrl || source.url || work.url,
        isVerified: true,
      };
    }
    // DOI didn't resolve. Fall through to title lookup, but strip the DOI.
    source = { ...source, doi: undefined };
  }

  // Path B: no DOI — search Semantic Scholar by title.
  if (source.title && source.title.length > 8) {
    const results = await searchPapers(source.title, 3);
    const match = results.find((r) => r.title && titlesMatch(source.title, r.title));
    if (match) {
      const doi = match.externalIds?.DOI;
      const authorsStr = (match.authors || [])
        .slice(0, 3)
        .map((a) => a.name)
        .filter(Boolean)
        .join(', ');
      if (doi) {
        stats.doiResolved++;
        const oa = await findOpenAccess(doi);
        if (oa?.isOa && oa.bestOaUrl) stats.oaFound++;
        return {
          ...source,
          title: match.title || source.title,
          authors: authorsStr || source.authors,
          year: match.year?.toString() || source.year,
          doi,
          url: oa?.bestOaUrl || match.openAccessPdf?.url || source.url,
          isVerified: true,
        };
      }
      // Found in S2 but no DOI — still a real paper, accept it.
      stats.doiResolved++;
      return {
        ...source,
        title: match.title || source.title,
        authors: authorsStr || source.authors,
        year: match.year?.toString() || source.year,
        url: match.openAccessPdf?.url || source.url,
        isVerified: true,
      };
    }
  }

  // Couldn't verify against any external source.
  stats.unverified++;
  return { ...source, isVerified: false };
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const i = cursor++;
      results[i] = await tasks[i]();
    }
  }
  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    worker,
  );
  await Promise.all(workers);
  return results;
}

export async function enrichDossier(
  dossier: ResearchDossier,
  options?: EnrichOptions,
): Promise<{ dossier: ResearchDossier; stats: EnrichmentStats }> {
  const stats: EnrichmentStats = {
    total: dossier.sources.length,
    doiVerified: 0,
    doiResolved: 0,
    oaFound: 0,
    unverified: 0,
  };
  if (dossier.sources.length === 0) {
    return { dossier, stats };
  }

  let done = 0;
  const tasks = dossier.sources.map((s) => async () => {
    try {
      return await enrichSource(s, stats);
    } finally {
      done++;
      options?.onProgress?.(done, dossier.sources.length);
    }
  });

  const enriched = await runWithConcurrency(tasks, options?.concurrency ?? 4);
  return {
    dossier: { ...dossier, sources: enriched },
    stats,
  };
}
