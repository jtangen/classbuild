import type { StateStorage } from 'zustand/middleware';
import { createJSONStorage } from 'zustand/middleware';

const DB_NAME = 'classbuild';
const STORE_NAME = 'persist';
const DB_VERSION = 1;

/** How long a read or write may take before it's treated as failed. */
const READ_TIMEOUT_MS = 15000;
const WRITE_TIMEOUT_MS = 15000;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // The browser can drop the connection under us (Safari does after long
      // backgrounding); forget it so the next read or write reopens instead
      // of failing on a dead handle forever.
      db.onclose = () => {
        dbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Resolves only once the transaction has COMMITTED. A put's request can
 * succeed and the transaction still abort at commit — that's how quota
 * overruns are reported (QuotaExceededError on the transaction) — and
 * resolving on the request would stamp "Saved" on data that never landed.
 */
function idbSet(db: IDBDatabase, key: string, value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed.'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB write was aborted.'));
  });
}

function idbDelete(db: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB delete failed.'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB delete was aborted.'));
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;
function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) dbPromise = openDb();
  return dbPromise;
}

function withTimeout<T>(work: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    work,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Set when the saved course couldn't be read. Writes stay off for the rest of
 * the session so a later successful open can't overwrite the course that's
 * still on disk with the blank one this tab started from.
 */
let writesBlocked: string | null = null;

async function reportPersistError(message: string): Promise<void> {
  // Dynamic import keeps the store ↔ storage reference a true cycle break.
  const { useUiStore } = await import('./uiStore');
  useUiStore.getState().setPersistError(message);
}

const idbStateStorage: StateStorage = {
  async getItem(name: string): Promise<string | null> {
    try {
      const db = await withTimeout(getDb(), READ_TIMEOUT_MS, 'IndexedDB did not respond.');
      let value = await withTimeout(idbGet(db, name), READ_TIMEOUT_MS, 'IndexedDB did not respond.');

      // One-time migration from localStorage → IndexedDB
      if (value === null) {
        try {
          const lsValue = localStorage.getItem(name);
          if (lsValue !== null) {
            await idbSet(db, name, lsValue);
            localStorage.removeItem(name);
            value = lsValue;
          }
        } catch {
          // localStorage may be unavailable
        }
      }

      return value;
    } catch (err) {
      // IndexedDB is unavailable (site data blocked, storage disabled, a
      // corrupt profile) or hung. Rejecting would leave zustand's hydration
      // unfinished, so App would sit on its loading screen forever. Start
      // from a blank course instead, with saving switched off.
      dbPromise = null;
      writesBlocked = `This browser's storage is unavailable (${errorText(err)}). Changes in this tab won't be saved — reload to try again, or download a project file from Export to keep your work.`;
      await reportPersistError(writesBlocked);
      return null;
    }
  },

  async setItem(name: string, value: string): Promise<void> {
    if (writesBlocked) {
      await reportPersistError(writesBlocked);
      return;
    }
    try {
      const db = await getDb();
      // Guard against a never-settling put (an oversized payload can hang the
      // IndexedDB write without resolving OR rejecting — which previously left
      // a deceptively green "Saved" badge while content was silently not saved).
      // A timeout converts that hang into a visible persistError.
      await withTimeout(
        idbSet(db, name, value),
        WRITE_TIMEOUT_MS,
        'IndexedDB write timed out — the course may be too large to save.',
      );
      // Stamp the timestamp so the Header can show "Saved · Xs ago".
      const { useUiStore } = await import('./uiStore');
      const ui = useUiStore.getState();
      ui.setLastSavedAt(Date.now());
      // Every write serializes the FULL partialized state, so one success
      // means everything current is on disk — a lingering failure banner
      // from an earlier attempt is now stale. Clear it.
      if (ui.persistError) ui.setPersistError(null);
    } catch (err) {
      // Reopen on the next attempt — the cached connection may be the problem
      // (closed by the browser, or a failed open that would otherwise be
      // cached forever and make "retry" useless).
      dbPromise = null;
      await reportPersistError(`Failed to save: ${errorText(err)}`);
    }
  },

  async removeItem(name: string): Promise<void> {
    const db = await getDb();
    await idbDelete(db, name);
  },
};

export const idbStorage = createJSONStorage(() => idbStateStorage);
