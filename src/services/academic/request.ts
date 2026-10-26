/**
 * fetch() for the academic lookup APIs (Crossref, Semantic Scholar,
 * Unpaywall). Every request gets a deadline — a stalled response would
 * otherwise hold a chapter in "verifying" indefinitely — and the number in
 * flight is capped across ALL dossiers, so "Research all" doesn't hit the
 * anonymous rate limits with dozens of parallel lookups.
 */

const REQUEST_TIMEOUT_MS = 10000;
const MAX_CONCURRENT = 4;

let active = 0;
const waiting: Array<() => void> = [];

async function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return;
  }
  // release() hands its slot straight to the next waiter.
  await new Promise<void>((resolve) => waiting.push(resolve));
}

function release(): void {
  const next = waiting.shift();
  if (next) next();
  else active--;
}

export async function academicFetch(url: string, signal?: AbortSignal): Promise<Response> {
  await acquire();
  try {
    const deadline = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const combined =
      signal && typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, deadline]) : deadline;
    return await fetch(url, { signal: combined });
  } finally {
    release();
  }
}
