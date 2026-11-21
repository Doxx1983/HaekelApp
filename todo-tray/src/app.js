'use strict';
const $ = id => document.getElementById(id);
const Core = window.TodoCore;
const THEMES = ['auto', 'light', 'dark'], T_ICON = { auto: '🌓', light: '☀️', dark: '🌙' }, T_NAME = { auto: 'automatisch', light: 'hell', dark: 'dunkel' };
let theme = 'auto'; try { theme = localStorage.getItem('theme') || 'auto'; } catch { /* ok */ }
function applyTheme(t) {
  theme = THEMES.includes(t) ? t : 'auto';
  if (theme === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = theme;
  $('bTheme').textContent = T_ICON[theme]; $('bTheme').title = 'Design: ' + T_NAME[theme] + ' (Klick wechselt)';
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = getComputedStyle(document.body).backgroundColor;
  try { localStorage.setItem('theme', theme); } catch { /* ok */ }
}
$('bTheme').onclick = () => applyTheme(THEMES[(THEMES.indexOf(theme) + 1) % 3]);
applyTheme(theme);
$('datum').textContent = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
const heuteStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

let cfg = {}, data = { aufgaben: [], projekte: [], nutzer: [], eingang: [] }, ansicht = 'heute', filter = '', filterWer = '', neuHeute = false, detailId = null, bekannt = null;

const ANSICHTEN = [['heute', 'Heute'], ['offen', 'Offen'], ['board', 'Board'], ['erledigt', 'Erledigt'], ['archiv', 'Archiv']];
const SPALTEN = [['todo', 'Zu tun'], ['doing', 'In Arbeit'], ['done', 'Fertig']];
const STATUS_NAME = Object.fromEntries(SPALTEN);

const istHeute = t => t.heute === heuteStr();
const passt = {
  heute: t => !t.archiviert && istHeute(t),
  offen: t => !t.archiviert && t.status !== 'done',
  board: t => !t.archiviert,
  erledigt: t => !t.archiviert && t.status === 'done',
  archiv: t => t.archiviert,
};
const zuordnungOk = t => filter === '' || (filter === '-' ? !t.zuordnung : t.zuordnung === filter);
const werOk = t => filterWer === '' || (filterWer === '-' ? !t.zugewiesenAn : t.zugewiesenAn === filterWer);
const sichtbar = k => data.aufgaben.filter(passt[k]).filter(zuordnungOk).filter(werOk);

function el(tag, props = {}, ...kids) {
  const e = Object.assign(document.createElement(tag), props);
  for (const k of kids) e.append(k);
  return e;
}

const projName = id => { const p = data.projekte.find(x => x.id === id); return p ? (p.typ === 'chat' ? '💬 ' : '📁 ') + p.name : null; };
const finde = id => data.aufgaben.find(t => t.id === id);

function datumKurz(s) { const [y, m, d] = s.split('-'); return d + '.' + m + '.'; }
function faelligTag(t) {
  if (!t.faellig) return null;
  const spaet = t.status !== 'done' && t.faellig < heuteStr();
  const txt = t.faellig === heuteStr() ? 'heute fällig' : (spaet ? 'überfällig ' : 'fällig ') + datumKurz(t.faellig);
  return el('span', { className: 'tag due' + (spaet ? ' late' : ''), textContent: '⏰ ' + txt });
}

function optionen(sel, leer, aktuell) {
  sel.replaceChildren(el('option', { value: '', textContent: leer }));
  for (const p of data.projekte) sel.append(el('option', { value: p.id, textContent: projName(p.id) }));
  sel.value = [...sel.options].some(o => o.value === aktuell) ? aktuell : '';
}
function optionenFilterZu(sel, aktuell) {
  optionen(sel, 'Alle', aktuell); sel.insertBefore(el('option', { value: '-', textContent: 'Ohne Zuordnung' }), sel.options[1]);
  sel.value = [...sel.options].some(o => o.value === aktuell) ? aktuell : '';
}
function nutzerListe() { return [...new Set([...(data.nutzer || []), cfg.nutzer].filter(Boolean))]; }
function optionenWer(sel, mitAlle, aktuell, projektId) {
  sel.replaceChildren();
  if (mitAlle) sel.append(el('option', { value: '', textContent: 'Alle' }));
  else sel.append(el('option', { value: '', textContent: 'Niemand' }));
  for (const n of projektId ? Core.werFuer(data.projekte, projektId, nutzerListe()) : nutzerListe()) sel.append(el('option', { value: n, textContent: n === cfg.nutzer ? n + ' (ich)' : n }));
  if (mitAlle) sel.append(el('option', { value: '-', textContent: 'Niemand' }));
  sel.value = [...sel.options].some(o => o.value === aktuell) ? aktuell : (mitAlle ? '' : cfg.nutzer || '');
}

function sortiere(a, b) {
  const rang = t => t.status === 'done' ? 1 : 0;
  return (rang(a) - rang(b)) || (a.faellig || '9999').localeCompare(b.faellig || '9999') || (b.erstelltAm || '').localeCompare(a.erstelltAm || '');
}

function metaEl(t) {
  const meta = el('div', { className: 'meta' });
  if (t.status === 'doing') meta.append(el('span', { className: 'tag', textContent: 'In Arbeit' }));
  const f = faelligTag(t); if (f) meta.append(f);
  const pn = projName(t.zuordnung); if (pn) meta.append(el('span', { className: 'tag', textContent: pn }));
  if (t.zugewiesenAn) meta.append(el('span', { className: 'tag wer', textContent: '→ ' + t.zugewiesenAn }));
  if (t.ablegen) meta.append(el('span', { className: 'tag', textContent: '🗂 vormerken' }));
  if (t.dateien && t.dateien.length) meta.append(el('span', { textContent: '📎 ' + t.dateien.length }));
  if (t.erstelltVon && t.erstelltVon !== cfg.nutzer) meta.append(el('span', { textContent: 'von ' + t.erstelltVon }));
  return meta;
}

function taskEl(t) {
  const done = t.status === 'done';
  const box = el('button', { className: 'box', textContent: done ? '✓' : (t.status === 'doing' ? '…' : ''), title: done ? 'Wieder öffnen' : 'Abhaken',
    onclick: e => { e.stopPropagation(); aendern(t.id, { status: done ? 'todo' : 'done' }); } });
  const act = el('div', { className: 'act' });
  if (!t.archiviert) {
    act.append(el('button', { className: 'heute' + (istHeute(t) ? ' on' : ''), textContent: istHeute(t) ? '★' : '☆', title: 'Für heute',
      onclick: e => { e.stopPropagation(); aendern(t.id, { heute: istHeute(t) ? null : heuteStr() }); } }));
    act.append(el('button', { textContent: '🗄', title: 'Archivieren', onclick: e => { e.stopPropagation(); aendern(t.id, { archiviert: true }); } }));
  } else {
    act.append(el('button', { textContent: '↩', title: 'Zurückholen', onclick: e => { e.stopPropagation(); aendern(t.id, { archiviert: false }); } }));
    act.append(el('button', { textContent: '🗑', title: 'Endgültig löschen (inkl. Dateien)', onclick: async e => {
      e.stopPropagation(); if (confirm('„' + t.titel + '“ mit allen Dateien endgültig löschen?')) { await window.api.loeschen(t.id); await laden(); } } }));
  }
  const row = el('div', { className: 'task ' + t.status, onclick: () => oeffneDetail(t.id) }, box, el('div', { className: 'txt' }, el('div', { className: 't', textContent: t.titel }), metaEl(t)), act);
  return row;
}

function cardEl(t) {
  const i = SPALTEN.findIndex(s => s[0] === t.status);
  const act = el('div', { className: 'act' });
  if (i > 0) act.append(el('button', { textContent: '◀', title: 'Eine Spalte zurück', onclick: e => { e.stopPropagation(); aendern(t.id, { status: SPALTEN[i - 1][0] }); } }));
  if (i < 2) act.append(el('button', { textContent: '▶', title: 'Eine Spalte weiter', onclick: e => { e.stopPropagation(); aendern(t.id, { status: SPALTEN[i + 1][0] }); } }));
  const c = el('div', { className: 'card ' + t.status, draggable: true, onclick: () => oeffneDetail(t.id) }, el('div', { className: 't', textContent: t.titel }), metaEl(t), act);
  c.ondragstart = e => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; };
  return c;
}

