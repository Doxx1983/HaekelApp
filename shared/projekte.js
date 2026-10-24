// Projekte des Häkelhelfers (bis zu 10 Anleitungen mit eigenem Fortschritt und eigenen Farben).
// Gemeinsam für anleitung/ und die Apps, die Anleitungen dorthin schicken (grid/, muster/). Braucht store.js.
// Gespeichert unter anleitung.projects ([{ id, name, pattern, pos, done, colors, used }]) und anleitung.current (id).
const Projekte = (() => {
  const MAX = 10, st = Store('anleitung');
  const DEFAULT_COLORS = { A: '#E53935', B: '#1E88E5' };
  // Farben nur als #RRGGBB mit kurzem Namen übernehmen (sie landen in style-Attributen)
  const cleanColors = c => { const o = {}; if (c && typeof c === 'object') for (const [k, v] of Object.entries(c)) if (/^[\p{L}\d]{1,12}$/u.test(k) && /^#[0-9a-f]{6}$/i.test(v)) o[k.toUpperCase()] = v.toUpperCase(); return o; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  // Name aus der ersten Zeile, die keine Reihe ist (Titel), sonst aus der ersten Zeile
  const nameOf = text => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const t = lines.find(l => !/^(?:R|Row|Reihe|Runde|Round|Rnd|Rd)\.?\s*\d/i.test(l)) || lines[0] || '';
    return t.replace(/\s+/g, ' ').slice(0, 40) || 'Projekt';
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
  // Löschen nimmt auch den Reihenzähler des Projekts mit
  function remove(id) {
    saveAll(all().filter(p => p.id !== id)); if (st.get('current', '') === id) st.remove('current');
    const z = Store('zaehler'), cs = z.get('counters', null);
    if (cs && cs[id]) { delete cs[id]; z.set('counters', cs); if (z.get('current', '') === id) z.set('current', 'frei'); }
  }
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
  const FULL_MSG = `Im Häkelhelfer sind schon ${MAX} Projekte gespeichert. Bitte dort unter „Projekte“ erst eins löschen.`;
  return { MAX, DEFAULT_COLORS, FULL_MSG, all, current, setCurrent, put, remove, full, create, open, nameOf, cleanColors };
})();
