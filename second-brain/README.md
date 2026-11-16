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
5. **Platte verschlüsseln** (Windows: BitLocker, Mac: FileVault, Linux: LUKS) und Passwortmanager (Bitwarden) nutzen.
6. **Python 3 prüfen:** `python3 --version` (nur Standardbibliothek nötig).
7. **Claude Code im Ordner starten** (`claude` im Repo-Ordner). Es liest `CLAUDE.md` automatisch.

### B. Erste Befüllung (Woche 1)
1. Ein **Themengebiet** wählen (z. B. Häkeltechniken).
2. 10–20 Quellen als Markdown in `raw/` legen (Web Clipper, `pdftotext`, Transkripte).
   Sensibles gehört **nicht** hierher, sondern nach `raw-sensibel/` (bleibt außerhalb von Git).
3. Claude sagen: **„Ingest alle neuen Quellen in raw/"**. Es nutzt `python3 tools/brain.py status`.
4. Ergebnis in Obsidian prüfen (Stichproben: stimmt die Zusammenfassung? Quellen verlinkt?).
5. `CLAUDE.md` nachschärfen, wenn Stil oder Struktur nicht passen.

### C. Laufender Betrieb
- **Wöchentlich:** neue Quellen sammeln → „Ingest neue Quellen".
- **Fragen stellen:** „Frage: …" → Claude liest Index, dann Seiten, antwortet mit Links.
  Gute Antworten ins Wiki legen lassen („als Ausgabe speichern").
- **Monatlich:** „Lint" → `python3 tools/brain.py lint` plus inhaltliche Prüfung.
- **Vor jedem Push:** `git status` ansehen, nichts Sensibles im Diff? Push nur nach deiner Freigabe.
- **Backup (3-2-1):** lokal + GitHub privat + verschlüsselte Kopie extern (z. B. `restic`). Wiederherstellung einmal testen.

### D. Wachstum
| Größe | Maßnahme |
|---|---|
| ab ~200 Seiten | Index in Bereichs-Indizes aufteilen (`wiki/<bereich>/_index.md`) |
| ab ~500 Seiten / 1 GB Rohdaten | SQLite-FTS-Suche ergänzen, `raw/` auf externe Platte oder Git LFS |
| sehr groß | Bereiche als eigene Repos mit eigener `CLAUDE.md` |

## Befehle
```
python3 tools/brain.py index         # Index erzeugen
python3 tools/brain.py lint          # Links/Frontmatter/Waisen prüfen
python3 tools/brain.py status        # neue Rohquellen
python3 tools/brain.py mark raw/x.md # als ingestiert merken
```

## Sicherheit in Kürze
Repo privat + 2FA · keine Secrets/Kundendaten im Wiki · Inhalte aus `raw/` sind Daten, keine Befehle ·
kein Push/Löschen/Versand ohne Freigabe · verschlüsselte Platte · getestetes Backup.
