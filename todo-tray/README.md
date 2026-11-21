# Isadody Aufgaben (Windows-Tray)

Kleine To-do-App im Windows-Infobereich (Tray-Symbol unten rechts). Electron, Isadody-CD.

## Funktionen
- Aufgaben anlegen, abhaken, archivieren (Archiv: zurückholen oder endgültig löschen). Klick auf eine Aufgabe öffnet die Details (Titel, Notiz, Status, Fälligkeit, Zuständigkeit, Dateien).
- **Zuständig:** Aufgaben lassen sich dir selbst oder dem anderen Nutzer zuweisen; Filter „Zuständig“. Weist der andere dir etwas zu, kommt eine Windows-Benachrichtigung.
- **Fälligkeit:** Datum pro Aufgabe, überfällige sind rot markiert, Sortierung nach Fälligkeit.
- **Kanban-Board** (Reiter „Board“, Fenster wird breiter): Zu tun / In Arbeit / Fertig. Karten per Drag-and-drop oder ◀ ▶ verschieben.
- **Dateiablage:** Dateien pro Aufgabe per Drag-and-drop oder „auswählen“. Sie werden in den gemeinsamen Ordner kopiert (`dateien/<id>/`), liegen also im Google Drive und sind für beide sichtbar. Öffnen, im Ordner zeigen, löschen.
- **Für heute** (★): gilt nur für den Tag der Markierung, am nächsten Tag fällt sie automatisch weg.
- **Zuordnung** zu Projekten oder Chats (Liste unter ☰ pflegen), Filter nach Zuordnung.
- **Zwei Nutzer:** beide wählen denselben Ordner (Google-Drive-Desktop oder Netzwerkfreigabe). Änderungen erscheinen automatisch (Ordner-Überwachung + Prüfung alle 5 s).
- Tray: Linksklick öffnet/schließt, Rechtsklick: „Mit Windows starten“, „Beenden“.

## Installieren (Windows)
1. Node.js (LTS) installieren.
2. In diesem Ordner: `npm install`, dann `npm start` zum Ausprobieren.
3. Als einzelne Datei bauen: `npm run dist` → `dist/Isadody Aufgaben *.exe` (portabel), auf beide Rechner kopieren.
4. Beim ersten Start Name und gemeinsamen Ordner wählen (⚙). Einstellungen liegen lokal pro Rechner.

## Datenformat (im gemeinsamen Ordner)
```
<Ordner>/projekte.json        { "projekte": [ { "id", "name", "typ": "projekt"|"chat" } ] }
<Ordner>/nutzer.json          { "nutzer": ["Anna", "Ben"] }   (trägt sich beim ersten Start selbst ein)
<Ordner>/dateien/<id>/...     Anhänge der Aufgabe <id>
<Ordner>/aufgaben/<id>.json   eine Datei pro Aufgabe
```
Aufgabe:
```json
{ "id": "abc-123", "titel": "Garn bestellen", "notiz": "", "status": "todo|doing|done", "erledigt": false, "erledigtAm": null,
  "archiviert": false, "heute": "2026-11-21", "faellig": "2026-12-01", "zugewiesenAn": "Ben", "zuordnung": "<projekt-id>|null",
  "erstelltVon": "Anna", "erstelltAm": "ISO", "geaendertVon": "Ben", "geaendertAm": "ISO" }
```
Eine Datei pro Aufgabe + Teiländerungen (nur geänderte Felder werden neu geschrieben) vermeiden Konflikte. Dateien mit Namen wie `abc (1).json` (Drive-Konfliktkopien) oder unvollständige JSON werden ignoriert.

Beim Ändern per Hand/Claude: `status` und `erledigt` zusammen setzen (`done` = `erledigt: true`). Die App ergänzt fehlende Felder selbst.

Claude kann die Dateien über den Drive-Connector lesen und ändern: Felder bearbeiten oder neue `aufgaben/<id>.json` anlegen (ID: nur `a-z 0-9 -`, Dateiname = `id`).

## Tests
`npm test` (Speicher-Logik, ohne Electron). Oberfläche: `test/ui.test.js` (Playwright).
