# Tafeldorp — ontwerp (werktitel)

Leerspel voor Eleanor (7): keersommen automatiseren, tafels 1 t/m 10, in een
Stardew-achtig dorpje met het eigen gezin. Ontwerpsessie 18 aug 2026 met Stephan.

## Kernstructuur

```
DORP (topdown, vrij rondlopen als Eleanor)
│
├── 10 LOCATIES — elk gekoppeld aan een tafel (1 t/m 10)
│     │
│     ├── 1. Verhaal-quest    gezinslid geeft opdracht met natuurlijke keersom
│     │                       in Stardew-dialoog (portret + tekstbox)
│     ├── 2. Tafel-minigame   oefenen: sommen van die tafel (zelfde engine, eigen skin)
│     └── 3. Tafel-eindbaas   battle met levens; winnen = OBJECT (1 van 10)
│
├── SUPER-EINDBAAS (slot open bij 10 objecten)
│     alle tafels door elkaar, zelfde engine, echt te verliezen
│
└── UNLIMITED MODE (unlocked na super-eindbaas)
      oneindig, snelheidsrecord op een lokaal scorebord
```

## Vastgelegde ontwerpkeuzes

| Keuze | Besluit | Waarom |
|---|---|---|
| Spelvorm | Mini-RPG dorpje met quests, 10 tafel-minigames, final battle | Verhaal maakt sommen natuurlijk, minigames trainen |
| Thema | Modern dorpje | Sluit aan bij echte-leven-sommen en bij LimeZu-assets in huis |
| Tafels | Alle tafels 1-10 beschikbaar | Zij of Stephan kiest; geen kunstmatige slotjes op oefenen |
| Minigames | 1 engine, 10 skins | Snel te bouwen, consistent, engine = ook final battle en unlimited |
| Eindbaas | Battle met levens (HP baas, harten Eleanor), geen klok | Spannend zonder tijdsdruk-frustratie |
| Fouten | Overal zacht; alleen super-eindbaas en unlimited echt te verliezen | Leren zonder straf, uitdaging pas als alles gemasterd is |
| Invoer | Mix: multiple choice bij nieuwe tafel, touch-numpad bij mastery | MC laagdrempelig, typen voor echt automatiseren |
| Apparaat | Tablet/touch first | Grote knoppen, geen toetsenbord nodig; draait in browser |

## Het dorp: 10 locaties (voorstel, skin per tafel)

| # | Tafel | Locatie | Somcontext (skin) | Questgever |
|---|---|---|---|---|
| 1 | 1 | Thuis (keuken) | borden dekken, 1 per persoon | Mama |
| 2 | 2 | Bakkerij | broodjes per zakje van 2 | Papa |
| 3 | 3 | Speeltuin | ballen in netten van 3 | Ward |
| 4 | 4 | Supermarkt | flessen in kratten van 4 | Mama |
| 5 | 5 | School | potloden in doosjes van 5 | Papa |
| 6 | 6 | IJssalon | eierdozen / bolletjes per 6 | Ward |
| 7 | 7 | Dierenwinkel | visjes per aquarium van 7 | Mama |
| 8 | 8 | Bibliotheek | boeken per plank van 8 | Papa |
| 9 | 9 | Sporthal | kegels in rijen van 9 | Ward |
| 10 | 10 | Speelgoedwinkel | knikkers in zakjes van 10 | Mama |

Verdeling questgevers is een startpunt; dialogen schrijven we per locatie.
Elke locatie levert na de eindbaas een object op (bijv. taartvorm, gouden bal,
schoolbel...); de 10 objecten samen openen de super-eindbaas.

## Kern-loop per locatie

1. **Quest**: gezinslid spreekt Eleanor aan (Stardew-tekstbox, portret met
   expressie). De opdracht bevat een natuurlijke keersom: "Ik heb 3 zakjes met
   elk 2 broodjes, hoeveel broodjes zijn dat?" Antwoord via de invoer-UI.
2. **Minigame**: op de locatie zelf, ronde van 10 sommen van die tafel in de
   skin van de locatie (visueel: groepjes objecten die de som tonen).
3. **Eindbaas**: battle. Goed antwoord = aanval raakt (baas verliest HP), fout =
   baas raakt Eleanor (hart kwijt). Baas verslagen = object + feestje.
   Verliezen = zacht: gewoon opnieuw, niets kwijt.

