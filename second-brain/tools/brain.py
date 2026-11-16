#!/usr/bin/env python3
"""Index, Lint und Ingest-Status für das Second Brain. Nur Standardbibliothek.

  python tools/brain.py index         # wiki/index.md neu erzeugen
  python tools/brain.py lint          # Links, Frontmatter, Bereiche, Tags, Hubs prüfen
  python tools/brain.py status        # neue/geänderte Rohquellen anzeigen
  python tools/brain.py mark <datei>  # Rohquelle als ingestiert merken
"""
import hashlib, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WIKI, RAW = ROOT / "wiki", ROOT / "raw"
MANIFEST = WIKI / ".ingested.json"
PFLICHT = ["titel", "typ", "bereich", "zusammenfassung", "aktualisiert"]
MAX_BEREICHE = 3


def zeilen(datei):
    p = ROOT / datei
    if not p.exists():
        return []
    return [z.strip() for z in p.read_text(encoding="utf-8").splitlines()
            if z.strip() and not z.strip().startswith("#")]


def lade_bereiche():
    return {z.split(":", 1)[0].strip(): z.split(":", 1)[1].strip()
            for z in zeilen("bereiche.txt") if ":" in z}


def liste(wert):
    wert = (wert or "").strip()
    if wert.startswith("[") and wert.endswith("]"):
        wert = wert[1:-1]
    return [x.strip() for x in wert.split(",") if x.strip()]


def seiten():
    for p in sorted(WIKI.rglob("*.md")):
        if p.name.startswith("_") or p.name == "index.md":
            continue
        yield p


def frontmatter(text):
    text = text.replace("\r\n", "\n")
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
    bereiche = lade_bereiche()
    gruppen = {b: [] for b in bereiche}
    gruppen["(ohne gültigen Bereich)"] = []
    n = 0
    for p in seiten():
        fm, _ = frontmatter(p.read_text(encoding="utf-8"))
        n += 1
        zeile = f"- [[{slug(p)}]] ({fm.get('typ', '?')}): {fm.get('titel', p.stem)}. {fm.get('zusammenfassung', '')}"
        ziele = [b for b in liste(fm.get("bereich")) if b in bereiche] or ["(ohne gültigen Bereich)"]
        for b in ziele:
            gruppen[b].append(zeile)
    out = ["# Index", "", "_Automatisch erzeugt mit `python tools/brain.py index`. Seiten mit mehreren Bereichen erscheinen mehrfach._", ""]
    for b, eintraege in gruppen.items():
        if eintraege:
            out += [f"## {b}", ""] + sorted(eintraege) + [""]
    (WIKI / "index.md").write_text("\n".join(out), encoding="utf-8")
    print(f"Index: {n} Seiten")


def cmd_lint():
    bereiche, tags = lade_bereiche(), set(zeilen("tags.txt"))
    alle = {slug(p) for p in seiten()}
    eingehend = {s: 0 for s in alle}
    hubs = {}
    daten = []
    fehler = 0

    def melde(art, s, msg):
        nonlocal fehler
        print(f"[{art}] {s}: {msg}"); fehler += 1

    if not bereiche:
        melde("Bereiche", "bereiche.txt", "keine Bereiche definiert")
    for b in bereiche:
        if f"bereich-{b}" not in alle:
            melde("Hub", f"bereich-{b}", "Hub-Seite fehlt (wiki/bereich-" + b + ".md)")

    for p in seiten():
        text = p.read_text(encoding="utf-8").replace("\r\n", "\n")
        fm, body = frontmatter(text)
        s = slug(p)
        daten.append((s, fm, text))
        for k in PFLICHT:
            if not fm.get(k):
                melde("Frontmatter", s, f"'{k}' fehlt")
        bl = liste(fm.get("bereich"))
        if len(bl) > MAX_BEREICHE:
            melde("Bereich", s, f"mehr als {MAX_BEREICHE} Bereiche")
        for b in bl:
            if b not in bereiche:
                melde("Bereich", s, f"'{b}' nicht in bereiche.txt")
        for t in liste(fm.get("tags")):
            if t not in tags:
                melde("Tag", s, f"'{t}' nicht in tags.txt")
        if fm.get("typ") == "konzept" and fm.get("quellen") in (None, "", "[]"):
            melde("Quellen", s, "keine Quellen angegeben")
        if fm.get("typ") == "hub":
            hubs[s] = text
        for ziel in re.findall(r"\[\[([^\]|#]+)", text):
            ziel = ziel.strip()
            if ziel in alle:
                eingehend[ziel] += 1
            else:
                melde("Link", s, f"Ziel '{ziel}' existiert nicht")
        if len(body.split()) > 1200:
            melde("Länge", s, "über 1200 Wörter, aufteilen")

    for s, fm, _ in daten:
        if fm.get("typ") == "konzept":
            for b in liste(fm.get("bereich")):
                h = f"bereich-{b}"
                if h in hubs and f"[[{s}]]" not in hubs[h]:
                    melde("Hub", s, f"nicht in [[{h}]] verlinkt")

    index = (WIKI / "index.md").read_text(encoding="utf-8") if (WIKI / "index.md").exists() else ""
    for s, n in eingehend.items():
        if n == 0 and f"[[{s}]]" not in index:
            melde("Waise", s, "weder verlinkt noch im Index")
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
