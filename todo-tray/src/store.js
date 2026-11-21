'use strict';
// Speicher im gemeinsamen Ordner:
//   aufgaben/<id>.json   eine Datei pro Aufgabe (zwei Nutzer überschreiben sich kaum)
//   dateien/<id>/...     Anhänge der Aufgabe
//   projekte.json        Projekte und Chats
//   nutzer.json          Namen der beiden Nutzer
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ID_RE = /^[a-z0-9-]+$/;
const STATUS = ['todo', 'doing', 'done'];
const TASK_FIELDS = ['titel', 'notiz', 'status', 'erledigt', 'erledigtAm', 'archiviert', 'heute', 'zuordnung', 'zugewiesenAn', 'faellig'];

const now = () => new Date().toISOString();
const newId = () => Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex');

function atomicWrite(file, data) {
  const tmp = file + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function listFiles(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isFile() && !e.name.endsWith('.tmp')).map(e => e.name).sort(); } catch { return []; }
}

const safeName = n => path.basename(String(n)).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 180) || 'datei';

class Store {
  constructor(dir, user) {
    this.dir = dir;
    this.user = user || 'unbekannt';
    this.tasksDir = path.join(dir, 'aufgaben');
    this.filesDir = path.join(dir, 'dateien');
    this.inboxDir = path.join(dir, 'eingang');
    this.projFile = path.join(dir, 'projekte.json');
    this.userFile = path.join(dir, 'nutzer.json');
    fs.mkdirSync(this.tasksDir, { recursive: true });
    fs.mkdirSync(this.filesDir, { recursive: true });
    fs.mkdirSync(this.inboxDir, { recursive: true });
    if (!fs.existsSync(this.projFile)) atomicWrite(this.projFile, { projekte: [] });
    this.registerUser(this.user);
  }

  _taskFile(id) {
    if (!ID_RE.test(id)) throw new Error('Ungültige ID');
    return path.join(this.tasksDir, id + '.json');
  }

  _taskFilesDir(id) {
    if (!ID_RE.test(id)) throw new Error('Ungültige ID');
    return path.join(this.filesDir, id);
  }

  registerUser(name) {
    const u = readJson(this.userFile) || { nutzer: [] };
    if (!Array.isArray(u.nutzer)) u.nutzer = [];
    if (name && !u.nutzer.includes(name)) { u.nutzer.push(name); atomicWrite(this.userFile, u); }
  }

  users() {
    const u = readJson(this.userFile);
    return u && Array.isArray(u.nutzer) ? u.nutzer : [];
  }

  // Dateien wie "abc (1).json" (Drive-Konfliktkopien) oder halb synchronisierte Dateien werden übersprungen.
  load() {
    const aufgaben = [];
    for (const f of fs.readdirSync(this.tasksDir)) {
      if (!f.endsWith('.json') || !ID_RE.test(f.slice(0, -5))) continue;
      const t = readJson(path.join(this.tasksDir, f));
      if (!t || t.id !== f.slice(0, -5) || typeof t.titel !== 'string') continue;
      if (!STATUS.includes(t.status)) t.status = t.erledigt ? 'done' : 'todo'; // Altbestand ohne Status
      t.dateien = listFiles(path.join(this.filesDir, t.id)); // nicht in der Aufgabe gespeichert, nur zur Anzeige
      aufgaben.push(t);
    }
    const p = readJson(this.projFile);
    return { aufgaben, projekte: (p && Array.isArray(p.projekte)) ? p.projekte : [], nutzer: this.users(), eingang: listFiles(this.inboxDir) };
  }

  signature() {
    const parts = [];
    const scan = (d, prefix) => {
      let names = [];
      try { names = fs.readdirSync(d); } catch { return; }
      for (const f of names) {
        try {
          const p = path.join(d, f), s = fs.statSync(p);
          if (s.isDirectory()) { if (prefix === 'd') scan(p, 'd'); continue; }
          if (f.endsWith('.json') || prefix === 'd') parts.push(prefix + f + s.mtimeMs + ':' + s.size);
        } catch { /* weg */ }
      }
    };
    scan(this.tasksDir, 't'); scan(this.dir, 'r'); scan(this.filesDir, 'd'); scan(this.inboxDir, 'd');
    return parts.sort().join('|');
  }

