# -*- coding: utf-8 -*-
"""Tafelbaas-battlers uit de Fantasy Battlers-pack (Aleksandr Makarov):
per locatie een monster, oplopend eng langs de missie-volgorde.
Kopieert de x2-varianten naar public/assets/battlers/ (gitignored).
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BRON = ROOT.parent / "familie-assets" / "vendor" / "reference" / "fantasy-battlers" / \
    "Fantasy Battlers - Complete" / "x2 size"
OUT = ROOT / "public" / "assets" / "battlers"

# locatie -> battler-nummer, oplopend eng in missie-volgorde
KEUZE = {
    "bakkerij": "01",   # deeg-uiltje
    "school": "10",     # scholiertje met bordje
    "molen": "29",      # meel-paddenstoel
    "speeltuin": "12",  # slijmpje
    "supermarkt": "05", # hamster-dief
    "zwembad": "11",    # kristal-golem
    "boerderij": "16",  # zombie-hagedis
    "bieb": "22",       # inktvis-tovenaar
    "sporthal": "25",   # hoorn-krijger
    "kerk": "27",       # rode draak (super-eindbaas)
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for locatie, nr in KEUZE.items():
        pad = BRON / f"{nr}.png"
        im = Image.open(pad).convert("RGBA")
        b = im.getbbox()
        if b:
            im = im.crop(b)
        im.save(OUT / f"{locatie}.png")
        print(f"{locatie}: #{nr} {im.size[0]}x{im.size[1]}")


if __name__ == "__main__":
    main()
