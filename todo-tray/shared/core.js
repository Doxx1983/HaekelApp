'use strict';
// Gemeinsame Datenlogik für Windows-App (Node) und Handy-PWA (Browser): Aufgabenformat, Status, Patches.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TodoCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const STATUS = ['todo', 'doing', 'done'];
  const FIELDS = ['titel', 'notiz', 'status', 'erledigt', 'erledigtAm', 'archiviert', 'heute', 'zuordnung', 'zugewiesenAn', 'faellig', 'ablegen', 'ablage'];
  const ID_RE = /^[a-z0-9-]+$/;

  const now = () => new Date().toISOString();
  const newId = () => {
    const a = new Uint8Array(3); globalThis.crypto.getRandomValues(a);
    return Date.now().toString(36) + '-' + [...a].map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Altbestand ohne Status: aus "erledigt" ableiten.
  function normalize(t) {
    if (!STATUS.includes(t.status)) t.status = t.erledigt ? 'done' : 'todo';
    return t;
  }

  function createTask({ titel, zuordnung = null, heute = null, notiz = '', zugewiesenAn = null, faellig = null, status = 'todo' }, user) {
    const st = STATUS.includes(status) ? status : 'todo';
    return {
      id: newId(), titel: String(titel).trim(), notiz, status: st, erledigt: st === 'done', erledigtAm: st === 'done' ? now() : null,
      archiviert: false, heute, zuordnung, zugewiesenAn, faellig, ablegen: false, ablage: null,
      erstelltVon: user, erstelltAm: now(), geaendertVon: user, geaendertAm: now(),
    };
  }

  // Patch statt Komplett-Überschreiben: nur geänderte Felder ersetzen; status und erledigt bleiben im Gleichschritt.
  function applyPatch(task, patch, user) {
    const t = normalize({ ...task }), p = { ...patch };
    if ('status' in p && !STATUS.includes(p.status)) delete p.status;
    if ('status' in p) p.erledigt = p.status === 'done';
    else if ('erledigt' in p) p.status = p.erledigt ? 'done' : 'todo';
    if ('erledigt' in p && !('erledigtAm' in p)) p.erledigtAm = p.erledigt ? now() : null;
    for (const k of FIELDS) if (k in p) t[k] = p[k];
    if (typeof t.titel !== 'string' || !t.titel.trim()) throw new Error('Titel fehlt');
    t.geaendertVon = user; t.geaendertAm = now();
    return t;
  }

  // ----- Projekte / Chats mit Mitgliederliste (leer = alle). Nur Sichtbarkeit in der App, kein technischer Schutz. -----
  const normNamen = a => [...new Set((Array.isArray(a) ? a : []).map(x => String(x).trim()).filter(Boolean))];
  function newProject({ name, typ = 'projekt', mitglieder = [] }, user) {
    const m = normNamen(mitglieder); if (m.length && !m.includes(user)) m.push(user);
    return { id: newId(), name: String(name).trim(), typ: typ === 'chat' ? 'chat' : 'projekt', besitzer: user, mitglieder: m };
  }
  const kannProjektBearbeiten = (p, user) => !p.besitzer || p.besitzer === user;
  function applyProjectPatch(p, patch, user) {
    if (!kannProjektBearbeiten(p, user)) throw new Error('Nur ' + p.besitzer + ' darf „' + p.name + '“ ändern');
    const x = { ...p };
    if ('name' in patch && String(patch.name).trim()) x.name = String(patch.name).trim();
    if ('typ' in patch) x.typ = patch.typ === 'chat' ? 'chat' : 'projekt';
    if ('mitglieder' in patch) { const m = normNamen(patch.mitglieder); if (m.length && x.besitzer && !m.includes(x.besitzer)) m.push(x.besitzer); x.mitglieder = m; }
    return x;
  }
  const projektSichtbar = (p, name) => !Array.isArray(p.mitglieder) || !p.mitglieder.length || p.mitglieder.includes(name);
  // Blendet Projekte und deren Aufgaben aus, bei denen `name` nicht Mitglied ist. Aufgaben ohne Projekt sind für alle sichtbar.
  function filterSichtbar(d, name) {
    const versteckt = new Set(d.projekte.filter(p => !projektSichtbar(p, name)).map(p => p.id));
    return { ...d, projekte: d.projekte.filter(p => !versteckt.has(p.id)), aufgaben: d.aufgaben.filter(t => !t.zuordnung || !versteckt.has(t.zuordnung)) };
  }
  // Wer darf bei diesem Projekt zuständig sein?
  function werFuer(projekte, projektId, nutzer) {
    const p = projekte.find(x => x.id === projektId);
    return p && Array.isArray(p.mitglieder) && p.mitglieder.length ? p.mitglieder : nutzer;
  }

  return { newProject, kannProjektBearbeiten, applyProjectPatch, projektSichtbar, filterSichtbar, werFuer, STATUS, FIELDS, ID_RE, now, newId, normalize, createTask, applyPatch };
});
