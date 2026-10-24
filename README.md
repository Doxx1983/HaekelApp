# Isadody Häkel-Apps

Sammlung kleiner Web-Apps fürs Häkeln. Die Startseite (`/index.html`) verlinkt alle Apps; jede App läuft auch für sich unter ihrer eigenen Adresse. Oben zeigt sie „Weitermachen“ mit dem zuletzt benutzten Häkelhelfer-Projekt; die App-Karten tragen Strich-Icons (Inline-SVG, Schwarzbraun auf Coral).

| Ordner | App |
|---|---|
| `anleitung/` | Häkelhelfer (unten beschrieben) |
| `zaehler/` | Reihenzähler im Pop-it-Stil |
| `grid/` | Grid-Ersteller: Bild → Tapestry-Muster |
| `muster/` | Mustersammlung: Bilder, PDFs, Word, Texte ablegen, taggen, suchen |
| `lineal/` | Lineal: Bild oder PDF aus der Sammlung ansehen, ein Streifen markiert die aktuelle Reihe und zählt mit (Stand je Muster in `lineal.s`, `lineal/#<muster-id>` öffnet direkt) |
| `lexikon/` | Häkellexikon: Maschen, Kürzel und Begriffe DE/US/UK |
| `shared/` | gemeinsam: `isadody.css` (CD-Tokens, Schriften, Grundstil, `.logo`, `.small`, `.btn`, `.home`), `store.js` (`Store('<app>')` speichert unter `<app>.<key>`), `dialog.js` (Rückfragen und Hinweise im CD: `Dialog.alert`, `Dialog.confirm`, `Dialog.prompt`, geben ein Promise zurück; statt `alert`/`confirm`/`prompt` verwenden), `muster-db.js` (Zugriff auf die Sammlung), `doctext.js` (Dateiformate, Text aus .docx/.odt/.pdf; `pdfText`, `openPdf`), `pdfjs/` (pdf.js 3.11.174 legacy, Apache 2.0, wird erst bei Bedarf geladen), `hilfe.css` (Hilfeseiten), `projekte.js` (Projekte des Häkelhelfers, auch von `grid/` und `muster/` genutzt), `sicherung.js` (Gesamtsicherung, prüft eingespielte Dateien), `maschen.js` (Begriffe und Kürzel DE/US/UK, `MASCHEN`, `KATEGORIEN`), `logo.png`, `icon-*.png` (App-Symbol, Logo auf Papierton) |

Daten: alles liegt im Browser. `Store.set` meldet einen vollen Speicher einmal per Hinweis (statt still nichts zu speichern) und gibt `false` zurück. **Sicherung** (Startseite, Sammlung → „Sichern“): eine JSON-Datei `isadody-sicherung-Datum.json` mit allen Schlüsseln `anleitung.*`, `zaehler.*`, `grid.*`, `muster.*`, `lexikon.*` und der Sammlung (Dateien als Base64). Beim Einspielen wird jedes Feld geprüft (ids, Farben nur `#RRGGBB`, Grid-Raster, Tags), Vorhandenes bleibt, bei Projekten und Zählern gewinnt der zuletzt benutzte Stand, bei Mustern die zuletzt geänderte Fassung (`changed`). Neue Projekte kommen nur bis zur 10er-Grenze dazu; was nicht passt, nennt die Meldung. Als gesichert zählt nur eine Datei, die im Speichern-Fenster geschrieben oder nach dem Download bestätigt wurde. Die Startseite zeigt, wann zuletzt gesichert wurde; nach 14 Tagen oder nie steht in jeder App am unteren Rand fett in Coral „Sicherung erstellen“ (`shared/erinnerung.js`, führt zur Startseite, dort sichert es direkt), und auf iPhone/iPad den Hinweis „Zum Home-Bildschirm“ (Safari löscht Daten sonst nach 7 Tagen ohne Nutzung). `manifest.webmanifest` macht die Sammlung als App installierbar; **Offline:** `sw.js` (Service Worker im Hauptordner, angemeldet über `shared/offline.js` in jeder App) lädt beim ersten Besuch alle Dateien aus `FILES` in den Cache; mit Netz kommt jede Datei frisch (Cache wird aktualisiert), ohne Netz oder nach 4 s aus dem Cache. Neue Dateien in `FILES` eintragen und `VERSION` erhöhen. `shared/wach.js` hält im Häkelhelfer und Zähler den Bildschirm an (Screen Wake Lock). Die Sicherungsdatei wird aus Einzelteilen zusammengesetzt (nicht als ein langer Text im Speicher).