function renderBoard() {
  const b = $('board'); b.replaceChildren();
  const liste = sichtbar('board').sort(sortiere);
  for (const [st, name] of SPALTEN) {
    const items = liste.filter(t => t.status === st);
    const cards = el('div', { className: 'cards' }, ...items.map(cardEl));
    const col = el('div', { className: 'col' }, el('h3', {}, el('span', { textContent: name }), el('span', { textContent: items.length })), cards);
    col.dataset.status = st;
    col.ondragover = e => { e.preventDefault(); col.classList.add('over'); };
    col.ondragleave = () => col.classList.remove('over');
    col.ondrop = e => { e.preventDefault(); col.classList.remove('over'); const id = e.dataTransfer.getData('text/plain'), t = finde(id); if (t && t.status !== st) aendern(id, { status: st }); };
    b.append(col);
  }
}

function render() {
  if (!cfg.bereit) return;
  const nav = $('nav'); nav.replaceChildren();
  for (const [k, l] of ANSICHTEN) {
    nav.append(el('button', { className: k === ansicht ? 'on' : '', onclick: () => { ansicht = k; render(); } }, l + ' ', el('small', { textContent: sichtbar(k).length })));
  }
  optionenFilterZu($('filter'), filter); filter = $('filter').value;
  optionenWer($('filterWer'), true, filterWer); filterWer = $('filterWer').value;
  optionen($('neuZu'), 'Ohne Zuordnung', $('neuZu').value);
  optionenWer($('neuWer'), false, $('neuWer').dataset.gewaehlt ?? cfg.nutzer, $('neuZu').value);
  $('neuHeute').className = 'star' + (neuHeute ? ' on' : '');
  const board = ansicht === 'board';
  $('liste').hidden = board; $('board').hidden = !board;
  window.api.breite(board ? 900 : 400);
  if (board) renderBoard();
  else {
    const liste = sichtbar(ansicht).sort(sortiere);
    const main = $('liste'); main.replaceChildren();
    if (!liste.length) main.append(el('p', { className: 'leer', textContent: { heute: 'Nichts für heute markiert.', offen: 'Alles erledigt 🎉', erledigt: 'Noch nichts erledigt.', archiv: 'Archiv ist leer.' }[ansicht] }));
    for (const t of liste) main.append(taskEl(t));
  }
  const n = (data.eingang || []).length; $('inN').hidden = !n; $('inN').textContent = n;
  if (!$('pIn').hidden) renderEingang();
  if (detailId) refreshDetail();
}

