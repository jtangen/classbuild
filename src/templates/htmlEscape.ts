/**
 * Build-time escaping for the standalone HTML templates (quiz, weekly
 * challenge, CLI course package). Model-generated text can contain `<`, `&`,
 * quotes and even a literal `</script>`, so nothing it touches should reach the
 * generated page unescaped.
 */

/** Escape text for HTML element content or a quoted attribute value. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * JSON for embedding inside an inline `<script>`. Escaping `<` stops model text
 * containing `</script>` (or `<!--` + `<script`) from ending the script element
 * early; U+2028/U+2029 are escaped for older JS engines. The result is still
 * valid JSON and a valid JS expression.
 */
export function toScriptJson(value: unknown): string {
  return (JSON.stringify(value) ?? 'null')
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
