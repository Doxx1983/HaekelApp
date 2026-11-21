'use strict';
// UI-Test: Renderer in Chromium, window.api mit echtem Store verbunden (ohne Electron).
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path');
const assert = require('assert');
const { Store } = require('../src/store');

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'todoui-'));
  const store = new Store(dir, 'Anna');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 400, height: 580 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const store_remove_impl = (i, n) => store.removeFile(i, n);
  await page.exposeFunction('store_remove', store_remove_impl);
  const m = { laden: () => store.load(), neu: d => store.create(d), aendern: (i, p) => store.update(i, p), loeschen: i => store.remove(i),
    projektNeu: d => store.addProject(d), projektLoeschen: i => store.removeProject(i), dateiHinzu: (i, p) => store.addFiles(i, p), eingangZuordnen: (n, i) => store.inboxAssign(n, i), eingangNeu: (n, e) => store.inboxNewTask(n, e) };
  for (const k of Object.keys(m)) await page.exposeFunction('__' + k, m[k]);
  await page.addInitScript(() => {
    let cb = () => {};
    window.api = { config: async () => ({ nutzer: 'Anna', ordner: 'x', bereit: true }), configSetzen: async c => ({ ...c, bereit: true }),
      ordnerWaehlen: async () => 'x', verstecken() {}, beiAenderung: f => { cb = f; }, __cb: () => cb(),
      laden: () => window.__laden(), neu: d => window.__neu(d), aendern: (i, p) => window.__aendern(i, p), loeschen: i => window.__loeschen(i),
      projektNeu: d => window.__projektNeu(d), projektLoeschen: i => window.__projektLoeschen(i),
      breite: w => { window.__breite = w; }, dateiHinzu: (i, p) => window.__dateiHinzu(i, p), dateiOeffnen() {}, eingangZuordnen: (n, i) => window.__eingangZuordnen(n, i), eingangNeu: (n, e) => window.__eingangNeu(n, e), eingangOeffnen() {}, eingangLoeschen() {}, dateiZeigen() {}, dateiLoeschen: async (i, n) => store_remove(i, n) };
  });
  await page.goto('file://' + path.resolve(__dirname, '../src/index.html'));

  await page.click('#bProj'); await page.fill('#pName', 'Häkelapp'); await page.click('#pAdd');
  await page.fill('#pName', 'Chat Isadody'); await page.selectOption('#pTyp', 'chat'); await page.click('#pAdd'); await page.click('#pOk');
  assert.strictEqual(store.load().projekte.length, 2);

  await page.fill('#neuTitel', 'Garn bestellen'); await page.click('#neuHeute');
  await page.selectOption('#neuZu', { label: '📁 Häkelapp' }); await page.press('#neuTitel', 'Enter');
  await page.fill('#neuTitel', 'Rechnung'); await page.press('#neuTitel', 'Enter'); // in Ansicht "Heute" => automatisch heute
  assert.strictEqual(store.load().aufgaben.length, 2);
  assert.strictEqual(await page.locator('.task').count(), 2);

  await page.click('nav button:has-text("Offen")'); assert.strictEqual(await page.locator('.task').count(), 2);
  await page.locator('.task .box').first().click();                   // abhaken
  assert.strictEqual(store.load().aufgaben.filter(t => t.erledigt).length, 1);
  await page.click('nav button:has-text("Erledigt")'); assert.strictEqual(await page.locator('.task.done').count(), 1);
  await page.click('.task .act button[title=Archivieren]');
  await page.click('nav button:has-text("Archiv")'); assert.strictEqual(await page.locator('.task').count(), 1);
  await page.click('.task .act button[title="Zurückholen"]');
  await page.click('nav button:has-text("Offen")'); await page.selectOption('#filter', { label: '📁 Häkelapp' });
  assert.strictEqual(await page.locator('.task').count(), 1);
  // Änderung durch zweiten Nutzer
  new Store(dir, 'Ben').create({ titel: 'Von Ben' }); await page.selectOption('#filter', ''); await page.evaluate(() => window.api.__cb());
  await page.waitForTimeout(200);
  assert.ok((await page.locator('.task').allTextContents()).some(t => t.includes('Von Ben')));
  // Zuweisen, Fälligkeit, Status, Dateien über das Detailfenster
  await page.click('nav button:has-text("Offen")'); await page.locator('.task .t', { hasText: 'Garn bestellen' }).click();
  await page.selectOption('#dWer', 'Ben'); await page.fill('#dFaellig', '2020-01-01'); await page.dispatchEvent('#dFaellig', 'change');
  await page.selectOption('#dStatus', 'doing');
  let gb = store.load().aufgaben.find(t => t.titel === 'Garn bestellen');
  assert.strictEqual(gb.zugewiesenAn, 'Ben'); assert.strictEqual(gb.faellig, '2020-01-01'); assert.strictEqual(gb.status, 'doing');
  const f = path.join(dir, 'angebot.pdf'); fs.writeFileSync(f, 'x');
  await page.evaluate(([id, p]) => window.api.dateiHinzu(id, [p]), [gb.id, f]); await page.evaluate(() => window.api.__cb()); await page.waitForTimeout(200);
  assert.ok((await page.locator('#dDateien').textContent()).includes('angebot.pdf'));
  await page.click('#dOk');
  assert.ok((await page.locator('.tag.late').count()) >= 1);                  // überfällig markiert
  // Eingang (Handy-Fotos)
  fs.writeFileSync(path.join(dir, 'eingang', 'foto1.jpg'), 'x'); fs.writeFileSync(path.join(dir, 'eingang', 'foto2.jpg'), 'x');
  await page.evaluate(() => window.api.__cb()); await page.waitForTimeout(200);
  assert.strictEqual(await page.locator('#inN').textContent(), '2');
  await page.click('#bIn'); await page.locator('#inListe .pl').first().locator('select').selectOption({ label: 'Garn bestellen' });
  await page.locator('#inListe .pl').first().locator('button:has-text("Zuordnen")').click(); await page.waitForTimeout(200);
  assert.ok(store.load().aufgaben.find(t => t.id === gb.id).dateien.includes('foto1.jpg'));
  await page.locator('#inListe .pl').first().locator('button:has-text("Neue Aufgabe")').click(); await page.waitForTimeout(200);
  assert.ok(store.load().aufgaben.some(t => t.titel === 'foto2')); assert.deepStrictEqual(store.load().eingang, []);
  await page.click('#inOk');
  // Kanban
  await page.click('nav button:has-text("Board")');
  assert.strictEqual(await page.evaluate(() => window.__breite), 900);
  assert.strictEqual(await page.locator('.col[data-status=doing] .card').count(), 1);
  await page.locator('.col[data-status=doing] .card').dragTo(page.locator('.col[data-status=done]'));
  assert.strictEqual(store.load().aufgaben.find(t => t.id === gb.id).status, 'done');
  await page.locator('.col[data-status=done] .card button[title="Eine Spalte zurück"]').first().click();
  assert.strictEqual(store.load().aufgaben.find(t => t.id === gb.id).status, 'doing');
  await page.setViewportSize({ width: 900, height: 580 });
  await page.screenshot({ path: path.join(process.argv[2] || '.', 'board.png') });
  await page.screenshot({ path: path.join(process.argv[2] || '.', 'ui.png') });
  assert.deepStrictEqual(errs, []);
  await browser.close(); console.log('UI-Tests OK');
})().catch(e => { console.error(e); process.exit(1); });
