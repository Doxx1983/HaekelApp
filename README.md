# Isadody Häkel-Apps

Sammlung kleiner Web-Apps fürs Häkeln. Die Startseite (`/index.html`) verlinkt alle Apps; jede App läuft auch für sich unter ihrer eigenen Adresse.

| Ordner | App |
|---|---|
| `anleitung/` | Häkelhelfer (unten beschrieben) |
| `zaehler/` | Reihenzähler im Pop-it-Stil |
| `grid/` | Grid-Ersteller: Bild → Tapestry-Muster |
| `muster/` | Mustersammlung: Bilder, PDFs, Word, Texte ablegen, taggen, suchen |
| `shared/` | gemeinsam: `isadody.css` (CD-Tokens, Schriften, Grundstil, `.logo`, `.small`, `.btn`, `.home`), `store.js` (`Store('<app>')` speichert unter `<app>.<key>`), `muster-db.js` (Zugriff auf die Sammlung), `doctext.js` (Dateiformate, Text aus .docx/.odt), `hilfe.css` (Hilfeseiten), `logo.png` |

Hilfe: jede App hat `hilfe/index.html` (bindet `../../shared/isadody.css` und `../../shared/hilfe.css` ein, Link „‹ Zur App“) und im Kopf einen runden Knopf `<a class="help" href="hilfe/">?</a>` (in `.tools` neben dem Kopfknopf). Neue Funktion = Hilfeseite mitpflegen.

Neue App: eigener Ordner mit `index.html`, bindet `../shared/isadody.css` und `../shared/store.js` ein, Logo `../shared/logo.png`, Link `<a class="home" href="../">‹ Alle Apps</a>`, Karte auf der Startseite eintragen, Hilfeseite anlegen. Kein Build.

## Mustersammlung (`muster/`)

- **Ablegen:** Bilder, PDFs, Word (`.docx`, `.doc`), LibreOffice (`.odt`) und `.txt`-Dateien über „+ Muster“ (mehrere auf einmal, am Computer auch per Ziehen) oder Text einfügen.
- **Ordnen:** Name, Tags (Enter oder Komma, Vorschläge aus vorhandenen Tags), Notizen, Favorit. Übersicht mit Suche (Name, Tags, Notizen, Textinhalt), Tag-Filtern (mehrere = alle müssen passen), „★ Favoriten“, Sortierung Neueste/A–Z.
- **Speicher:** IndexedDB `isadody-muster` (Dateien als Blob, Bilder mit kleinem Vorschaubild), Filter im Store `muster.*`. Die App bittet den Browser per `navigator.storage.persist()`, die Daten nicht automatisch zu löschen.
- **Sicherung:** „Sicherung herunterladen“ erzeugt eine JSON-Datei mit allen Mustern (Dateien als Base64), „Sicherung einspielen“ fügt fehlende Muster hinzu (gleiche ID wird übersprungen).
- **Häkelhelfer:** Textmuster lassen sich mit „Im Häkelhelfer öffnen“ direkt dort starten (schreibt `anleitung.pattern`; Fortschritt wird nur bei anderem Text zurückgesetzt).
- Aus `.docx` und `.odt` liest die App den Text (eigener ZIP-Leser mit `DecompressionStream`, keine Bibliothek): Vorschau, Suche im Inhalt und „Im Häkelhelfer öffnen“. Alte `.doc` werden nur gespeichert und heruntergeladen.
- PDFs werden am Computer eingebettet angezeigt, auf dem Handy per „PDF öffnen“.

## Häkelhelfer (`anleitung/`)

Web-App für unterwegs: Häkelanleitung laden, dann zeigt die App immer nur die nächsten Maschen (max. 8 Kacheln), mit großem „Weiter“-Button und kleinem „Zurück“. Die aktuelle Reihe steht oben links.

Live: https://doxx1983.github.io/haekelapp/anleitung/ (Startseite: https://doxx1983.github.io/haekelapp/, GitHub Pages, Branch `main`, Ordner `/`)

## Funktionen

