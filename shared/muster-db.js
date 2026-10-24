// Zugriff auf die Mustersammlung (IndexedDB „isadody-muster“), gemeinsam für muster/ und anleitung/.
// MusterDB.open() → Promise<IDBDatabase>; MusterDB.all() → Promise<Muster[]>; get(id) → Promise<Muster|undefined>; put(muster)
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
  const req = (mode, fn) => open().then(db => new Promise((ok, err) => {
    const t = db.transaction(ST, mode), q = fn(t.objectStore(ST));
    t.oncomplete = () => ok(q.result); t.onerror = () => err(t.error); t.onabort = () => err(t.error);
  }));
  const get = id => req('readonly', s => s.get(id));
  const put = it => req('readwrite', s => s.put(it));
  return { open, all, get, put, ST };
})();
