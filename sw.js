const CACHE_NAME = 'scoralia-v1';
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
  '/styles.css' // Include your main CSS file if you have one
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
