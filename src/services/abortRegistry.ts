/**
 * Registry of in-flight generation AbortControllers, keyed by a stable string
 * ("reading:3", "quiz:3", "research:3", "syllabus", "batch", …). Lives at
 * module level — controllers aren't serializable state, and the registry must
 * survive component unmounts so a Stop button rendered after navigation can
 * still cancel a stream started before it.
 */
const controllers = new Map<string, AbortController>();

// Change notification, so a page that remounts mid-run (ResearchPage) can
// render work started by its previous mount as still in flight.
const listeners = new Set<() => void>();
let version = 0;
function changed(): void {
  version++;
  listeners.forEach((listener) => listener());
}

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
  changed();
  return controller;
}

/**
 * Unregister after the work settles. Pass the controller you registered so a
 * finished attempt can't evict a newer one that reused the key.
 */
export function endAbortable(key: string, controller: AbortController): void {
  if (controllers.get(key) === controller) {
    controllers.delete(key);
    changed();
  }
}

/** Abort whatever is registered under `key`. Returns true if something was. */
export function abortInFlight(key: string): boolean {
  const controller = controllers.get(key);
  if (!controller) return false;
  controllers.delete(key);
  controller.abort();
  changed();
  return true;
}

/**
 * Abort everything in flight. Called when the course is reset or replaced, so
 * a stream from the old course can't land its result in the new one.
 */
export function abortAll(): void {
  if (controllers.size === 0) return;
  const all = [...controllers.values()];
  controllers.clear();
  all.forEach((controller) => controller.abort());
  changed();
}

/** True while something is registered (started, not yet settled) under `key`. */
export function isInFlight(key: string): boolean {
  return controllers.has(key);
}

/** useSyncExternalStore subscription: fires whenever any key starts or settles. */
export function subscribeAbortable(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** useSyncExternalStore snapshot — bumps on every registry change. */
export function abortableVersion(): number {
  return version;
}