## Didactiek

- **Mastery-tracking**: per som (bijv. 7x6) goed/fout/tijd bijhouden in
  localStorage. Per tafel een mastery-niveau (nieuw / oefenen / gemasterd).
- **Invoer volgt mastery**: nieuwe tafel = 4 grote multiple-choice knoppen;
  tafel gemasterd genoeg = touch-numpad (zelf intypen).
- **Fout = terugkomen**: een fout beantwoorde som komt later in de ronde terug.
- **Hint na 2x fout**: de som wordt visueel getoond als groepjes (3x4 = drie
  groepjes van vier appels) en telbaar gemaakt.
- **Slimme selectie**: sommen die vaker fout gaan komen vaker terug
  (spaced repetition light), binnen de gekozen tafel.

## Super-eindbaas en unlimited

- **Super-eindbaas**: alleen toegankelijk met 10 objecten. Alle tafels door
  elkaar, battle-vorm, en hier wel echt te verliezen (dan opnieuw). De climax.
- **Unlimited mode**: na het verslaan van de super-eindbaas unlocked. Zelfde
  engine, oneindige stroom sommen, snelheids/streak-record op een lokaal
  scorebord. Herbruikt de final-battle-engine een op een.

## Assets (uit familie-assets, single source of truth)

- **Personen**: class 3 LimeZu-sprites 48px (`sprites8/<naam>/sheet_48.png`) —
  echte kindermaat en gezichtsdetail. Eleanor speelbaar; stephan, marjolein en
  ward als NPC.
- **Dialogen**: class 2 portretten 128px (`portraits/<naam>/`), expressies per
  situatie.
- **Wereld**: LimeZu Modern Interiors (in `vendor/modern-interiors/`) voor
  interieurs en UI.
- **Open punt**: Modern Interiors bevat geen buiten-tilesets. Opties: (a) de
  losse pack Modern Exteriors van LimeZu kopen (paar euro, zelfde stijl), of
  (b) het dorp als plattegrond/hub-scherm doen en alle scenes binnen. Voorkeur
  a zodra we aan de dorpskaart beginnen.
- **Credits**: naamsvermelding LimeZu verplicht (zie CREDITS.md); niet
  herdistribueren, dus ruwe vendor-assets blijven buiten git.

## Techniek

- Phaser 3 + TypeScript + Vite, zelfde opzet als vlaaienvanger.
- `scripts/sync-assets.mjs` kopieert sprites en portretten uit
  `../familie-assets/` naar `public/assets/familie/` (build self-contained,
  tablet heeft de bibliotheek niet nodig).
- Save-data (mastery, objecten, records) in localStorage; een profiel volstaat.
- Touch-first: knoppen minimaal 64px, geen toetsenbord-afhankelijkheid; muis
  werkt vanzelf mee voor op de PC.
- Build naar `docs/` (GitHub Pages, main:/docs), zie README; publiceren
  besloten 19 aug 2026. Let op: `docs/` is build-output en wordt bij elke
  build geleegd — documentatie hoort in `ontwerp/`.

## Didactiek: hoe kinderen tafels automatiseren (onderbouwing)

Het spel volgt de fasen die het (Nederlandse) rekenonderwijs en de
geheugenliteratuur onderscheiden; per fase een spelmechanisme:

1. **Begrijpen** (som als groepjes): de context-visual (zakjes met broodjes)
   IS de som. De kale keersom staat er altijd groot naast, zodat beeld en
   abstracte notatie aan elkaar koppelen. Telhulp bij twee keer fout.
2. **Ophalen in plaats van herlezen** (retrieval practice / testing effect):
   het spel is quizvorm, nooit passief. Foute sommen komen dezelfde ronde
   terug (direct herstel-effect).
3. **Gespreide, gerichte herhaling** (spaced repetition): per som worden
   goed/fout bijgehouden; zwakke sommen komen in volgende rondes vaker terug,
   ook dagen later. Weinig nieuwe feiten tegelijk, gemengd met gekende
   (incremental rehearsal).
4. **Strategieen voor de brug naar memoriseren**: omkeersommen (7x2 = 2x7),
   steunsommen (5x en 10x kennen, dan 6x7 = 5x7 + 7). Hints in die vorm bij
   herhaalde fouten (fase 2 van de hints).
