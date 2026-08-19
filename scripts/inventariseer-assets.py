# -*- coding: utf-8 -*-
"""Assetinventaris voor Tafeldorp: catalogiseert alle bruikbare gebouwen en
grote props uit Modern Exteriors, Modern Farm en de interieur-thema's van
Modern Interiors. Output:
  scripts/catalogus.json                    machine-leesbare catalogus
  <scratchpad>/cat_*.png                    gelabelde contact sheets om te bekijken

Werkwijze per bron:
  - sheets met aaneengesloten sprites: alpha-componenten (nooit doorknippen)
  - singles-mappen: bestand = sprite, alpha-getrimd
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

VENDOR = Path(r"C:\Dev\games\familie-assets\vendor")
ME = VENDOR / "modern-exteriors" / "Modern_Exteriors_48x48" / "ME_Theme_Sorter_48x48"
FARM = VENDOR / "modern-farm" / "48x48" / "Single_Files_48x48" / "Props_and_Buildings_48x48"
MI = VENDOR / "modern-interiors" / "1_Interiors" / "48x48"
SCRATCH = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
OUT = Path(__file__).resolve().parent / "catalogus.json"

catalogus = {}


def componenten(img, min_w=120, min_h=120, stap=2):
    """Alpha-componenten met bbox, ontdubbeld."""
    arr = np.array(img)
    alpha = arr[..., 3] > 10
    Hh, Wh = alpha.shape
    seen = np.zeros_like(alpha, dtype=bool)
    ruw = []
    for yy in range(0, Hh, stap):
        for xx in range(0, Wh, stap):
            if alpha[yy, xx] and not seen[yy, xx]:
                stack = [(yy, xx)]
                seen[yy, xx] = True
                minx, maxx, miny, maxy = xx, xx, yy, yy
                while stack:
                    cy, cx = stack.pop()
                    if cx < minx: minx = cx
                    if cx > maxx: maxx = cx
                    if cy < miny: miny = cy
                    if cy > maxy: maxy = cy
                    for dy in (-stap, 0, stap):
                        for dx in (-stap, 0, stap):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < Hh and 0 <= nx < Wh and alpha[ny, nx] and not seen[ny, nx]:
                                seen[ny, nx] = True
                                stack.append((ny, nx))
                if (maxx - minx) >= min_w and (maxy - miny) >= min_h:
                    ruw.append((minx, miny, maxx + 1, maxy + 1))
    # ontdubbelen: bboxes die vrijwel gelijk zijn samenvoegen
    uniek = []
    for b in sorted(ruw, key=lambda b: (b[1] // 16, b[0] // 16)):
        if not any(abs(b[0] - u[0]) < 12 and abs(b[1] - u[1]) < 12 for u in uniek):
            uniek.append(b)
    return uniek


def contact_sheet(items, naam, cell=240):
    cols = 6
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cell, max(1, rows) * cell), (30, 30, 40, 255))
    d = ImageDraw.Draw(sheet)
    for i, (label, img) in enumerate(items):
        w, h = img.size
        s = min(1.0, (cell - 22) / max(w, h))
        klein = img.resize((max(1, int(w * s)), max(1, int(h * s))), Image.NEAREST)
        cx, cy = (i % cols) * cell, (i // cols) * cell
        sheet.paste(klein, (cx + 8, cy + 18), klein)
        d.text((cx + 4, cy + 2), f"{label} {w}x{h}", fill=(255, 255, 0, 255))
    sheet.save(SCRATCH / f"cat_{naam}.png")
    print(f"cat_{naam}.png: {len(items)} items")


# --- 1. Additional Houses (sheet, componenten) ---
huizen_sheet = Image.open(ME / "24_Additional_Houses_48x48.png").convert("RGBA")
huizen = componenten(huizen_sheet)
items = []
catalogus["me_huis"] = []
for i, b in enumerate(huizen):
    crop = huizen_sheet.crop(b)
    items.append((f"#h{i}", crop))
    catalogus["me_huis"].append({"id": f"h{i}", "bron": "24_Additional_Houses_48x48.png", "bbox": list(b)})
contact_sheet(items, "huizen")

# --- 2. Villas (sheet, componenten) ---
villa_sheet = Image.open(ME / "7_Villas_48x48.png").convert("RGBA")
villas = componenten(villa_sheet)
items = []
catalogus["me_villa"] = []
for i, b in enumerate(villas):
    crop = villa_sheet.crop(b)
    items.append((f"#v{i}", crop))
    catalogus["me_villa"].append({"id": f"v{i}", "bron": "7_Villas_48x48.png", "bbox": list(b)})
contact_sheet(items, "villas")

# --- 3. Markets (singles) ---
items = []
catalogus["me_markt"] = []
for maat in ("Small", "Medium", "Big"):
    n = 13 if maat != "Big" else 7
    for i in range(1, n):
        p = ME / "9_Shopping_Center_and_Markets_Singles_48x48" / f"ME_Singles_Shopping_Center_and_Markets_48x48_Market_{maat}_{i}.png"
        if not p.exists():
            continue
        im = Image.open(p).convert("RGBA")
        bb = im.getbbox()
        items.append((f"{maat[0]}{i}", im.crop(bb)))
        catalogus["me_markt"].append({"id": f"{maat[0]}{i}", "bron": str(p.relative_to(ME)), "bbox": list(bb)})
contact_sheet(items, "markten")

# --- 4. Themagebouwen en farm ---
thema = {
    "school": ME / "13_School_Singles_48x48" / "ME_Singles_School_48x48_School_1.png",
    "klokketoren": ME / "13_School_Singles_48x48" / "ME_Singles_School_48x48_Clock_Tower_1.png",
    "brandweer": ME / "18_Fire_Station_Singles_48x48" / "ME_Singles_Fire_Station_48x48_Building.png",
    "kerk": ME / "19_Graveyard_Singles_48x48" / "ME_Singles_Graveyard_48x48_Grace_Chapel.png",
    "kerk_hek": ME / "19_Graveyard_Singles_48x48" / "ME_Singles_Graveyard_48x48_Grace_Chapel_With_Gate.png",
    "farm_huis": FARM / "Farmer_House_1_48x48.png",
    "farm_huis2": FARM / "Farmer_House_2_48x48.png",
    "schuur": FARM / "Barn_Small_48x48.png",
    "silo1": FARM / "Silos_1_48x48.png",
    "silo2": FARM / "Silos_2_48x48.png",
    "stal": FARM / "Stable_Example_Outside_48x48.png",
}
items = []
catalogus["thema"] = []
for naam, p in thema.items():
    if not p.exists():
        print(f"  ontbreekt: {p}")
        continue
    im = Image.open(p).convert("RGBA")
    bb = im.getbbox()
    items.append((naam, im.crop(bb)))
    catalogus["thema"].append({"id": naam, "bron": str(p), "bbox": list(bb)})
contact_sheet(items, "thema")

# --- 5. Interieur-thema's (alleen overzicht om te bekijken) ---
for f in sorted((MI / "Theme_Sorter_48x48").glob("*.png")):
    im = Image.open(f)
    s = min(1.0, 1400 / max(im.size))
    klein = im.resize((int(im.width * s), int(im.height * s)), Image.NEAREST)
    klein.save(SCRATCH / f"mi_{f.stem}.png")
print("interieur-thema's als mi_*.png")

json.dump(catalogus, open(OUT, "w"), indent=1)
print(f"catalogus: {sum(len(v) for v in catalogus.values())} assets -> {OUT}")
