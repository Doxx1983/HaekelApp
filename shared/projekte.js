// Projekte des Häkelhelfers (bis zu 10 Anleitungen mit eigenem Fortschritt und eigenen Farben).
// Gemeinsam für anleitung/ und die Apps, die Anleitungen dorthin schicken (grid/, muster/). Braucht store.js.
// Gespeichert unter anleitung.projects ([{ id, name, pattern, pos, done, colors, used, prev?, rows? (Reihenzahl, setzt der Häkelhelfer) }]) und anleitung.current (id).
const Projekte = (() => {
  const MAX = 10, st = Store('anleitung');
  const DEFAULT_COLORS = { A: '#E53935', B: '#1E88E5' };
  // Farben nur als #RRGGBB mit kurzem Namen übernehmen (sie landen in style-Attributen)
  const cleanColors = c => { const o = {}; if (c && typeof c === 'object') for (const [k, v] of Object.entries(c)) if (/^[\p{L}\d]{1,12}$/u.test(k) && /^#[0-9a-f]{6}$/i.test(v)) o[k.toUpperCase()] = v.toUpperCase(); return o; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  // Name aus der ersten Zeile, die keine Reihe ist (Titel), sonst „Projekt vom 24.10.“
  const nameOf = (text, what = 'Projekt') => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const t = lines.find(l => !/^(?:(?:R|Row|Rows|Reihen?|Runden?|Rounds?|Rnds?|Rds?)\.?\s*\d|\d+\.?\s*(?:-\s*\d+\.?\s*)?(?:Reihen?|Runden?|Rnd|Rd|R)\b)/i.test(l)) || '';
    return t.replace(/\s+/g, ' ').slice(0, 40) || `${what} vom ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`;
  };
  // Einmalig: die eine Anleitung aus der Zeit vor den Projekten wird Projekt 1
  function all() {
    let list = st.get('projects', null);
    if (!Array.isArray(list)) {
      const t = st.get('pattern', ''); list = [];
      if (t) {
        const p = { id: uid(), name: nameOf(t), pattern: t, pos: st.get('pos', { r: 0, p: 0 }), done: st.get('done', {}), colors: { ...DEFAULT_COLORS, ...st.get('colors', {}) }, used: Date.now() };
        list.push(p); st.set('current', p.id);
      }
      st.set('projects', list);
    }
    return list;
  }
  const saveAll = list => st.set('projects', list);
  const current = () => { const list = all(), id = st.get('current', ''); return list.find(p => p.id === id) || null; };
  const setCurrent = id => st.set('current', id);
  function put(p) { const list = all(), i = list.findIndex(x => x.id === p.id); if (i < 0) list.push(p); else list[i] = p; saveAll(list); }
  function remove(id) { saveAll(all().filter(p => p.id !== id)); if (st.get('current', '') === id) st.remove('current'); }
  const full = () => all().length >= MAX;
  // Neues Projekt; Farben vom aktuellen Projekt übernehmen, damit die eigene Palette bleibt
  function create(pattern, name, colors) {
    if (full()) return null;
    const base = current();
    const p = { id: uid(), name: (name || '').trim() || nameOf(pattern), pattern, pos: { r: 0, p: 0 }, done: {}, colors: { ...DEFAULT_COLORS, ...(base ? base.colors : {}), ...cleanColors(colors) }, used: Date.now() };
    put(p); setCurrent(p.id); return p;
  }
  // Anleitung aus einer anderen App öffnen: gleiche Anleitung → dieses Projekt (Fortschritt bleibt), sonst neues Projekt.
  // false, wenn schon 10 Projekte da sind.
  function open(pattern, name, colors) {
    const same = all().find(p => p.pattern === pattern);
    if (same) { if (colors) same.colors = { ...same.colors, ...cleanColors(colors) }; same.used = Date.now(); put(same); setCurrent(same.id); return true; }
    return !!create(pattern, name, colors);
  }
  // Anleitung eines Projekts ersetzen (z. B. geändertes Grid). prev = Anleitung, zu der der Fortschritt gehört;
  // der Häkelhelfer gleicht beim Öffnen ab und behält Häkchen unveränderter Reihen.
  function update(id, pattern, colors) {
    const p = all().find(x => x.id === id); if (!p) return null;
    if (p.pattern !== pattern) { if (p.prev === undefined) p.prev = p.pattern; p.pattern = pattern; delete p.rows; }
    if (colors) p.colors = { ...p.colors, ...cleanColors(colors) };
    p.used = Date.now(); put(p); setCurrent(p.id); return p;
  }
  const FULL_MSG = `Im Häkelhelfer sind schon ${MAX} Projekte gespeichert. Bitte dort unter „Projekte“ erst eins löschen.`;
  return { MAX, DEFAULT_COLORS, FULL_MSG, all, saveAll, current, setCurrent, put, remove, full, create, open, update, nameOf, cleanColors };
})();
