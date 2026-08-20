# -*- coding: utf-8 -*-
"""Interieur-compiler Tafeldorp v2: bouwt per binnenlocatie een GESLOTEN,
zelf ingerichte kamer (geen gekopieerde voorbeelden meer).

Opbouw per kamer:
  - vloer + noordmuur (2 tiles, Room_Builder) + dunne zij/onderranden
  - meubels als objecten met voet-botsing en boven/onder-split (zoals buiten)
  - deuropening onderaan met mat = uitgang
Output per kamer: <id>_onder.png, <id>_boven.png, <id>.json en index.json.
"""
import json
from glob import glob
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
VENDOR = ROOT.parent / "familie-assets" / "vendor"
MI48 = VENDOR / "modern-interiors" / "1_Interiors" / "48x48"
RB = MI48 / "Room_Builder_subfiles_48x48"
THEMA = MI48 / "Theme_Sorter_Singles_48x48"
FARM = VENDOR / "modern-farm" / "48x48" / "Single_Files_48x48"
OUT = ROOT / "public" / "assets" / "interieur"

TILE = 48

_vloeren = Image.open(RB / "Room_Builder_Floors_48x48.png").convert("RGBA")
_wanden = Image.open(RB / "Room_Builder_Walls_48x48.png").convert("RGBA")


def vloertegel(c, r):
    return _vloeren.crop((c * TILE, r * TILE, (c + 1) * TILE, (r + 1) * TILE))


def wandpaar(c, r):
    top = _wanden.crop((c * TILE, r * TILE, (c + 1) * TILE, (r + 1) * TILE))
    onder = _wanden.crop((c * TILE, (r + 1) * TILE, (c + 1) * TILE, (r + 2) * TILE))
    return top, onder


VLOER = {
    "parket": vloertegel(1, 10), "plankgeel": vloertegel(1, 12), "houtdonker": vloertegel(1, 16),
    "plankoud": vloertegel(1, 18), "beige": vloertegel(5, 10), "taupe": vloertegel(5, 12),
    "rozediamant": vloertegel(9, 8), "visgraat": vloertegel(9, 10), "grijs": vloertegel(13, 8),
    "grijslicht": vloertegel(13, 10), "groen": vloertegel(13, 2), "creme": vloertegel(5, 2),
}
WAND = {
    "houtdonker": wandpaar(11, 0), "baksteenbruin": wandpaar(11, 2), "rozechecker": wandpaar(11, 4),
    "streep": wandpaar(11, 6), "baksteenrood": wandpaar(11, 8), "rozeplank": wandpaar(11, 12),
    "taupe": wandpaar(11, 14), "kist": wandpaar(11, 16), "plankdonker": wandpaar(11, 18),
    "oranjehout": wandpaar(11, 20), "roodbruin": wandpaar(11, 22),
}

RAND_DONKER = (42, 36, 56, 255)
RAND_LICHT = (214, 210, 224, 255)

# LimeZu-muurstukken uit het Generic Home-design (6_Home_Designs): echte
# Room_Builder-look voor alle kamers. Maten: noordmuur 96px (witte top 18 +
# wandvlak 81 incl contour), zijmuur 45px dik (rand 18 + vlak 24 + lijn 3),
# zuidkap 18px.
_GH = Image.open(VENDOR / "modern-interiors" / "6_Home_Designs" /
                 "Generic_Home_Designs" / "48x48" /
                 "Generic_Home_1_Layer_1_48x48.png").convert("RGBA")
N_VLAK = _GH.crop((192, 15, 240, 96))      # 48x81 wandvlak met contourlijnen
ZIJ_GRIJS = _GH.crop((579, 528, 603, 576))  # 24x48 zijwand-vlak
WIT = (248, 248, 248, 255)
DONKER = (58, 58, 80, 255)
RAND = 18
ZIJ = RAND + 24 + 3
NOORD = 96
ZUID = 18


def getint(img, kleur):
    """Multiply-tint op een muurvlak; contouren blijven donker."""
    if kleur is None:
        return img
    arr = np.array(img).astype(float)
    for i in range(3):
        arr[..., i] *= kleur[i] / 255.0
    return Image.fromarray(arr.clip(0, 255).astype("uint8"))

# NPC-plekken (spiegel van src/core/locaties.ts) voor de debug-render
NPC_PLEK = {
    "thuis": {"tx": 3.2, "ty": 5.6},
    "bakkerij": {"tx": 4.6, "ty": 4.8},
    "school": {"tx": 3, "ty": 6.4},
    "molen": {"tx": 6.5, "ty": 5.4},
    "supermarkt": {"tx": 2.2, "ty": 5.5},
    "boerderij": {"tx": 7, "ty": 5.2},
    "bieb": {"tx": 13.6, "ty": 4.6},
    "sporthal": {"tx": 9, "ty": 6.2},
}


