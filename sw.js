// sw.js – Scoralia (pass‑through only, never caches)
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Always go to the network, never serve from cache
  event.respondWith(fetch(event.request));
});