// Benachrichtigung, wenn der andere Nutzer mir etwas zuweist.
function pruefeNeueZuweisungen() {
  const meine = new Set(data.aufgaben.filter(t => t.zugewiesenAn === cfg.nutzer && t.status !== 'done' && !t.archiviert).map(t => t.id));
  if (bekannt) {
    for (const id of meine) if (!bekannt.has(id)) {
      const t = finde(id);
      if (t && t.geaendertVon !== cfg.nutzer && typeof Notification !== 'undefined') new Notification('Neue Aufgabe von ' + t.geaendertVon, { body: t.titel });
    }
  }
  bekannt = meine;
}

async function laden() { if (!cfg.bereit) return; data = Core.filterSichtbar(await window.api.laden(), cfg.nutzer); pruefeNeueZuweisungen(); render(); }
async function aendern(id, patch) { await window.api.aendern(id, patch); await laden(); }

// ---------- Detail ----------
function oeffneDetail(id) {
  const t = finde(id); if (!t) return;
  detailId = id;
  $('dTitel').value = t.titel; $('dNotiz').value = t.notiz || '';
  $('pTask').hidden = false; refreshDetail(true);
}
function refreshDetail(erst) {
  const t = finde(detailId);
  if (!t) { detailId = null; $('pTask').hidden = true; return; }
  $('dStatus').value = t.status; $('dFaellig').value = t.faellig || ''; $('dHeute').checked = istHeute(t);
  optionenWer($('dWer'), false, t.zugewiesenAn || '', t.zuordnung); $('dWer').value = t.zugewiesenAn || '';
  optionen($('dZu'), 'Ohne Zuordnung', t.zuordnung || '');
  $('dAblegen').checked = !!t.ablegen; $('dAblage').textContent = t.ablage ? 'Dateien abgelegt in: ' + t.ablage : '';
  $('dInfo').textContent = 'Angelegt von ' + t.erstelltVon + ', zuletzt geändert von ' + t.geaendertVon + '.';
  $('dArch').textContent = t.archiviert ? 'Zurückholen' : 'Archivieren';
  const box = $('dDateien'); box.replaceChildren();
  if (!t.dateien.length) box.append(el('p', { className: 'hint', textContent: 'Noch keine Dateien.' }));
  for (const n of t.dateien) {
    box.append(el('div', { className: 'pl' }, el('span', { textContent: '📎 ' + n }),
      el('button', { textContent: '↗', title: 'Öffnen', onclick: () => window.api.dateiOeffnen(t.id, n) }),
      el('button', { textContent: '📂', title: 'Im Ordner zeigen', onclick: () => window.api.dateiZeigen(t.id, n) }),
      el('button', { textContent: '🗑', title: 'Datei löschen', onclick: async () => { if (confirm('Datei „' + n + '“ löschen?')) { await window.api.dateiLoeschen(t.id, n); await laden(); } } })));
  }
}
const feld = (id, key, wert) => { $(id).onchange = () => aendern(detailId, { [key]: wert($(id)) }); };
feld('dStatus', 'status', e => e.value); feld('dFaellig', 'faellig', e => e.value || null); feld('dWer', 'zugewiesenAn', e => e.value || null);
feld('dAblegen', 'ablegen', e => e.checked); feld('dZu', 'zuordnung', e => e.value || null); feld('dHeute', 'heute', e => e.checked ? heuteStr() : null);
$('dTitel').onchange = () => { const v = $('dTitel').value.trim(); if (v) aendern(detailId, { titel: v }); else $('dTitel').value = finde(detailId).titel; };
$('dNotiz').onchange = () => aendern(detailId, { notiz: $('dNotiz').value });
$('dAdd').onclick = async () => { await window.api.dateiWaehlen(detailId); await laden(); };
$('dOk').onclick = () => { detailId = null; $('pTask').hidden = true; };
$('dArch').onclick = async () => { const t = finde(detailId); await aendern(detailId, { archiviert: !t.archiviert }); detailId = null; $('pTask').hidden = true; };
const drop = $('dDrop');
drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
drop.ondragleave = () => drop.classList.remove('over');
drop.ondrop = async e => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files.length) { await window.api.dateiHinzu(detailId, e.dataTransfer.files); await laden(); } };
// Datei, die daneben fallen gelassen wird, soll das Fenster nicht in eine Datei-Ansicht verwandeln
for (const ev of ['dragover', 'drop']) window.addEventListener(ev, e => { if (!drop.contains(e.target)) e.preventDefault(); });

