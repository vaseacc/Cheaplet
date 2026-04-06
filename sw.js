// sw.js - Service Worker for Scoralia PWA
const CACHE_NAME = 'scoralia-v3';

// Files to cache for offline access
const urlsToCache = [
  '/',
  '/index.html',
  '/global.js',
  '/social.html',
  '/topic.html',
  '/search.html',
  '/listanitem.html',
  '/messages.html',
  '/profile.html',
  '/LoginInToCheaplet.html',
  '/favicon.svg',
  '/full.css'
];

// Install event – cache core files
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('Cache addAll failed:', err))
  );
  self.skipWaiting();
});

// Activate event – clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Helper to check if a request should be bypassed (never cached)
function shouldBypass(url) {
  // Bypass Firebase / Firestore / Google APIs
  if (url.includes('firestore.googleapis.com') ||
      url.includes('googleapis.com') ||
      url.includes('firebaseapp.com') ||
      url.includes('/listen') ||
      url.includes('firebase')) {
    return true;
  }
  // Bypass any non-GET requests (like POST, etc.)
  return false;
}

// Fetch event – bypass Firebase and Firestore requests
self.addEventListener('fetch', event => {
  const url = event.request.url;
  const request = event.request;

  // Special case: favicon.ico – return a transparent pixel to avoid 404
  if (url.endsWith('/favicon.ico')) {
    event.respondWith(
      fetch('/favicon.svg').catch(() => {
        // Fallback: return a 1x1 transparent pixel (base64)
        return new Response(
          'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
          { headers: { 'Content-Type': 'image/gif' } }
        );
      })
    );
    return;
  }

  // If the request must bypass the cache, go straight to network
  if (shouldBypass(url) || request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // For everything else: serve from cache, fallback to network
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(request).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(request, responseToCache);
            });
          return networkResponse;
        });
      })
  );
});
