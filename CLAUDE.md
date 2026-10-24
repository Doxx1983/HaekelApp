# Hinweise für Claude

Sammlung kleiner Web-Apps ohne Build: Startseite `index.html`, je App ein Ordner (`anleitung/`, `zaehler/`, `grid/`), Gemeinsames in `shared/`. Details: `README.md`.

- Sprache mit der Nutzerin und im UI: Deutsch, kurz und präzise.
- Das Design folgt dem Isadody-CD (Tokens in `shared/isadody.css`). Logo nicht einfärben oder verzerren.
- Änderungen testen: Parser mit `node` an Beispielzeilen aus `beispiele/`, UI mit Playwright (Chromium liegt unter `/opt/pw-browsers/chromium`).
- Entwicklungsbranch pushen; `main` nur auf ausdrückliche Anweisung aktualisieren (Fast-Forward, `main` speist GitHub Pages).