_generic = None


def meubel(map_, nummer):
    """Meubel op exact nummer uit een thema-map; alpha-getrimd.
    map_ == "gen": nummer is een tile-rect (x0,y0,x1,y1) op de 1_Generic-sheet."""
    global _generic
    if map_ == "gen":
        if _generic is None:
            _generic = Image.open(
                MI48 / "Theme_Sorter_48x48" / "1_Generic_48x48.png").convert("RGBA")
        x0, y0, x1, y1 = [int(v * TILE) for v in nummer]
        im = _generic.crop((x0, y0, x1, y1))
        b = im.getbbox()
        return im.crop(b) if b else im
    if isinstance(nummer, str):  # naam-glob (farm-props); "^" = prefix-match
        for pad in (FARM / "Props_and_Buildings_48x48", FARM / "Pickup_Items_48x48"):
            patroon = f"{nummer[1:]}*.png" if nummer.startswith("^") else f"*{nummer}*.png"
            files = sorted(glob(str(pad / patroon)))
            if files:
                im = Image.open(files[0]).convert("RGBA")
                b = im.getbbox()
                return im.crop(b) if b else im
        print(f"    ontbreekt: farm/{nummer}")
        return None
    files = glob(str(THEMA / map_ / f"*_48x48_{nummer}.png"))
    if not files:
        print(f"    ontbreekt: {map_} #{nummer}")
        return None
    im = Image.open(files[0]).convert("RGBA")
    b = im.getbbox()
    return im.crop(b) if b else im


# Uitsnedes uit de 1_Generic-sheet, in tiles (x0, y0, x1, y1).
GEN = {
    "kleed_rood": (9.05, 4.15, 12.95, 6.8),
    "kleed_blauw": (8, 7.2, 12.6, 9.8),
    "kleed_klein_rood": (8.7, 10.7, 10.5, 12.3),
    "kleed_klein_groen": (10.7, 10.7, 12.5, 12.3),
    "kleed_klein_blauw": (10.7, 12.6, 12.5, 14.3),
    "kleed_grijs": (7.9, 13.4, 10.6, 15.2),
    "kleed_paars": (12.05, 21.35, 15.7, 25.1),
    "loper_bruin": (9.05, 22.9, 10.65, 28.7),
    "schilderij_groen": (0, 13.5, 1.7, 14.9),
    "schilderij_vuur": (2, 13.5, 3.7, 14.9),
    "schilderij_landschap": (4, 13.5, 5.7, 14.9),
    "bankje": (0, 15.4, 1.8, 16.9),
    "bankje_oranje": (2, 15.4, 3.8, 16.9),
    "raam_hout": (4.9, 9.2, 6.8, 10.9),
    "raam_dubbel": (6.9, 8.3, 8.7, 9.6),
    "raam_rood": (5.9, 43.3, 7.7, 45.2),
    "raam_beige": (7.9, 43.3, 9.7, 45.2),
    "raam_bruin": (9.9, 43.3, 11.3, 45.2),
    "raam_gordijn_beige": (5.2, 48.4, 7.8, 50.4),
    "raam_gordijn_roze": (8.2, 48.4, 10.8, 50.4),
    "raam_gordijn_blauw": (11.2, 48.4, 13.9, 50.4),
    "palm": (13.02, 25.2, 14.5, 26.95),
    "boompje": (13.05, 28.3, 14.45, 30.7),
    "potplant_1": (5.75, 56.3, 6.65, 58.8),
    "potplant_2": (6.7, 56.3, 7.9, 58.8),
    "potplant_3": (7.9, 56.2, 9.1, 58.8),
    "grote_tafel": (5.4, 33.4, 7.8, 36.1),
    "grote_tafel_bruin": (0.4, 33.4, 2.8, 36.1),
}


# Kamer-definities. Meubels: (thema-map, naampatroon, tx, ty, boven, solide)
# tx/ty in tiles, voet van het meubel op de onderkant van tile ty.
LR = "2_Living_Room_Singles_48x48"
KEUKEN = "12_Kitchen_Singles_48x48"
GROC = "16_Grocery_Store_Singles_48x48"
KLAS = "5_Classroom_and_Library_Singles_48x48"
GYM = "8_Gym_Singles_48x48"
REC = "14_Basement_Singles_48x48"
CONF = "13_Conference_Hall_Singles_48x48"
IJS = "24_Ice_Cream_Shop_Singles_48x48"
BED = "4_Bedroom_Singles_48x48"

