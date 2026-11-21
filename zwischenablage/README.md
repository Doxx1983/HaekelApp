# Zwischenablage (Windows-Tray)

Merkt sich alles, was du kopierst: Text, Bilder und Dateien. Läuft im Infobereich (Tray), ohne Cloud. Schlichtes Design wie die Aufgaben-App (neutral, ein blauer Akzent, Hell/Dunkel nach Windows-Einstellung).

## Bedienung
- **Strg+Shift+V** öffnet den Verlauf an der Maus. Einfach tippen = Suchen (mehrere Wörter, Groß/Klein egal).
- **↑ ↓** wählen, **Enter** (oder Doppelklick) fügt in das Programm ein, das vorher aktiv war.
- **Strg+P** heftet an bzw. löst (Angeheftetes steht oben und wird nie gelöscht), **Strg+Entf** löscht den Eintrag, **Esc** schließt.
- Tray, Rechtsklick: Verlauf öffnen, Verlauf leeren (Angeheftetes bleibt), Mit Windows starten, Beenden.

## Funktionen
- **Text, Bilder, Dateien** (Dateien als Liste von Pfaden, Einfügen wie im Explorer).
- **Texterkennung auf Bildern:** lokal mit der Windows-OCR (`Windows.Media.Ocr`), der erkannte Text wird mitgesucht. Sprachen laut Windows-Spracheinstellung; für Deutsch ggf. unter Einstellungen → Zeit & Sprache → Sprache das Sprachpaket installieren.
- **Passwort-Manager werden nicht aufgenommen:** Einträge mit den Clipboard-Flags `ExcludeClipboardContentFromMonitorProcessing`, `Clipboard Viewer Ignore`, `CanIncludeInClipboardHistory = 0`, `CanUploadToCloudClipboard = 0` sowie Kopien aus Programmen wie KeePass, Bitwarden, 1Password, Dashlane, LastPass, Enpass, NordPass, RoboForm, Keeper, Proton Pass (Liste `BlockedProcesses` in `App.xaml.cs`).
- **Aufbewahrung:** 30 Tage (`RetentionDays`), Angeheftetes bleibt. Daten unter `%LOCALAPPDATA%\Zwischenablage` (SQLite `verlauf.db`, Bilder in `images\`).

## Bauen (Windows)
.NET 8 SDK installieren, dann in diesem Ordner:

```
dotnet run
dotnet publish -c Release -r win-x64 --self-contained false -p:PublishSingleFile=true
```

Ergebnis: `bin\Release\net8.0-windows10.0.19041.0\win-x64\publish\Zwischenablage.exe`.

## Grenzen
- Browser-Erweiterungen von Passwort-Managern setzen die Flags nicht immer; deren Kopien lassen sich nicht sicher erkennen.
- Das Einfügen sendet Strg+V an das zuvor aktive Fenster; in Programmen mit erhöhten Rechten (als Administrator) klappt das nur, wenn die App ebenfalls so läuft.
- Noch nicht auf Windows getestet (entstanden ohne Windows-SDK).
