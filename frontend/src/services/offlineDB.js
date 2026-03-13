const DB_NAME = 'MandiConnectDB';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pendingCrops')) {
        db.createObjectStore('pendingCrops', { keyPath: 'localId' });
      }
      if (!db.objectStoreNames.contains('userData')) {
        db.createObjectStore('userData', { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePendingCrop(crop) {
  const db = await openDB();
  const tx = db.transaction('pendingCrops', 'readwrite');
  tx.objectStore('pendingCrops').put({ ...crop, localId: crop.localId || Date.now().toString() });
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingCrops() {
  const db = await openDB();
  const tx = db.transaction('pendingCrops', 'readonly');
  const store = tx.objectStore('pendingCrops');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function clearPendingCrops() {
  const db = await openDB();
  const tx = db.transaction('pendingCrops', 'readwrite');
  tx.objectStore('pendingCrops').clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveUserData(key, value) {
  const db = await openDB();
  const tx = db.transaction('userData', 'readwrite');
  tx.objectStore('userData').put({ key, value });
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function getUserData(key) {
  const db = await openDB();
  const tx = db.transaction('userData', 'readonly');
  const store = tx.objectStore('userData');
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result?.value || null);
    req.onerror = () => reject(req.error);
  });
}
