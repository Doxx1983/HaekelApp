// Offline-Betrieb: Die Apps kommen aus dem Netz, wenn es da ist (so sind Änderungen sofort live),
// sonst aus dem Zwischenspeicher. Beim ersten Besuch wird alles Wichtige vorab gespeichert.
// Neue Datei, die offline gebraucht wird: unten in FILES eintragen (fehlende Einträge stören nicht).
const CACHE = 'haekel-apps';
const FILES = ['./', 'manifest.webmanifest',
  'anleitung/', 'zaehler/', 'grid/', 'muster/', 'lexikon/',
  'anleitung/hilfe/', 'zaehler/hilfe/', 'grid/hilfe/', 'muster/hilfe/', 'lexikon/hilfe/',
  'shared/isadody.css', 'shared/hilfe.css', 'shared/fonts/fonts.css', 'shared/logo.png', 'shared/icon-180.png', 'shared/icon-192.png',
  'shared/fonts/baloo2-latin.woff2', 'shared/fonts/baloo2-latin-ext.woff2', 'shared/fonts/nunito-latin.woff2', 'shared/fonts/nunito-latin-ext.woff2',
  'shared/store.js', 'shared/dialog.js', 'shared/erinnerung.js', 'shared/projekte.js', 'shared/muster-db.js', 'shared/sicherung.js', 'shared/doctext.js', 'shared/maschen.js'];
const WAIT = 4000; // so lange aufs Netz warten, dann den gespeicherten Stand zeigen

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(new Request(f, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const net = fetch(req).then(res => { if (res.ok && res.type === 'basic') c.put(req, res.clone()); return res; });
    net.catch(() => {}); // Fehler wird unten behandelt
    const saved = () => c.match(req, { ignoreSearch: true });
    try {
      // Netz zuerst; hängt es zu lange (schlechtes WLAN), den gespeicherten Stand nehmen, falls es einen gibt
      const res = await Promise.race([net, new Promise(ok => setTimeout(ok, WAIT))]);
      if (res) return res;
      return (await saved()) || await net;
    } catch {
      return (await saved()) || new Response('Offline und diese Seite ist noch nicht gespeichert.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
