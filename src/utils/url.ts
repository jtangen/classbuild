/**
 * Returns true only for http(s) URLs. Blocks javascript:, data:, vbscript:, etc.
 * which could otherwise fire a prompt-injected payload when a user clicks an
 * AI-produced research-source link.
 */
export function isSafeHttpUrl(url: unknown): url is string {
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim());
}

/**
 * True only for in-memory media the app itself produces: `blob:` object URLs
 * and base64 `data:` URIs of the given kind (e.g. 'audio', 'image'). Use it
 * before handing a stored URL to an imperative sink (`a.href = …; a.click()`,
 * `window.open`) — those bypass React's javascript:-URL blocking, and stored
 * values can come from an imported project file.
 */
export function isSafeMediaUrl(url: unknown, kind: 'audio' | 'image'): url is string {
  if (typeof url !== 'string') return false;
  return url.startsWith('blob:') || new RegExp(`^data:${kind}/[\\w.+-]+;base64,`, 'i').test(url);
}