# meubels: (thema, nummer-of-farmglob-of-gen-rect, tx, ty, boven[, solide])
# kleden: (thema, nummer, tx, ty_voet) — vloerlaag, onder alle meubels, geen botsing.
# Wanddecor (ramen, borden, schilderijen): voet op ty ~1.15-1.55 zodat het op het
# muurvlak hangt; boven 0.0 en solide False (de muur-collision dekt al).
# Indeling volgens Stardew Valley-principes (referenties 19 aug 2026): meubels
# langs de noordmuur, open midden met kleed, toonbank scheidt de NPC-zone,
# planten in hoeken, mat bij de deur. NPC-posities uit src/core/locaties.ts.
KAMERS = {
    # Farmhouse-look: open leefruimte boven (keukenzone + woonkamer, alleen
    # vloerwissel), slaapkamer | hal beneden. Mama bij het aanrecht (3.2, 5.6).
    "thuis": {
        "b": 18, "h": 15, "vloer": "parket", "wand": "taupe", "mat_bx": 13,
        "muurtint": (255, 244, 225),
        "zones": [
            (0, 2, 7, 7, "grijslicht"),     # keuken (geblokte zone in het hout)
            (0, 10, 7, 14, "rozediamant"),  # slaapkamer
            (8, 10, 17, 14, "beige"),       # hal
        ],
        "hwanden": [(8, 0, 17, 13, 14)],    # boven | beneden, deur boven de mat
        "vwanden": [(8, 10, 14, 11, 12)],   # slaapkamer | hal, met deur
        "kleden": [
            ("gen", GEN["kleed_rood"], 12.6, 6.85),     # zithoek, vrij van de muur
            (KEUKEN, 246, 4, 7.3),                       # onder de eettafel
            ("gen", GEN["kleed_klein_rood"], 13, 12.6),  # hal, voor de deur
        ],
        "meubels": [
            # keuken: aanrechtwand zoals het Stardew-farmhouse
            (KEUKEN, 160, 0.9, 3.9, 0.5),   # koelkast
            (KEUKEN, 109, 2, 3.85, 0.45),   # aanrecht
            (KEUKEN, 153, 3, 3.9, 0.5),     # fornuis
            (KEUKEN, 143, 4.2, 3.85, 0.45),  # spoelbak
            (KEUKEN, 113, 5.4, 3.85, 0.45),  # aanrecht
            ("gen", GEN["raam_hout"], 6.6, 1.55, 0.0, False),
            (KEUKEN, 296, 4, 6.6, 0.3),     # eettafel
            (KEUKEN, 384, 4, 6.68, 0.0, False),   # bord met eten op tafel
            (KEUKEN, 371, 2.7, 6.5, 0.3), (KEUKEN, 368, 5.3, 6.5, 0.3),
            # woonkamer: haard, klok, zithoek op het kleed
            (LR, 89, 10, 4, 0.65),          # staande klok
            ("gen", GEN["raam_gordijn_beige"], 11.9, 1.68, 0.0, False),
            (LR, 110, 14, 4, 0.55),         # haard
            ("gen", GEN["schilderij_vuur"], 16.2, 1.5, 0.0, False),
            (LR, 37, 16.4, 4, 0.55),        # kast
            (LR, 29, 12, 5.9, 0.35),        # bank op het kleed
            (REC, 204, 14.7, 5.9, 0.35),    # fauteuil
            ("gen", GEN["palm"], 16.6, 7.3, 0.55),
            # slaapkamer en hal
            (BED, 224, 2, 13.7, 0.35),      # tweepersoonsbed (papa en mama)
            (LR, 63, 4.1, 13.5, 0.4),       # nachtkastje tussen de bedden
            (BED, 125, 5.8, 13.7, 0.45),    # stapelbed (Eleanor en Ward)
            ("gen", GEN["schilderij_landschap"], 10.5, 9.95, 0.0, False),
            ("gen", GEN["bankje"], 10.5, 11.4, 0.3),   # onder het schilderij
            (LR, 70, 15, 10.85, 0.45),      # dressoir in de hal
            (LR, 18, 16.6, 13.5, 0.4),      # plant in de hal
        ],
    },
    # Bakkerij (Pierre's-look): ovens en broodrekken achter, doorlopende
    # toonbank met vitrines scheidt papa (5.5, 4.4) van de klantenruimte.
    "bakkerij": {
        "b": 14, "h": 10, "vloer": "beige", "wand": "streep",
        "muurtint": (255, 228, 190),
        "kleden": [(KEUKEN, 226, 10.5, 8.4)],
        "meubels": [
            (GROC, 253, 1.6, 3.95, 0.5), (GROC, 254, 3.4, 3.95, 0.5),   # ovens
            (GROC, 203, 5.4, 3.9, 0.5), (GROC, 205, 7.2, 3.9, 0.5),     # broodrekken
            (GROC, 250, 9, 3.9, 0.5),       # stokbroodrek
            ("gen", GEN["raam_rood"], 10.9, 1.55, 0.0, False),
            (GROC, 89, 12.5, 1.45, 0.0, False),   # aanbiedingsbord
            (KEUKEN, 407, 2.6, 5.6, 0.35), (KEUKEN, 408, 4.6, 5.6, 0.35),  # vitrines
            (GROC, 171, 6.5, 5.6, 0.35),    # kassa
            (REC, 3, 10.5, 7.6, 0.3),       # tafeltje in de winkel
            (REC, 109, 9.3, 7.5, 0.25), (REC, 113, 11.7, 7.55, 0.25),
            ("gen", GEN["potplant_2"], 0.9, 8.8, 0.55),
            ("gen", GEN["potplant_3"], 13.1, 8.8, 0.55),
        ],
    },
    # Supermarkt (Pierre's): kassa linksvoor waar de verkoper staat (3, 5.4),
    # koelwand en groentekasten achter, stelling-eilanden in het midden.
    "supermarkt": {
        "b": 16, "h": 12, "vloer": "grijslicht", "wand": "taupe",
        "muurtint": (235, 240, 245),
        "meubels": [
            (GROC, 2, 1.2, 1.45, 0.0, False),   # OPEN-bord
            (GROC, 61, 4.6, 3.9, 0.5), (GROC, 66, 6.6, 3.9, 0.5), (GROC, 71, 8.6, 3.9, 0.5),
            (GROC, 427, 11, 3.9, 0.45), (GROC, 428, 13.2, 3.9, 0.45),  # groente-uitstalling
            (GROC, 88, 14.6, 1.45, 0.0, False),   # prijsbord
            (GROC, 171, 2.2, 6.7, 0.35),    # kassa bij de muur, verkoper erachter
            (GROC, 121, 1.2, 8.4, 0.3),     # winkelmanden voor de balie
            (GROC, 98, 6.5, 7.5, 0.5), (GROC, 100, 9.5, 7.5, 0.5), (GROC, 102, 12.5, 7.5, 0.5),
            (GROC, 148, 14.5, 6.5, 0.35),   # koelvitrine tegen de oostwand
            ("gen", GEN["potplant_2"], 1, 11.1, 0.55),
            ("gen", GEN["potplant_3"], 14.8, 11.1, 0.55),
        ],
    },
    # Klaslokaal: bord en kaarten aan de muur, juf (3, 6.4) bij haar bureau,
    # tafeltjes in twee rijen, boekenkasten in de hoeken.
    "school": {
        "b": 16, "h": 12, "vloer": "plankgeel", "wand": "rozeplank",
        "muurtint": (255, 245, 205),
        "kleden": [("gen", GEN["kleed_klein_groen"], 3, 7.85)],
        "meubels": [
            (KLAS, 45, 0.9, 3.9, 0.55), (KLAS, 47, 2.6, 3.9, 0.55),  # boekenkasten
            (KLAS, 39, 5.5, 4.2, 0.45),     # schoolbord op poten
            (KLAS, 31, 9.5, 1.45, 0.0, False),   # wereldkaart
            (KLAS, 32, 11.5, 1.45, 0.0, False),  # stickerkaart
            (KLAS, 33, 13.4, 1.45, 0.0, False),  # prikbord
            (KLAS, 60, 14.2, 3.9, 0.55),    # kast rechtsachter
            (KLAS, 25, 3, 7.4, 0.3),        # juf-bureau, juf erachter
            (KLAS, 9, 6.5, 7.5, 0.3), (KLAS, 11, 9.5, 7.5, 0.3), (KLAS, 7, 12.5, 7.5, 0.3),
            (KLAS, 15, 6.5, 9.8, 0.3), (KLAS, 17, 9.5, 9.8, 0.3), (KLAS, 21, 12.5, 9.8, 0.3),
            ("gen", GEN["potplant_3"], 13.9, 10.9, 0.55),
        ],
    },
    # Bieb (Stardew-museum): kastenwand achter, lage schappen als eilanden,
    # balie rechts waar de bibliothecaresse staat (13.6, 4.6), leeshoek rechtsonder.
    "bieb": {
        "b": 16, "h": 12, "vloer": "houtdonker", "wand": "baksteenbruin",
        "muurtint": (240, 225, 200),
        "kleden": [("gen", GEN["kleed_grijs"], 12, 10.3)],
        "meubels": [
            (KLAS, 74, 1, 3.9, 0.55), (KLAS, 70, 2.9, 3.9, 0.55), (KLAS, 62, 4.8, 3.9, 0.55),
            (KLAS, 64, 6.7, 3.9, 0.55), (KLAS, 72, 8.6, 3.9, 0.55),
            ("gen", GEN["raam_bruin"], 11, 1.55, 0.0, False),
            (KLAS, 59, 14.9, 3.9, 0.55),    # smalle kast in de noordoost-hoek
            (KLAS, 49, 13.6, 5.8, 0.35),    # uitleenbalie
            (KLAS, 43, 3.5, 7, 0.45), (KLAS, 44, 7, 7, 0.45),   # schap-eilanden
            (KLAS, 46, 3.5, 9.6, 0.45),
            ("gen", GEN["grote_tafel"], 12, 9.2, 0.3),   # leestafel
            (REC, 205, 14.6, 8.9, 0.35),    # fauteuil
            (LR, 84, 14.55, 7.3, 0.65),     # leeslamp
            ("gen", GEN["boompje"], 0.9, 11.2, 0.5),
        ],
    },
    # Sporthal: spiegels en cardio achter, badmeester Bas vrij op de vloer
    # (9, 6.2), matten midden, krachthoek links, boksbal rechts.
    "sporthal": {
        "b": 18, "h": 13, "vloer": "grijs", "wand": "taupe",
        "muurtint": (225, 230, 238),
        "meubels": [
            (GYM, 131, 2.2, 3.35, 0.5), (GYM, 131, 4, 3.35, 0.5),   # spiegels
            (GYM, 186, 6.5, 4, 0.35), (GYM, 187, 8.5, 4, 0.35),   # loopbanden
            (GYM, 188, 10.5, 4, 0.35),      # crosstrainer
            (GYM, 167, 13.5, 3.95, 0.4), (GYM, 169, 15.7, 3.95, 0.4),  # halterrekken
            (GYM, 96, 2.2, 6.8, 0.35),      # gewichtenbank
            (GYM, 106, 1.5, 8.2, 0.3), (GYM, 107, 2.5, 8.4, 0.3),  # kettlebells
            (GYM, 73, 3.5, 9.6, 0.3),       # gymbal
            (GYM, 88, 12.55, 8.05, 0.0, False),  # halterstang op de mat
            (GYM, 198, 6.5, 9, 0.0, False), (GYM, 197, 9.5, 9, 0.0, False),
            (GYM, 200, 12.5, 9, 0.0, False),    # matten
            (GYM, 178, 16.6, 6.8, 0.55),    # boksbal
            (GYM, 75, 16.3, 9.3, 0.3),      # bal bij de boksbal
        ],
    },
    # Molenzolder: opslag langs de wanden, meelzakken en hooi; molenaar
    # Mees staat vrij in het midden (6.5, 5.4).
    "molen": {
        "b": 12, "h": 10, "vloer": "plankoud", "wand": "kist",
        "muurtint": (235, 215, 185),
        "meubels": [
            (REC, 64, 1.2, 3.85, 0.4), (REC, 65, 2.9, 3.8, 0.4),   # kratten
            (GROC, 436, 5, 3.75, 0.3), (GROC, 437, 6.8, 3.75, 0.3),  # meelzakken
            (CONF, 45, 9, 3.85, 0.4), (CONF, 46, 10.3, 3.85, 0.4),   # vaten
            (KLAS, 41, 10.7, 4.6, 0.6),     # ladder
            ("farm", "Hay_Dry_Pile_48", 2, 7.3, 0.3),
            ("farm", "Hay_Dry_Pile_Small", 9.8, 7.6, 0.3),
            (GROC, 305, 7.9, 4.8, 0.3),     # weegschaal bij de meelzakken
        ],
    },
    # Kerkzaal: gouden drapes, altaarpodium met bloemen, twee kolommen banken
    # met een loper als middenpad naar de deur. Arena van de Tafeldraak.
    "kerk": {
        "b": 14, "h": 13, "vloer": "visgraat", "wand": "baksteenrood",
        "muurtint": (255, 215, 195),
        "kleden": [
            ("gen", GEN["kleed_paars"], 7, 6.2),   # altaarkleed
            ("gen", GEN["loper_bruin"], 7, 12.4),
        ],
        "meubels": [
            (CONF, 6, 1.5, 4.1, 0.7), (CONF, 4, 12.5, 4.1, 0.7),  # drapes
            (CONF, 26, 7, 4.4, 0.4),        # altaarpodium
            (REC, 61, 5.2, 4.2, 0.35), (REC, 63, 8.8, 4.2, 0.35),  # bloemen
            ("gen", GEN["bankje"], 3.2, 8, 0.25), ("gen", GEN["bankje"], 5, 8, 0.25),
            ("gen", GEN["bankje"], 9, 8, 0.25), ("gen", GEN["bankje"], 10.8, 8, 0.25),
            ("gen", GEN["bankje"], 3.2, 9.6, 0.25), ("gen", GEN["bankje"], 5, 9.6, 0.25),
            ("gen", GEN["bankje"], 9, 9.6, 0.25), ("gen", GEN["bankje"], 10.8, 9.6, 0.25),
            ("gen", GEN["bankje"], 3.2, 11.2, 0.25), ("gen", GEN["bankje"], 5, 11.2, 0.25),
            ("gen", GEN["bankje"], 9, 11.2, 0.25), ("gen", GEN["bankje"], 10.8, 11.2, 0.25),
            ("gen", GEN["boompje"], 1.1, 11.5, 0.5), ("gen", GEN["boompje"], 12.9, 11.5, 0.5),
        ],
    },
    # Stal (Stardew-barn): lange voederbakken tegen de noordmuur, boer Bram
    # ervoor (7, 5.2), hooi los op de vloer, vaten en kratten in de hoeken.
    "boerderij": {
        "b": 14, "h": 10, "vloer": "plankoud", "wand": "plankdonker",
        "muurtint": (230, 210, 180),
        "meubels": [
            (REC, 66, 1, 3.85, 0.4),        # krat
            ("farm", "^Manger_Horizontal_Full", 3.5, 3.8, 0.45),
            ("farm", "Hay_Manger_Horizontal_Full", 8, 3.8, 0.45),
            ("farm", "Cow_Sign", 5.7, 4.05, 0.3),
            ("farm", "Chicken_Sign", 10.3, 4.05, 0.3),
            (CONF, 45, 11.5, 3.85, 0.4), (CONF, 46, 12.7, 3.85, 0.4),  # vaten
            ("farm", "Nest_Chicken", 2.5, 7, 0.3),
            ("farm", "Hay_Dry_Pile_48", 12, 6.8, 0.3),
            ("farm", "Hay_Dry_Bits_1", 5.5, 7.8, 0.0, False),
            ("farm", "Hay_Dry_Bits_2", 10, 6.3, 0.0, False),
            ("farm", "Hay_Dry_Pile_Small", 9, 8.3, 0.3),
        ],
    },
    # IJssalon: machines en toppings achter, vriesvitrines als toonbank,
    # ijshoorn-beeld, tafeltjes met gekleurde krukken in de zitzone.
    "ijssalon": {
        "b": 13, "h": 10, "vloer": "rozediamant", "wand": "rozechecker",
        "muurtint": (255, 228, 235),
        "kleden": [(KEUKEN, 259, 6, 8.2)],
        "meubels": [
            (IJS, 2, 1.8, 3.9, 0.5),        # softijsmachine-counter
            ("gen", GEN["raam_gordijn_roze"], 6.5, 1.55, 0.0, False),
            (IJS, 13, 9, 1.5, 0.0, False),  # menubord
            (IJS, 101, 11, 3.9, 0.5),       # toppings-counter
            (IJS, 28, 2.5, 5.6, 0.35), (IJS, 34, 4.2, 5.6, 0.35), (IJS, 43, 5.9, 5.6, 0.35),
            (IJS, 100, 7.7, 5.6, 0.35),     # kassa-counter, rij begint bij de muur
            (IJS, 75, 11.6, 7.6, 0.5),      # ijshoorn-beeld
            (REC, 1, 2.5, 8.4, 0.3),        # tafeltje links
            (REC, 103, 1.4, 8.3, 0.25), (REC, 105, 3.6, 8.3, 0.25),
            (REC, 2, 10.2, 8.3, 0.3),       # tafeltje rechts
            (REC, 107, 9.1, 8.2, 0.25),
        ],
    },
}

