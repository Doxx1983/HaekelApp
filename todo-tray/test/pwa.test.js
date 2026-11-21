'use strict';
// PWA-Test: echte pwa/*.js im Chromium, Google-API (Drive + Anmeldung) wird in-memory nachgebaut.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');

const root = path.resolve(__dirname, '..');
const server = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  const t = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }[path.extname(f)] || 'text/plain';
  r.writeHead(200, { 'Content-Type': t }); r.end(fs.readFileSync(f));
});

// ---- Fake-Drive ----
const FOLDER = 'application/vnd.google-apps.folder';
let n = 0; const files = new Map();
const add = (name, parent, mime, content = null) => { const id = 'f' + ++n; files.set(id, { id, name, mimeType: mime, parents: parent ? [parent] : [], trashed: false, content, modifiedTime: new Date(Date.now() + n).toISOString(), webViewLink: 'https://drive.example/' + id }); return files.get(id); };
const by = (name, parent) => [...files.values()].find(f => f.name === name && f.parents.includes(parent) && !f.trashed);
const kids = (parent, pred = () => true) => [...files.values()].filter(f => f.parents.includes(parent) && !f.trashed && pred(f));
const q2 = s => { const un = x => x.replace(/\\'/g, "'").replace(/\\\\/g, '\\'); return s.split(' and ').map(c => {
  let m; if ((m = /^name='(.*)'$/.exec(c))) return f => f.name === un(m[1]);
  if ((m = /^mimeType='(.*)'$/.exec(c))) return f => f.mimeType === m[1];
  if ((m = /^mimeType != '(.*)'$/.exec(c))) return f => f.mimeType !== m[1];
  if ((m = /^trashed=false$/.exec(c))) return f => !f.trashed;
  if ((m = /^'(.*)' in parents$/.exec(c))) return f => f.parents.includes(m[1]);
  throw new Error('Fake-Drive kennt Abfrage nicht: ' + c); }); };
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'Location' };
const js = (o, h = {}) => ({ status: 200, headers: { ...CORS, 'content-type': 'application/json', ...h }, body: JSON.stringify(o) });
const pending = new Map();

async function drive(route) {
  const rq = route.request(), u = new URL(rq.url()), m = rq.method(), p = u.pathname;
  if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  assert.ok((await rq.allHeaders()).authorization === 'Bearer test-token', 'Token fehlt');
  const body = rq.postDataBuffer();
  let r;
  if (m === 'GET' && p === '/drive/v3/files') { const preds = q2(u.searchParams.get('q')); r = js({ files: [...files.values()].filter(f => preds.every(x => x(f))) }); }
  else if (m === 'GET' && /^\/drive\/v3\/files\/[^/]+$/.test(p)) { const f = files.get(p.split('/').pop()); r = u.searchParams.get('alt') === 'media' ? { status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: f.content } : js(f); }
  else if (m === 'POST' && p === '/drive/v3/files') { const b = JSON.parse(body); r = js(add(b.name, b.parents[0], b.mimeType)); }
  else if (m === 'PATCH' && /^\/drive\/v3\/files\/[^/]+$/.test(p)) {
    const f = files.get(p.split('/').pop()), b = JSON.parse(body || '{}'); if (b.trashed) f.trashed = true;
    if (u.searchParams.get('addParents')) f.parents = f.parents.filter(x => x !== u.searchParams.get('removeParents')).concat(u.searchParams.get('addParents'));
    r = js(f);
  }
  else if (m === 'POST' && p === '/upload/drive/v3/files' && u.searchParams.get('uploadType') === 'multipart') {
    const txt = body.toString('utf8'), parts = txt.split(/--b[a-z0-9]+(?:--)?(?:\r\n)?/).filter(s => s.includes('Content-Type'));
    const meta = JSON.parse(parts[0].split('\r\n\r\n')[1].trim()), content = parts[1].split('\r\n\r\n')[1].replace(/\r\n$/, '');
    r = js(add(meta.name, meta.parents[0], meta.mimeType, content));
  }
  else if (m === 'POST' && p === '/upload/drive/v3/files' && u.searchParams.get('uploadType') === 'resumable') {
    const id = 'up' + ++n; pending.set(id, JSON.parse(body)); r = js({}, { location: 'https://www.googleapis.com/upload/drive/v3/files?upload_id=' + id });
  }
  else if (m === 'PUT' && p === '/upload/drive/v3/files') { const meta = pending.get(u.searchParams.get('upload_id')); r = js(add(meta.name, meta.parents[0], 'application/octet-stream', body.toString('latin1'))); }
  else if (m === 'PATCH' && /^\/upload\/drive\/v3\/files\/[^/]+$/.test(p)) { const f = files.get(p.split('/').pop()); f.content = body.toString('utf8'); f.modifiedTime = new Date(Date.now() + ++n).toISOString(); r = js(f); }
  else r = { status: 500, headers: CORS, body: 'unbekannt ' + m + ' ' + p };
  await route.fulfill(r);
}
const GIS = `window.google = { accounts: { oauth2: { initTokenClient: () => ({ requestAccessToken() { this.callback({ access_token: 'test-token', expires_in: 3600 }); } }) } } };`;

