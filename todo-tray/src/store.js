'use strict';
// Speicher: eine JSON-Datei pro Aufgabe (aufgaben/<id>.json) + projekte.json.
// Eine Datei pro Aufgabe => zwei Nutzer überschreiben sich kaum gegenseitig (Google Drive / Netzwerk).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ID_RE = /^[a-z0-9-]+$/;
const TASK_FIELDS = ['titel', 'notiz', 'erledigt', 'erledigtAm', 'archiviert', 'heute', 'zuordnung'];

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

class Store {
  constructor(dir, user) {
    this.dir = dir;
    this.user = user || 'unbekannt';
    this.tasksDir = path.join(dir, 'aufgaben');
    this.projFile = path.join(dir, 'projekte.json');
    fs.mkdirSync(this.tasksDir, { recursive: true });
    if (!fs.existsSync(this.projFile)) atomicWrite(this.projFile, { projekte: [] });
  }

  _taskFile(id) {
    if (!ID_RE.test(id)) throw new Error('Ungültige ID');
    return path.join(this.tasksDir, id + '.json');
  }

  // Dateien wie "abc (1).json" (Drive-Konfliktkopien) oder halb synchronisierte Dateien werden übersprungen.
  load() {
    const aufgaben = [];
    for (const f of fs.readdirSync(this.tasksDir)) {
      if (!f.endsWith('.json') || !ID_RE.test(f.slice(0, -5))) continue;
      const t = readJson(path.join(this.tasksDir, f));
      if (t && t.id === f.slice(0, -5) && typeof t.titel === 'string') aufgaben.push(t);
    }
    const p = readJson(this.projFile);
    return { aufgaben, projekte: (p && Array.isArray(p.projekte)) ? p.projekte : [] };
  }

  signature() {
    const parts = [];
    for (const d of [this.tasksDir, this.dir]) {
      for (const f of fs.readdirSync(d)) {
        if (!f.endsWith('.json')) continue;
        try { const s = fs.statSync(path.join(d, f)); parts.push(f + s.mtimeMs + ':' + s.size); } catch { /* weg */ }
      }
    }
    return parts.sort().join('|');
  }

  create({ titel, zuordnung = null, heute = null, notiz = '' }) {
    const id = newId();
    const t = {
      id, titel: String(titel).trim(), notiz, erledigt: false, erledigtAm: null, archiviert: false,
      heute, zuordnung, erstelltVon: this.user, erstelltAm: now(), geaendertVon: this.user, geaendertAm: now(),
    };
    atomicWrite(this._taskFile(id), t);
    return t;
  }

  // Patch statt Komplett-Überschreiben: aktuelle Datei lesen, nur geänderte Felder ersetzen.
  update(id, patch) {
    const file = this._taskFile(id);
    const t = readJson(file);
    if (!t) throw new Error('Aufgabe nicht gefunden');
    for (const k of TASK_FIELDS) if (k in patch) t[k] = patch[k];
    if ('erledigt' in patch && !('erledigtAm' in patch)) t.erledigtAm = patch.erledigt ? now() : null;
    t.geaendertVon = this.user;
    t.geaendertAm = now();
    atomicWrite(file, t);
    return t;
  }

  remove(id) {
    try { fs.unlinkSync(this._taskFile(id)); } catch { /* schon weg */ }
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

module.exports = { Store, ID_RE };
