'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Store } = require('../src/store');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-'));
const a = new Store(dir, 'Anna'), b = new Store(dir, 'Ben');

const p = a.addProject({ name: 'Häkelapp' });
const c = b.addProject({ name: 'Chat Isadody', typ: 'chat' });
assert.deepStrictEqual(a.load().projekte.map(x => x.name), ['Häkelapp', 'Chat Isadody']);

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

a.removeProject(c.id);
assert.strictEqual(a.load().aufgaben.find(x => x.id === t.id).zuordnung, null);
assert.throws(() => a.update('../x', {}));
a.remove(t.id); assert.strictEqual(a.load().aufgaben.length, 1);
console.log('Store-Tests OK');
