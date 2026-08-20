// Service worker: maakt Tafeldorp installeerbaar en offline speelbaar zodra
// het spel via HTTPS wordt aangeboden (GitHub Pages). Zelfde patroon als
// Schaakhelden: eerst cache, dan netwerk; alles wat binnenkomt gaat de cache
// in, dus na een keer spelen werkt het spel volledig offline.
// Nieuwe versie uitbrengen? Verhoog het nummer hieronder.
const CACHE = 'tafeldorp-v2';

const START = ['.', 'index.html', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(START)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(
      (hit) => hit ||
        fetch(e.request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
    )
  );
});
