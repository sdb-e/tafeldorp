# Tafeldorp

Leerspel voor Eleanor (7): keersommen (tafels 1-10) in een Stardew-achtig
dorpje met het eigen gezin. Ontwerp: `ontwerp/ontwerp.md` (let op: `docs/` is
build-output voor GitHub Pages en wordt bij elke build geleegd).

## Draaien

```
npm install
npm run sync-assets   # kopieert sprites + portretten uit ../familie-assets
npm run dev           # dev-server, ook bereikbaar op tablet via --host
```

## Kamers finetunen in Tiled

De kamerinrichting is visueel bij te stellen in [Tiled](https://www.mapeditor.org)
(gratis). Eenmalig installeren (vraagt adminrechten):
`winget install Tiled.Tiled`

1. `python scripts/exporteer-tiled.py` zet per kamer een `tiled/kamer-*.tmx`
   klaar (bestaande tmx wordt nooit overschreven; terug naar de Python-versie
   kan met `--force <kamer>`).
2. Open `tafeldorp.tiled-project` in Tiled, kies een kamer en versleep de
   meubels en kleden; nieuwe meubels sleep je uit de tileset "meubels".
   Eigenschappen `boven` (fractie die boven de speler rendert) en `solide`
   staan per object.
3. `python scripts/bouw-interieurs.py` bakt de kamers; een kamer met tmx
   gebruikt automatisch jouw Tiled-versie. Daarna gewoon `npm run build`.

Muren, vloeren, deuren en NPC-plekken blijven in het script; Tiled gaat
alleen over WAT er staat en WAAR.

## Publiceren

`npm run build` bouwt naar `docs/`; GitHub Pages serveert vanaf main:/docs
(https://sdb-e.github.io/tafeldorp/). Commit `docs/` mee en push. Het spel is
op de tablet installeerbaar als app (manifest plus service worker in
`public/`); bij een nieuwe release het cache-nummer in `public/sw.js` ophogen.

Assets van de gezinsleden komen uit `../familie-assets` (single source of
truth); wijzig personen daar, nooit hier. Gekopieerde en vendor-assets staan
buiten git (licentie LimeZu: niet herdistribueren).
