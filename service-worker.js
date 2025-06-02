// service-worker.js

// Give your cache a unique name. Increment this value if you want to force all clients
// to download a new version of the cached files.
const CACHE_NAME = 'mycam-pwa-v1';

// These are the files we want to cache. Because this service worker lives in the
// same folder as index.html, manifest.json, icon-192.png, and icon-512.png, we
// can refer to them by relative URL (no leading slash). That way, when this SW
// is served from https://codermikhael.github.io/mycam-pwa-drive/service-worker.js,
// each of these “foo.png” entries resolves to
// https://codermikhael.github.io/mycam-pwa-drive/foo.png, etc.
const URLS_TO_CACHE = [
  'index.html',
  'manifest.json',
  'service-worker.js',
  'icon-192.png',
  'icon-512.png'
];

// During the “install” event, open our cache and add the listed URLs.
// If any URL is missing (404), the promise will reject and the SW will fail to install.
// That is why we must ensure each of these files actually exists at those paths.
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell and assets');
        return cache.addAll(URLS_TO_CACHE);
      })
      .catch((err) => {
        console.error('[Service Worker] Failed to cache during install:', err);
      })
  );
});

// During activation, remove any old caches that don’t match the current CACHE_NAME.
// This helps keep storage clean when you update CACHE_NAME.
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate event');
  event.waitUntil(
    caches.keys().then((allKeys) => {
      return Promise.all(
        allKeys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  // Claim clients immediately so that the page is controlled by this SW without reloading.
  return self.clients.claim();
});

// Intercept all fetch requests. If the request matches something in our cache, serve it
// from cache. Otherwise, fetch from network as usual.
self.addEventListener('fetch', (event) => {
  // Only handle GET requests (e.g., skip POST/PUT)
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // If we have a cached response, return it immediately.
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise, fetch from network and optionally cache the result.
      return fetch(event.request)
        .then((networkResponse) => {
          // If response is invalid or not OK, just return it (no caching).
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Otherwise, clone and store a copy in the cache for future use.
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch((error) => {
          // If network fetch fails (e.g. offline), you could return a fallback here.
          console.error('[Service Worker] Fetch failed:', error);
          throw error;
        });
    })
  );
});
