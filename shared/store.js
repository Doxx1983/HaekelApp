// Gespeicherte Daten pro App. Alle Apps liegen auf derselben Adresse und teilen sich localStorage,
// darum bekommt jeder Schlüssel den App-Namen als Präfix: Store('zaehler').set('n', 3) → "zaehler.n".
// Browser bitten, gespeicherte Daten nicht automatisch zu löschen (wirkt nicht überall, z. B. nicht in Safari)
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {}
// Speicher voll: einmal pro Seitenaufruf deutlich melden, statt still nichts mehr zu speichern
function storeFull() {
  if (storeFull.shown) return; storeFull.shown = true;
  const msg = 'Der Speicher im Browser ist voll. Neue Änderungen werden nicht gespeichert. Bitte auf der Startseite eine Sicherung herunterladen und alte Projekte oder Muster löschen.';
  setTimeout(() => (typeof Dialog !== 'undefined' ? Dialog.alert(msg, { title: 'Speicher voll' }) : alert(msg)));
}
function Store(app) {
  const k = key => `${app}.${key}`;
  return {
    get(key, def) { try { const v = localStorage.getItem(k(key)); return v === null ? def : JSON.parse(v); } catch { return def; } },
    set(key, val) {
      try { localStorage.setItem(k(key), JSON.stringify(val)); return true; }
      catch (e) { if (e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22)) storeFull(); return false; }
    },
    remove(key) { try { localStorage.removeItem(k(key)); } catch {} },
    // einmalig alte Schlüssel ohne Präfix übernehmen (Originale bleiben liegen); Klartext wird als JSON-Text gespeichert
    migrate(oldKeys) {
      try {
        if (localStorage.getItem(k('migrated'))) return;
        for (const o of oldKeys) {
          let v = localStorage.getItem(o); if (v === null || localStorage.getItem(k(o)) !== null) continue;
          try { JSON.parse(v); } catch { v = JSON.stringify(v); }
          localStorage.setItem(k(o), v);
        }
        localStorage.setItem(k('migrated'), '1');
      } catch {}
    },
  };
}
