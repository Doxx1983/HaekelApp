# Hinweise für Claude

Kleine Web-App ohne Build, alles in `index.html`. Details und Funktionen: `README.md`.

- Sprache mit der Nutzerin und im UI: Deutsch, kurz und präzise.
- Das Design folgt dem Isadody-CD (Tokens als CSS-Variablen am Anfang von `index.html`). Logo nicht einfärben oder verzerren.
- Änderungen testen: Parser mit `node` an Beispielzeilen aus `beispiele/`, UI mit Playwright (Chromium liegt unter `/opt/pw-browsers/chromium`).
- Entwicklungsbranch pushen; `main` nur auf ausdrückliche Anweisung aktualisieren (Fast-Forward, `main` speist GitHub Pages).
