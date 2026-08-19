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

## Publiceren

`npm run build` bouwt naar `docs/`; GitHub Pages serveert vanaf main:/docs
(https://sdb-e.github.io/tafeldorp/). Commit `docs/` mee en push. Het spel is
op de tablet installeerbaar als app (manifest plus service worker in
`public/`); bij een nieuwe release het cache-nummer in `public/sw.js` ophogen.

Assets van de gezinsleden komen uit `../familie-assets` (single source of
truth); wijzig personen daar, nooit hier. Gekopieerde en vendor-assets staan
buiten git (licentie LimeZu: niet herdistribueren).
