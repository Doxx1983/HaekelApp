#!/usr/bin/env python3
"""Index, Lint und Ingest-Status für das Second Brain. Nur Standardbibliothek.

  python3 tools/brain.py index        # wiki/index.md neu erzeugen
  python3 tools/brain.py lint         # Links, Frontmatter, Waisen prüfen
  python3 tools/brain.py status       # neue/geänderte Rohquellen anzeigen
  python3 tools/brain.py mark <datei> # Rohquelle als ingestiert merken
"""
import hashlib, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WIKI, RAW = ROOT / "wiki", ROOT / "raw"
MANIFEST = ROOT / "wiki" / ".ingested.json"
PFLICHT = ["titel", "typ", "zusammenfassung", "aktualisiert"]


def seiten():
    for p in sorted(WIKI.rglob("*.md")):
        if p.name.startswith("_") or p.name == "index.md":
            continue
        yield p


def frontmatter(text):
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    fm = {}
    if m:
        for zeile in m.group(1).splitlines():
            if ":" in zeile:
                k, v = zeile.split(":", 1)
                fm[k.strip()] = v.strip()
    return fm, text[m.end():] if m else text


def slug(p):
    return p.relative_to(WIKI).with_suffix("").as_posix()


def cmd_index():
    gruppen = {}
    for p in seiten():
        fm, _ = frontmatter(p.read_text(encoding="utf-8"))
        gruppen.setdefault(p.parent.relative_to(WIKI).as_posix(), []).append(
            f"- [[{slug(p)}]]: {fm.get('titel', p.stem)}. {fm.get('zusammenfassung', '')}")
    out = ["# Index", "", "_Automatisch erzeugt mit `python3 tools/brain.py index`._", ""]
    for g in sorted(gruppen):
        out += [f"## {g}", ""] + gruppen[g] + [""]
    (WIKI / "index.md").write_text("\n".join(out), encoding="utf-8")
    print(f"Index: {sum(len(v) for v in gruppen.values())} Seiten")


def cmd_lint():
    alle = {slug(p) for p in seiten()}
    eingehend = {s: 0 for s in alle}
    fehler = 0
    for p in seiten():
        text = p.read_text(encoding="utf-8")
        fm, body = frontmatter(text)
        s = slug(p)
        for k in PFLICHT:
            if not fm.get(k):
                print(f"[Frontmatter] {s}: '{k}' fehlt"); fehler += 1
        if fm.get("typ") == "konzept" and fm.get("quellen") in (None, "", "[]"):
            print(f"[Quellen] {s}: keine Quellen angegeben"); fehler += 1
        for ziel in re.findall(r"\[\[([^\]|#]+)", text):
            ziel = ziel.strip()
            if ziel in alle:
                eingehend[ziel] += 1
            else:
                print(f"[Link] {s}: Ziel '{ziel}' existiert nicht"); fehler += 1
        if len(body.split()) > 1200:
            print(f"[Länge] {s}: über 1200 Wörter, aufteilen"); fehler += 1
    index = (WIKI / "index.md").read_text(encoding="utf-8") if (WIKI / "index.md").exists() else ""
    for s, n in eingehend.items():
        if n == 0 and f"[[{s}]]" not in index:
            print(f"[Waise] {s}: weder verlinkt noch im Index"); fehler += 1
    print(f"Lint: {len(alle)} Seiten, {fehler} Hinweise")
    return 1 if fehler else 0


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def lade():
    return json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}


def cmd_status():
    m, neu = lade(), []
    for p in sorted(RAW.rglob("*")):
        if p.is_file() and p.name != ".gitkeep":
            rel = p.relative_to(ROOT).as_posix()
            if m.get(rel) != sha(p):
                neu.append(rel)
    print("\n".join(neu) if neu else "Keine neuen Rohquellen.")


def cmd_mark(arg):
    p = (ROOT / arg).resolve()
    if not p.is_file() or RAW not in p.parents:
        sys.exit("Datei muss unter raw/ liegen.")
    m = lade()
    m[p.relative_to(ROOT).as_posix()] = sha(p)
    MANIFEST.write_text(json.dumps(m, indent=1, sort_keys=True))
    print("Markiert:", p.relative_to(ROOT))


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["index"]: cmd_index()
    elif a[:1] == ["lint"]: sys.exit(cmd_lint())
    elif a[:1] == ["status"]: cmd_status()
    elif a[:1] == ["mark"] and len(a) == 2: cmd_mark(a[1])
    else: print(__doc__)
