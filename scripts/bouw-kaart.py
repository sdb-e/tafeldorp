# -*- coding: utf-8 -*-
"""Kaartcompiler Tafeldorp v3: dorp in Modern Exteriors-stijl (48px), volgens
docs/kaartontwerp.md. Assets uit scripts/catalogus.json (inventariseer-assets.py).

Autotiles (stoep, water, zwembad) worden niet met handmatige indices gelegd:
elk stuk wordt geclassificeerd op materiaal per regio (3x3) en per cel wordt
het best passende stuk gekozen op basis van de buren.

Output in public/assets/kaart/ (gitignored):
  kaart_onder.png, kaart_boven.png, kaart.json
"""
import json
import random
import re
from glob import glob
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
VENDOR = ROOT.parent / "familie-assets" / "vendor"
ME = VENDOR / "modern-exteriors" / "Modern_Exteriors_48x48" / "ME_Theme_Sorter_48x48"
FARM = VENDOR / "modern-farm" / "48x48" / "Single_Files_48x48" / "Props_and_Buildings_48x48"
OUT = ROOT / "public" / "assets" / "kaart"

TILE = 48
W, H = 100, 76

CAT = json.load(open(ROOT / "scripts" / "catalogus.json"))
_sheets = {}


def sheet(naam):
    if naam not in _sheets:
        _sheets[naam] = Image.open(ME / naam).convert("RGBA")
    return _sheets[naam]


def asset(groep, aid):
    for a in CAT[groep]:
        if a["id"] == aid:
            if groep in ("me_huis", "me_villa"):
                bron = {"me_huis": "24_Additional_Houses_48x48.png", "me_villa": "7_Villas_48x48.png"}[groep]
                return sheet(bron).crop(tuple(a["bbox"]))
            pad = (ME / a["bron"]) if groep == "me_markt" else Path(a["bron"])
            return Image.open(pad).convert("RGBA").crop(tuple(a["bbox"]))
    raise KeyError(f"{groep}:{aid}")


