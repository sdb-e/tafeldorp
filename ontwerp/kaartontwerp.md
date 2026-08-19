# Kaartontwerp Tafeldorp v3 (Modern Exteriors, 48px)

Besluiten (19 aug 2026): alles op de 48px-varianten; buitenwereld uit Modern
Exteriors (+ Modern Farm voor de boerderij), binnenlocaties uit Modern
Interiors. Elke locatie is een gebouw dat je door de deur binnengaat; binnen
is een ingerichte kamer waar de minigame komt. Assets komen uit
`scripts/catalogus.json` (gemaakt door `inventariseer-assets.py`), nooit los
geknipt.

## Wereld: 100x76 tiles, districten

```
  [SCHOOL 5]        [SPORTHAL 9] [ZWEMBAD 6]   [BOERDERIJ 7 + weide]
      |__________________|noordlaan|_______________|
  [winkels: BAKKERIJ 2, SUPERMARKT 4, IJSSALON]    |
      |westlaan|——————[PLEIN + fontein]——————|oostlaan|——[MOLEN 10]
      |                    |                       |
  [KERK ★ + toren]    [zuidlaan]              [BIEB 8 (baksteen)]
      |                    |
  [vijver] [SPEELTUIN 3] [THUIS 1 (villa) + buurvilla's]  [BRANDWEER]
                        [KAPPER]
```

## Gebouw-toewijzing (catalogus-id's)

| Locatie | Tafel | Asset | Interieur (MI-thema) |
|---|---|---|---|
| School | 5 | thema:school (23x23t, klok) | 5 Classroom |
| Sporthal | 9 | me_huis:h46 (rode hal) | 8 Gym |
| Zwembad | 6 | pool-tiles + hek (buitenbad) | buiten-minigame |
| Boerderij | 7 | thema:farm_huis2 + schuur + stal, weide | Farm stal-interieur |
| Molen | 10 | me_huis:h47 windpomp + thema:silo2 | 14 Basement |
| Bakkerij | 2 | me_markt:S9 | 16 Grocery + 12 Kitchen |
| Supermarkt | 4 | me_markt:B3 | 16 Grocery store |
| IJssalon | decor | me_markt:S3 | 24 Ice Cream Shop |
| Kapper | decor | me_markt:S5 | 1 Generic |
| Bibliotheek | 8 | me_huis:h42 (baksteen, boogramen) | 5 Library |
| Kerk | ★ eindbaas | thema:kerk + klokketoren | 13 Conference Hall |
| Thuis | 1 | me_villa:v0 + tuinhek | 2 LivingRoom + 12 Kitchen |
| Brandweer | decor | thema:brandweer | later |
| Speeltuin | 3 | me_villa:v10 trampolines + v14 boomhut + toys | buiten-minigame |

Buurvilla's v1..v3 en h9-serie als woonhuizen zonder functie.

## Terrein en aankleding

- Paden/plein: Sidewalk_2 (klinkers) via automatische rand-classificatie
  (materiaal per zijde gesampled, geen handmatige indices).
- Water: Grass_Water_1 autotiles; vijver bij de kerk, zwembadbad.
- Bosrand: Tree_Wall_Modular-segmenten + losse Camping-bomen (100+ varianten,
  groen/teal/herfst/appel) er doorheen, twee lagen diep.
- Props: City_Props (bankjes, lantaarns, prullenbakken), Garden (bloemen,
  vazen, vogelhuisjes), Villas-bomen; hekken Fence_1 om weide en tuinen.

## Deuren en interieurs

- kaart.json krijgt per locatie een `deur`-rect (voor de gevel) en `binnen`-id.
- Binnengaan = fade naar InteriorScene(binnen-id); elke kamer heeft onderaan
  een deurmat terug naar het dorp (spawn voor de gevel).
- Interieurs gegenereerd door `bouw-interieurs.py`: Room_Builder vloer+muren,
  props uit het thema van de locatie; output per kamer
  `public/assets/interieur/<id>_onder.png`, `_boven.png`, `<id>.json`.

## Interieurs: Stardew-principes (19 aug 2026)

De kamerindelingen volgen de Stardew Valley-interieurs (referenties: farmhouse
tier 2, Pierre's General Store, Stardrop Saloon, Barn — wiki-screenshots):

- Meubels langs de noordmuur, het midden blijft open; een vloerkleed ankert de
  functionele zone (zithoek, klantenruimte, leestafel).
- Toonbanken en vitrines scheiden de NPC-zone van de klantzone (NPC-posities
  uit `src/core/locaties.ts`); praten werkt over de toonbank heen.
- Zonering binnen een kamer via vloerwissel (keukentegels in het parket), niet
  met extra muren; echte binnenmuren alleen in het woonhuis.
- Ramen, gordijnen, schilderijen en borden hangen op het noordmuurvlak
  (voet-ty ~1.15-1.7); planten vullen de hoeken. Niets mag over de witte
  muurkap heen steken.
- Winkel = kassa bij de deur plus stelling-eilanden met brede gangpaden
  (Pierre's), stal = voederbakken tegen de noordmuur plus los hooi (Barn).

Assets: Modern Interiors thema-singles op nummer, gekozen via de contact
sheets uit `scripts/contact-interieurs.py` (output `scripts/contact/`,
gitignored). Generic-items (kleden, ramen, banken, planten) komen als
pixel-crop uit de 1_Generic-sheet via de `GEN`-tabel in `bouw-interieurs.py`;
crop-rects strak houden, aangrenzende sprites geven anders randjes.

## Volgorde van bouwen

1. `bouw-kaart.py` v3: terrein + gebouwen + bosrand + props + collision + deuren.
2. Visuele iteratie op de overzichtsrender en in-game screenshots.
3. `bouw-interieurs.py`: eerst thuis + bakkerij, dan de rest.
4. Phaser: InteriorScene + deur-overgangen.

NB (19 aug 2026): de documentatie stond eerst in `docs/`, maar die map is nu
vite-buildoutput voor GitHub Pages en wordt bij elke build geleegd. Het
werkbestand `kaartvarianten.html` (kaartvariant-vergelijking van de
nachtsessie, keuze v3 was al gemaakt) is daarbij verloren gegaan; de
debug-renders staan in `scripts/debug/`.
