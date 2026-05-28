/**
 * Anti-hallucination safety clause appended to every gpt-image-2 prompt.
 *
 * Single source of truth — Claude is no longer asked to write its own trailing
 * safety clause inside the image prompt (the chapter and slide prompts used
 * to do both, which the user noticed as redundant copy at the end of every
 * generated prompt). The factual-fidelity guard is the genuinely useful part
 * here: even if Claude writes "a chart showing forgetting over 30 days",
 * gpt-image-2 will happily invent axis ticks ("0, 10, 20, 30" / "100%, 75%,
 * 50%") that have no source. This clause tells it not to.
 *
 * What we don't include here (and why):
 *   - "No course-position metadata (Chapter N, Class N, …)" — gpt-image-2
 *     has no access to course context unless Claude wrote it into the
 *     prompt, and Claude is already instructed not to. Adding this clause
 *     at the gpt-image-2 level is mentioning something the model couldn't
 *     have done anyway.
 */
export const IMAGE_FACTUAL_SAFETY_CLAUSE =
  ' Render only text, numbers, dates, names, and citations that appear verbatim earlier in this prompt. Do not invent values: no made-up axis numbers, percentages, sample sizes, dates, author names, or journal titles. If a chart or label would require data that is not in this prompt, omit the values entirely and render the visual as an unlabelled abstract trend.';

/** Append the safety clause to a prompt, idempotent if it's already present. */
export function withSafetyClause(prompt: string): string {
  const trimmed = prompt.trimEnd();
  if (trimmed.includes('IMPORTANT FACTUAL FIDELITY')) return trimmed;
  return trimmed + IMAGE_FACTUAL_SAFETY_CLAUSE;
}
