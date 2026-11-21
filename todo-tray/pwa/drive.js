'use strict';
// Datenschicht der PWA: spricht direkt mit der Google-Drive-API (REST) und nutzt dieselbe
// Ordnerstruktur wie die Windows-App (aufgaben/, dateien/<id>/, eingang/, projekte.json, nutzer.json).
const Drive = (() => {
  const API = 'https://www.googleapis.com/drive/v3', UP = 'https://www.googleapis.com/upload/drive/v3';
  const SCOPE = 'https://www.googleapis.com/auth/drive';
  const FOLDER = 'application/vnd.google-apps.folder';
  const TASK_RE = /^([a-z0-9-]+)\.json$/;
  const Core = window.TodoCore;
  const ls = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* ok */ } } };

  let tokenClient = null, token = ls.get('drv_token'), exp = Number(ls.get('drv_exp') || 0), user = '', clientId = '';
  const ids = {};                 // root, aufgaben, dateien, eingang, projekte, nutzer
  const cache = new Map();        // Aufgaben-ID -> { fileId, modifiedTime, task }
  const taskFolders = new Map();  // Aufgaben-ID -> Ordner-ID in dateien/
  const fileCounts = new Map();   // Aufgaben-ID -> Anzahl Dateien (nach dem ersten Laden bekannt)

  // Lesen-ändern-schreiben nacheinander ausführen, sonst überschreiben zwei schnelle Änderungen (z. B. Status + Zuständig) sich gegenseitig.
  let chain = Promise.resolve();
  const serial = fn => { const p = chain.then(fn); chain = p.catch(() => {}); return p; };

  const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  // ---------- Anmeldung (Google Identity Services, Token-Modell) ----------
  function requestToken(prompt) {
    return new Promise((resolve, reject) => {
      if (!window.google || !google.accounts) return reject(new Error('AUTH'));
      if (!tokenClient) tokenClient = google.accounts.oauth2.initTokenClient({ client_id: clientId, scope: SCOPE, callback: () => {}, error_callback: () => {} });
      tokenClient.callback = r => {
        if (r.error) return reject(new Error('AUTH'));
        token = r.access_token; exp = Date.now() + (Number(r.expires_in) || 3600) * 1000;
        ls.set('drv_token', token); ls.set('drv_exp', String(exp)); resolve(token);
      };
      tokenClient.error_callback = () => reject(new Error('AUTH'));
      tokenClient.requestAccessToken({ prompt });
    });
  }
  const gueltig = () => token && Date.now() < exp - 60000;
  async function getToken() { return gueltig() ? token : requestToken(''); }   // stilles Erneuern, sonst AUTH-Fehler -> Anmelde-Button
  const signIn = () => requestToken(gueltig() ? '' : 'select_account');

  async function req(url, opts = {}, retry = true) {
    const t = await getToken();
    const r = await fetch(url, { cache: 'no-store', ...opts, headers: { ...(opts.headers || {}), Authorization: 'Bearer ' + t } });
    if (r.status === 401 && retry) { token = null; exp = 0; return req(url, opts, false); }
    if (!r.ok) throw new Error('Drive ' + r.status + ' ' + (await r.text()).slice(0, 160));
    return r;
  }
  const json = async (u, o) => (await req(u, o)).json();

  async function list(q, fields = 'id,name,mimeType,modifiedTime,webViewLink,size') {
    const out = []; let pageToken;
    do {
      const p = new URLSearchParams({ q, fields: `nextPageToken,files(${fields})`, pageSize: '1000', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true' });
      if (pageToken) p.set('pageToken', pageToken);
      const r = await json(API + '/files?' + p);
      out.push(...r.files); pageToken = r.nextPageToken;
    } while (pageToken);
    return out;
  }
  const children = (parent, extra = '') => list(`'${parent}' in parents and trashed=false${extra}`);

  async function makeFolder(name, parent) {
    const r = await json(API + '/files?supportsAllDrives=true&fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mimeType: FOLDER, parents: [parent] }) });
    return r.id;
  }
  async function subfolder(parent, name, create) {
    const f = await list(`name='${esc(name)}' and mimeType='${FOLDER}' and trashed=false and '${parent}' in parents`, 'id');
    if (f.length) return f[0].id;
    return create ? makeFolder(name, parent) : null;
  }

  async function createJson(name, parent, obj) {
    const b = 'b' + Math.random().toString(36).slice(2);
    const body = `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: [parent], mimeType: 'application/json' })}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(obj, null, 2)}\r\n--${b}--`;
    return json(`${UP}/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,modifiedTime`, { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body });
  }
  const readJson = async id => (await req(`${API}/files/${id}?alt=media&supportsAllDrives=true`)).json();
  const writeJson = (id, obj) => json(`${UP}/files/${id}?uploadType=media&supportsAllDrives=true&fields=id,modifiedTime`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj, null, 2) });

  // Dateien (Fotos etc.): resumbarer Upload, geeignet auch für größere Dateien.
  async function uploadFile(parent, file) {
    const meta = { name: file.name || 'datei', parents: [parent] };
    const r = await req(`${UP}/files?uploadType=resumable&supportsAllDrives=true&fields=id,name`, {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': file.type || 'application/octet-stream' }, body: JSON.stringify(meta) });
    const loc = r.headers.get('Location');
    if (!loc) throw new Error('Upload-Adresse fehlt');
    return (await req(loc, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file })).json();
  }

  // ---------- Verbinden ----------
  async function connect(ordnerName) {
    const roots = await list(`name='${esc(ordnerName)}' and mimeType='${FOLDER}' and trashed=false`, 'id');
    if (!roots.length) throw new Error('ORDNER');
    ids.root = roots[0].id;
    for (const n of ['aufgaben', 'dateien', 'eingang']) ids[n] = await subfolder(ids.root, n, true);
  }

  function init(cid) { clientId = cid; }
  const eingeloggt = () => gueltig();

  async function registerUser(name) {
    user = name;
    const f = (await children(ids.root, ` and name='nutzer.json'`))[0];
    if (!f) { ids.nutzer = (await createJson('nutzer.json', ids.root, { nutzer: [name] })).id; return; }
    ids.nutzer = f.id;
    const u = await readJson(f.id);
    const l = Array.isArray(u.nutzer) ? u.nutzer : [];
    if (!l.includes(name)) { l.push(name); await writeJson(f.id, { nutzer: l }); }
  }

  // ---------- Lesen ----------
  async function load() {
    const [tasks, rootFiles, inbox] = await Promise.all([
      children(ids.aufgaben, ` and mimeType != '${FOLDER}'`), children(ids.root, ` and mimeType != '${FOLDER}'`), children(ids.eingang, ` and mimeType != '${FOLDER}'`)]);
    const seen = new Set(), jobs = [];
    for (const f of tasks) {
      const m = TASK_RE.exec(f.name); if (!m) continue;
      seen.add(m[1]);
      const c = cache.get(m[1]);
      if (!c || c.modifiedTime !== f.modifiedTime) jobs.push(f);
    }
    for (const id of [...cache.keys()]) if (!seen.has(id)) cache.delete(id);
    for (let i = 0; i < jobs.length; i += 6) {      // höchstens 6 gleichzeitig
      await Promise.all(jobs.slice(i, i + 6).map(async f => {
        try {
          const t = await readJson(f.id), id = TASK_RE.exec(f.name)[1];
          if (t && t.id === id && typeof t.titel === 'string') cache.set(id, { fileId: f.id, modifiedTime: f.modifiedTime, task: Core.normalize(t) });
        } catch { /* halb synchronisierte Datei: beim nächsten Mal */ }
      }));
    }
    const proj = rootFiles.find(f => f.name === 'projekte.json'), nu = rootFiles.find(f => f.name === 'nutzer.json');
    if (nu) ids.nutzer = nu.id;
    if (proj) ids.projekte = proj.id;
    const [p, n] = await Promise.all([proj ? readJson(proj.id).catch(() => null) : null, nu ? readJson(nu.id).catch(() => null) : null]);
    return {
      aufgaben: [...cache.entries()].map(([id, c]) => ({ ...c.task, dateienAnzahl: fileCounts.get(id) })),
      projekte: p && Array.isArray(p.projekte) ? p.projekte : [],
      nutzer: n && Array.isArray(n.nutzer) ? n.nutzer : [],
      eingang: inbox.map(f => ({ id: f.id, name: f.name, link: f.webViewLink, size: f.size })),
    };
  }

  // ---------- Schreiben ----------
  async function create(fields) {
    const t = Core.createTask(fields, user);
    const r = await createJson(t.id + '.json', ids.aufgaben, t);
    cache.set(t.id, { fileId: r.id, modifiedTime: r.modifiedTime, task: t });
    return t;
  }
  const update = (id, patch) => serial(async () => {
    const c = cache.get(id); if (!c) throw new Error('Aufgabe nicht gefunden');
    const t = Core.applyPatch(await readJson(c.fileId), patch, user);      // frisch lesen, nur geänderte Felder ersetzen
    const r = await writeJson(c.fileId, t);
    cache.set(id, { fileId: c.fileId, modifiedTime: r.modifiedTime, task: t });
    return t;
  });
  const trash = id => json(`${API}/files/${id}?supportsAllDrives=true&fields=id`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) });
  async function remove(id) {
    const c = cache.get(id); if (c) await trash(c.fileId);
    const f = await subfolder(ids.dateien, id, false); if (f) await trash(f);
    cache.delete(id); taskFolders.delete(id); fileCounts.delete(id);
  }

  // ---------- Dateien ----------
  async function taskFiles(id) {
    let f = taskFolders.get(id);
    if (!f) { f = await subfolder(ids.dateien, id, false); if (f) taskFolders.set(id, f); }
    const files = f ? (await children(f, ` and mimeType != '${FOLDER}'`)).map(x => ({ id: x.id, name: x.name, link: x.webViewLink, size: x.size })) : [];
    fileCounts.set(id, files.length);
    return files;
  }
  async function addFiles(id, files) {
    let f = taskFolders.get(id) || await subfolder(ids.dateien, id, true);
    taskFolders.set(id, f);
    for (const file of files) await uploadFile(f, file);
    return taskFiles(id);
  }
  const addToInbox = async files => { for (const f of files) await uploadFile(ids.eingang, f); };
  async function assignInbox(fileId, taskId) {
    let f = taskFolders.get(taskId) || await subfolder(ids.dateien, taskId, true);
    taskFolders.set(taskId, f);
    await json(`${API}/files/${fileId}?addParents=${f}&removeParents=${ids.eingang}&supportsAllDrives=true&fields=id`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  }
  async function inboxNewTask(file, extra = {}) {
    const t = await create({ titel: file.name.replace(/\.[^.]+$/, ''), ...extra });
    await assignInbox(file.id, t.id);
    return t;
  }

  // ---------- Projekte ----------
  const projekte = fn => serial(async () => {
    const p = ids.projekte ? await readJson(ids.projekte) : { projekte: [] };
    if (!Array.isArray(p.projekte)) p.projekte = [];
    fn(p);
    if (ids.projekte) await writeJson(ids.projekte, p); else ids.projekte = (await createJson('projekte.json', ids.root, p)).id;
  });
  const addProject = fields => projekte(p => p.projekte.push(Core.newProject(fields, user)));
  const updateProject = (id, patch) => projekte(p => {
    const i = p.projekte.findIndex(x => x.id === id); if (i < 0) throw new Error('Projekt nicht gefunden');
    p.projekte[i] = Core.applyProjectPatch(p.projekte[i], patch, user);
  });
  async function removeProject(id) {
    await projekte(p => {
      const cur = p.projekte.find(x => x.id === id);
      if (cur && !Core.kannProjektBearbeiten(cur, user)) throw new Error('Nur ' + cur.besitzer + ' darf „' + cur.name + '“ löschen');
      p.projekte = p.projekte.filter(x => x.id !== id);
    });
    for (const [tid, c] of cache) if (c.task.zuordnung === id) await update(tid, { zuordnung: null });
  }

  return { init, signIn, eingeloggt, connect, registerUser, load, create, update, remove, taskFiles, addFiles, addToInbox, assignInbox, inboxNewTask, trash, addProject, updateProject, removeProject };
})();
