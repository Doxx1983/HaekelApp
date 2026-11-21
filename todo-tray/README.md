# To-Dos (Windows-Tray)

Kleine To-do-App im Windows-Infobereich (Tray-Symbol unten rechts). Electron. Klassisches, aufgeräumtes Design mit Hell/Dunkel (Knopf oben rechts: Auto → Hell → Dunkel, wird pro Gerät gemerkt).

## Funktionen
- Aufgaben anlegen, abhaken, archivieren (Archiv: zurückholen oder endgültig löschen). Klick auf eine Aufgabe öffnet die Details (Titel, Notiz, Status, Fälligkeit, Zuständigkeit, Dateien).
- **Zuständig:** Aufgaben lassen sich dir selbst oder dem anderen Nutzer zuweisen; Filter „Zuständig“. Weist der andere dir etwas zu, kommt eine Windows-Benachrichtigung.
- **Fälligkeit:** Datum pro Aufgabe, überfällige sind rot markiert, Sortierung nach Fälligkeit.
- **Kanban-Board** (Reiter „Board“, Fenster wird breiter): Zu tun / In Arbeit / Fertig. Karten per Drag-and-drop oder ◀ ▶ verschieben.
- **Dateiablage:** Dateien pro Aufgabe per Drag-and-drop oder „auswählen“. Sie werden in den gemeinsamen Ordner kopiert (`dateien/<id>/`), liegen also im Google Drive und sind für beide sichtbar. Öffnen, im Ordner zeigen, löschen.
- **Für heute** (★): gilt nur für den Tag der Markierung, am nächsten Tag fällt sie automatisch weg.
- **Zuordnung** zu Projekten oder Chats (Liste unter ☰ pflegen), Filter nach Zuordnung.
- **Zwei Nutzer:** beide wählen denselben Ordner (Google-Drive-Desktop oder Netzwerkfreigabe). Änderungen erscheinen automatisch (Ordner-Überwachung + Prüfung alle 5 s).
- **Eingang (📥) für Handy-Fotos:** Fotos/Dateien mit der Google-Drive-App des Handys in `eingang/` hochladen (Drive-App: „+“ → Hochladen, oder Foto → Teilen → Drive). In der App ordnest du sie einer Aufgabe zu oder machst daraus eine neue Aufgabe; die Datei wandert dabei nach `dateien/<id>/`.
- Tray: Linksklick öffnet/schließt, Rechtsklick: „Mit Windows starten“, „Beenden“.

## Installieren (Windows)
1. Node.js (LTS) installieren.
2. In diesem Ordner: `npm install`, dann `npm start` zum Ausprobieren.
3. Als einzelne Datei bauen: `npm run dist` → `dist/To-Dos *.exe` (portabel), auf beide Rechner kopieren.
4. Beim ersten Start Name und gemeinsamen Ordner wählen (⚙). Einstellungen liegen lokal pro Rechner.

## Einsortieren (Claude legt Dateien ab)
In den Aufgabendetails gibt es das Häkchen **„Zum Einsortieren vormerken“** (`ablegen: true`, am besten bei erledigten Aufgaben). Auf Zuruf („sortier die vorgemerkten Aufgaben ein“) geht Claude so vor:
1. Alle Aufgaben mit `ablegen: true` aus `aufgaben/` lesen.
2. Die Dateien aus `dateien/<id>/` verschieben nach `archiv/<Projekt oder Chat>/<Aufgabentitel>/` (ohne Zuordnung: `archiv/Sonstiges/...`). Nur verschieben, nie löschen. Bei Unklarheit nachfragen.
3. In der Aufgabe `ablegen: false`, `ablage: "archiv/…/…"` setzen (die App zeigt „Dateien abgelegt in: …“) und die Aufgabe archivieren (`archiviert: true`).

