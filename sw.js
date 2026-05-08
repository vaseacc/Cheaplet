// sw.js – Scoralia PWA (pass‑through only, no caching)
const CACHE_NAME = 'scoralia-v13-nocache'; // bumped to force update

// ---- Install: do nothing, skip waiting ----
self.addEventListener('install', event => {
  console.log('[SW] Installing pass‑through…');
  self.skipWaiting();
});

// ---- Activate: clean all old caches, claim clients ----
self.addEventListener('activate', event => {
  console.log('[SW] Activating pass‑through…');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ---- Fetch: always go to the network, never cache ----
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Ignore Firebase, Cloudinary, Turnstile, analytics
  if (
    url.href.includes('firestore.googleapis.com') ||
    url.href.includes('googleapis.com') ||
    url.href.includes('firebaseapp.com') ||
    url.href.includes('api.cloudinary.com') ||
    url.href.includes('challenges.cloudflare.com') ||
    url.href.includes('/__/auth/') ||
    url.href.includes('/listen') ||
    url.href.includes('google-analytics.com')
  ) return;

  // All other requests: use network only, no cache fallback
  event.respondWith(
    fetch(request).catch(() => {
      return new Response(null, { status: 504, statusText: 'Gateway Timeout' });
    })
  );
});
