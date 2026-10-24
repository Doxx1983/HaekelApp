# Isadody Häkelhelfer

Web-App für unterwegs: Häkelanleitung laden, dann zeigt die App immer nur die nächsten Maschen (max. 8 Kacheln), mit großem „Weiter“-Button und kleinem „Zurück“. Die aktuelle Reihe steht oben links.

Live: https://doxx1983.github.io/haekelapp/ (GitHub Pages, Branch `main`, Ordner `/`)

## Funktionen

- **Anleitung laden** als `.txt`-Datei oder eingefügter Text. Anleitung, Position und Fortschritt bleiben im Browser (`localStorage`) gespeichert.
- **Deutsch und Englisch:** Reihen beginnen mit `R`, `Row`, `Reihe`, `Runde`, `Round`, `Rnd` + Nummer. Kürzel (`fM`, `Stb`, `sc`, `dc`, `bs` …) werden unverändert angezeigt.
- **Wiederholungen:** `(fM, Zun) x 6`, `(3 fM, Abn) 5x`, Anzahl vor dem Kürzel (`254sc`, `6 fM`).
- **Anzeige:** Folgen von bis zu 3 gleichen Maschen als einzelne Kacheln, ab 4 gleichen als eine Kachel „10× fM“ (`SINGLE_MAX` in `index.html`). Max. 8 Kacheln pro Seite (`MAX_CHIPS`).
- **Garnfarben:** `Use color A`, `Farbe B`, `Wechsel zu Farbe C:` setzen die Farbe ab dieser Stelle, auch mitten in der Reihe, und gelten bis zum nächsten Wechsel (auch über Reihen hinweg). Farben werden vorher in der App festgelegt (Palette, Regler, Hex). Gleiche Maschen in verschiedenen Farben werden nicht zusammengefasst.
- **Fortschritt:** Tipp auf eine Kachel = diese und alle vorigen in der Reihe werden blass. Tipp auf eine blasse Kachel = Rücksetzen dieser und aller folgenden, mit Bestätigung.
- **Corporate Design:** Isadody-CD (Papierton, Coral, Baloo 2 + Nunito, runde Buttons, gestrichelte „Naht“ in den Kacheln, Logo oben links).

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | die ganze App (HTML, CSS, JavaScript), keine Build-Schritte, keine Abhängigkeiten |
| `logo.png` | Isadody-Logo (aus dem Design-System-Artefakt „Isadody“), nicht einfärben, Höhe mind. 64 px |
| `beispiele/` | Beispielanleitungen zum Testen |

Wichtige Stellen in `index.html`: `parse` / `expand` / `chipsOf` (Anleitung → Kacheln), `render` (Anzeige), `renderColorPickers` (Farbauswahl), `fitSeams` (gleichmäßige Nahtstriche).

## Entwickeln und testen

Einfach `index.html` im Browser öffnen. Der Parser läuft auch ohne Browser (Funktionen am Dateianfang des Skripts). Veröffentlichen: auf `main` pushen, Pages aktualisiert sich selbst.

## Entscheidungen

- Eigene Farbauswahl statt `<input type="color">`, weil der in installierten Apps nicht überall funktioniert.
- Kein Dunkelmodus, weil das CD nur ein helles Thema kennt.
- Text auf Coral-Buttons in Schwarzbraun (Kontrast), nie Akzentfarben für Text.

## Offene Ideen

- Offline-Betrieb (Service Worker) und Web-App-Manifest mit Symbol für „Zum Startbildschirm“.
- Anleitungen als PDF oder Foto einlesen.
- Mehrere Anleitungen speichern und umschalten.
- Einzelne Maschen einer Gruppe („13× dc“) abhaken.

## Grid-Ersteller (`grid/`)

Bild laden, Breite (Maschen), Höhe (Reihen) und Farbanzahl wählen → Raster für Tapestry-Häkeln mit Farblegende und Anweisungen je Reihe.

- **Farbreduktion** im Lab-Farbraum: k-means mit vielen Gruppen, dann ähnlichste Gruppen (Ward) zusammenlegen; kleine, deutlich andere Flächen bleiben so erhalten. Optional werden Einzelmaschen geglättet.
- **Richtung:** Reihe 1 unten, Rechtshänder beginnen rechts; in Reihen abwechselnd, in Runden immer gleich. „Linkshändig“ spiegelt das.
- **Bearbeiten:** Farben der Legende ändern (Palette, Hex), einzelne Maschen malen, Rückgängig.
- **Ausgabe:** Raster als PNG, Anleitung als Text/.txt, „Im Häkelhelfer öffnen“ schreibt die Anleitung (`Reihe n: Farbe A, 5 fM, …`) samt Farben in den Speicher von `anleitung/`.
- Gespeichert unter `grid.state` und `grid.src` (verkleinertes Bild). Kernfunktionen (`quantize`, `despeckle`, `instructions`, `toHelper`) laufen auch mit `node`.
