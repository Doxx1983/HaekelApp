'use strict';
const $ = id => document.getElementById(id);
const heuteStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

let cfg = {}, data = { aufgaben: [], projekte: [] }, ansicht = 'heute', filter = '', neuHeute = false;

const ANSICHTEN = [['heute', 'Heute'], ['offen', 'Offen'], ['erledigt', 'Erledigt'], ['archiv', 'Archiv']];

const istHeute = t => t.heute === heuteStr();
const passt = {
  heute: t => !t.archiviert && istHeute(t),
  offen: t => !t.archiviert && !t.erledigt,
  erledigt: t => !t.archiviert && t.erledigt,
  archiv: t => t.archiviert,
};

function el(tag, props = {}, ...kids) {
  const e = Object.assign(document.createElement(tag), props);
  for (const k of kids) e.append(k);
  return e;
}

function projName(id) { const p = data.projekte.find(x => x.id === id); return p ? (p.typ === 'chat' ? '💬 ' : '📁 ') + p.name : null; }

function optionen(sel, mitAlle, aktuell) {
  sel.replaceChildren();
  if (mitAlle) sel.append(el('option', { value: '', textContent: 'Alle' }), el('option', { value: '-', textContent: 'Ohne Zuordnung' }));
  else sel.append(el('option', { value: '', textContent: 'Ohne Zuordnung' }));
  for (const p of data.projekte) sel.append(el('option', { value: p.id, textContent: projName(p.id) }));
  sel.value = [...sel.options].some(o => o.value === aktuell) ? aktuell : '';
}

function renderNav() {
  const nav = $('nav'); nav.replaceChildren();
  for (const [k, l] of ANSICHTEN) {
    const n = data.aufgaben.filter(passt[k]).filter(zuordnungOk).length;
    const b = el('button', { className: k === ansicht ? 'on' : '', onclick: () => { ansicht = k; render(); } }, l + ' ', el('small', { textContent: n }));
    nav.append(b);
  }
}

function zuordnungOk(t) { return filter === '' || (filter === '-' ? !t.zuordnung : t.zuordnung === filter); }

function taskEl(t) {
  const done = t.erledigt;
  const box = el('button', { className: 'box', textContent: done ? '✓' : '', title: done ? 'Wieder öffnen' : 'Abhaken',
    onclick: () => aendern(t.id, { erledigt: !done }) });
  const titel = el('div', { className: 't', textContent: t.titel, title: 'Doppelklick zum Bearbeiten' });
  titel.ondblclick = () => {
    const inp = el('input', { type: 'text', className: 'edit', value: t.titel });
    const fertig = save => { if (save && inp.value.trim() && inp.value.trim() !== t.titel) aendern(t.id, { titel: inp.value.trim() }); else render(); };
    inp.onkeydown = e => { if (e.key === 'Enter') fertig(true); if (e.key === 'Escape') fertig(false); };
    inp.onblur = () => fertig(true);
    titel.replaceWith(inp); inp.focus(); inp.select();
  };
  const meta = el('div', { className: 'meta' });
  const pn = projName(t.zuordnung); if (pn) meta.append(el('span', { className: 'tag', textContent: pn }));
  if (t.erstelltVon) meta.append(el('span', { textContent: 'von ' + t.erstelltVon }));
  const act = el('div', { className: 'act' });
  if (!t.archiviert) {
    act.append(el('button', { className: 'heute' + (istHeute(t) ? ' on' : ''), textContent: istHeute(t) ? '★' : '☆', title: 'Für heute',
      onclick: () => aendern(t.id, { heute: istHeute(t) ? null : heuteStr() }) }));
    act.append(el('button', { textContent: '🗄', title: 'Archivieren', onclick: () => aendern(t.id, { archiviert: true }) }));
  } else {
    act.append(el('button', { textContent: '↩', title: 'Zurückholen', onclick: () => aendern(t.id, { archiviert: false }) }));
    act.append(el('button', { textContent: '🗑', title: 'Endgültig löschen', onclick: async () => { if (confirm('„' + t.titel + '“ endgültig löschen?')) { await window.api.loeschen(t.id); await laden(); } } }));
  }
  return el('div', { className: 'task' + (done ? ' done' : '') }, box, el('div', { className: 'txt' }, titel, meta), act);
}

function render() {
  if (!cfg.bereit) return;
  renderNav();
  optionen($('filter'), true, filter); filter = $('filter').value;
  const prev = $('neuZu').value; optionen($('neuZu'), false, prev);
  $('neuHeute').className = 'star' + (neuHeute ? ' on' : '');
  const liste = data.aufgaben.filter(passt[ansicht]).filter(zuordnungOk)
    .sort((a, b) => (a.erledigt - b.erledigt) || (b.erstelltAm || '').localeCompare(a.erstelltAm || ''));
  const main = $('liste'); main.replaceChildren();
  if (!liste.length) main.append(el('p', { className: 'leer', textContent: { heute: 'Nichts für heute markiert.', offen: 'Alles erledigt 🎉', erledigt: 'Noch nichts erledigt.', archiv: 'Archiv ist leer.' }[ansicht] }));
  for (const t of liste) main.append(taskEl(t));
  const sichtbar = $('liste').scrollTop; main.scrollTop = sichtbar;
}

async function laden() { if (!cfg.bereit) return; data = await window.api.laden(); render(); }
async function aendern(id, patch) { await window.api.aendern(id, patch); await laden(); }

function renderProj() {
  const box = $('projListe'); box.replaceChildren();
  if (!data.projekte.length) box.append(el('p', { className: 'hint', textContent: 'Noch keine Einträge.' }));
  for (const p of data.projekte) {
    box.append(el('div', { className: 'pl' }, el('span', { textContent: projName(p.id) }), el('i', { textContent: p.typ }),
      el('button', { textContent: '🗑', title: 'Entfernen', onclick: async () => { await window.api.projektLoeschen(p.id); await laden(); renderProj(); } })));
  }
}

function zeigeEinstellungen() {
  $('sName').value = cfg.nutzer || ''; $('sOrdner').value = cfg.ordner || ''; $('sErr').textContent = '';
  $('sAbbr').hidden = !cfg.bereit; $('pSet').hidden = false;
}

$('add').onsubmit = async e => {
  e.preventDefault();
  const titel = $('neuTitel').value.trim(); if (!titel) return;
  await window.api.neu({ titel, zuordnung: $('neuZu').value || null, heute: neuHeute || ansicht === 'heute' ? heuteStr() : null });
  $('neuTitel').value = ''; neuHeute = false; await laden();
};
$('neuHeute').onclick = () => { neuHeute = !neuHeute; render(); };
$('filter').onchange = e => { filter = e.target.value; render(); };
$('bClose').onclick = () => window.api.verstecken();
$('bSet').onclick = zeigeEinstellungen;
$('sAbbr').onclick = () => { $('pSet').hidden = true; };
$('sWahl').onclick = async () => { const o = await window.api.ordnerWaehlen(); if (o) $('sOrdner').value = o; };
$('sOk').onclick = async () => {
  const nutzer = $('sName').value.trim(), ordner = $('sOrdner').value.trim();
  if (!nutzer || !ordner) { $('sErr').textContent = 'Bitte Name und Ordner angeben.'; return; }
  cfg = await window.api.configSetzen({ nutzer, ordner });
  if (!cfg.bereit) { $('sErr').textContent = 'Ordner nicht beschreibbar.'; return; }
  $('pSet').hidden = true; await laden();
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
