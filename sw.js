// sw.js – Scoralia (PWA installability with no caching)
const CACHE_NAME = 'scoralia-cache-v1';

// Install: skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: clear all caches to ensure fresh content always
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return caches.delete(key); // Delete our cache too to force fresh fetches
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Always bypass cache, fetch from network only
// This ensures users always get the latest files, never old cached versions
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Always fetch from network, ignore cache completely
  event.respondWith(
    fetch(event.request, {
      cache: 'no-store',
      mode: event.request.mode,
      credentials: event.request.credentials
    }).catch(() => {
      // If network fails and it's a navigation request, try to return offline fallback
      // For PWA to still be installable, we need basic functionality
      if (event.request.mode === 'navigate') {
        return caches.match('/offline.html').then((response) => {
          return response || new Response('Offline', { status: 503 });
        });
      }
      // For other requests, just fail silently or return error
      return new Response('Network error', { status: 503 });
    })
  );
});
