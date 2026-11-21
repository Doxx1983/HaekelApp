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

  return { STATUS, FIELDS, ID_RE, now, newId, normalize, createTask, applyPatch };
});