5. **Eerst goed, dan snel** (fluency na accuratesse): multiple choice tot een
   tafel accuraat is, dan het numpad (zelf produceren), pas daarna tempo.
6. **Tempo en mix als eindfase**: de eindbaas-spellen zijn KALE sommen, alle
   tafels door elkaar, op snelheid; dat is de automatiseringstoets, geen
   leeromgeving meer. Zo werkt bijv. ook Bareka (NL automatiseringstoetsen)
   en Times Tables Rock Stars.

## Levels en missies (besloten 19 aug 2026)

Het spel is een missie-ketting, geen open wereld:

1. **Start thuis**: mama geeft de eerste missie ("ga naar de bakkerij, help
   bakker Bart"). De deurzones van andere locaties zeggen dan nog "eerst naar
   de bakkerij!".
2. **Per locatie**: NPC-eigenaar begroet je (dialoog) → minigame =
   **bestellingen afhandelen** (10 per ronde, som in context: 3 zakjes van 4
   broodjes; visueel als groepjes = ingebouwde telhint; de kale keersom
   "3 x 4 = ?" staat er altijd groot bij; MC-knoppen, numpad bij mastery) →
   na 10 goed komt de **tafelbaas** (battle met levens) → object verdiend →
   de NPC vertelt waar je daarna heen mag.
   De tafelbaas per locatie oefent nog binnen die ene tafel; de super-eindbaas
   in de kerk en de unlimited mode zijn **kale sommen, alle tafels door
   elkaar, op snelheid** (de automatiseringsfase).
3. **Volgorde** (makkelijk eerst): thuis 1 → bakkerij 2 → school 5 → molen 10 →
   speeltuin 3 → supermarkt 4 → zwembad 6 → boerderij 7 → bieb 8 → sporthal 9 →
   kerk (super-eindbaas, alle tafels).
4. Voortgang (behaalde locaties, mastery per som, objecten) in localStorage;
   behaalde locaties blijven herspeelbaar voor oefenen.

NPC's: gezin (mama/papa/Ward, echte portretten) geeft de verhaalmissies;
elke locatie heeft een eigen dorpsfiguur (bakker, juf, badmeester, boer,
bibliothecaresse, ijscoman) uit de LimeZu character generator.

NPC-bezetting definitief (19 aug 2026, herzien): het gezin bemant de meeste
locaties in rol-outfit (zelfde persoon, ander hoedje via de Accessories-laag in
familie-assets characters8; dialoogportret blijft het gewone gezinsportret):
bakker papa (koksmuts), juf mama (bril), molenaar papa (muts), boer Ward
(hoed), mama in de bieb (andere bril), coach papa (rode pet), Ward in de
speeltuin, mama thuis. Twee dorpsfiguren uit de premades
(`scripts/bouw-dorpsfiguren.py` naar `public/assets/dorp/`): kruidenier Kees
(07) en badmeester Bas (19), met pixel-art headshot-portretten.

## Startmenu en trainen (besloten 19 aug 2026)

Het spel opent in een startmenu (16-bit chiptune via WebAudio, alleen in het
menu) met drie ingangen: **Het dorp in!** (de missie-ketting), **Tijdrit**
(per tafel vrij toegankelijk; de Tafeldraak-tijdrit unlockt na het Gouden
Ticket) en **Records** (besttijd per tafel plus de draak-top-5). Zo kan een
speler die het verhaal heeft uitgespeeld direct trainen. In het dorp zit
rechtsboven een menu-knop.

## Fasering

| Fase | Inhoud | Resultaat |
|---|---|---|
| 1 | Scaffold, dorp-hub, Eleanor loopt rond, 1 NPC met dialoog | Lopen en praten werkt op tablet |
| 2 | Minigame-engine + invoer-UI (MC en numpad) + mastery-tracking | Tafel oefenen op 1 locatie (bakkerij) |
| 3 | Eindbaas-battle + object-beloning | Volledige loop op 1 locatie |
| 4 | 10 locaties met skins, quests en dialogen | Heel dorp speelbaar |
| 5 | Super-eindbaas + unlimited mode + scorebord | Spel compleet |