  create({ titel, zuordnung = null, heute = null, notiz = '', zugewiesenAn = null, faellig = null, status = 'todo' }) {
    const id = newId();
    const st = STATUS.includes(status) ? status : 'todo';
    const t = {
      id, titel: String(titel).trim(), notiz, status: st, erledigt: st === 'done', erledigtAm: st === 'done' ? now() : null,
      archiviert: false, heute, zuordnung, zugewiesenAn, faellig,
      erstelltVon: this.user, erstelltAm: now(), geaendertVon: this.user, geaendertAm: now(),
    };
    atomicWrite(this._taskFile(id), t);
    return t;
  }

  // Patch statt Komplett-Überschreiben: aktuelle Datei lesen, nur geänderte Felder ersetzen.
  update(id, patch) {
    const file = this._taskFile(id);
    const t = readJson(file);
    if (!t) throw new Error('Aufgabe nicht gefunden');
    const p = { ...patch };
    if ('status' in p && !STATUS.includes(p.status)) delete p.status;
    if ('status' in p) { p.erledigt = p.status === 'done'; }
    else if ('erledigt' in p) { p.status = p.erledigt ? 'done' : 'todo'; }
    if ('erledigt' in p && !('erledigtAm' in p)) p.erledigtAm = p.erledigt ? now() : null;
    for (const k of TASK_FIELDS) if (k in p) t[k] = p[k];
    if (typeof t.titel !== 'string' || !t.titel.trim()) throw new Error('Titel fehlt');
    t.geaendertVon = this.user;
    t.geaendertAm = now();
    atomicWrite(file, t);
    return t;
  }

  remove(id) {
    try { fs.unlinkSync(this._taskFile(id)); } catch { /* schon weg */ }
    try { fs.rmSync(this._taskFilesDir(id), { recursive: true, force: true }); } catch { /* ok */ }
  }

  // Dateien in dateien/<id>/ kopieren; vorhandene Namen werden nicht überschrieben ("name (2).ext").
  addFiles(id, paths) {
    if (!fs.existsSync(this._taskFile(id))) throw new Error('Aufgabe nicht gefunden');
    const dir = this._taskFilesDir(id);
    fs.mkdirSync(dir, { recursive: true });
    const added = [];
    for (const src of paths) {
      if (!fs.statSync(src).isFile()) continue;
      const base = safeName(src), ext = path.extname(base), stem = path.basename(base, ext);
      let name = base, n = 2;
      while (fs.existsSync(path.join(dir, name))) name = stem + ' (' + n++ + ')' + ext;
      fs.copyFileSync(src, path.join(dir, name));
      added.push(name);
    }
    return added;
  }

  filePath(id, name) {
    const p = path.join(this._taskFilesDir(id), safeName(name));
    if (!fs.existsSync(p)) throw new Error('Datei nicht gefunden');
    return p;
  }

  removeFile(id, name) {
    try { fs.unlinkSync(this.filePath(id, name)); } catch { /* weg */ }
  }

  // Eingang: Fotos/Dateien vom Handy (Drive-App -> Ordner "eingang"), werden Aufgaben zugeordnet.
  inboxPath(name) {
    const p = path.join(this.inboxDir, safeName(name));
    if (!fs.existsSync(p)) throw new Error('Datei nicht gefunden');
    return p;
  }

  inboxAssign(name, id) {
    const p = this.inboxPath(name);
    this.addFiles(id, [p]);
    fs.unlinkSync(p);
  }

  inboxNewTask(name, extra = {}) {
    this.inboxPath(name);
    const t = this.create({ titel: path.basename(name, path.extname(name)), ...extra });
    this.inboxAssign(name, t.id);
    return t;
  }

  inboxRemove(name) {
    try { fs.unlinkSync(this.inboxPath(name)); } catch { /* weg */ }
  }

  addProject({ name, typ = 'projekt' }) {
    const p = readJson(this.projFile) || { projekte: [] };
    const proj = { id: newId(), name: String(name).trim(), typ: typ === 'chat' ? 'chat' : 'projekt' };
    p.projekte.push(proj);
    atomicWrite(this.projFile, p);
    return proj;
  }

  removeProject(id) {
    const p = readJson(this.projFile) || { projekte: [] };
    p.projekte = p.projekte.filter(x => x.id !== id);
    atomicWrite(this.projFile, p);
    for (const t of this.load().aufgaben) if (t.zuordnung === id) this.update(t.id, { zuordnung: null });
  }
}

module.exports = { Store, ID_RE, STATUS };
