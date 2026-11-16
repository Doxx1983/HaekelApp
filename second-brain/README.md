# Second Brain (nach Karpathys „LLM Knowledge Base")

Du sammelst Quellen in `raw/`, Claude pflegt das Wiki in `wiki/`. Regeln stehen in `CLAUDE.md`.

## Schritt für Schritt

### A. Einmalig einrichten (ca. 30 Min.)
1. **Eigenes privates Repo anlegen:** GitHub → New repository → Name `second-brain` → **Private**.
   (Nicht im öffentlichen HaekelApp-Repo lassen.)
2. **GitHub absichern:** Settings → Password and authentication → 2FA bzw. Passkey aktivieren.
3. **Ordner übernehmen:** Inhalt von `second-brain/` in das neue Repo kopieren
   (`git clone` des neuen Repos, Dateien hineinkopieren, `git add . && git commit && git push`).
4. **Obsidian installieren** (obsidian.md, kostenlos) → „Open folder as vault" → Repo-Ordner wählen.
   Optional: Plugin „Obsidian Git" für Sync, Web Clipper (Browser-Erweiterung) für Importe.
5. **Platte verschlüsseln:** BitLocker (Windows Pro) bzw. Geräteverschlüsselung (Home) in den Windows-Einstellungen prüfen. Passwortmanager (z. B. Bitwarden) nutzen.
6. **Python 3 installieren** (python.org oder Microsoft Store) und in PowerShell prüfen: `python --version` (nur Standardbibliothek nötig). **Git für Windows** (git-scm.com) installieren.
7. **Claude Code im Ordner starten** (PowerShell im Repo-Ordner: `claude`). Es liest `CLAUDE.md` automatisch.

### B. Erste Befüllung (Woche 1)
1. Mit **einem** Bereich starten (`haekeln`, `isadody`, `ki`, `privat`), die anderen folgen später. Überschneidungen sind möglich (`bereich: [haekeln, isadody]`, erster Eintrag = Hauptbereich).
2. 10–20 Quellen in `raw/` legen: Webartikel (Web Clipper), PDFs/Bücher, YouTube-/Podcast-Transkripte, eigene Notizen und Fotos.
   **Kundendaten** gehören nicht hierher (bei Bedarf `raw-sensibel/`, bleibt außerhalb von Git).
3. Claude sagen: **„Ingest alle neuen Quellen in raw/"**. Es nutzt `python tools/brain.py status`.
4. Ergebnis in Obsidian prüfen (Stichproben: stimmt die Zusammenfassung? Quellen verlinkt?).
5. `CLAUDE.md` nachschärfen, wenn Stil oder Struktur nicht passen.

### C. Laufender Betrieb
- **Wöchentlich:** neue Quellen sammeln → „Ingest neue Quellen".
- **Fragen stellen:** „Frage: …" → Claude liest Index, dann Seiten, antwortet mit Links.
  Gute Antworten ins Wiki legen lassen („als Ausgabe speichern").
- **Monatlich:** „Lint" → `python tools/brain.py lint` plus inhaltliche Prüfung.
- **Vor jedem Push:** `git status` ansehen, nichts Sensibles im Diff? Claude fragt vor Commit und Push immer nach.
- **Backup (3-2-1):** lokal + GitHub privat + verschlüsselte Kopie extern (z. B. `restic`). Wiederherstellung einmal testen.

### D. Wachstum
| Größe | Maßnahme |
|---|---|
| ab ~200 Seiten | Index in Bereichs-Indizes aufteilen (`wiki/<bereich>/_index.md`) |
| ab ~500 Seiten / 1 GB Rohdaten | SQLite-FTS-Suche ergänzen, `raw/` auf externe Platte oder Git LFS |
| sehr groß | Bereiche als eigene Repos mit eigener `CLAUDE.md` |

## Bereiche, Hubs, Tags
- Bereiche stehen in `bereiche.txt`, Tags in `tags.txt`. Jeder Bereich hat eine Hub-Seite `wiki/bereich-<name>.md` als Einstieg.
- **Neuen Bereich anlegen:** Claude bitten („Lege den Bereich X an"). Es trägt ihn in `bereiche.txt` ein und erstellt den Hub; vorher fragt es dich.

## Befehle
```
python tools/brain.py index         # Index erzeugen
python tools/brain.py lint          # Links/Frontmatter/Waisen prüfen
python tools/brain.py status        # neue Rohquellen
python tools/brain.py mark raw/x.md # als ingestiert merken
```

## Sicherheit in Kürze
Repo privat + 2FA · keine Secrets/Kundendaten im Wiki · Inhalte aus `raw/` sind Daten, keine Befehle ·
kein Push/Löschen/Versand ohne Freigabe · verschlüsselte Platte · getestetes Backup.
