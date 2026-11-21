'use strict';
const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, screen, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');
const { Store } = require('./store');

if (!app.requestSingleInstanceLock()) app.quit();

const cfgFile = () => path.join(app.getPath('userData'), 'config.json');
const readCfg = () => { try { return JSON.parse(fs.readFileSync(cfgFile(), 'utf8')); } catch { return {}; } };
const writeCfg = c => fs.writeFileSync(cfgFile(), JSON.stringify(c, null, 2));

let cfg = {}, store = null, win = null, tray = null, lastSig = '', timer = null, watcher = null;

function openStore() {
  store = null;
  if (watcher) { watcher.close(); watcher = null; }
  if (!cfg.ordner || !cfg.nutzer) return;
  try {
    store = new Store(cfg.ordner, cfg.nutzer);
    lastSig = store.signature();
    watcher = fs.watch(store.tasksDir, () => checkChanged());
  } catch (e) { store = null; }
}

function checkChanged() {
  if (!store || !win) return;
  try {
    const s = store.signature();
    if (s !== lastSig) { lastSig = s; win.webContents.send('geaendert'); }
  } catch { /* Ordner kurz nicht erreichbar */ }
}

function placeWindow() {
  const b = tray.getBounds();
  const { width, height } = win.getBounds();
  const disp = screen.getDisplayMatching(b).workArea;
  let x = Math.round(b.x + b.width / 2 - width / 2);
  let y = b.y > disp.y + disp.height / 2 ? b.y - height - 8 : b.y + b.height + 8;
  x = Math.max(disp.x + 8, Math.min(x, disp.x + disp.width - width - 8));
  y = Math.max(disp.y + 8, Math.min(y, disp.y + disp.height - height - 8));
  win.setPosition(x, y, false);
}

function toggle() {
  if (win.isVisible()) return win.hide();
  placeWindow(); win.show(); win.focus();
}

function createWindow() {
  win = new BrowserWindow({
    width: 400, height: 580, show: false, frame: false, resizable: false, skipTaskbar: true,
    alwaysOnTop: true, backgroundColor: '#FBF6EC', icon: path.join(__dirname, '..', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  win.on('blur', () => { if (!win.webContents.isDevToolsOpened() && !dialogOpen) win.hide(); });
}

let dialogOpen = false;
async function pickFolder() {
  dialogOpen = true;
  try {
    const r = await dialog.showOpenDialog(win, { title: 'Gemeinsamen Ordner wählen (Google Drive oder Netzwerk)', properties: ['openDirectory', 'createDirectory'] });
    return r.canceled ? null : r.filePaths[0];
  } finally { dialogOpen = false; win.show(); }
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'icon.png')).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('Isadody Aufgaben');
  tray.on('click', toggle);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Öffnen', click: toggle },
    { label: 'Mit Windows starten', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin,
      click: m => app.setLoginItemSettings({ openAtLogin: m.checked }) },
    { type: 'separator' },
    { label: 'Beenden', click: () => app.quit() },
  ]));
}

ipcMain.handle('config', () => ({ ...cfg, bereit: !!store }));
ipcMain.handle('config:setzen', (_e, c) => {
  cfg = { ...cfg, ...c }; writeCfg(cfg); openStore();
  return { ...cfg, bereit: !!store };
});
ipcMain.handle('ordner:waehlen', pickFolder);
ipcMain.handle('laden', () => store.load());
ipcMain.handle('neu', (_e, d) => { const t = store.create(d); lastSig = store.signature(); return t; });
ipcMain.handle('aendern', (_e, id, patch) => { const t = store.update(id, patch); lastSig = store.signature(); return t; });
ipcMain.handle('loeschen', (_e, id) => { store.remove(id); lastSig = store.signature(); });
ipcMain.handle('projekt:neu', (_e, d) => { const p = store.addProject(d); lastSig = store.signature(); return p; });
ipcMain.handle('projekt:loeschen', (_e, id) => { store.removeProject(id); lastSig = store.signature(); });
ipcMain.on('verstecken', () => win.hide());

app.whenReady().then(() => {
  cfg = readCfg(); openStore();
  createWindow(); createTray();
  timer = setInterval(checkChanged, 5000); // Fallback, falls fs.watch bei Drive/Netzwerk nichts meldet
  if (!store) { placeWindow(); win.show(); }
});
app.on('second-instance', () => { if (win) { placeWindow(); win.show(); win.focus(); } });
app.on('window-all-closed', e => e.preventDefault());
app.on('before-quit', () => clearInterval(timer));
