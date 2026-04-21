// sw.js - Service Worker for Scoralia PWA (Network-First Strategy)
const CACHE_NAME = 'scoralia-v10';

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
  '/favicon.svg'
];

// Install event – force SW to take over immediately
self.addEventListener('install', event => {
  console.log('[SW] Installing new version...');
  self.skipWaiting(); // Forces the waiting service worker to become the active service worker
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
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
  self.clients.claim(); // Take control of all open pages immediately
});

// Helper to check if a request should be completely ignored by the cache
function shouldBypass(url) {
  // Ignore non-http/https requests (chrome-extension://, etc.)
  if (!url.startsWith('http')) {
    return true;
  }

  if (url.includes('firestore.googleapis.com') ||
      url.includes('googleapis.com') ||
      url.includes('firebaseapp.com') ||
      url.includes('/listen') ||
      url.includes('api.cloudinary.com') ||
      url.includes('challenges.cloudflare.com')) {
    return true;
  }
  return false;
}

// Fetch event – NETWORK-FIRST STRATEGY
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = req.url;

  // 1. Always bypass API calls and non-GET requests
  if (req.method !== 'GET' || shouldBypass(url)) {
    return; // Let the browser handle it normally
  }

  // 2. NETWORK-FIRST STRATEGY for everything else (HTML, JS, CSS, Images)
  event.respondWith(
    fetch(req)
      .then(networkResponse => {
        // If we get a valid response from the internet, save it to the cache and return it
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If the network fails (user is offline), check the cache
        console.log('[SW] Network failed, serving from cache:', url);
        return caches.match(req);
      })
  );
});
