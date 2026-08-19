# -*- coding: utf-8 -*-
"""UI-assets voor Tafeldorp uit de Modern UI-pack (LimeZu, stijl 1: hout).
Cropt panelen, knoppen en iconen naar public/assets/ui/ (gitignored).
Draaien: python scripts/bouw-ui.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BRON = ROOT.parent / "familie-assets" / "vendor" / "modern-ui" / "48x48" / "Modern_UI_Style_1_48x48.png"
OUT = ROOT / "public" / "assets" / "ui"

im = Image.open(BRON).convert("RGBA")

# (naam, ruwe crop-box); alpha-trim erna zodat de randen exact kloppen
CROPS = {
    "paneel-hout": (18, 16, 120, 118),    # ornate houtframe (dialogen)
    "paneel-rond": (162, 380, 256, 480),  # afgerond paneel met bruine rand
    "knop": (174, 748, 248, 824),         # lichte toets (actief)
    "knop-ingedrukt": (32, 748, 106, 826),  # donkere toets (ingedrukt)
    "hart": (630, 477, 700, 527),
    "ster": (518, 52, 577, 97),
    "check": (420, 1112, 472, 1150),
    "kruis": (428, 1062, 470, 1102),
    "munt": (430, 1164, 520, 1244),
    "naamplaat": (802, 1154, 946, 1208),
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for naam, box in CROPS.items():
        crop = im.crop(box)
        b = crop.getbbox()
        if b:
            crop = crop.crop(b)
        crop.save(OUT / f"{naam}.png")
        print(f"{naam}: {crop.size[0]}x{crop.size[1]}")


if __name__ == "__main__":
    main()