(async () => {
  // Ausgangslage wie im echten Drive: Ordner mit projekte.json, ohne Unterordner (die legt die App an)
  const rootF = add('To-Dos', 'root', FOLDER);
  add('projekte.json', rootF.id, 'application/json', JSON.stringify({ projekte: [{ id: 'haekel', name: 'Häkelapp', typ: 'projekt' }] }));
  add('nutzer.json', rootF.id, 'application/json', JSON.stringify({ nutzer: ['Anna'] }));

  await new Promise(r => server.listen(0, r)); const base = 'http://localhost:' + server.address().port + '/pwa/';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, serviceWorkers: 'block' });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route('https://accounts.google.com/gsi/client', r => r.fulfill({ contentType: 'text/javascript', body: GIS }));
  await page.route('https://www.googleapis.com/**', drive);
  await page.route(base + 'config.js', r => r.fulfill({ contentType: 'text/javascript', body: "window.TODO_CONFIG = { clientId: 'x.apps.googleusercontent.com', ordner: 'To-Dos' };" }));
  await page.goto(base);

  await page.click('#bLogin');
  await page.waitForSelector('#pName:not([hidden])');
  assert.ok(await page.locator('#nameListe button:has-text("Anna")').count());
  await page.fill('#nameNeu', 'Ben'); await page.click('#nameOk');
  await page.waitForSelector('#pName', { state: 'hidden' });
  assert.deepStrictEqual(JSON.parse(by('nutzer.json', rootF.id).content).nutzer, ['Anna', 'Ben']);
  for (const x of ['aufgaben', 'dateien', 'eingang']) assert.ok(by(x, rootF.id), x + ' wurde nicht angelegt');
  const aufg = by('aufgaben', rootF.id).id;

  // Aufgabe anlegen: an Anna, fällig, Projekt
  await page.fill('#neuTitel', 'Flyer drucken'); await page.selectOption('#neuWer', 'Anna'); await page.selectOption('#neuZu', { label: '📁 Häkelapp' });
  await page.fill('#neuFaellig', '2020-05-01'); await page.click('#neuHeute'); await page.press('#neuTitel', 'Enter');
  await page.waitForSelector('.task');
  const tf = kids(aufg)[0], t = JSON.parse(tf.content);
  assert.ok(/^[a-z0-9-]+\.json$/.test(tf.name) && tf.name === t.id + '.json');
  assert.strictEqual(t.zugewiesenAn, 'Anna'); assert.strictEqual(t.faellig, '2020-05-01'); assert.strictEqual(t.zuordnung, 'haekel');
  assert.strictEqual(t.erstelltVon, 'Ben'); assert.strictEqual(t.status, 'todo'); assert.ok(t.heute);
  assert.ok(await page.locator('.tag.late').count());

  // Aufgabe, die die Windows-App (Anna) geschrieben hat, erscheint nach Aktualisieren
  const fremd = { id: 'zz-1', titel: 'Von Anna', status: 'todo', erledigt: false, zugewiesenAn: 'Ben', erstelltVon: 'Anna', geaendertVon: 'Anna', erstelltAm: new Date().toISOString() };
  add('zz-1.json', aufg, 'application/json', JSON.stringify(fremd)); add('zz-1 (1).json', aufg, 'application/json', '{}'); // Konfliktkopie wird ignoriert
  await page.click('nav button:has-text("Offen")'); await page.click('#bRef'); await page.waitForSelector('.task:has-text("Von Anna")');
  assert.strictEqual(await page.locator('.task').count(), 2);

  // Detail: Status, Datei-Upload (Foto), Zuständig ändern -> Patch bleibt erhalten
  await page.locator('.task .t', { hasText: 'Flyer' }).click();
  await page.selectOption('#dStatus', 'doing'); await page.selectOption('#dWer', 'Ben');
  await page.setInputFiles('#fFoto', { name: 'IMG_1.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('JPEGDATA') });
  await page.waitForSelector('#dDateien .pl');
  const t2 = JSON.parse(by(t.id + '.json', aufg).content);
  assert.strictEqual(t2.status, 'doing'); assert.strictEqual(t2.zugewiesenAn, 'Ben'); assert.strictEqual(t2.faellig, '2020-05-01');
  const dir = by(t.id, by('dateien', rootF.id).id); assert.ok(dir, 'dateien/<id> fehlt');
  assert.deepStrictEqual(kids(dir.id).map(f => f.name), ['IMG_1.jpg']); assert.strictEqual(kids(dir.id)[0].content, 'JPEGDATA');
  await page.check('#dAblegen'); await page.waitForTimeout(300);
  assert.strictEqual(JSON.parse(by(t.id + '.json', aufg).content).ablegen, true);
  await page.click('#dOk');

  // Board
  await page.click('nav button:has-text("Board")');
  assert.strictEqual(await page.locator('.col').nth(1).locator('.card').count(), 1);
  await page.locator('.col').nth(1).locator('.card button:has-text("Fertig")').click(); await page.waitForTimeout(300);
  assert.strictEqual(JSON.parse(by(t.id + '.json', aufg).content).erledigt, true);

  // Eingang: Foto, das jemand per Drive-App hochgeladen hat
  add('Foto.jpg', by('eingang', rootF.id).id, 'image/jpeg', 'x');
  await page.click('#bRef'); await page.waitForTimeout(300); await page.click('#bIn');
  await page.locator('#inListe .pl').first().locator('select').selectOption({ label: 'Von Anna' });
  await page.locator('#inListe .pl').first().locator('button:has-text("Zuordnen")').click(); await page.waitForTimeout(300);
  assert.strictEqual(kids(by('eingang', rootF.id).id).length, 0);
  assert.deepStrictEqual(kids(by('zz-1', by('dateien', rootF.id).id).id).map(f => f.name), ['Foto.jpg']);
  await page.setInputFiles('#fIn', { name: 'Direkt.png', mimeType: 'image/png', buffer: Buffer.from('PNG') }); await page.waitForTimeout(300);
  await page.locator('#inListe .pl').first().locator('button:has-text("Neue Aufgabe")').click(); await page.waitForTimeout(500);
  const neu = kids(aufg).map(f => f.content && JSON.parse(f.content)).find(x => x && x.titel === 'Direkt');
  assert.ok(neu && neu.zugewiesenAn === 'Ben'); assert.strictEqual(kids(by(neu.id, by('dateien', rootF.id).id).id).length, 1);
  await page.click('#inOk');

  // Freigabe: Projekt nur für Anna -> Ben (ich) sieht es nicht; eigenes Projekt begrenzen
  add('geheim.json', aufg, 'application/json', JSON.stringify({ id: 'geheim', titel: 'Nur Anna', status: 'todo', zuordnung: 'privat', erstelltVon: 'Anna', geaendertVon: 'Anna' }));
  const pf = by('projekte.json', rootF.id), pj = JSON.parse(pf.content); pj.projekte.push({ id: 'privat', name: 'Privat', typ: 'projekt', besitzer: 'Anna', mitglieder: ['Anna'] }); pf.content = JSON.stringify(pj);
  await page.click('#bRef'); await page.waitForTimeout(400);
  assert.ok(!(await page.locator('#filter option').allTextContents()).some(x => x.includes('Privat')));
  assert.ok(!(await page.locator('main').textContent()).includes('Nur Anna'));
  await page.click('#bProj'); await page.fill('#pNameIn', 'Haus'); await page.click('#pAdd'); await page.waitForTimeout(300);
  assert.ok(!(await page.locator('#projListe').textContent()).includes('Privat'));
  await page.locator('#projListe .pl', { hasText: 'Haus' }).locator('button:has-text("👥")').click();
  await page.locator('#projListe .pl', { hasText: 'Haus' }).locator('input[data-n=Anna]').uncheck(); await page.waitForTimeout(300);
  const haus = JSON.parse(by('projekte.json', rootF.id).content).projekte.find(x => x.name === 'Haus');
  assert.strictEqual(haus.besitzer, 'Ben'); assert.deepStrictEqual(haus.mitglieder, ['Ben']);
  await page.click('#pOk');

  // Archivieren, Projekt anlegen
  await page.click('nav button:has-text("Offen")'); await page.locator('.task .t', { hasText: 'Direkt' }).click(); await page.click('#dArch');
  await page.waitForTimeout(300); assert.strictEqual(JSON.parse(by(neu.id + '.json', aufg).content).archiviert, true);
  await page.click('#bProj'); await page.fill('#pNameIn', 'Chat Planung'); await page.selectOption('#pTyp', 'chat'); await page.click('#pAdd'); await page.waitForTimeout(300);
  assert.ok(JSON.parse(by('projekte.json', rootF.id).content).projekte.some(p => p.typ === 'chat'));
  await page.click('#pOk');
  await page.click('nav button:has-text("Board")'); await page.screenshot({ path: path.join(process.argv[2] || '.', 'pwa.png') });
  assert.deepStrictEqual(errs, []);
  await browser.close(); server.close(); console.log('PWA-Tests OK');
})().catch(e => { console.error(e); process.exit(1); });
