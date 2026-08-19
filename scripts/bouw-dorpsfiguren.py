# -*- coding: utf-8 -*-
"""Dorpsfiguren: kopieert de gekozen LimeZu premade-characters naar
public/assets/dorp/<naam>/sheet_48.png (zelfde sheet-layout als de familie,
dus dezelfde animatie-registratie werkt) en genereert per figuur een
pixel-art dialoogportret (headshot uit het front-frame, 2x geschaald op een
128x128 canvas). Toewijzing besloten 19 aug 2026 (zie docs/ontwerp.md)."""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PREMADE = (ROOT.parent / "familie-assets" / "vendor" / "modern-interiors" /
           "2_Characters" / "Character_Generator" / "0_Premade_Characters" / "48x48")
OUT = ROOT / "public" / "assets" / "dorp"

# naam -> premade-nummer. De overige locaties worden bemand door het gezin in
# rol-outfits (familie-assets characters8, besluit 19 aug 2026).
FIGUREN = {
    "kees": 7,    # kruidenier Kees (uniformpet) - supermarkt
    "bas": 19,    # badmeester Bas (pet en snor) - zwembad
}

FRONT = (144, 0, 192, 96)   # static-down frame
KOP = (144, 22, 192, 82)    # headshot binnen het frame


def main():
    for naam, nr in FIGUREN.items():
        bron = PREMADE / f"Premade_Character_48x48_{nr:02d}.png"
        d = OUT / naam
        d.mkdir(parents=True, exist_ok=True)
        sheet = Image.open(bron).convert("RGBA")
        sheet.save(d / "sheet_48.png")

        kop = sheet.crop(KOP)
        kop = kop.resize((kop.width * 2, kop.height * 2), Image.NEAREST)
        canvas = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
        canvas.alpha_composite(kop, ((128 - kop.width) // 2, 128 - kop.height))
        canvas.save(d / "portret.png")
        print(f"{naam}: premade {nr:02d} + portret")


if __name__ == "__main__":
    main()
