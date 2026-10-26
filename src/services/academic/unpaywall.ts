/**
 * Unpaywall API — free, CORS-friendly. Returns the best legal open-access
 * copy of a DOI when one exists. Email is required as a polite-pool token,
 * not for auth. https://unpaywall.org/products/api
 */

import { normalizeDoi } from './crossref';
import { academicFetch } from './request';

const UNPAYWALL_EMAIL = 'classbuild@example.com';

export interface UnpaywallHit {
  doi: string;
  isOa: boolean;
  bestOaUrl?: string;
}

export async function findOpenAccess(
  doi: string,
  signal?: AbortSignal,
): Promise<UnpaywallHit | null> {
  const normalized = normalizeDoi(doi);
  if (!normalized || !normalized.includes('/')) return null;
  try {
    const url = `https://api.unpaywall.org/v2/${encodeURIComponent(
      normalized,
    )}?email=${UNPAYWALL_EMAIL}`;
    const res = await academicFetch(url, signal);
    if (!res.ok) return null;
    const data = await res.json();
    const best = data?.best_oa_location;
    return {
      doi: normalized,
      isOa: !!data?.is_oa,
      bestOaUrl: best?.url_for_pdf || best?.url || undefined,
    };
  } catch {
    return null;
  }
}
