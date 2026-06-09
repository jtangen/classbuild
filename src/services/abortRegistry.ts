/**
 * Registry of in-flight generation AbortControllers, keyed by a stable string
 * ("reading:3", "quiz:3", "syllabus", "batch", …). Lives at module level —
 * controllers aren't serializable state, and the registry must survive
 * component unmounts so a Stop button rendered after navigation can still
 * cancel a stream started before it.
 */
const controllers = new Map<string, AbortController>();

/** Key for a per-chapter material generation. */
export const materialAbortKey = (kind: string, chapterNum: number): string =>
  `${kind}:${chapterNum}`;

/**
 * Create and register a controller for `key`, aborting any stale one first
 * (a re-generate while a previous attempt is somehow still streaming should
 * supersede it, not race it).
 */
export function beginAbortable(key: string): AbortController {
  abortInFlight(key);
  const controller = new AbortController();
  controllers.set(key, controller);
  return controller;
}

/**
 * Unregister after the work settles. Pass the controller you registered so a
 * finished attempt can't evict a newer one that reused the key.
 */
export function endAbortable(key: string, controller: AbortController): void {
  if (controllers.get(key) === controller) controllers.delete(key);
}

/** Abort whatever is registered under `key`. Returns true if something was. */
export function abortInFlight(key: string): boolean {
  const controller = controllers.get(key);
  if (!controller) return false;
  controllers.delete(key);
  controller.abort();
  return true;
}
