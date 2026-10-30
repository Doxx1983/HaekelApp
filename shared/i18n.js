// Sprache der Apps: Deutsch oder Englisch. Wahl unter „isadody.lang“; ohne Wahl Englisch bei englischer Browsersprache, sonst Deutsch.
// Übersetzt wird über Tabellen Deutsch → Englisch (shared/en.js, <app>/en.js):
//   I18N.add({ 'Löschen': 'Delete', 'Reihe {n}': 'Row {n}' })
//   T('Reihe {n}', { n: 3 })  → „Row 3“ bzw. „Reihe 3“; fehlt ein Eintrag, bleibt der deutsche Text.
// Feste Texte im HTML (Textknoten, title, placeholder, aria-label, alt) werden auf Englisch automatisch ersetzt,
// auch später eingefügte. translate="no" (Anleitungstext, Namen, Kürzel) bleibt unverändert.
// data-i18n: das ganze innerHTML ist der Schlüssel (für Sätze mit <b>, <code> usw.).
// Hilfeseiten: hilfe/index.html (Deutsch) und hilfe/en.html (Englisch); der „?“-Knopf führt zur passenden.
const I18N = (() => {
  const KEY = 'isadody.lang', LANGS = ['de', 'en'];
  // Seiten mit eigener englischer Fassung (index.html + en.html): Hilfe, Impressum, Datenschutz
  const TWIN = /\/(hilfe|impressum|datenschutz)\/(index\.html)?$/, TWIN_EN = /\/(hilfe|impressum|datenschutz)\/en\.html$/;
  let lang = null;
  try { lang = localStorage.getItem(KEY); } catch {}
  if (!LANGS.includes(lang)) lang = /^en/i.test((navigator.languages && navigator.languages[0]) || navigator.language || '') ? 'en' : 'de';
  const en = lang === 'en';
  const locale = en ? (/^en/i.test(navigator.language || '') ? navigator.language : 'en-GB') : 'de-DE';
  document.documentElement.lang = lang;

  const dict = new Map();
  const norm = s => String(s).replace(/\s+/g, ' ').trim();
  const fill = (s, v) => v ? s.replace(/\{(\w+)\}/g, (m, k) => k in v ? v[k] : m) : s;
  function t(s, v) {
    if (en) { const e = dict.get(norm(s)); if (e !== undefined) s = e; }
    return fill(s, v);
  }

  // DOM übersetzen (nur auf Englisch)
  const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE']);
  function text(n) {
    const v = n.nodeValue, k = norm(v), e = dict.get(k);
    if (e === undefined || e === k) return; // gleicher Text: nicht neu setzen (sonst meldet der Beobachter endlos)
    const pre = v.match(/^\s*/)[0], post = v.slice(pre.length).match(/\s*$/)[0];
    n.nodeValue = pre + e + post;
  }
  function el(e) {
    for (const a of ATTRS) { const v = e.getAttribute(a); if (v) { const x = dict.get(norm(v)); if (x !== undefined && x !== v) e.setAttribute(a, x); } }
    if (e.hasAttribute('data-i18n')) { const k = norm(e.innerHTML), x = dict.get(k); if (x !== undefined && x !== k) e.innerHTML = x; }
    if (e.matches('a.help') && /(^|\/)hilfe\/$/.test(e.getAttribute('href'))) e.setAttribute('href', e.getAttribute('href') + 'en.html');
  }
  // translate="no": nichts übersetzen; Textfelder, Skripte usw.: nur die Attribute (z. B. placeholder)
  const no = e => e.getAttribute('translate') === 'no';
  const off = e => { if (no(e)) return true; if (SKIP.has(e.tagName)) { el(e); return true; } return false; };
  function apply(root) {
    if (root.nodeType === 3) return text(root);
    if (root.nodeType !== 1 || off(root)) return;
    el(root);
    const w = document.createTreeWalker(root, 5, { acceptNode: n => n.nodeType === 1 && off(n) ? 2 : 1 });
    for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeType === 3 ? text(n) : el(n);
  }
  const inside = n => { const p = n.nodeType === 1 ? n : n.parentElement; return !p || !p.closest('[translate="no"],script,style,textarea,code,pre'); };
  const free = e => !e.closest('[translate="no"]');
  if (en) {
    new MutationObserver(list => {
      for (const m of list) {
        if (m.type === 'childList') { for (const n of m.addedNodes) if (n.isConnected && inside(n.parentNode || n)) apply(n); }
        else if (m.type === 'characterData') { if (inside(m.target)) text(m.target); }
        else if (free(m.target)) el(m.target);
      }
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    addEventListener('DOMContentLoaded', () => apply(document.documentElement));
  }

  function add(o) {
    for (const k in o) dict.set(norm(k), o[k]);
    if (en && document.readyState !== 'loading') apply(document.documentElement);
  }
  function set(l) {
    if (!LANGS.includes(l) || l === lang) return;
    try { localStorage.setItem(KEY, l); } catch {}
    // Hilfe- und Rechtsseiten: zur Fassung in der anderen Sprache wechseln
    const p = location.pathname;
    if (TWIN.test(p) && l === 'en') location.replace('en.html' + location.hash);
    else if (TWIN_EN.test(p) && l === 'de') location.replace('./' + location.hash);
    else location.reload();
  }
  // Umschalter „DE | EN“
  function switcher() {
    const d = document.createElement('div'); d.className = 'lang'; d.setAttribute('role', 'group'); d.setAttribute('aria-label', en ? 'Language' : 'Sprache');
    d.setAttribute('translate', 'no');
    for (const l of LANGS) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = l.toUpperCase(); b.lang = l;
      b.setAttribute('aria-label', l === 'de' ? 'Deutsch' : 'English');
      b.setAttribute('aria-pressed', l === lang); b.onclick = () => set(l);
      d.append(b);
    }
    return d;
  }
  // Hilfe- oder Rechtsseite in der falschen Sprache aufgerufen (z. B. alter Link): passende Fassung zeigen
  if (en && TWIN.test(location.pathname)) location.replace('en.html' + location.hash);
  else if (!en && TWIN_EN.test(location.pathname)) location.replace('./' + location.hash);
  // Ziffern, Datum und Beträge im Format der Sprache
  const num = (n, o) => Number(n).toLocaleString(locale, o);
  return { lang, en, locale, t, add, set, switcher, num, apply };
})();
const T = I18N.t;
