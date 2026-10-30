// Fußzeile mit Impressum und Datenschutz (Pflichtlinks, von jeder Seite erreichbar).
// Einbinden am Ende von <body>: <script src="../shared/recht.js"></script>; Pfade richten sich nach dieser Datei.
(() => {
  const base = new URL('../', document.currentScript.src), en = typeof I18N !== 'undefined' && I18N.en;
  const page = (p, t) => Object.assign(document.createElement('a'), { href: new URL(p + '/' + (en ? 'en.html' : ''), base).href, textContent: t });
  const f = document.createElement('footer'); f.className = 'recht';
  f.append(page('impressum', en ? 'Legal notice' : 'Impressum'), page('datenschutz', en ? 'Privacy' : 'Datenschutz'));
  document.body.append(f);
  // Auf den Rechtsseiten führt „‹ Zurück“ zur Seite, von der man kam
  const z = document.querySelector('.zurueck');
  if (z && /\/(impressum|datenschutz)\//.test(location.pathname) && document.referrer.startsWith(base.origin) && history.length > 1)
    z.onclick = e => { e.preventDefault(); history.back(); };
})();