# ---------- autotile-engine ----------
def regiosig(img, pred):
    """9-vector: fractie pred-pixels per 3x3-regio."""
    arr = np.array(img.convert("RGBA"))
    h, w = arr.shape[:2]
    sig = []
    for ry in range(3):
        for rx in range(3):
            r = arr[ry * h // 3:(ry + 1) * h // 3, rx * w // 3:(rx + 1) * w // 3]
            a = r[..., 3] > 40
            if a.sum() == 0:
                sig.append(0.0)
                continue
            sig.append(float(pred(r).sum()) / float(a.sum()))
    return np.array(sig)


GEWICHT = np.array([1, 1, 1, 1, 4, 1, 1, 1, 1], dtype=float)  # centrum telt zwaar


class Familie:
    """Autotile-familie: 48x48-stukken + materiaal-predicaat.

    Matching: signaturen gebinariseerd (materiaal aanwezig per 3x3-regio) en
    gewogen hamming-afstand, met de float-afstand als tie-breaker. Dat kiest
    rechte randen op rechte randen in plaats van 'bijna passende' diagonalen.
    """

    def __init__(self, patroon, pred):
        self.stukken = []
        for p in sorted(glob(patroon), key=lambda p: int(re.search(r"_(\d+)\.png$", p).group(1))):
            im = Image.open(p).convert("RGBA")
            if im.size != (TILE, TILE):
                continue
            sig = regiosig(im, pred)
            self.stukken.append((im, sig, (sig > 0.45).astype(float)))
        if not self.stukken:
            raise SystemExit(f"FOUT: geen stukken voor {patroon}")

    def kies(self, gewenst):
        def score(s):
            ham = float((np.abs(s[2] - gewenst) * GEWICHT).sum())
            fijn = float(((s[1] - gewenst) ** 2).sum())
            return (ham, fijn)
        return min(self.stukken, key=score)[0]


def is_water(r):
    rr, g, b = r[..., 0].astype(int), r[..., 1].astype(int), r[..., 2].astype(int)
    return (b > rr + 25) & (b > g) & (r[..., 3] > 40)


def is_stoep(r):
    rr, g, b = r[..., 0].astype(int), r[..., 1].astype(int), r[..., 2].astype(int)
    licht = (rr > 175) & (g > 165) & (b > 140)
    return licht & (r[..., 3] > 40)


def is_badwater(r):
    rr, g, b = r[..., 0].astype(int), r[..., 1].astype(int), r[..., 2].astype(int)
    return (b > 150) & (b > rr + 30) & (g > 120) & (r[..., 3] > 40)


FAM_WATER = Familie(str(ME / "1_Terrains_and_Fences_Singles_48x48" / "*Grass_Water_1_*.png"), is_water)
FAM_STOEP = Familie(str(ME / "2_City_Terrains_Singles_48x48" / "*Sidewalk_2_*.png"), is_stoep)
FAM_BAD = Familie(str(ME / "14_Swimming_Pool_Singles_48x48" / "*Pool_2_*.png"), is_badwater)

# grasvulling: puurste gras-stukken uit Grass_1
_grasfam = Familie(str(ME / "1_Terrains_and_Fences_Singles_48x48" / "*Grass_1_*.png"),
                   lambda r: (r[..., 1].astype(int) > r[..., 0]) & (r[..., 1].astype(int) > r[..., 2]))
GRAS = [s[0] for s in _grasfam.stukken if float(s[1].min()) > 0.85][:6] or [_grasfam.stukken[0][0]]

# bomen (Camping): compleet, gegroepeerd op maat
BOMEN = {"groot": [], "middel": [], "klein": []}
for p in glob(str(ME / "11_Camping_Singles_48x48" / "*_Tree_*.png")):
    if "Dead" in p or "Props" in p or "Wall" in p or "Stick" in p:
        continue
    im = Image.open(p).convert("RGBA")
    b = im.getbbox()
    if not b:
        continue
    im = im.crop(b)
    if im.height >= 200:
        BOMEN["groot"].append(im)
    elif im.height >= 150:
        BOMEN["middel"].append(im)
    else:
        BOMEN["klein"].append(im)
# geen Tree_Wall_Modular: die segmenten hebben een ingebakken gras-achtergrond
# die als donkere rechthoek afsteekt tegen onze grastegels
BOSWAND = []


def prop(patroon):
    files = sorted(glob(str(ME / patroon)))
    if not files:
        print(f"  let op: geen prop voor {patroon}")
        return None
    im = Image.open(files[0]).convert("RGBA")
    b = im.getbbox()
    return im.crop(b) if b else im


BANK = prop("3_City_Props_Singles_48x48/*_Bench_1.png")
LANTAARN = prop("3_City_Props_Singles_48x48/*Street_Light*_1.png") or prop("3_City_Props_Singles_48x48/*Lamp*_1.png")
FONTEIN = prop("17_Garden_Singles_48x48/*Fountain*_1.png") or prop("17_Garden_Singles_48x48/*Angel_Statue_1.png")
BLOEMVAAS = prop("17_Garden_Singles_48x48/*Big_Red_Flower_Vase_1.png")
BLOEMVAAS2 = prop("17_Garden_Singles_48x48/*Big_Sunflower_Vase_1.png")
VOGELHUIS = prop("17_Garden_Singles_48x48/*Blue_Little_Bird_House_1.png")
TRAMPOLINE = asset("me_villa", "v10")
BOOMHUT = asset("me_villa", "v14")
SPEELTOESTEL = prop("13_School_Singles_48x48/*Yard_Toy_1.png")
WIPTOESTEL = prop("13_School_Singles_48x48/*Yard_Toy_11.png")

# ---------- terrein-grids ----------
stoep = [[False] * W for _ in range(H)]
water = [[False] * W for _ in range(H)]
bad = [[False] * W for _ in range(H)]


def vul(grid, x0, y0, x1, y1):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            grid[y][x] = True


# lanen en plein (stoep), zie docs/kaartontwerp.md
vul(stoep, 44, 32, 60, 42)      # plein
vul(stoep, 51, 12, 52, 32)      # noordlaan
vul(stoep, 51, 42, 52, 66)      # zuidlaan
vul(stoep, 8, 36, 44, 37)       # westlaan
vul(stoep, 60, 36, 92, 37)      # oostlaan
vul(stoep, 17, 29, 20, 36)      # schoolpad
vul(stoep, 8, 29, 28, 32)       # schoolplein
vul(stoep, 39, 19, 40, 32)      # pad sporthal
vul(stoep, 77, 26, 78, 36)      # pad boerderij
vul(stoep, 86, 37, 87, 44)      # pad molen
vul(stoep, 53, 56, 70, 57)      # pad bieb
vul(stoep, 18, 38, 19, 50)      # pad kerk
vul(stoep, 30, 42, 31, 47)      # pad speeltuin
vul(stoep, 44, 60, 50, 61)      # pad thuis
vul(stoep, 68, 60, 76, 61)      # pad brandweer

# water: vijver bij de kerk; zwembadbad apart (eigen familie)
vul(water, 6, 56, 13, 63)
vul(bad, 57, 13, 62, 16)

objecten = []
locaties = []


def solide_bbox(img):
    """Bounding box van echt solide pixels (alpha >= 200): schaduwen tellen niet."""
    a = np.array(img)[..., 3]
    ys, xs = np.where(a >= 200)
    if len(xs) == 0:
        return (0, 0, img.width, img.height)
    return (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)


def band_bbox(img, y0, y1):
    """Horizontale extent van solide pixels binnen rijen y0..y1. Zo bepaalt de
    gevel zelf de botsingsbreedte, niet het bredere dak of de schaduw ernaast."""
    a = np.array(img)[..., 3]
    band = a[max(0, y0):max(0, y1)]
    xs = np.where(band >= 200)[1]
    if len(xs) == 0:
        return (0, img.width)
    return (int(xs.min()), int(xs.max()) + 1)


def zet(img, tx, ty, boven=0.55, solide=True, naam=None, tafel=None, binnen=None,
        deur_dx=0.0, porch=0, extra_solide=(), voet="breed", voorgrond_h=0):
    """porch = hoogte in px onderaan de sprite die beloopbaar is (terras/trap);
    de deurzone ligt bij de echte deur (deur_dx in tiles t.o.v. het midden).
    extra_solide = [x, y, w, h]-vakken in sprite-pixels (linksboven-origine)
    voor hekjes, balustrades en trapranden binnen de porch."""
    objecten.append({"img": img, "tx": tx, "ty": ty, "boven": boven, "solide": solide,
                     "porch": porch, "extra_solide": list(extra_solide), "voet": voet,
                     "voorgrond_h": voorgrond_h})
    if naam:
        dx = int((tx + 0.5) * TILE + deur_dx * TILE)
        gevel = int((ty + 1) * TILE) - porch
        locaties.append({
            "naam": naam, "tafel": tafel, "binnen": binnen,
            "deur": [dx - 50, gevel - 36, 100, 96],
            "bordpos": [dx, gevel + 6],
        })


rng = random.Random(12)


def boom(tx, ty, maat="middel"):
    zet(rng.choice(BOMEN[maat]), tx, ty, boven=0.6, voet="stam")


# ---------- gebouwen ----------
zet(asset("thema", "school"), 17, 28, naam="School", tafel=5, binnen="school", boven=0.5,
    porch=100, deur_dx=-4.2, extra_solide=[[180, 992, 14, 100], [518, 992, 14, 100]])
zet(asset("me_huis", "h46"), 40, 17, naam="Sporthal", tafel=9, binnen="sporthal",
    porch=48, deur_dx=-0.66, extra_solide=[[0, 387, 240, 44], [312, 387, 303, 44]])
zet(asset("thema", "farm_huis2"), 76, 15, naam="Boerderij", tafel=7, binnen="boerderij",
    deur_dx=2.2, porch=35)
zet(asset("thema", "schuur"), 87, 15)
zet(asset("thema", "stal"), 80, 24)
zet(asset("thema", "silo1"), 94, 16)
zet(asset("me_huis", "h47"), 87, 45, naam="Molen", tafel=10, binnen="molen")
zet(asset("thema", "silo2"), 92, 45)
zet(asset("me_markt", "S9"), 34, 35, naam="Bakkerij", tafel=2, binnen="bakkerij", deur_dx=-1.0)
zet(asset("me_markt", "B3"), 40, 31, naam="Supermarkt", tafel=4, binnen="supermarkt", deur_dx=-0.5)
zet(asset("me_markt", "S3"), 56, 31, naam="IJssalon", tafel=None, binnen="ijssalon", deur_dx=-1.0)
zet(asset("me_markt", "S5"), 46, 52, naam="Kapper", tafel=None, binnen="kapper", deur_dx=-1.0)
zet(asset("me_huis", "h42"), 70, 55, naam="Bibliotheek", tafel=8, binnen="bieb", deur_dx=-7.4)
zet(asset("thema", "kerk"), 18, 58, naam="Kerk", tafel="eindbaas", binnen="kerk", porch=33)
zet(asset("thema", "klokketoren"), 24, 57)
VILLA_HEK = [[0, 598, 58, 25], [216, 598, 196, 25], [4, 528, 18, 95], [409, 528, 18, 95]]
zet(asset("me_villa", "v0"), 46, 68, naam="Thuis", tafel=1, binnen="thuis",
    porch=95, deur_dx=-1.75, extra_solide=VILLA_HEK, voorgrond_h=34)
zet(asset("me_villa", "v1"), 36, 68, porch=95, extra_solide=VILLA_HEK, voorgrond_h=34)
zet(asset("me_villa", "v2"), 56, 68, porch=95, extra_solide=VILLA_HEK, voorgrond_h=34)
zet(asset("thema", "brandweer"), 84, 69, naam="Brandweer", tafel=None, binnen=None, deur_dx=-2.6)
# speeltuin (buiten)
zet(TRAMPOLINE, 28, 48, boven=0.0, naam="Speeltuin", tafel=3, binnen=None)
zet(BOOMHUT, 34, 50, boven=0.55)
if SPEELTOESTEL: zet(SPEELTOESTEL, 25, 50, boven=0.2)
if WIPTOESTEL: zet(WIPTOESTEL, 27, 52, boven=0.0)
# zwembad is een buitenlocatie zonder gebouw: alleen een zone bij het bad
locaties.append({"naam": "Zwembad", "tafel": 6, "binnen": None,
                 "deur": [57 * TILE, 17 * TILE, 6 * TILE, 60], "bordpos": [60 * TILE, 18 * TILE]})

# plein-decoratie
if FONTEIN: zet(FONTEIN, 51, 36, boven=0.3)
for bx, by in [(45, 33), (59, 33), (45, 41), (59, 41)]:
    if LANTAARN: zet(LANTAARN, bx, by, boven=0.4)
for bx, by in [(47, 38), (55, 38)]:
    if BANK: zet(BANK, bx, by, boven=0.0)
for bx, by in [(46, 34), (58, 34), (46, 40), (58, 40)]:
    if BLOEMVAAS: zet(BLOEMVAAS if (bx + by) % 2 else BLOEMVAAS2, bx, by, boven=0.0)
if VOGELHUIS: zet(VOGELHUIS, 10, 54, boven=0.2)

# losse bomen door het dorp
for bx, by, m in [(33, 27, "middel"), (48, 28, "klein"), (62, 30, "middel"), (68, 35, "groot"),
                  (34, 41, "klein"), (24, 40, "middel"), (12, 42, "groot"), (28, 58, "middel"),
                  (40, 55, "klein"), (54, 50, "middel"), (62, 46, "groot"), (78, 42, "middel"),
                  (82, 55, "groot"), (66, 64, "middel"), (27, 64, "groot"), (14, 68, "middel"),
                  (66, 20, "groot"), (46, 14, "middel"), (56, 24, "klein"), (70, 12, "middel"),
                  (90, 30, "middel"), (10, 22, "groot"), (12, 12, "middel"), (32, 14, "groot"),
                  (94, 52, "middel"), (92, 62, "groot"), (22, 52, "klein"), (94, 68, "middel")]:
    boom(bx, by, m)


def bosrand():
    stroken = []
    for basis_y in (int(2.2 * TILE), int(4.4 * TILE)):
        x = -60
        while x < W * TILE + 60:
            img = rng.choice(BOSWAND + BOMEN["groot"])
            stroken.append((img, x, basis_y + rng.randint(-12, 12)))
            x += img.width - rng.randint(36, 60)
    # onderrand: kleine bomen met de voet op de kaartrand, zodat de kruinen
    # de deuren van de onderste gebouwen niet bedekken
    for basis_y, maat in (((H - 1) * TILE + 24, "klein"), (H * TILE + 20, "middel")):
        x = -60
        while x < W * TILE + 60:
            img = rng.choice(BOMEN[maat])
            stroken.append((img, x, basis_y + rng.randint(-8, 8)))
            x += img.width - rng.randint(24, 40)
    for x_basis in (-20, int(1.6 * TILE), (W - 3) * TILE, int((W - 1.4) * TILE)):
        y = int(4 * TILE)
        while y < (H - 1) * TILE + 60:
            img = rng.choice(BOMEN["groot"] + BOMEN["middel"])
            stroken.append((img, x_basis + rng.randint(-14, 14), y))
            y += img.height - rng.randint(60, 90)
    return stroken


def _buurvector(grid, x, y):
    v = []
    for ry in (-1, 0, 1):
        for rx in (-1, 0, 1):
            nx, ny = x + rx, y + ry
            binnen = 0 <= nx < W and 0 <= ny < H and grid[ny][nx]
            v.append(1.0 if binnen else 0.0)
    return np.array(v)


def teken_familie(canvas, grid, fam):
    """Stoep-achtig: het stuk ligt op de cel zelf; randen zitten in het stuk.
    Cellen met alle vier zijburen gevuld krijgen altijd de vulling (voorkomt
    donkere schaduwhoeken op binnenhoeken)."""
    vulling = fam.kies(np.ones(9))
    for y in range(H):
        for x in range(W):
            if not grid[y][x]:
                continue
            v = _buurvector(grid, x, y)
            if v[1] and v[3] and v[5] and v[7]:
                canvas.paste(vulling, (x * TILE, y * TILE))
            else:
                canvas.paste(fam.kies(v), (x * TILE, y * TILE))


def _waterstuk(n):
    p = ME / "1_Terrains_and_Fences_Singles_48x48" / f"ME_Singles_Terrains_and_Fences_48x48_Grass_Water_1_{n}.png"
    return Image.open(p).convert("RGBA")


def teken_water(canvas, grid, fam):
    """Water-achtig (LimeZu): watercellen zijn puur water, behalve de noordoever
    die een zandbank-tile op de watercel krijgt (5/6/7). De overige oevers zijn
    gras-stukken met een hap water, op de ring eromheen."""
    puur = fam.kies(np.ones(9))
    bank_m = _waterstuk(6)
    for y in range(H):
        for x in range(W):
            if grid[y][x]:
                grasN = y == 0 or not grid[y - 1][x]
                if grasN:
                    canvas.paste(bank_m, (x * TILE, y * TILE))
                else:
                    canvas.paste(puur, (x * TILE, y * TILE))
                continue
            v = _buurvector(grid, x, y)
            if v.sum() == 0:
                continue
            # zuid-contact wordt door de bank op de watercel afgehandeld
            v[6] = v[7] = v[8] = 0.0
            if v.sum() == 0:
                continue
            v[4] = 0.0
            canvas.paste(fam.kies(v), (x * TILE, y * TILE))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    onder = Image.new("RGBA", (W * TILE, H * TILE))
    boven = Image.new("RGBA", (W * TILE, H * TILE), (0, 0, 0, 0))

    for y in range(H):
        for x in range(W):
            onder.paste(GRAS[(x * 7 + y * 13) % len(GRAS)], (x * TILE, y * TILE))
    teken_familie(onder, stoep, FAM_STOEP)
    teken_water(onder, water, FAM_WATER)
    teken_familie(onder, bad, FAM_BAD)

    collisions = []
    # water: één vak per aaneengesloten gebied, met marge tot op de oeverrand
    # (de gras-tegels met een hap water zijn visueel water en moeten blokkeren)
    for grid, marge in ((water, 26), (bad, 10)):
        gezien = [[False] * W for _ in range(H)]
        for y in range(H):
            for x in range(W):
                if grid[y][x] and not gezien[y][x]:
                    stapel = [(x, y)]
                    gezien[y][x] = True
                    x0 = x1 = x
                    y0 = y1 = y
                    while stapel:
                        cx, cy = stapel.pop()
                        x0, x1 = min(x0, cx), max(x1, cx)
                        y0, y1 = min(y0, cy), max(y1, cy)
                        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < W and 0 <= ny < H and grid[ny][nx] and not gezien[ny][nx]:
                                gezien[ny][nx] = True
                                stapel.append((nx, ny))
                    collisions.append([x0 * TILE - marge, y0 * TILE - marge,
                                       (x1 - x0 + 1) * TILE + 2 * marge,
                                       (y1 - y0 + 1) * TILE + 2 * marge])

    voorgronden = []
    rand = [s for s in bosrand()]
    for img, px, py in sorted(rand, key=lambda s: s[2]):
        onder.alpha_composite(img, (px, py - img.height))
        bh = int(img.height * 0.62)
        boven.alpha_composite(img.crop((0, 0, img.width, bh)), (px, py - img.height))
    collisions += [
        [0, 0, W * TILE, int(3.2 * TILE)],
        [0, (H - 3) * TILE, W * TILE, 3 * TILE],
        [0, 0, int(2.2 * TILE), H * TILE],
        [(W - 2) * TILE - 12, 0, 2 * TILE + 12, H * TILE],
    ]

    for o in sorted(objecten, key=lambda o: o["ty"]):
        img = o["img"]
        w, h = img.size
        px = int((o["tx"] + 0.5) * TILE - w / 2)
        py = int((o["ty"] + 1) * TILE - h)
        onder.alpha_composite(img, (px, py))
        bh = int(h * o["boven"])
        if bh > 0:
            boven.alpha_composite(img.crop((0, 0, w, bh)), (px, py))
        if o["solide"]:
            sx0, sy0, sx1, sy1 = solide_bbox(img)
            if o.get("voet") == "stam":
                # stamvak op de echte stam: onderste solide rijen bepalen het
                # midden en de bodem, de schaduwvlek (alpha < 200) telt niet mee
                bx0, bx1 = band_bbox(img, sy1 - 26, sy1)
                collisions.append([px + (bx0 + bx1) / 2 - 20, py + sy1 - 34, 40, 28])
            else:
                voet_top = max(bh, sy0)
                voet_bodem = min(h, sy1) - o.get("porch", 0)
                if voet_bodem - voet_top >= 12:
                    fx0, fx1 = band_bbox(img, voet_top, voet_bodem)
                    collisions.append([px + fx0 + 4, py + voet_top,
                                       (fx1 - fx0) - 8, voet_bodem - voet_top - 4])
        for ex, ey, ew, eh in o.get("extra_solide", []):
            collisions.append([px + ex, py + ey, ew, eh])
        vg = o.get("voorgrond_h", 0)
        if vg > 0:
            strip = img.crop((0, h - vg, w, h))
            fnaam = f"voorgrond_{len(voorgronden)}.png"
            strip.save(OUT / fnaam)
            voorgronden.append({"file": fnaam, "x": px, "y": py + h - vg})

    data = {
        "wereld": [W * TILE, H * TILE],
        "spawn": [int(51.5 * TILE), int(63 * TILE)],
        "collisions": collisions,
        "locaties": locaties,
        "voorgronden": voorgronden,
    }
    onder.convert("RGB").save(OUT / "kaart_onder.png")
    boven.save(OUT / "kaart_boven.png")

    # debug-render: alle botsingsvakken (rood) en deurzones (blauw) ingetekend,
    # voor visuele controle dat niets op schaduw of lege lucht blokkeert
    debug = onder.copy()
    debug.alpha_composite(boven)
    pen = ImageDraw.Draw(debug, "RGBA")
    for cx, cy, cw, ch in collisions:
        pen.rectangle([cx, cy, cx + cw, cy + ch], fill=(255, 40, 40, 70), outline=(255, 0, 0, 255))
    for loc in locaties:
        dx, dy, dw, dh = loc["deur"]
        pen.rectangle([dx, dy, dx + dw, dy + dh], fill=(40, 120, 255, 70), outline=(0, 80, 255, 255))
    debug_dir = ROOT / "scripts" / "debug"
    debug_dir.mkdir(parents=True, exist_ok=True)
    debug.convert("RGB").save(debug_dir / "kaart_debug.png")
    json.dump(data, open(OUT / "kaart.json", "w"), indent=1)
    print(f"kaart: {W*TILE}x{H*TILE}, {len(collisions)} botsingsvakken, {len(locaties)} locaties")
    print(f"bomen: {len(BOMEN['groot'])} groot, {len(BOMEN['middel'])} middel, {len(BOMEN['klein'])} klein; boswand: {len(BOSWAND)}")


if __name__ == "__main__":
    main()
