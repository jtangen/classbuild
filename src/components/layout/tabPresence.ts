/**
 * Cross-tab awareness. Every ClassBuild tab in this browser saves its WHOLE
 * course snapshot to the same IndexedDB key, so two open tabs silently
 * overwrite each other — whichever saves last wins. This module lets each
 * tab know (a) whether another tab is open and (b) whether another tab has
 * saved since this one loaded or last saved, i.e. this tab's copy is now
 * older than what's on disk.
 *
 * BroadcastChannel only; where it's unavailable this reports "alone" and the
 * app behaves exactly as before.
 *
 * Protocol (tiny messages, same-origin tabs only):
 *   hello — "I'm here, who else is?" — sent on start, whenever the tab
 *           becomes visible, and every PING_MS while visible.
 *   here  — reply to hello. Sent from a message handler, so a hidden tab
 *           (timers throttled) still answers promptly.
 *   saved — this tab just wrote its snapshot.
 *   bye   — the tab is going away (pagehide).
 * A peer that hasn't been heard from for PEER_TIMEOUT_MS is dropped, which
 * covers tabs that crashed or were frozen without saying bye.
 */
import { useUiStore } from '../../store/uiStore';

const CHANNEL_NAME = 'classbuild-tabs';
const PING_MS = 10000;
const PEER_TIMEOUT_MS = 25000;

type TabMessageType = 'hello' | 'here' | 'saved' | 'bye';

export interface TabPresence {
  /** Other ClassBuild tabs currently open in this browser. */
  otherTabs: number;
  /** Another tab saved after this tab loaded or last saved, so this tab's
   *  in-memory course is older than what's stored, and its next save will
   *  replace the newer version. */
  otherTabSavedNewer: boolean;
}

const TAB_ID =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

let snapshot: TabPresence = { otherTabs: 0, otherTabSavedNewer: false };
const listeners = new Set<() => void>();
const peers = new Map<string, number>(); // tabId → last heard (ms)
let channel: BroadcastChannel | null = null;
let started = false;

function publish(next: TabPresence): void {
  if (
    next.otherTabs === snapshot.otherTabs &&
    next.otherTabSavedNewer === snapshot.otherTabSavedNewer
  ) {
    return;
  }
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function refresh(otherTabSavedNewer = snapshot.otherTabSavedNewer): void {
  const now = Date.now();
  for (const [id, lastHeard] of peers) {
    if (now - lastHeard > PEER_TIMEOUT_MS) peers.delete(id);
  }
  publish({ otherTabs: peers.size, otherTabSavedNewer });
}

function post(type: TabMessageType): void {
  try {
    channel?.postMessage({ type, tabId: TAB_ID });
  } catch {
    // Channel closed (page tearing down) — nothing to tell anyone.
  }
}

function start(): void {
  if (started) return;
  started = true;
  if (typeof BroadcastChannel === 'undefined' || typeof window === 'undefined') return;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    channel = null;
    return;
  }

  channel.onmessage = (event: MessageEvent) => {
    const msg = event.data as { type?: unknown; tabId?: unknown } | null;
    if (!msg || typeof msg.tabId !== 'string' || msg.tabId === TAB_ID) return;
    if (msg.type === 'bye') {
      peers.delete(msg.tabId);
      refresh();
      return;
    }
    peers.set(msg.tabId, Date.now());
    if (msg.type === 'hello') post('here');
    refresh(msg.type === 'saved' ? true : snapshot.otherTabSavedNewer);
  };

  // This tab's own saves: tell the others their copy is now older than disk,
  // and clear our own "older" flag — what we just wrote is the newest.
  useUiStore.subscribe((state, prev) => {
    if (state.lastSavedAt !== null && state.lastSavedAt !== prev.lastSavedAt) {
      post('saved');
      if (snapshot.otherTabSavedNewer) refresh(false);
    }
  });

  post('hello');
  window.setInterval(() => {
    if (document.visibilityState === 'visible') post('hello');
    refresh();
  }, PING_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') post('hello');
  });
  window.addEventListener('pagehide', () => post('bye'));
  // Back/forward cache: a restored page is live again.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) post('hello');
  });
}

/** useSyncExternalStore subscription; starts listening on first use. */
export function subscribeTabPresence(listener: () => void): () => void {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTabPresence(): TabPresence {
  return snapshot;
}
