// Offline-Cache der Häkel-Apps. Mit Netz kommt jede Datei frisch aus dem Netz und wird im Cache aktualisiert;
// ohne Netz (oder nach 4 s ohne Antwort) aus dem Cache. Beim ersten Besuch werden alle Dateien vorab geladen.
// Neue Dateien in FILES eintragen und VERSION erhöhen (Dateien, die nur besucht werden, landen auch so im Cache).
const VERSION = 'isadody-7';
const FILES = [
  './', 'en.js', 'manifest.webmanifest',
  'anleitung/', 'anleitung/hilfe/', 'grid/', 'grid/hilfe/', 'lexikon/', 'lexikon/hilfe/', 'lineal/', 'lineal/hilfe/', 'muster/', 'muster/hilfe/', 'stoppuhr/', 'stoppuhr/hilfe/', 'kalkulation/', 'kalkulation/hilfe/', 'zaehler/', 'zaehler/hilfe/',
  'anleitung/en.js', 'anleitung/hilfe/en.html', 'grid/en.js', 'grid/hilfe/en.html', 'lexikon/en.js', 'lexikon/hilfe/en.html', 'lineal/en.js', 'lineal/hilfe/en.html', 'muster/en.js', 'muster/hilfe/en.html', 'stoppuhr/en.js', 'stoppuhr/hilfe/en.html', 'kalkulation/en.js', 'kalkulation/hilfe/en.html', 'zaehler/en.js', 'zaehler/hilfe/en.html',
  'impressum/', 'impressum/en.html', 'datenschutz/', 'datenschutz/en.html',
  'shared/isadody.css', 'shared/hilfe.css', 'shared/fonts/fonts.css',
  'shared/fonts/baloo2-latin.woff2', 'shared/fonts/baloo2-latin-ext.woff2', 'shared/fonts/nunito-latin.woff2', 'shared/fonts/nunito-latin-ext.woff2',
  'shared/i18n.js', 'shared/en.js', 'shared/maschen-en.js', 'shared/store.js', 'shared/dialog.js', 'shared/erinnerung.js', 'shared/muster-db.js', 'shared/doctext.js', 'shared/projekte.js', 'shared/sicherung.js', 'shared/maschen.js',
  'shared/wach.js', 'shared/offline.js', 'shared/recht.js',
  'shared/pdfjs/pdf.min.js', 'shared/pdfjs/pdf.worker.min.js', // Schriften in shared/pdfjs/standard_fonts/ kommen bei Bedarf in den Cache
  'shared/logo.png', 'shared/icon-180.png', 'shared/icon-192.png', 'shared/icon-512.png',
];

self.addEventListener('install', e => e.waitUntil(
  caches.open(VERSION).then(c => Promise.all(FILES.map(f => c.add(new Request(f, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));

self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    // „anleitung/“ und „anleitung/index.html“ sind dieselbe Seite
    const alt = u.pathname.endsWith('/') ? u.origin + u.pathname + 'index.html' : u.pathname.endsWith('/index.html') ? u.origin + u.pathname.slice(0, -10) : null;
    const cached = async () => (await c.match(r, { ignoreSearch: true })) || (alt && await c.match(alt));
    const net = fetch(r).then(res => { if (res.ok && res.type === 'basic') c.put(r, res.clone()); return res; });
    net.catch(() => {});
    try { return await Promise.race([net, new Promise((_, no) => setTimeout(no, 4000))]); }
    catch {
      const hit = await cached(); if (hit) return hit;
      try { return await net; }
      catch { return new Response('Offline, und diese Seite ist noch nicht gespeichert.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); }
    }
  })());
});
