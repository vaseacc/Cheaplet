// sw.js – Scoralia (inactive, only for PWA installability)
self.addEventListener('install', () => {
  // Force skip waiting to activate new service worker immediately
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
  );
  // Force claim all clients immediately
  self.clients.claim();
});

// Do NOT intercept any fetch requests – let the browser handle everything normally
