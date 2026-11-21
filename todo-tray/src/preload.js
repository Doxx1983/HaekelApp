'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');
const call = (k, ...a) => ipcRenderer.invoke(k, ...a);

contextBridge.exposeInMainWorld('api', {
  config: () => call('config'),
  configSetzen: c => call('config:setzen', c),
  ordnerWaehlen: () => call('ordner:waehlen'),
  laden: () => call('laden'),
  neu: d => call('neu', d),
  aendern: (id, patch) => call('aendern', id, patch),
  loeschen: id => call('loeschen', id),
  projektNeu: d => call('projekt:neu', d),
  projektAendern: (id, patch) => call('projekt:aendern', id, patch),
  projektLoeschen: id => call('projekt:loeschen', id),
  dateiWaehlen: id => call('datei:waehlen', id),
  dateiHinzu: (id, files) => call('datei:hinzu', id, [...files].map(f => webUtils.getPathForFile(f)).filter(Boolean)),
  dateiOeffnen: (id, n) => call('datei:oeffnen', id, n),
  dateiZeigen: (id, n) => call('datei:zeigen', id, n),
  dateiLoeschen: (id, n) => call('datei:loeschen', id, n),
  eingangZuordnen: (n, id) => call('eingang:zuordnen', n, id),
  eingangNeu: (n, extra) => call('eingang:neu', n, extra),
  eingangOeffnen: n => call('eingang:oeffnen', n),
  eingangLoeschen: n => call('eingang:loeschen', n),
  breite: w => ipcRenderer.send('breite', w),
  verstecken: () => ipcRenderer.send('verstecken'),
  beiAenderung: cb => ipcRenderer.on('geaendert', () => cb()),
});
