// Offline-Nutzung: meldet den Service Worker (sw.js im Hauptordner) an, der alle Dateien der Sammlung im Gerät ablegt.
(() => {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const sw = new URL('../sw.js', document.currentScript.src);
  addEventListener('load', () => navigator.serviceWorker.register(sw).catch(() => {}));
})();