// ---------- Eingang ----------
function renderEingang() {
  const box = $('inListe'); box.replaceChildren();
  if (!data.eingang.length) box.append(el('p', { className: 'hint', textContent: 'Eingang ist leer.' }));
  const offene = data.aufgaben.filter(t => !t.archiviert && t.status !== 'done');
  for (const n of data.eingang) {
    const sel = el('select', {}, el('option', { value: '', textContent: 'Aufgabe wählen …' }), ...offene.map(t => el('option', { value: t.id, textContent: t.titel })));
    box.append(el('div', { className: 'pl', style: 'flex-wrap:wrap' },
      el('span', { textContent: '📎 ' + n }),
      el('button', { textContent: '↗', title: 'Öffnen', onclick: () => window.api.eingangOeffnen(n) }),
      el('button', { textContent: '🗑', title: 'Löschen', onclick: async () => { if (confirm('„' + n + '“ löschen?')) { await window.api.eingangLoeschen(n); await laden(); } } }),
      el('div', { className: 'row', style: 'flex:1 0 100%' }, sel,
        el('button', { className: 'go', textContent: 'Zuordnen', onclick: async () => { if (sel.value) { await window.api.eingangZuordnen(n, sel.value); await laden(); } } }),
        el('button', { className: 'go', textContent: 'Neue Aufgabe', onclick: async () => { await window.api.eingangNeu(n, { zugewiesenAn: cfg.nutzer }); await laden(); } }))));
  }
}
$('bIn').onclick = () => { if (!cfg.bereit) return; renderEingang(); $('pIn').hidden = false; };
$('inOk').onclick = () => { $('pIn').hidden = true; };

