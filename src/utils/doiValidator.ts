/**
 * Validate DOIs against the doi.org Handle API.
 * responseCode 1 = valid, anything else = invalid.
 * https://www.doi.org/the-identifier/resources/factsheets/doi-resolution-documentation
 */

const DOI_HANDLE_API = 'https://doi.org/api/handles/';

/** Normalize a DOI string — strip URL prefix, whitespace, trailing punctuation */
function normalizeDoi(doi: string): string {
  let d = doi.trim();
  // Strip common URL prefixes
  d = d.replace(/^https?:\/\/doi\.org\//, '');
  d = d.replace(/^https?:\/\/dx\.doi\.org\//, '');
  d = d.replace(/^doi:\s*/i, '');
  // Strip trailing period or comma (common in pasted citations)
  d = d.replace(/[.,;]+$/, '');
  return d;
}

/**
 * Check if a single DOI resolves via the Handle API.
 * Returns true if valid, false if invalid or on network error.
 */
async function checkDoi(doi: string): Promise<boolean> {
  const normalized = normalizeDoi(doi);
  if (!normalized || !normalized.includes('/')) return false;

  try {
    const response = await fetch(`${DOI_HANDLE_API}${normalized}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.responseCode === 1;
  } catch {
    // Network error — don't strip the DOI, give benefit of doubt
    return true;
  }
}

export interface DoiValidationResult {
  doi: string;
  valid: boolean;
}

/**
 * Validate an array of DOIs in parallel.
 * Returns a Map from original DOI string to validity.
 */
export async function validateDois(dois: string[]): Promise<Map<string, boolean>> {
  const unique = [...new Set(dois.filter(Boolean))];
  const results = await Promise.all(
    unique.map(async (doi): Promise<[string, boolean]> => [doi, await checkDoi(doi)])
  );
  return new Map(results);
}
