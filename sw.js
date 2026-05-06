// sw.js – Service Worker for Scoralia PWA (Network‑First, non‑blocking)
const CACHE_NAME = 'scoralia-v12'; // bumped version to force update

// Only cache static assets that change rarely
const urlsToCache = [
  '/global.js',
  '/favicon.svg',
  '/manifest.json'
];

// ---- Install ----
self.addEventListener('install', event => {
  console.log('[SW] Installing…');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(err => {
        console.warn('[SW] Failed to pre‑cache some assets:', err);
      });
    })
  );
});

// ---- Activate – clean old caches ----
self.addEventListener('activate', event => {
  console.log('[SW] Activating…');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// ---- Helper – should we completely ignore this request? ----
function isIgnored(url) {
  // Firestore, Firebase Auth, Cloudinary, Turnstile, analytics
  return (
    url.includes('firestore.googleapis.com') ||
    url.includes('googleapis.com') ||
    url.includes('firebaseapp.com') ||
    url.includes('api.cloudinary.com') ||
    url.includes('challenges.cloudflare.com') ||
    url.includes('/__/auth/') ||
    url.includes('/listen') ||
    url.includes('google-analytics.com')
  );
}

// ---- Fetch ----
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Only handle GET requests
  if (request.method !== 'GET') return;

  // 2. Ignore Firebase, Cloudinary, etc.
  if (isIgnored(url.href)) return;

  // 3. Navigation (HTML pages) → network‑only, no cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          'You are offline. Please check your connection.',
          { status: 503, statusText: 'Offline' }
        );
      })
    );
    return;
  }

  // 4. Static assets (JS, CSS, images, fonts) → network‑first, fallback to cache
  event.respondWith(
    fetch(request)
      .then(networkResponse => {
        // Cache a fresh copy for future offline use
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Network failed – serve from cache
        return caches.match(request).then(cachedResponse => {
          return cachedResponse || new Response(null, { status: 504 });
        });
      })
  );
});
