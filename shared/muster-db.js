// Zugriff auf die Mustersammlung (IndexedDB „isadody-muster“), gemeinsam für muster/ und anleitung/.
// MusterDB.open() → Promise<IDBDatabase>; MusterDB.all() → Promise<Muster[]>
const MusterDB = (() => {
  const DB = 'isadody-muster', ST = 'items';
  let p;
  const open = () => p || (p = new Promise((ok, err) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ST, { keyPath: 'id' });
    r.onsuccess = () => ok(r.result); r.onerror = () => { p = null; err(r.error); };
  }));
  const all = () => open().then(db => new Promise((ok, err) => {
    const q = db.transaction(ST, 'readonly').objectStore(ST).getAll();
    q.onsuccess = () => ok(q.result); q.onerror = () => err(q.error);
  }));
  return { open, all, ST };
})();
