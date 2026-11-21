'use strict';
const { contextBridge, ipcRenderer } = require('electron');
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
  projektLoeschen: id => call('projekt:loeschen', id),
  verstecken: () => ipcRenderer.send('verstecken'),
  beiAenderung: cb => ipcRenderer.on('geaendert', () => cb()),
});
