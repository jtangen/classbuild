import type { ActivityDetail } from '../types/course';

/**
 * Guarantees a fully-shaped ActivityDetail.
 *
 * The activity-detail model (Haiku) occasionally returns valid JSON that omits
 * an array field — most often `variations` — and the `as ActivityDetail` cast
 * at parse time does not validate it. Render/export sites then do
 * `detail.variations.length` / `.map` / `.forEach` on `undefined`, which throws
 * and takes down the entire Build phase (the ErrorBoundary catches it, but the
 * malformed object is persisted, so reselecting the Activities tab re-crashes).
 *
 * Normalizing on parse (and defensively wherever a stored detail is read) keeps
 * any missing field from ever reaching a `.length`/`.map`/`.forEach`.
 */
export function normalizeActivityDetail(
  raw: Partial<ActivityDetail> | null | undefined,
): ActivityDetail | undefined {
  if (!raw) return undefined;
  return {
    steps: Array.isArray(raw.steps) ? raw.steps : [],
    facilitationTips: Array.isArray(raw.facilitationTips) ? raw.facilitationTips : [],
    commonPitfalls: Array.isArray(raw.commonPitfalls) ? raw.commonPitfalls : [],
    debriefGuide: typeof raw.debriefGuide === 'string' ? raw.debriefGuide : '',
    variations: Array.isArray(raw.variations) ? raw.variations : [],
    assessmentIdeas: typeof raw.assessmentIdeas === 'string' ? raw.assessmentIdeas : '',
  };
}
