# -*- coding: utf-8 -*-
"""Contact sheets van de Modern Interiors-thema's (singles, genummerd), zodat
kamerinrichting op exact nummer gekozen kan worden. Output: scripts/contact/
(gitignored, vendor-materiaal). Elke sheet max ~1000x1650 zodat hij 1:1 leesbaar
in beeld komt."""
import re
from glob import glob
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
MI48 = ROOT.parent / "familie-assets" / "vendor" / "modern-interiors" / "1_Interiors" / "48x48"
THEMA = MI48 / "Theme_Sorter_Singles_48x48"
OUT = ROOT / "scripts" / "contact"

COLS = 10
CEL_B, CEL_H = 100, 124
RIJEN_PER_SHEET = 13

THEMAS = [
    "2_Living_Room_Singles_48x48",
    "5_Classroom_and_Library_Singles_48x48",
    "8_Gym_Singles_48x48",
    "12_Kitchen_Singles_48x48",
    "13_Conference_Hall_Singles_48x48",
    "14_Basement_Singles_48x48",
    "16_Grocery_Store_Singles_48x48",
    "24_Ice_Cream_Shop_Singles_48x48",
]

try:
    FONT = ImageFont.truetype("arial.ttf", 15)
except OSError:
    FONT = ImageFont.load_default()


def nummer(pad):
    m = re.search(r"_(\d+)\.png$", pad)
    return int(m.group(1)) if m else -1


def maak_sheets(map_):
    files = sorted(glob(str(THEMA / map_ / "*.png")), key=nummer)
    per = COLS * RIJEN_PER_SHEET
    kort = map_.split("_Singles")[0]
    for si in range(0, len(files), per):
        blok = files[si:si + per]
        rijen = (len(blok) + COLS - 1) // COLS
        sheet = Image.new("RGB", (COLS * CEL_B, rijen * CEL_H), (52, 48, 64))
        d = ImageDraw.Draw(sheet)
        for i, f in enumerate(blok):
            cx, cy = (i % COLS) * CEL_B, (i // COLS) * CEL_H
            im = Image.open(f).convert("RGBA")
            b = im.getbbox()
            if b:
                im = im.crop(b)
            if im.width > CEL_B - 8 or im.height > CEL_H - 28:
                s = min((CEL_B - 8) / im.width, (CEL_H - 28) / im.height)
                im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.NEAREST)
            sheet.paste(im, (cx + (CEL_B - im.width) // 2, cy + (CEL_H - 24 - im.height) // 2), im)
            d.rectangle([cx, cy + CEL_H - 22, cx + CEL_B - 1, cy + CEL_H - 1], fill=(30, 27, 40))
            d.text((cx + CEL_B // 2, cy + CEL_H - 12), str(nummer(f)), font=FONT,
                   fill=(240, 240, 245), anchor="mm")
            d.rectangle([cx, cy, cx + CEL_B - 1, cy + CEL_H - 1], outline=(80, 76, 96))
        naam = f"{kort}_{si // per + 1}.png"
        sheet.save(OUT / naam)
        print(f"{naam}: {len(blok)} items")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for t in THEMAS:
        maak_sheets(t)


if __name__ == "__main__":
    main()
