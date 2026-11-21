'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Store } = require('../src/store');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-'));
const a = new Store(dir, 'Anna'), b = new Store(dir, 'Ben');

const p = a.addProject({ name: 'Häkelapp' });
const c = b.addProject({ name: 'Chat Planung', typ: 'chat' });
assert.deepStrictEqual(a.load().projekte.map(x => x.name), ['Häkelapp', 'Chat Planung']);

const t = a.create({ titel: 'Garn bestellen', zuordnung: p.id, heute: '2026-11-21' });
b.update(t.id, { erledigt: true });
a.update(t.id, { zuordnung: c.id });            // gleichzeitig anderes Feld: beides bleibt erhalten
let r = b.load().aufgaben[0];
assert.strictEqual(r.erledigt, true); assert.strictEqual(r.zuordnung, c.id);
assert.ok(r.erledigtAm); assert.strictEqual(r.erstelltVon, 'Anna'); assert.strictEqual(r.geaendertVon, 'Anna');

a.update(t.id, { archiviert: true });
assert.strictEqual(b.load().aufgaben[0].archiviert, true);

// Drive-Konfliktkopie und kaputte Datei werden ignoriert
fs.writeFileSync(path.join(dir, 'aufgaben', t.id + ' (1).json'), '{}');
fs.writeFileSync(path.join(dir, 'aufgaben', 'kaputt.json'), '{"id":');
assert.strictEqual(a.load().aufgaben.length, 1);

const s1 = a.signature(); b.create({ titel: 'Neu' }); assert.notStrictEqual(a.signature(), s1);

assert.throws(() => a.removeProject(c.id), /Nur Ben/);   // fremdes Projekt
b.removeProject(c.id);
assert.strictEqual(a.load().aufgaben.find(x => x.id === t.id).zuordnung, null);
assert.throws(() => a.update('../x', {}));
a.remove(t.id); assert.strictEqual(a.load().aufgaben.length, 1);
// Status, Zuständigkeit, Fälligkeit
const k = a.create({ titel: 'Flyer', zugewiesenAn: 'Ben', faellig: '2026-12-01' });
assert.strictEqual(k.status, 'todo');
let u = b.update(k.id, { status: 'doing' }); assert.strictEqual(u.erledigt, false);
u = b.update(k.id, { status: 'done' }); assert.strictEqual(u.erledigt, true); assert.ok(u.erledigtAm);
u = b.update(k.id, { erledigt: false }); assert.strictEqual(u.status, 'todo'); assert.strictEqual(u.erledigtAm, null);
u = b.update(k.id, { status: 'quatsch' }); assert.strictEqual(u.status, 'todo');
assert.strictEqual(u.zugewiesenAn, 'Ben'); assert.strictEqual(u.faellig, '2026-12-01');
assert.deepStrictEqual(a.users().sort(), ['Anna', 'Ben']);

// Altbestand ohne Status
fs.writeFileSync(path.join(dir, 'aufgaben', 'alt-1.json'), JSON.stringify({ id: 'alt-1', titel: 'Alt', erledigt: true }));
assert.strictEqual(a.load().aufgaben.find(x => x.id === 'alt-1').status, 'done');

// Dateien
const src = path.join(os.tmpdir(), 'bericht.txt'); fs.writeFileSync(src, 'hallo');
assert.deepStrictEqual(a.addFiles(k.id, [src]), ['bericht.txt']);
assert.deepStrictEqual(a.addFiles(k.id, [src]), ['bericht (2).txt']);
assert.deepStrictEqual(b.load().aufgaben.find(x => x.id === k.id).dateien, ['bericht (2).txt', 'bericht.txt']);
assert.strictEqual(fs.readFileSync(b.filePath(k.id, 'bericht.txt'), 'utf8'), 'hallo');
assert.throws(() => b.filePath(k.id, '../../aufgaben/' + k.id + '.json'));
const sg = a.signature(); fs.writeFileSync(src, 'neu'); a.addFiles(k.id, [src]); assert.notStrictEqual(a.signature(), sg);
a.removeFile(k.id, 'bericht.txt'); assert.strictEqual(a.load().aufgaben.find(x => x.id === k.id).dateien.length, 2);
a.remove(k.id); assert.ok(!fs.existsSync(path.join(dir, 'dateien', k.id)));
// Projekte mit Mitgliedern (nur Sichtbarkeit in der App)
const Core = require('../shared/core');
const geheim = b.addProject({ name: 'Geheim', mitglieder: ['Ben'] });
assert.strictEqual(geheim.besitzer, 'Ben');
assert.throws(() => a.updateProject(geheim.id, { mitglieder: [] }), /Nur Ben/);
const tg = b.create({ titel: 'Überraschung', zuordnung: geheim.id });
const garten = a.addProject({ name: 'Garten' });
assert.deepStrictEqual(garten.mitglieder, []);                        // leer = alle
const alle = a.load();
const fuerAnna = Core.filterSichtbar(alle, 'Anna'), fuerBen = Core.filterSichtbar(alle, 'Ben');
assert.ok(!fuerAnna.projekte.some(x => x.id === geheim.id) && !fuerAnna.aufgaben.some(x => x.id === tg.id));
assert.ok(fuerBen.projekte.some(x => x.id === geheim.id) && fuerBen.aufgaben.some(x => x.id === tg.id));
assert.ok(fuerAnna.projekte.some(x => x.id === garten.id));
const ps = b.updateProject(geheim.id, { mitglieder: ['Anna'] });         // Besitzer bleibt immer Mitglied
assert.deepStrictEqual(ps.mitglieder.sort(), ['Anna', 'Ben']);
assert.deepStrictEqual(Core.werFuer(a.load().projekte, geheim.id, ['Anna', 'Ben', 'Cleo']).sort(), ['Anna', 'Ben']);
assert.deepStrictEqual(Core.werFuer(a.load().projekte, garten.id, ['Anna', 'Ben', 'Cleo']), ['Anna', 'Ben', 'Cleo']);
b.remove(tg.id); b.removeProject(geheim.id); a.removeProject(garten.id);

// Ablegen-Markierung
const ab = a.create({ titel: 'Ablage' }); assert.strictEqual(ab.ablegen, false);
assert.strictEqual(b.update(ab.id, { ablegen: true }).ablegen, true);
assert.strictEqual(a.update(ab.id, { ablegen: false, ablage: 'archiv/Häkelapp/Ablage' }).ablage, 'archiv/Häkelapp/Ablage');
// Eingang
fs.writeFileSync(path.join(dir, 'eingang', 'IMG_001.jpg'), 'x'); fs.writeFileSync(path.join(dir, 'eingang', 'IMG_002.jpg'), 'y');
assert.deepStrictEqual(a.load().eingang, ['IMG_001.jpg', 'IMG_002.jpg']);
const e1 = a.create({ titel: 'Fotos' }); a.inboxAssign('IMG_001.jpg', e1.id);
assert.deepStrictEqual(a.load().aufgaben.find(x => x.id === e1.id).dateien, ['IMG_001.jpg']);
const e2 = a.inboxNewTask('IMG_002.jpg'); assert.strictEqual(e2.titel, 'IMG_002'); assert.deepStrictEqual(a.load().eingang, []);
assert.throws(() => a.inboxPath('../projekte.json'));
console.log('Store-Tests OK');
