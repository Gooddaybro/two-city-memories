const CACHE_NAME = 'two-city-memories-v3-stage4-p4';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/main.css',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  './data/defaults.js',
  './data/cloud-config.js',
  './js/schema.js',
  './js/store.js',
  './js/cloud.js',
  './js/app.js',
  './js/utils/stage2-logic.js',
  './js/utils/stage3-logic.js',
  './js/utils/image-compressor.js',
  './js/modules/ui.js',
  './js/modules/counters.js',
  './js/modules/weather.js',
  './js/modules/map.js',
  './js/modules/couple.js',
  './js/modules/signals.js',
  './js/modules/capsules.js',
  './js/modules/tickets.js',
  './js/modules/gallery.js',
  './js/modules/wishlist.js',
  './js/modules/letters.js',
  './js/modules/vinyl.js',
  './js/modules/effects.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isCodeOrDoc =
    request.mode === 'navigate' ||
    /\.(html|js|css|json)$/i.test(url.pathname) ||
    url.pathname.endsWith('/');

  event.respondWith(
    fetch(request, isCodeOrDoc ? { cache: 'no-cache' } : undefined)
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
