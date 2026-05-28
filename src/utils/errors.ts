/**
 * Convert an error from Claude, OpenAI, ElevenLabs, or a raw fetch into a
 * short, user-facing sentence. Used by the UI so tab-error banners and
 * toasts don't leak internal API noise like "HTTP 429: {"error":..."}.
 *
 * The raw error is still useful for logs, so callers typically do:
 *   console.error('Quiz generation failed:', err);
 *   setTabError('quiz', friendlyError(err));
 */

interface StatusLike {
  status?: number;
  statusCode?: number;
  code?: number | string;
}

export function friendlyError(err: unknown, fallback = 'Something went wrong. Try again in a moment.'): string {
  if (err == null) return fallback;

  const message = err instanceof Error ? err.message : String(err);
  const status = getStatus(err);

  // Auth / billing
  if (status === 401 || /invalid[_\s-]?api[_\s-]?key|unauthori[sz]ed|authentication/i.test(message)) {
    return 'API key rejected. Check your key in Setup.';
  }
  if (status === 403 || /permission_denied|forbidden/i.test(message)) {
    return 'Access denied. Your account may not have permission for this model — check the provider console.';
  }
  if (/insufficient_quota|quota[_\s]exceeded|billing|credit balance/i.test(message)) {
    return 'Provider credit is exhausted. Top up your account and retry.';
  }

  // Rate limit / overload
  if (status === 429 || /rate[_\s]?limit|too many requests/i.test(message)) {
    return 'Too many requests. Wait 30–60 seconds and retry.';
  }
  if (status === 529 || status === 503 || /overloaded|service_unavailable|server_error/i.test(message)) {
    return 'The model is overloaded right now. Retry in a minute.';
  }

  // Input / content
  if (/content[_\s]?filter|prohibited[_\s]?content|safety/i.test(message)) {
    return 'The model declined to respond to that prompt. Try softer wording or a different angle.';
  }
  if (status === 400 || /invalid_request|bad request/i.test(message)) {
    return 'The request was rejected. Try regenerating — if it keeps failing, refine your topic.';
  }

  // Stale client after a new deploy: the running page references a code-split
  // chunk whose hash no longer exists, so the dynamic import fails with
  // "Failed to fetch dynamically imported module" or a MIME-type error.
  if (/dynamically imported module|mime type of "text\/html"|module script/i.test(message)) {
    return 'ClassBuild was updated while this tab was open. Refresh the page (Cmd/Ctrl+Shift+R) and retry.';
  }

  // Network
  if (/failed to fetch|network|ecconnreset|timeout|timed out|econnref/i.test(message)) {
    return 'Network error. Check your connection and retry.';
  }

  // Parsing — means we got a response but it wasn't usable
  if (/unexpected token|json\.parse|malformed|parse/i.test(message)) {
    return 'The model returned unexpected output. Regenerating usually fixes this.';
  }

  if (typeof status === 'number' && status >= 500) {
    return 'The provider is having issues. Retry in a minute.';
  }

  return fallback;
}

function getStatus(err: unknown): number | undefined {
  if (err == null || typeof err !== 'object') return undefined;
  const s = err as StatusLike;
  if (typeof s.status === 'number') return s.status;
  if (typeof s.statusCode === 'number') return s.statusCode;
  if (typeof s.code === 'number') return s.code;
  return undefined;
}
