import type { StateStorage } from 'zustand/middleware';
import { createJSONStorage } from 'zustand/middleware';

const DB_NAME = 'classbuild';
const STORE_NAME = 'persist';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
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

function idbSet(db: IDBDatabase, key: string, value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(db: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;
function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) dbPromise = openDb();
  return dbPromise;
}

const idbStateStorage: StateStorage = {
  async getItem(name: string): Promise<string | null> {
    const db = await getDb();
    let value = await idbGet(db, name);

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
  },

  async setItem(name: string, value: string): Promise<void> {
    try {
      const db = await getDb();
      // Guard against a never-settling put (an oversized payload can hang the
      // IndexedDB write without resolving OR rejecting — which previously left
      // a deceptively green "Saved" badge while content was silently not saved).
      // A timeout converts that hang into a visible persistError.
      await Promise.race([
        idbSet(db, name, value),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('IndexedDB write timed out — the course may be too large to save.')), 15000),
        ),
      ]);
      // Stamp the timestamp so the Header can show "Saved · Xs ago".
      // Dynamic import keeps this circular ref a true cycle break.
      const { useUiStore } = await import('./uiStore');
      const ui = useUiStore.getState();
      ui.setLastSavedAt(Date.now());
      // Every write serializes the FULL partialized state, so one success
      // means everything current is on disk — a lingering failure banner
      // from an earlier attempt is now stale. Clear it.
      if (ui.persistError) ui.setPersistError(null);
    } catch (err) {
      const { useUiStore } = await import('./uiStore');
      useUiStore.getState().setPersistError(
        `Failed to save: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  },

  async removeItem(name: string): Promise<void> {
    const db = await getDb();
    await idbDelete(db, name);
  },
};

export const idbStorage = createJSONStorage(() => idbStateStorage);
