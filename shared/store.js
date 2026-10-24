// Gespeicherte Daten pro App. Alle Apps liegen auf derselben Adresse und teilen sich localStorage,
// darum bekommt jeder Schlüssel den App-Namen als Präfix: Store('zaehler').set('n', 3) → "zaehler.n".
function Store(app) {
  const k = key => `${app}.${key}`;
  return {
    get(key, def) { try { const v = localStorage.getItem(k(key)); return v === null ? def : JSON.parse(v); } catch { return def; } },
    set(key, val) { try { localStorage.setItem(k(key), JSON.stringify(val)); } catch {} },
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