// ---------- Projekte ----------
function renderProj() {
  const box = $('projListe'); box.replaceChildren();
  if (!data.projekte.length) box.append(el('p', { className: 'hint', textContent: 'Noch keine Einträge.' }));
  for (const p of data.projekte) {
    const darf = Core.kannProjektBearbeiten(p, cfg.nutzer), alle = nutzerListe(), begrenzt = p.mitglieder && p.mitglieder.length;
    const editor = el('div', { className: 'row', style: 'flex:1 0 100%;flex-wrap:wrap;gap:10px' }); editor.hidden = true;
    for (const n of alle) {
      const cb = el('input', { type: 'checkbox', checked: !begrenzt || p.mitglieder.includes(n), disabled: n === p.besitzer });
      cb.onchange = async () => {
        const gewaehlt = [...editor.querySelectorAll('input')].filter(x => x.checked).map(x => x.dataset.n);
        await window.api.projektAendern(p.id, { mitglieder: gewaehlt.length === alle.length ? [] : gewaehlt }); await laden(); renderProj();
      };
      cb.dataset.n = n; editor.append(el('label', { style: 'flex-direction:row;gap:4px;align-items:center' }, cb, n));
    }
    const row = el('div', { className: 'pl', style: 'flex-wrap:wrap' }, el('span', { textContent: projName(p.id) }), el('i', { textContent: begrenzt ? '👥 ' + p.mitglieder.join(', ') : '👥 alle' }));
    if (darf) {
      row.append(el('button', { textContent: '👥', title: 'Wer darf dieses Projekt sehen?', onclick: () => { editor.hidden = !editor.hidden; } }),
        el('button', { textContent: '🗑', title: 'Entfernen', onclick: async () => { await window.api.projektLoeschen(p.id); await laden(); renderProj(); } }), editor);
    } else row.append(el('i', { textContent: 'von ' + p.besitzer }));
    box.append(row);
  }
}

function zeigeEinstellungen() {
  $('sName').value = cfg.nutzer || ''; $('sOrdner').value = cfg.ordner || ''; $('sErr').textContent = '';
  $('sAbbr').hidden = !cfg.bereit; $('pSet').hidden = false;
}

$('add').onsubmit = async e => {
  e.preventDefault();
  const titel = $('neuTitel').value.trim(); if (!titel) return;
  await window.api.neu({ titel, zuordnung: $('neuZu').value || null, zugewiesenAn: $('neuWer').value || null,
    faellig: $('neuFaellig').value || null, heute: neuHeute || ansicht === 'heute' ? heuteStr() : null });
  $('neuTitel').value = ''; $('neuFaellig').value = ''; delete $('neuWer').dataset.gewaehlt; neuHeute = false; await laden();
};
$('neuZu').onchange = render;
$('neuWer').onchange = () => { $('neuWer').dataset.gewaehlt = $('neuWer').value; };
$('neuHeute').onclick = () => { neuHeute = !neuHeute; render(); };
$('filter').onchange = e => { filter = e.target.value; render(); };
$('filterWer').onchange = e => { filterWer = e.target.value; render(); };
$('bClose').onclick = () => window.api.verstecken();
$('bSet').onclick = zeigeEinstellungen;
$('sAbbr').onclick = () => { $('pSet').hidden = true; };
$('sWahl').onclick = async () => { const o = await window.api.ordnerWaehlen(); if (o) $('sOrdner').value = o; };
$('sOk').onclick = async () => {
  const nutzer = $('sName').value.trim(), ordner = $('sOrdner').value.trim();
  if (!nutzer || !ordner) { $('sErr').textContent = 'Bitte Name und Ordner angeben.'; return; }
  cfg = await window.api.configSetzen({ nutzer, ordner });
  if (!cfg.bereit) { $('sErr').textContent = 'Ordner nicht beschreibbar.'; return; }
  $('pSet').hidden = true; bekannt = null; await laden();
};
$('bProj').onclick = () => { if (!cfg.bereit) return; renderProj(); $('pProj').hidden = false; };
$('pOk').onclick = () => { $('pProj').hidden = true; render(); };
$('pAdd').onclick = async () => {
  const name = $('pName').value.trim(); if (!name) return;
  await window.api.projektNeu({ name, typ: $('pTyp').value }); $('pName').value = ''; await laden(); renderProj();
};
$('pName').onkeydown = e => { if (e.key === 'Enter') $('pAdd').click(); };

(async () => {
  cfg = await window.api.config();
  window.api.beiAenderung(laden);
  window.addEventListener('focus', laden);
  if (cfg.bereit) await laden(); else zeigeEinstellungen();
})();
