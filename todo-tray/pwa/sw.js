'use strict';
// Service Worker: nur die App-Hülle wird zwischengespeichert (damit sie sich installieren/offline öffnen lässt).
// Daten und Google-Anfragen gehen nie durch den Cache.
const CACHE = 'aufgaben-v1';
const SHELL = ['./', 'index.html', 'app.js', 'drive.js', 'config.js', 'core.js', 'manifest.webmanifest', 'icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
