// Gesamtsicherung aller Apps in einer JSON-Datei: gespeicherte Daten (localStorage, Schlüssel <app>.*) und die Mustersammlung (IndexedDB).
// Braucht store.js, muster-db.js und projekte.js. Format: { app: 'isadody', v: 2, date, local: { schlüssel: JSON-Text }, items: [Muster, Datei als Base64] }.
// Alte Sicherungen der Sammlung ({ app: 'isadody-muster', items }) werden auch gelesen.
// Beim Einspielen wird alles geprüft und nur Bekanntes übernommen: Die Datei kann von jemand anderem stammen.
const Sicherung = (() => {
  const APPS = ['anleitung', 'zaehler', 'grid', 'muster', 'lexikon'], st = Store('sicherung');
  const HEX = /^#[0-9a-f]{6}$/i, ID = /^[\w-]{1,64}$/, KINDS = ['image', 'pdf', 'word', 'text'];
  const int = (v, a, b, d) => Number.isInteger(v) && v >= a && v <= b ? v : d;
  const str = (v, n) => typeof v === 'string' ? v.slice(0, n) : '';
  const obj = v => v && typeof v === 'object' && !Array.isArray(v);

  // ---- Prüfen ----
  // Grid-Stand { G: { w, h, palette, cells }, o, keep, src }; null, wenn etwas nicht passt
  function cleanGrid(g) {
    if (!obj(g) || !obj(g.G)) return null;
    const { w, h, palette, cells } = g.G, o = obj(g.o) ? g.o : {};
    if (int(w, 5, 200, 0) !== w || int(h, 5, 200, 0) !== h) return null;
    if (!Array.isArray(palette) || !palette.length || palette.length > 10 || !palette.every(p => HEX.test(p))) return null;
    if (!Array.isArray(cells) || cells.length !== w * h || !cells.every(c => int(c, 0, palette.length - 1, -1) === c)) return null;
    const res = { G: { w, h, palette: palette.map(p => p.toUpperCase()), cells: cells.slice() },
      o: { w, h, k: int(o.k, 2, 10, Math.max(2, palette.length)), mode: o.mode === 'rounds' ? 'rounds' : 'rows', left: o.left === true, smooth: o.smooth !== false }, keep: g.keep !== false };
    if ('src' in g) res.src = cleanSrc(g.src);
    return res;
  }
  const cleanSrc = s => typeof s === 'string' && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(s) ? s : '';
  // Muster der Sammlung; Datei (blob) bleibt Base64-Text und wird beim Einspielen umgewandelt
  function cleanItem(o) {
    if (!obj(o) || !ID.test(o.id) || !KINDS.includes(o.kind)) return null;
    const it = { id: o.id, kind: o.kind, title: str(o.title, 200).trim() || 'Muster', name: str(o.name, 200),
      mime: /^[\w.+-]+\/[\w.+-]+$/.test(o.mime) ? o.mime : o.kind === 'pdf' ? 'application/pdf' : o.kind === 'text' ? 'text/plain' : 'application/octet-stream',
      size: int(o.size, 0, 1e10, 0), tags: Array.isArray(o.tags) ? [...new Set(o.tags.filter(t => typeof t === 'string').map(t => t.replace(/^#/, '').trim().slice(0, 40)).filter(Boolean))].slice(0, 50) : [],
      fav: o.fav === true, notes: str(o.notes, 10000), added: Number.isFinite(o.added) ? o.added : Date.now() };
    if (typeof o.text === 'string') it.text = o.text.slice(0, 2e6);
    const c = Projekte.cleanColors(o.colors); if (Object.keys(c).length) it.colors = c;
    const g = cleanGrid(o.grid); if (g) it.grid = g;
    if (Number.isFinite(o.changed)) it.changed = o.changed;
    if (typeof o.blob === 'string' && /^[A-Za-z0-9+/=]*$/.test(o.blob)) it.blob = o.blob;
    return it;
  }
  function cleanProject(o) {
    if (!obj(o) || !ID.test(o.id) || typeof o.pattern !== 'string') return null;
    const done = {};
    if (obj(o.done)) for (const [k, v] of Object.entries(o.done)) if (/^\d{1,5}$/.test(k) && int(v, 0, 1e6, -1) === v) done[k] = v;
    const pos = obj(o.pos) ? o.pos : {};
    return { id: o.id, name: str(o.name, 80).trim() || Projekte.nameOf(o.pattern), pattern: o.pattern.slice(0, 2e6),
      pos: { r: int(pos.r, 0, 1e5, 0), p: int(pos.p, 0, 1e5, 0) }, done, colors: { ...Projekte.DEFAULT_COLORS, ...Projekte.cleanColors(o.colors) }, used: Number.isFinite(o.used) ? o.used : 0 };
  }
  function cleanCounter(o) {
    if (!obj(o)) return null;
    const n = int(o.n, 2, 60, 10), popped = Array.isArray(o.popped) ? [...new Set(o.popped.filter(i => int(i, 0, n - 1, -1) === i))] : [];
    return { n, flips: int(o.flips, 0, 1e5, 0), popped: popped.length >= n ? [] : popped, target: int(o.target, 0, 1e5, 0), used: Number.isFinite(o.used) ? o.used : 0 };
  }

  // ---- Sichern ----
  const b64 = blob => new Promise((ok, err) => { const r = new FileReader(); r.onload = () => ok(r.result.split(',')[1] || ''); r.onerror = () => err(r.error); r.readAsDataURL(blob); });
  const unb64 = (s, type) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new Blob([u], { type }); };
  function download(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  // Alles herunterladen; merkt sich den Zeitpunkt für die Erinnerung
  async function save() {
    const local = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (APPS.some(a => k.startsWith(a + '.'))) local[k] = localStorage.getItem(k); }
    let items = [];
    try { items = await MusterDB.all(); } catch {}
    const out = [];
    for (const it of items) { const o = { ...it }; delete o.thumb; if (it.blob) o.blob = await b64(it.blob); out.push(o); }
    const d = new Date().toISOString().slice(0, 10);
    download(new Blob([JSON.stringify({ app: 'isadody', v: 2, date: Date.now(), local, items: out })], { type: 'application/json' }), `isadody-sicherung-${d}.json`);
    st.set('last', Date.now());
  }

  // ---- Einspielen ----
  async function thumbOf(blob) { // wie in muster/: kleines Vorschaubild
    try {
      const img = await createImageBitmap(blob), k = Math.min(1, 360 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return await new Promise(ok => c.toBlob(ok, 'image/jpeg', .8));
    } catch { return null; }
  }
  const json = s => { try { return JSON.parse(s); } catch { return undefined; } };
  // Vorhandenes bleibt; aus der Sicherung kommt, was fehlt. Projekte und Zähler: der zuletzt benutzte Stand gewinnt.
  // Ergebnis { ok, text } für eine kurze Meldung
  async function restore(file) {
    let data; try { data = JSON.parse(await file.text()); } catch { return { ok: false, text: 'Datei ist keine Sicherung' }; }
    if (!obj(data) || !['isadody', 'isadody-muster'].includes(data.app)) return { ok: false, text: 'Datei ist keine Isadody-Sicherung' };
    const parts = [];
    if (data.app === 'isadody' && obj(data.local)) {
      const L = data.local, a = Store('anleitung'), z = Store('zaehler'), g = Store('grid');
      // Projekte des Häkelhelfers
      const inP = json(L['anleitung.projects']);
      if (Array.isArray(inP)) {
        const list = Projekte.all(); let n = 0;
        for (const p of inP.map(cleanProject).filter(Boolean)) {
          const i = list.findIndex(x => x.id === p.id);
          if (i < 0) { list.push(p); n++; } else if (p.used > (list[i].used || 0)) { list[i] = p; n++; }
        }
        a.set('projects', list);
        const cur = json(L['anleitung.current']);
        if (!a.get('current', '') && typeof cur === 'string' && list.some(x => x.id === cur)) a.set('current', cur);
        if (n) parts.push(`${n} ${n === 1 ? 'Projekt' : 'Projekte'}`);
      }
      // Zähler
      const inZ = json(L['zaehler.counters']);
      if (obj(inZ)) {
        const cs = z.get('counters', {}) || {}; let n = 0;
        for (const [k, v] of Object.entries(inZ)) {
          const c = cleanCounter(v); if (!c || !(k === 'frei' || ID.test(k))) continue;
          if (!cs[k] || c.used > (cs[k].used || 0)) { cs[k] = c; n++; }
        }
        z.set('counters', cs);
        if (n) parts.push(`${n} Zähler`);
      }
      // Grid-Ersteller: nur, wenn hier noch kein Raster liegt
      const gs = cleanGrid(json(L['grid.state']));
      if (gs && !g.get('state', null)) {
        g.set('state', gs); g.set('src', cleanSrc(json(L['grid.src'])));
        const mid = json(L['grid.mid']); if (typeof mid === 'string' && ID.test(mid)) g.set('mid', mid);
        parts.push('Grid');
      }
      // Lexikon: Favoriten zusammenführen (nur Einträge wie „abn“, höchstens 200)
      const inF = json(L['lexikon.fav']);
      if (Array.isArray(inF)) {
        const lx = Store('lexikon'), favs = lx.get('fav', []), have = new Set(Array.isArray(favs) ? favs.filter(f => typeof f === 'string' && ID.test(f)) : []), n0 = have.size;
        for (const f of inF) if (typeof f === 'string' && /^[a-z0-9]{1,32}$/.test(f) && have.size < 200) have.add(f);
        lx.set('fav', [...have]);
        if (have.size > n0) parts.push(`${have.size - n0} Lexikon-Favoriten`);
      }
    }
    // Mustersammlung
    if (Array.isArray(data.items)) {
      let n = 0, same = 0;
      for (const o of data.items) {
        const it = cleanItem(o); if (!it) continue;
        try {
          if (await MusterDB.get(it.id)) { same++; continue; }
          if (typeof it.blob === 'string') { it.blob = unb64(it.blob, it.mime); if (it.kind === 'image') it.thumb = await thumbOf(it.blob); }
          await MusterDB.put(it); n++;
        } catch { return { ok: false, text: `Speicher voll: ${n} Muster eingespielt, der Rest fehlt` }; }
      }
      if (n) parts.push(`${n} Muster`);
      if (same && !n) parts.push('Muster schon vorhanden');
    }
    return { ok: true, text: parts.length ? `Eingespielt: ${parts.join(', ')}` : 'Nichts Neues in der Sicherung' };
  }

  // Erinnerung: Text zur letzten Sicherung; warn = lange her oder nie (und es gibt etwas zu sichern)
  async function status() {
    const last = st.get('last', 0), days = last ? Math.floor((Date.now() - last) / 864e5) : -1;
    let has = Projekte.all().length > 0 || !!Store('zaehler').get('counters', null) || !!Store('grid').get('state', null) || Store('lexikon').get('fav', []).length > 0;
    if (!has) try { has = (await MusterDB.all()).length > 0; } catch {}
    const text = !last ? 'Noch keine Sicherung' : days === 0 ? 'Letzte Sicherung: heute' : days === 1 ? 'Letzte Sicherung: gestern' : `Letzte Sicherung vor ${days} Tagen`;
    return { text, warn: has && (!last || days >= 14) };
  }
  return { save, restore, status, cleanItem, cleanGrid };
})();
