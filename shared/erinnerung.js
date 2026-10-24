// Erinnerung an die Sicherung, in allen Apps. Braucht store.js; nutzt MusterDB, wenn eingebunden.
// Erinnerung.status() → { text, warn }; warn = nie oder vor 14 Tagen gesichert, und es gibt etwas zu sichern.
// In den Apps zeigt Erinnerung.hint() dann unter dem Kopf einen Hinweis mit Link zur Sicherung auf der Startseite.
const Erinnerung = (() => {
  const DAYS = 14;
  const len = v => Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0;
  async function status() {
    const last = Store('sicherung').get('last', 0), days = last ? Math.floor((Date.now() - last) / 864e5) : -1, a = Store('anleitung');
    let has = len(a.get('projects', null)) > 0 || !!a.get('pattern', '') || len(Store('zaehler').get('counters', null)) > 0 || !!Store('grid').get('state', null) || len(Store('lexikon').get('fav', [])) > 0;
    if (!has && typeof MusterDB !== 'undefined') try { has = (await MusterDB.all()).length > 0; } catch {}
    const text = !last ? 'Noch keine Sicherung' : days === 0 ? 'Letzte Sicherung: heute' : days === 1 ? 'Letzte Sicherung: gestern' : `Letzte Sicherung vor ${days} Tagen`;
    return { text, warn: has && (!last || days >= DAYS) };
  }
  // „Später“ blendet den Hinweis bis zum Schließen des Tabs aus
  async function hint(home = '../') {
    try { if (sessionStorage.getItem('sicherung.later')) return; } catch {}
    const s = await status(); if (!s.warn) return;
    const d = document.createElement('div'); d.className = 'backup-hint'; d.setAttribute('role', 'status');
    d.innerHTML = '<p><b></b> Deine Daten liegen nur in diesem Browser.</p><div><a class="small" href="">Jetzt sichern</a><button class="small" type="button">Später</button></div>';
    d.querySelector('b').textContent = s.text + '.';
    d.querySelector('a').href = home + '#daten';
    d.querySelector('button').onclick = () => { try { sessionStorage.setItem('sicherung.later', '1'); } catch {} d.remove(); };
    const h = document.querySelector('header'); h ? h.after(d) : document.body.prepend(d);
  }
  return { status, hint };
})();
