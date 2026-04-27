// sw.js - Service Worker for Scoralia PWA (Network-First, bypass HTML cache)
const CACHE_NAME = 'scoralia-v11'; // bump version to force update

// Files to cache for offline access (only static assets, no HTML pages)
const urlsToCache = [
  '/global.js',
  '/favicon.svg',
  '/manifest.json',
  // You can add other static assets like CSS files, images, etc.
  // BUT DO NOT cache any .html file or clean URLs that rely on server rewrites
];

// Install event
self.addEventListener('install', event => {
  console.log('[SW] Installing new version...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(err => {
        console.warn('[SW] Failed to cache some assets:', err);
      });
    })
  );
});

// Activate event – clean up old caches instantly
self.addEventListener('activate', event => {
  console.log('[SW] Activating new version & clearing old caches...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim(); // take control of all open pages immediately
});

// Helper: should this request bypass the cache entirely?
function shouldBypass(url) {
  // Ignore non-http/https requests
  if (!url.startsWith('http')) return true;

  // Always bypass API calls, Firebase, Cloudinary, Turnstile
  if (url.includes('firestore.googleapis.com') ||
      url.includes('googleapis.com') ||
      url.includes('firebaseapp.com') ||
      url.includes('/listen') ||
      url.includes('api.cloudinary.com') ||
      url.includes('challenges.cloudflare.com')) {
    return true;
  }

  // Bypass all HTML navigation requests (so Vercel rewrites work)
  // We detect navigation by looking at the request mode and destination.
  // For simplicity, we'll just never cache requests that are not GET or are for HTML files.
  return false;
}

// Fetch event – network-first for static assets, network-only for HTML
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET requests
  if (req.method !== 'GET') return;

  // Always bypass if it's an API call or similar
  if (shouldBypass(url.href)) return;

  // If the request is a navigation (i.e., the user is loading a page), ALWAYS network-first
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => {
        // If offline, you could return a fallback page, but for now just fail
        return new Response('You are offline. Please check your connection.', { status: 503 });
      })
    );
    return;
  }

  // For other static assets (JS, CSS, images), use network-first with cache fallback
  event.respondWith(
    fetch(req)
      .then(networkResponse => {
        // If we got a valid response, cache it for future offline use
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Network failed – try to serve from cache
        console.log('[SW] Network failed, serving from cache:', url.href);
        return caches.match(req);
      })
  );
});
