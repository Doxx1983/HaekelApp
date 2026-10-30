// Erinnerung an die Sicherung, in allen Apps. Braucht store.js; nutzt MusterDB, wenn eingebunden.
// Erinnerung.status() → { text, warn }; warn = nie oder vor 14 Tagen gesichert, und es gibt etwas zu sichern.
// Erinnerung.hint() zeigt dann am unteren Rand „Sicherung erstellen“.
const Erinnerung = (() => {
  const DAYS = 14;
  const len = v => Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0;
  async function status() {
    const last = Store('sicherung').get('last', 0), days = last ? Math.floor((Date.now() - last) / 864e5) : -1, a = Store('anleitung');
    let has = len(a.get('projects', null)) > 0 || !!a.get('pattern', '') || len(Store('zaehler').get('counters', null)) > 0 || !!Store('grid').get('state', null) || len(Store('lexikon').get('fav', [])) > 0 || len(Store('stoppuhr').get('t', null)) > 0;
    if (!has && typeof MusterDB !== 'undefined') try { has = (await MusterDB.all()).length > 0; } catch {}
    const text = !last ? 'Noch keine Sicherung' : days === 0 ? 'Letzte Sicherung: heute' : days === 1 ? 'Letzte Sicherung: gestern' : `Letzte Sicherung vor ${days} Tagen`;
    return { text, warn: has && (!last || days >= DAYS) };
  }
  // Fette Coral-Zeile am unteren Rand. In den Apps Link zur Sicherung auf der Startseite, dort (save) direkt sichern.
  async function hint(home = '../', save) {
    document.querySelectorAll('.backup-hint').forEach(e => e.remove());
    const s = await status(); if (!s.warn) return;
    const a = document.createElement('a'); a.className = 'backup-hint'; a.textContent = 'Sicherung erstellen';
    a.title = s.text; a.href = home + '#daten';
    if (save) a.onclick = e => { e.preventDefault(); save(); };
    document.body.append(a);
  }
  return { status, hint };
})();
