// sw.js - Service Worker for Scoralia PWA
const CACHE_NAME = 'scoralia-v2';

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

// Fetch event – bypass Firebase and Firestore requests
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // 🔥 IMPORTANT: Never intercept Firebase / Firestore API calls
  if (url.includes('googleapis.com') ||
      url.includes('firestore.googleapis.com') ||
      url.includes('firebaseapp.com') ||
      url.includes('/listen') ||
      url.includes('firebase')) {
    // Just go to network, do not cache
    event.respondWith(fetch(event.request));
    return;
  }

  // For everything else: serve from cache, fallback to network
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        const fetchRequest = event.request.clone();
        return fetch(fetchRequest).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return networkResponse;
        });
      })
  );
});