def bouw(kid, cfg):
    B, Hh = cfg["b"], cfg["h"]
    w, h = B * TILE, Hh * TILE
    onder = Image.new("RGBA", (w, h), (24, 21, 33, 255))
    boven = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    vloer = VLOER[cfg["vloer"]]
    for ty in range(2, Hh):
        for tx in range(B):
            onder.paste(vloer, (tx * TILE, ty * TILE))
    for (zx0, zy0, zx1, zy1, znaam) in cfg.get("zones", []):
        zv = VLOER[znaam]
        for ty in range(zy0, zy1 + 1):
            for tx in range(zx0, zx1 + 1):
                onder.paste(zv, (tx * TILE, ty * TILE))

    # Echte LimeZu-muren (stukken uit het Generic Home-design): noordmuur met
    # wandvlak en witte top, zijmuren met dikte, dunne zuidkap, en witte
    # randen die netjes om de hoeken doorlopen.
    d = ImageDraw.Draw(onder)
    mat_bx = cfg.get("mat_bx", B // 2)
    deur_x0, deur_x1 = (mat_bx - 1) * TILE + 4, (mat_bx + 1) * TILE - 4

    def rand_horizontaal(x0, x1, y):
        d.rectangle([x0, y, x1 - 1, y + 2], fill=DONKER)
        d.rectangle([x0, y + 3, x1 - 1, y + 14], fill=WIT)
        d.rectangle([x0, y + 15, x1 - 1, y + 17], fill=DONKER)

    def rand_verticaal(x, y0, y1):
        d.rectangle([x, y0, x + 2, y1 - 1], fill=DONKER)
        d.rectangle([x + 3, y0, x + 14, y1 - 1], fill=WIT)
        d.rectangle([x + 15, y0, x + 17, y1 - 1], fill=DONKER)

    n_vlak = getint(N_VLAK, cfg.get("muurtint"))
    zij_grijs = getint(ZIJ_GRIJS, cfg.get("muurtint"))

    def noordvlak(x0, x1, y):
        """Wandvlak (81px hoog) getegeld over [x0, x1)."""
        for x in range(x0, x1, TILE):
            onder.paste(n_vlak.crop((0, 0, min(TILE, x1 - x), 81)), (x, y))

    # 1. noordmuur: witte top + wandvlak over de volle breedte
    d.rectangle([0, 0, w - 1, 2], fill=DONKER)
    d.rectangle([0, 3, w - 1, 14], fill=WIT)
    noordvlak(0, w, 15)
    # 2. zuidkap met deuropening
    rand_horizontaal(0, deur_x0, h - ZUID)
    rand_horizontaal(deur_x1, w, h - ZUID)
    d.rectangle([deur_x0 - 2, h - ZUID, deur_x0, h - 1], fill=DONKER)
    d.rectangle([deur_x1, h - ZUID, deur_x1 + 2, h - 1], fill=DONKER)
    # 3. zijwand-vlakken tussen noordmuur en zuidkap
    for y in range(NOORD, h - ZUID, TILE):
        hh = min(TILE, h - ZUID - y)
        onder.paste(zij_grijs.crop((0, 0, 24, hh)), (RAND, y))
        onder.paste(zij_grijs.crop((0, 0, 24, hh)), (w - RAND - 24, y))
    d.rectangle([RAND + 24, NOORD, RAND + 26, h - ZUID - 1], fill=DONKER)
    d.rectangle([w - RAND - 27, NOORD, w - RAND - 25, h - ZUID - 1], fill=DONKER)
    # 4. witte buitenranden links en rechts, over de volle hoogte (hoeken)
    rand_verticaal(0, 0, h)
    rand_verticaal(w - RAND, 0, h)
    # deurmat in de opening
    d.rectangle([deur_x0 + 2, h - 30, deur_x1 - 2, h - 4], fill=(120, 88, 56, 255))
    d.rectangle([deur_x0 + 6, h - 26, deur_x1 - 6, h - 8], fill=(158, 118, 76, 255))

    # binnenmuren: horizontaal = volledig muurprofiel (witte top + wandvlak),
    # verticaal = witte wandband; segmentuiteinden krijgen een nette afsluiting
    hwanden = cfg.get("hwanden", [])
    vwanden = cfg.get("vwanden", [])
    binnen_collisions = []
    for (my, mx0, mx1, gat0, gat1) in hwanden:
        py = my * TILE
        segmenten = []
        seg = None
        for tx in range(mx0, mx1 + 1):
            if gat0 is not None and gat0 <= tx <= gat1:
                seg = None
                continue
            if seg is None:
                seg = [tx, tx]
                segmenten.append(seg)
            seg[1] = tx
        for (sx0, sx1) in segmenten:
            x0, x1 = sx0 * TILE, (sx1 + 1) * TILE
            rand_horizontaal(x0, x1, py - ZUID)
            noordvlak(x0, x1, py)
            d.rectangle([x0, py + 81, x1 - 1, py + 83], fill=DONKER)
            # verticale afsluiting aan beide uiteinden
            d.rectangle([x0, py - ZUID, x0 + 2, py + 83], fill=DONKER)
            d.rectangle([x1 - 3, py - ZUID, x1 - 1, py + 83], fill=DONKER)
            binnen_collisions.append([x0, py - ZUID, x1 - x0, 84 + ZUID])
    for (mx, my0, my1, gat0, gat1) in vwanden:
        px = mx * TILE - 9
        segmenten = []
        seg = None
        for ty in range(my0, my1 + 1):
            if gat0 is not None and gat0 <= ty <= gat1:
                seg = None
                continue
            if seg is None:
                seg = [ty, ty]
                segmenten.append(seg)
            seg[1] = ty
        for (sy0, sy1) in segmenten:
            y0, y1 = sy0 * TILE, (sy1 + 1) * TILE
            rand_verticaal(px, y0, y1)
            d.rectangle([px, y0, px + 17, y0 + 2], fill=DONKER)
            d.rectangle([px, y1 - 3, px + 17, y1 - 1], fill=DONKER)
            binnen_collisions.append([px - 2, y0, 22, y1 - y0])

    collisions = [
        [0, 0, w, NOORD - 4],              # noordmuur
        [0, 0, ZIJ + 2, h],                # links
        [w - ZIJ - 2, 0, ZIJ + 2, h],      # rechts
        [0, h - ZUID - 4, deur_x0, ZUID + 4],
        [deur_x1, h - ZUID - 4, w - deur_x1, ZUID + 4],
    ] + binnen_collisions

    # vloerkleden: onder alle meubels, geen botsing
    for (kmap, knr, ktx, kty) in cfg.get("kleden", []):
        img = meubel(kmap, knr)
        if img is None:
            continue
        px = int((ktx + 0.5) * TILE - img.width / 2)
        py = int((kty + 1) * TILE - img.height)
        onder.alpha_composite(img, (px, py))

    objecten = []
    for spec in cfg["meubels"]:
        map_, patroon, tx, ty, bfrac = spec[:5]
        solide = spec[5] if len(spec) > 5 else True
        img = meubel(map_, patroon)
        if img is None:
            continue
        objecten.append((img, tx, ty, bfrac, solide))

    for img, tx, ty, bfrac, solide in sorted(objecten, key=lambda o: o[2]):
        iw, ih = img.size
        px = int((tx + 0.5) * TILE - iw / 2)
        py = int((ty + 1) * TILE - ih)
        onder.alpha_composite(img, (px, py))
        bh = int(ih * bfrac)
        if bh > 0:
            boven.alpha_composite(img.crop((0, 0, iw, bh)), (px, py))
        if solide:
            voet = ih - bh if bh > 0 else ih
            collisions.append([px + 3, py + bh, iw - 6, max(10, voet - 6)])

    mat = [deur_x0, h - TILE, deur_x1 - deur_x0, TILE]

    OUT.mkdir(parents=True, exist_ok=True)
    onder.convert("RGB").save(OUT / f"{kid}_onder.png")
    heeft_boven = bool(np.array(boven)[..., 3].any())
    if heeft_boven:
        boven.save(OUT / f"{kid}_boven.png")
    data = {
        "wereld": [w, h],
        "spawn": [int((mat_bx) * TILE), h - int(2.4 * TILE)],
        "mat": mat,
        "boven": heeft_boven,
        "collisions": collisions,
    }
    json.dump(data, open(OUT / f"{kid}.json", "w"))

    # debug-render: botsingsvakken (rood), mat (blauw), spawn (groen),
    # NPC-plek (geel) — voor de beloopbaarheidscontrole
    debug = onder.copy()
    if heeft_boven:
        debug.alpha_composite(boven)
    pen = ImageDraw.Draw(debug, "RGBA")
    for cx, cy, cw, ch in collisions:
        pen.rectangle([cx, cy, cx + cw, cy + ch], fill=(255, 40, 40, 70), outline=(255, 0, 0, 255))
    pen.rectangle([mat[0], mat[1], mat[0] + mat[2], mat[1] + mat[3]],
                  fill=(40, 120, 255, 90), outline=(0, 80, 255, 255))
    sx, sy = data["spawn"]
    pen.ellipse([sx - 10, sy - 10, sx + 10, sy + 10], fill=(40, 220, 80, 200))
    if kid in NPC_PLEK:
        nx, ny = NPC_PLEK[kid]["tx"] * TILE, NPC_PLEK[kid]["ty"] * TILE
        pen.ellipse([nx - 12, ny - 12, nx + 12, ny + 12], outline=(255, 220, 0, 255), width=3)
    debug_dir = ROOT / "scripts" / "debug"
    debug_dir.mkdir(parents=True, exist_ok=True)
    debug.convert("RGB").save(debug_dir / f"{kid}_debug.png")
    print(f"{kid}: {B}x{Hh}, {len(objecten)} meubels, {len(collisions)} botsingsvakken")


def main():
    for kid, cfg in KAMERS.items():
        bouw(kid, cfg)
    json.dump({"kamers": sorted(KAMERS.keys())}, open(OUT / "index.json", "w"))


if __name__ == "__main__":
    main()