Hilfe: jede App hat `hilfe/index.html` (bindet `../../shared/isadody.css` und `../../shared/hilfe.css` ein, Link „‹ Zur App“) und im Kopf einen runden Knopf `<a class="help" href="hilfe/">?</a>` (in `.tools` neben dem Kopfknopf). Neue Funktion = Hilfeseite mitpflegen.

Häkelhelfer: Unter dem Textfeld zeigt ein Prüfschritt die erkannten Reihen mit Maschenzahl, Warnungen (⚠) und Zeilen ohne Maschen; „Nur Markiertes behalten“ kürzt den Text auf die Auswahl. Fortschritt wird gebündelt gespeichert (300 ms nach dem letzten Tipp, sofort bei `pagehide`/Wechsel, `flush()`); Projekte tragen ihre Reihenzahl (`rows`) für die Projektliste. Gemessen mit 10 Tapestrys 200 × 200 bei 6-fach gedrosselter CPU: Tipp 68 → 18 ms, Projektliste 2,2 s → 0,35 s.

Grid → Häkelhelfer: Die Anleitung trägt die Richtung („Reihe 3 (von rechts): …“), der Häkelhelfer zeigt sie als Hinweis zur Reihe; auch der Text-Export („3 A, 2 B“ und „A = #RRGGBB“) wird gelesen. Der Grid-Ersteller merkt sich das geschickte Projekt (`grid.pid`) und bietet beim erneuten Schicken an, es zu aktualisieren (`Projekte.update`, `prev` = alte Anleitung; der Häkelhelfer behält beim Öffnen die Häkchen unveränderter Reihen).

Neue App: eigener Ordner mit `index.html`, bindet `../shared/isadody.css` und `../shared/store.js` ein, Logo `../shared/logo.png`, Link `<a class="home" href="../">‹ Alle Apps</a>`, Karte auf der Startseite eintragen (mit Strich-Icon wie die anderen), Hilfeseite anlegen. Kein Build.

## Mustersammlung (`muster/`)

- **Ablegen:** Bilder, PDFs, Word (`.docx`, `.doc`), LibreOffice (`.odt`) und `.txt`-Dateien über „+ Muster“ (mehrere auf einmal, am Computer auch per Ziehen) oder Text einfügen.
- **Ordnen:** Name, Tags (Enter oder Komma, Vorschläge aus vorhandenen Tags), Notizen, Favorit. Übersicht mit Suche (Name, Tags, Notizen, Textinhalt), Tag-Filtern (mehrere = alle müssen passen), „★ Favoriten“, Sortierung Neueste/A–Z.
- **Speicher:** IndexedDB `isadody-muster` (Dateien als Blob, Bilder mit kleinem Vorschaubild), Filter im Store `muster.*`. Die App bittet den Browser per `navigator.storage.persist()`, die Daten nicht automatisch zu löschen.
- **Sicherung:** „Sicherung herunterladen“ erzeugt eine JSON-Datei mit allen Mustern (Dateien als Base64), „Sicherung einspielen“ fügt fehlende Muster hinzu; bei gleicher ID gewinnt die zuletzt geänderte Fassung.
- **Häkelhelfer:** Textmuster lassen sich mit „Im Häkelhelfer öffnen“ direkt dort starten (neues Projekt dort, bei gleicher Anleitung das vorhandene mit Fortschritt).
- Aus `.docx` und `.odt` liest die App den Text (eigener ZIP-Leser mit `DecompressionStream`, keine Bibliothek): Vorschau, Suche im Inhalt und „Im Häkelhelfer öffnen“. Alte `.doc` werden nur gespeichert und heruntergeladen.
- PDFs werden am Computer eingebettet angezeigt, auf dem Handy per „PDF öffnen“.

## Häkellexikon (`lexikon/`)

- **Daten:** `shared/maschen.js` (`MASCHEN`: id, Name, Kürzel DE/US/UK, Kategorie, Schwierigkeit, Erklärung, Schritte, `umr` = in der Umrechnungstabelle). Auch mit `node` ladbar (`module.exports`), damit der Parser des Häkelhelfers später dieselben Kürzel nutzen kann. Achtung: `dc`, `tr`, `dtr`, `dc2tog` bedeuten in US und UK Verschiedenes.
- **Begriffe:** Suche nach Name oder Kürzel (Groß/klein, Punkte, Leerzeichen, Umlaute egal; genaue Kürzel zuerst), Hinweis bei US/UK-Doppelbedeutung, Filter nach Bereich und Schwierigkeit, ★ Favoriten.
- **US · UK · DE:** Umrechnungstabelle, Zeilen mit unterschiedlichen US/UK-Namen hervorgehoben, Tipp auf den deutschen Namen öffnet den Eintrag.
- **Links:** `lexikon/#<id>` öffnet einen Eintrag (z. B. `#abn`).
- Gespeichert unter `lexikon.fav`, `lexikon.kat`, `lexikon.stufe`, `lexikon.favOnly`, `lexikon.tab`.

## Häkelhelfer (`anleitung/`)

Web-App für unterwegs: Häkelanleitung laden, dann zeigt die App immer nur die nächsten Maschen (max. 8 Kacheln), mit großem „Weiter“-Button und kleinem „Zurück“. Die aktuelle Reihe steht oben links.

Live: https://doxx1983.github.io/haekelapp/anleitung/ (Startseite: https://doxx1983.github.io/haekelapp/, GitHub Pages, Branch `main`, Ordner `/`)

## Funktionen

- **Projekte:** bis zu 10 Anleitungen parallel, jede mit eigenem Fortschritt und eigenen Farben (`shared/projekte.js`, `anleitung.projects` + `anleitung.current`). Liste unter „Projekte“ (zuletzt benutzt zuerst, je Projekt Reihe, letzte Nutzung, Garnfarben und Fortschrittsbalken; das aktive mit „Aktiv“), wechseln per Tipp, löschen mit ×. Oben steht beim Häkeln „Reihe x von n · Projektname“. Sammlung und Grid-Ersteller legen über `Projekte.open` ein neues Projekt an oder öffnen das mit gleicher Anleitung. Die alte Einzel-Anleitung (`anleitung.pattern/pos/done/colors`) wird einmalig Projekt 1.
- **Anleitung laden** aus der Mustersammlung (Liste der Textmuster mit Suche und Tags; Bilder, PDFs und alte .doc fehlen dort), als Datei (dieselben Formate wie die Sammlung; Text aus `.txt`, `.docx`, `.odt`) oder als eingefügter Text. Alles bleibt im Browser (`localStorage`, Schlüssel `anleitung.*`; ältere Daten ohne Präfix werden einmalig übernommen).
- **Deutsch und Englisch:** Reihen beginnen mit `R`, `Row`, `Reihe`, `Runde`, `Round`, `Rnd` + Nummer. Kürzel (`fM`, `Stb`, `sc`, `dc`, `bs` …) werden unverändert angezeigt.
- **Überschriften und Notizen:** Enthält die Anleitung nummerierte Reihen, werden Zeilen ohne Reihennummer (Titel, Material …) übersprungen; Farbwechsel darin gelten trotzdem. Ohne nummerierte Reihen ist jede Zeile eine Reihe.
- **Wiederholungen:** `(fM, Zun) x 6`, `(3 fM, Abn) 5x`, Anzahl vor dem Kürzel (`254sc`, `6 fM`).
- Auch `[..]`, `*..* 6x wiederholen`, `repeat 6 times`, `rep from * 5 more times`, `ab * noch 5x wiederholen`, Anzahl hinter dem Kürzel (`sc 5`, `inc x 6`), Reihenbereiche (`R12-14`), Kürzel wie `sc2tog`, `sl st`, `inv dec`, `2 fM zus.`, Maschenglied (`BLO`, `hMg`, auch für die ganze Reihe).
- Fachliche Schreibweisen: `2 fM in 1 M` / `2 sc in next st` = Zun, `2 hStb in jede M` → „2 hStb in 1 M“, `(sc, hdc, dc) in next st` als eine Kachel, `jede 2. M verdoppeln`, Fadenring als eigene Kachel, `3 Lm (zählt als 1. Stb)`, Klammer nach der Nummer (`Rd 7 (18 M):`, `Runde 12-15 (4 Rd.):`), Wiederholung ohne Klammer (`…; repeat 6 times`, `wdh. bis Rundenende`, `fM, Abn rundherum`). Mehrdeutiges probiert `variants()` durch und nimmt die Lesart, die zur Maschenzahl passt; `rowLists()` lässt 3–4 Anfangs-Lm notfalls als Stäbchen zählen.
- Notizen: Zeilen zwischen Reihen, Arbeitsschritte in der Reihe („Kopf ausstopfen“) und Text nach der Maschenzahl erscheinen als Hinweis über den Kacheln (`row.notes`). Materialliste vor Reihe 1 (`Farbe A: weiß`) setzt keine Farbe. Zeilen ohne Maschen meldet „Starten“ (`rows.skipped`). ⚠ erscheint bei jeder Abweichung von der Maschenzahl.
- Mehrteilige Anleitungen: beginnt die Nummerierung neu, ist das ein neues Teil (Name aus der Zeile davor, Anzahl aus `Arm (2x)`, `x2`, `2 Stück`); `withParts()` wiederholt Teile entsprechend, `row.part = { name, n, of }` steht unter der Position.
- Kürzel-Leiste unter den Kacheln: Bedeutung aus `shared/maschen.js`, Link ins Lexikon, US/UK nach der Anleitung (`sc` → US, `htr`/`ss` → UK).
- **Maschenzahl am Reihenende:** aus der Anleitung (`(18)`, `[18]`, `= 18 M`) oder gezählt (Zun = 2, Lm/Km/Wenden = 0); „in jede M“/„around“ wird bis zur Zahl aufgefüllt. Passt die Zählung nicht zur Anleitung, erscheint ein Hinweis.
- **Anzeige:** Folgen von bis zu 3 gleichen Maschen als einzelne Kacheln, ab 4 gleichen als eine Kachel „10× fM“ (`SINGLE_MAX` in `index.html`). Max. 8 Kacheln pro Seite (`MAX_CHIPS`).
- **Garnfarben:** `Use color A`, `Farbe B`, `Wechsel zu Farbe C:` setzen die Farbe ab dieser Stelle, auch mitten in der Reihe, und gelten bis zum nächsten Wechsel (auch über Reihen hinweg). Farben werden vorher in der App festgelegt (Palette, Regler, Hex). Gleiche Maschen in verschiedenen Farben werden nicht zusammengefasst.
- **Fortschritt:** Tipp auf eine Kachel = diese und alle vorigen in der Reihe werden blass. Tipp auf eine blasse Kachel = Rücksetzen dieser und aller folgenden, mit Bestätigung. Wird die Anleitung geändert, bleiben Position und Häkchen unveränderter Reihen (`keepProgress`). Ein zweiter Tab übernimmt Änderungen per `storage`-Ereignis, ohne zurückzuschreiben.
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

- Offline-Betrieb (Service Worker).
- Anleitungen als PDF oder Foto einlesen.
- Einzelne Maschen einer Gruppe („13× dc“) abhaken.

## Reihenzähler (`zaehler/`)

Pop-it-Zähler: jede Blase eine Reihe, volle Platte dreht sich um. Ein **freier Zähler** plus bis zu 10 **eigene Projekte** (unabhängig vom Häkelhelfer), anlegen, umbenennen, löschen unter Einstellungen (`zaehler.counters` = `{ frei, <id>: { name, n, flips, popped, target, used } }`, gewählt in `zaehler.current`, Ton/Vibration in `zaehler.prefs`). Der alte Einzelzähler `zaehler.state` wird einmalig der freie Zähler; Zähler, die kurz an Häkelhelfer-Projekten hingen, werden eigene Projekte mit deren Namen.

## Grid-Ersteller (`grid/`)

Bild laden, Breite (Maschen), Höhe (Reihen) und Farbanzahl wählen → Raster für Tapestry-Häkeln mit Farblegende und Anweisungen je Reihe.

- **Farbreduktion** im Lab-Farbraum: k-means mit vielen Gruppen, dann ähnlichste Gruppen (Ward) zusammenlegen; kleine, deutlich andere Flächen bleiben so erhalten. Optional werden Einzelmaschen geglättet.
- **Richtung:** Reihe 1 unten, Rechtshänder beginnen rechts; in Reihen abwechselnd, in Runden immer gleich. „Linkshändig“ spiegelt das.
- **Maschenprobe** (Maschen und Reihen auf 10 cm, optional): Kästchen in echter Maschenform, Reihenzahl passend zum Bild, fertige Größe in cm.
- **Bearbeiten:** Farben der Legende ändern (Palette, Hex), einzelne Maschen malen, Rückgängig und Wiederholen (Malen und Farbänderungen).
- **Sammlung:** „In Sammlung speichern“ legt ein Bild-Muster in `isadody-muster` an (PNG des Rasters, `text` = Häkelhelfer-Anleitung, `colors`, `grid` = Stand zum Weiterbearbeiten). Die id steht in `grid.mid`; erneutes Speichern aktualisiert dieses Muster, ein neues Bild setzt sie zurück. Die Sammlung zeigt dafür „Im Grid-Ersteller öffnen“; Häkelhelfer und Sammlung übernehmen `colors`.
- **Ausgabe:** Raster als PNG, Anleitung als Text/.txt, „Im Häkelhelfer öffnen“ legt die Anleitung (`Reihe n: Farbe A, 5 fM, …`) samt Farben als Projekt im Häkelhelfer an.
- Gespeichert unter `grid.state` und `grid.src` (verkleinertes Bild). Kernfunktionen (`quantize`, `despeckle`, `instructions`, `toHelper`) laufen auch mit `node`.
