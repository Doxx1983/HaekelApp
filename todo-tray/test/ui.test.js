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
  const m = { laden: () => store.load(), neu: d => store.create(d), aendern: (i, p) => store.update(i, p), loeschen: i => store.remove(i),
    projektNeu: d => store.addProject(d), projektLoeschen: i => store.removeProject(i) };
  for (const k of Object.keys(m)) await page.exposeFunction('__' + k, m[k]);
  await page.addInitScript(() => {
    let cb = () => {};
    window.api = { config: async () => ({ nutzer: 'Anna', ordner: 'x', bereit: true }), configSetzen: async c => ({ ...c, bereit: true }),
      ordnerWaehlen: async () => 'x', verstecken() {}, beiAenderung: f => { cb = f; }, __cb: () => cb(),
      laden: () => window.__laden(), neu: d => window.__neu(d), aendern: (i, p) => window.__aendern(i, p), loeschen: i => window.__loeschen(i),
      projektNeu: d => window.__projektNeu(d), projektLoeschen: i => window.__projektLoeschen(i) };
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
  await page.screenshot({ path: path.join(process.argv[2] || '.', 'ui.png') });
  assert.deepStrictEqual(errs, []);
  await browser.close(); console.log('UI-Tests OK');
})().catch(e => { console.error(e); process.exit(1); });
