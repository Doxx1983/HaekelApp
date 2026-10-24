// Bildschirm beim Häkeln wach halten (Screen Wake Lock), solange die Seite sichtbar ist. Ohne Unterstützung passiert nichts.
(() => {
  if (!('wakeLock' in navigator)) return;
  let lock = null;
  const get = async () => {
    if (lock || document.visibilityState !== 'visible') return;
    try { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } catch {}
  };
  document.addEventListener('visibilitychange', get); // nach dem Zurückwechseln neu anfordern
  addEventListener('pointerdown', get, { passive: true }); // manche Browser erlauben es erst nach einer Berührung
  get();
})();