- **Anleitung laden** aus der Mustersammlung (Liste der Textmuster mit Suche und Tags; Bilder, PDFs und alte .doc fehlen dort), als Datei (dieselben Formate wie die Sammlung; Text aus `.txt`, `.docx`, `.odt`) oder als eingefügter Text. Anleitung, Position und Fortschritt bleiben im Browser (`localStorage`, Schlüssel `anleitung.*`; ältere Daten ohne Präfix werden einmalig übernommen).
- **Deutsch und Englisch:** Reihen beginnen mit `R`, `Row`, `Reihe`, `Runde`, `Round`, `Rnd` + Nummer. Kürzel (`fM`, `Stb`, `sc`, `dc`, `bs` …) werden unverändert angezeigt.
- **Überschriften und Notizen:** Enthält die Anleitung nummerierte Reihen, werden Zeilen ohne Reihennummer (Titel, Material …) übersprungen; Farbwechsel darin gelten trotzdem. Ohne nummerierte Reihen ist jede Zeile eine Reihe.
- **Wiederholungen:** `(fM, Zun) x 6`, `(3 fM, Abn) 5x`, Anzahl vor dem Kürzel (`254sc`, `6 fM`).
- **Anzeige:** Folgen von bis zu 3 gleichen Maschen als einzelne Kacheln, ab 4 gleichen als eine Kachel „10× fM“ (`SINGLE_MAX` in `index.html`). Max. 8 Kacheln pro Seite (`MAX_CHIPS`).
- **Garnfarben:** `Use color A`, `Farbe B`, `Wechsel zu Farbe C:` setzen die Farbe ab dieser Stelle, auch mitten in der Reihe, und gelten bis zum nächsten Wechsel (auch über Reihen hinweg). Farben werden vorher in der App festgelegt (Palette, Regler, Hex). Gleiche Maschen in verschiedenen Farben werden nicht zusammengefasst.
- **Fortschritt:** Tipp auf eine Kachel = diese und alle vorigen in der Reihe werden blass. Tipp auf eine blasse Kachel = Rücksetzen dieser und aller folgenden, mit Bestätigung.
- **Corporate Design:** Isadody-CD (Papierton, Coral, Baloo 2 + Nunito, runde Buttons, gestrichelte „Naht“ in den Kacheln, Logo oben links).

## Aufbau

| Datei | Inhalt |
|---|---|
| `anleitung/index.html` | die ganze App (HTML, CSS, JavaScript), keine Build-Schritte, nur `shared/` als Abhängigkeit |
| `shared/logo.png` | Isadody-Logo (aus dem Design-System-Artefakt „Isadody“), nicht einfärben, Höhe mind. 64 px |
| `beispiele/` | Beispielanleitungen zum Testen |

Wichtige Stellen in `anleitung/index.html`: `parse` / `expand` / `chipsOf` (Anleitung → Kacheln), `render` (Anzeige), `renderColorPickers` (Farbauswahl), `fitSeams` (gleichmäßige Nahtstriche).

## Entwickeln und testen

Über einen lokalen Webserver im Hauptordner öffnen (z. B. `python3 -m http.server`), damit `../shared/` gefunden wird. Der Parser läuft auch ohne Browser (Funktionen am Dateianfang des Skripts). Veröffentlichen: auf `main` pushen, Pages aktualisiert sich selbst.

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
- **Bearbeiten:** Farben der Legende ändern (Palette, Hex), einzelne Maschen malen, Rückgängig und Wiederholen (Malen und Farbänderungen).
- **Sammlung:** „In Sammlung speichern“ legt ein Bild-Muster in `isadody-muster` an (PNG des Rasters, `text` = Häkelhelfer-Anleitung, `colors`, `grid` = Stand zum Weiterbearbeiten). Die id steht in `grid.mid`; erneutes Speichern aktualisiert dieses Muster, ein neues Bild setzt sie zurück. Die Sammlung zeigt dafür „Im Grid-Ersteller öffnen“; Häkelhelfer und Sammlung übernehmen `colors`.
- **Ausgabe:** Raster als PNG, Anleitung als Text/.txt, „Im Häkelhelfer öffnen“ schreibt die Anleitung (`Reihe n: Farbe A, 5 fM, …`) samt Farben in den Speicher von `anleitung/`.
- Gespeichert unter `grid.state` und `grid.src` (verkleinertes Bild). Kernfunktionen (`quantize`, `despeckle`, `instructions`, `toHelper`) laufen auch mit `node`.
