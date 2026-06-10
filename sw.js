// sw.js – Scoralia (inactive, only for PWA installability)
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
  );
  self.clients.claim();
});

// Do NOT intercept any fetch requests – let the browser handle everything normally