## Projekte, Chats und Sichtbarkeit
- Unter ☰ legst du beliebige Einträge an (Typ Projekt oder Chat), auch eigene wie „Garten“ oder „Haus“, unabhängig von Claude-Projekten.
- Mit 👥 legst du fest, wer ein Projekt sehen darf (nichts angehakt = alle). Nur der Besitzer (wer es angelegt hat) kann das ändern oder das Projekt löschen und bleibt immer Mitglied. Nicht-Mitglieder sehen Projekt und zugehörige Aufgaben nicht, und „Zuständig“ bietet nur Mitglieder an. Aufgaben ohne Projekt sind für alle sichtbar.
- **Achtung: das ist nur eine Sichtbarkeit in der App, kein Schutz.** Alle mit Zugriff auf den Drive-Ordner können Aufgaben-JSONs und Dateien in Drive lesen (ebenso Claude). Für echte Trennung bräuchte jedes Projekt einen eigenen Drive-Ordner mit eigener Freigabe (mögliche spätere Ausbaustufe).
- Der Eingang (`eingang/`) ist nicht pro Projekt getrennt.

## Mehrere Geräte und Nutzer
- Ein Nutzer = ein Name (exakt gleich geschrieben) auf allen eigenen Geräten. Die Daten liegen im Drive-Ordner, pro Gerät wird nur Name und Ordnerpfad gespeichert.
- Weitere Nutzer: Ordner für das Google-Konto freigeben (Bearbeiter), als Testnutzer in der Google Auth Platform eintragen (bis 100), App installieren, Namen wählen. Der Name erscheint danach automatisch in `nutzer.json` und in allen Auswahllisten.

## Handy (PWA)
Im Ordner `pwa/`: Web-App für Android/iPhone, spricht direkt mit der Google-Drive-API (gleiche Daten wie die Windows-App, Fotos direkt an Aufgaben). Einrichtung: `PWA-EINRICHTUNG.md`.

## Datenformat (im gemeinsamen Ordner)
```
<Ordner>/projekte.json        { "projekte": [ { "id", "name", "typ": "projekt"|"chat", "besitzer": "Anna", "mitglieder": [] } ] }   (mitglieder leer = alle)
<Ordner>/nutzer.json          { "nutzer": ["Anna", "Ben"] }   (trägt sich beim ersten Start selbst ein)
<Ordner>/dateien/<id>/...     Anhänge der Aufgabe <id>
<Ordner>/eingang/             Dateien vom Handy, noch ohne Aufgabe
<Ordner>/archiv/<Projekt>/<Aufgabe>/   einsortierte Dateien erledigter Aufgaben
<Ordner>/aufgaben/<id>.json   eine Datei pro Aufgabe
```
Aufgabe:
```json
{ "id": "abc-123", "titel": "Garn bestellen", "notiz": "", "status": "todo|doing|done", "erledigt": false, "erledigtAm": null,
  "archiviert": false, "heute": "2026-11-21", "ablegen": false, "ablage": null, "faellig": "2026-12-01", "zugewiesenAn": "Ben", "zuordnung": "<projekt-id>|null",
  "erstelltVon": "Anna", "erstelltAm": "ISO", "geaendertVon": "Ben", "geaendertAm": "ISO" }
```
Eine Datei pro Aufgabe + Teiländerungen (nur geänderte Felder werden neu geschrieben) vermeiden Konflikte. Dateien mit Namen wie `abc (1).json` (Drive-Konfliktkopien) oder unvollständige JSON werden ignoriert.

Beim Ändern per Hand/Claude: `status` und `erledigt` zusammen setzen (`done` = `erledigt: true`). Die App ergänzt fehlende Felder selbst.

Claude kann die Dateien über den Drive-Connector lesen und ändern: Felder bearbeiten oder neue `aufgaben/<id>.json` anlegen (ID: nur `a-z 0-9 -`, Dateiname = `id`).

## Tests
`npm test` (Speicher-Logik, ohne Electron). Mit Playwright: `test/ui.test.js` (Windows-Oberfläche), `test/pwa.test.js` (PWA gegen nachgebautes Drive).
Gemeinsamer Kern: `shared/core.js` (Kopie in `pwa/core.js`, Abgleich mit `npm run sync`).
