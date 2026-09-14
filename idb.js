// Minimal IndexedDB wrapper for storing user-uploaded cheat sheets as Blobs.
// Everything stays local — no network calls.

const CheatSheetDB = (() => {
  const DB_NAME = 'cardio-billing-cheatsheets';
  const DB_VERSION = 1;
  const STORE = 'files';

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('cat', 'cat', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function tx(mode) {
    return openDb().then((db) => db.transaction(STORE, mode).objectStore(STORE));
  }

  async function addFile({ cat, name, type, blob }) {
    const store = await tx('readwrite');
    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      cat,
      name,
      type,
      blob,
      addedAt: Date.now(),
    };
    return new Promise((resolve, reject) => {
      const req = store.add(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  }

  async function listByCategory(cat) {
    const store = await tx('readonly');
    return new Promise((resolve, reject) => {
      const index = store.index('cat');
      const req = index.getAll(cat);
      req.onsuccess = () => resolve(req.result.sort((a, b) => b.addedAt - a.addedAt));
      req.onerror = () => reject(req.error);
    });
  }

  async function countsByCategory() {
    const store = await tx('readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const counts = {};
        for (const rec of req.result) {
          counts[rec.cat] = (counts[rec.cat] || 0) + 1;
        }
        resolve(counts);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function getFile(id) {
    const store = await tx('readonly');
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteFile(id) {
    const store = await tx('readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  return { addFile, listByCategory, countsByCategory, getFile, deleteFile };
})();
