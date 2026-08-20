# -*- coding: utf-8 -*-
"""Zet elke kamer klaar als Tiled-bestand zodat Stephan de inrichting visueel
kan finetunen (wens 20 aug 2026). Per kamer: de kale shell (vloer plus muren)
als achtergrond-image, en alle kleden en meubels als versleepbare tile-objecten
uit een collectie-tileset.

Workflow:
  1. python scripts/exporteer-tiled.py      (zet tiled/ klaar; bestaande
     kamer-*.tmx worden NOOIT overschreven, gebruik --force per kamer)
  2. Stephan opent tafeldorp.tiled-project in Tiled en versleept meubels
  3. python scripts/bouw-interieurs.py      (leest de tmx-versies automatisch)

De mappen tiled/shells/ en tiled/tegels/ zijn gitignored (vendor-crops) en
worden door stap 1 opnieuw gegenereerd; de .tmx-bestanden staan wel in git.
"""
import argparse
import sys
from pathlib import Path
from xml.sax.saxutils import quoteattr

sys.path.insert(0, str(Path(__file__).resolve().parent))
bi = __import__("bouw-interieurs")

ROOT = Path(__file__).resolve().parent.parent
TILED = ROOT / "tiled"
TILE = 48


def veilige_naam(key):
    return "".join(c if c.isalnum() or c in "-_" else "x" for c in key)


def verzamel_tegels():
    """Unieke meubel/kleed-afbeeldingen over alle kamers, plus tileset-index."""
    tegels = {}
    for cfg in bi.KAMERS.values():
        for spec in list(cfg.get("kleden", [])) + list(cfg["meubels"]):
            map_, nummer = spec[0], spec[1]
            key = bi.bron_naar_key(map_, nummer)
            if key in tegels:
                continue
            img = bi.meubel(map_, nummer)
            if img is None:
                continue
            tegels[key] = img
    return tegels


def schrijf_tileset(tegels):
    (TILED / "tegels").mkdir(parents=True, exist_ok=True)
    regels = ['<?xml version="1.0" encoding="UTF-8"?>',
              f'<tileset version="1.10" tiledversion="1.12.2" name="meubels" '
              f'tilewidth="48" tileheight="48" tilecount="{len(tegels)}" columns="0" '
              f'objectalignment="bottomleft">',
              ' <grid orientation="orthogonal" width="1" height="1"/>']
    index = {}
    for i, (key, img) in enumerate(sorted(tegels.items())):
        bestand = f"tegels/{veilige_naam(key)}.png"
        img.save(TILED / bestand)
        regels.append(f' <tile id="{i}">')
        regels.append(f'  <image source="{bestand}" width="{img.width}" height="{img.height}"/>')
        regels.append(' </tile>')
        index[key] = (i, img.width, img.height)
    regels.append('</tileset>')
    (TILED / "meubels.tsx").write_text("\n".join(regels), encoding="utf-8")
    import json
    json.dump({str(i): key for key, (i, _, _) in index.items()},
              open(TILED / "sleutels.json", "w", encoding="utf-8"), indent=1)
    return index


def schrijf_tmx(kid, cfg, index, force=False):
    pad = TILED / f"kamer-{kid}.tmx"
    if pad.exists() and not force:
        print(f"{kid}: tmx bestaat al, overgeslagen (gebruik --force {kid})")
        return
    B, Hh = cfg["b"], cfg["h"]
    regels = ['<?xml version="1.0" encoding="UTF-8"?>',
              f'<map version="1.10" tiledversion="1.12.2" orientation="orthogonal" '
              f'renderorder="right-down" width="{B}" height="{Hh}" tilewidth="48" '
              f'tileheight="48" infinite="0" nextlayerid="4" nextobjectid="999">',
              ' <tileset firstgid="1" source="meubels.tsx"/>',
              f' <imagelayer id="1" name="shell">',
              f'  <image source="shells/{kid}_shell.png" width="{B * TILE}" height="{Hh * TILE}"/>',
              ' </imagelayer>']
    oid = 1
    for laag, specs in (("kleden", cfg.get("kleden", [])), ("meubels", cfg["meubels"])):
        lid = 2 if laag == "kleden" else 3
        regels.append(f' <objectgroup id="{lid}" name="{laag}">')
        for spec in specs:
            map_, nummer, tx, ty = spec[0], spec[1], spec[2], spec[3]
            key = bi.bron_naar_key(map_, nummer)
            if key not in index:
                continue
            tid, iw, ih = index[key]
            px = int((tx + 0.5) * TILE - iw / 2)
            py = int((ty + 1) * TILE - ih)
            regels.append(f'  <object id="{oid}" gid="{tid + 1}" name={quoteattr(key)} '
                          f'x="{px}" y="{py + ih}" width="{iw}" height="{ih}">')
            if laag == "meubels":
                boven_f = spec[4]
                solide = spec[5] if len(spec) > 5 else True
                regels.append('   <properties>')
                regels.append(f'    <property name="boven" type="float" value="{boven_f}"/>')
                regels.append(f'    <property name="solide" type="bool" value="{str(solide).lower()}"/>')
                regels.append('   </properties>')
            regels.append('  </object>')
            oid += 1
        regels.append(' </objectgroup>')
    regels.append('</map>')
    pad.write_text("\n".join(regels), encoding="utf-8")
    print(f"{kid}: kamer-{kid}.tmx geschreven")


def schrijf_project():
    pad = ROOT / "tafeldorp.tiled-project"
    if pad.exists():
        return
    pad.write_text('{\n "folders": [\n  "tiled"\n ]\n}\n', encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", nargs="*", metavar="KAMER",
                        help="overschrijf bestaande tmx (zonder argument: alle)")
    args = parser.parse_args()
    (TILED / "shells").mkdir(parents=True, exist_ok=True)
    tegels = verzamel_tegels()
    index = schrijf_tileset(tegels)
    for kid, cfg in bi.KAMERS.items():
        bi.bouw(kid, cfg, shell_pad=TILED / "shells" / f"{kid}_shell.png")
        force = args.force is not None and (args.force == [] or kid in args.force)
        schrijf_tmx(kid, cfg, index, force=force)
    schrijf_project()
    print(f"klaar: {len(tegels)} tegels, open tafeldorp.tiled-project in Tiled")


if __name__ == "__main__":
    main()
