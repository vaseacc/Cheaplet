// sw.js - Service Worker for Scoralia PWA
const CACHE_NAME = 'scoralia-v5';

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
  '/login.html',
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

// Helper to check if a request should bypass the service worker entirely
function shouldBypass(url) {
  // Never intercept Firestore / Firebase / Google APIs
  return url.includes('firestore.googleapis.com') ||
         url.includes('googleapis.com') ||
         url.includes('firebaseapp.com') ||
         url.includes('/Listen') ||
         url.includes('firebase') ||
         url.includes('google.firestore.v1.Firestore');
}

// Fetch event – bypass Firebase and Firestore requests, cache static assets
self.addEventListener('fetch', event => {
  const url = event.request.url;
  const request = event.request;

  // Special case: favicon.ico – return a transparent pixel
  if (url.endsWith('/favicon.ico')) {
    event.respondWith(
      fetch('/favicon.svg').catch(() => {
        return new Response(
          'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
          { headers: { 'Content-Type': 'image/gif' } }
        );
      })
    );
    return;
  }

  // 🔥 CRITICAL: For Firestore / API requests, DO NOT intercept.
  // Let the browser handle them normally.
  if (shouldBypass(url) || request.method !== 'GET') {
    return; // Service worker does nothing, browser fetches directly
  }

  // For static assets (HTML, JS, CSS, images), use cache-first strategy
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Not in cache, fetch from network and add to cache
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
