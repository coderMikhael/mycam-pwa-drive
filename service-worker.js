// service-worker.js

// Give the cache a unique name. Bump this if you ever want to "refresh" everything.
const CACHE_NAME = 'mycam-pwa-v1';

// We only list files that actually live in the same folder as this SW.
// Because this file is served from
//   https://codermikhael.github.io/mycam-pwa-drive/service-worker.js
// using *relative* paths here (no leading slash) means it will fetch
//   https://codermikhael.github.io/mycam-pwa-drive/index.html
//   https://codermikhael.github.io/mycam-pwa-drive/manifest.json
//   https://codermikhael.github.io/mycam-pwa-drive/icon-192.png
//   https://codermikhael.github.io/mycam-pwa-drive/icon-512.png
// etc. If any of these 404, the install will fail, so make sure each file exists exactly.
const URLS_TO_CACHE = [
  '/mycam-pwd-drive/index.html',
  '/mycam-pwd-drive/manifest.json',
  '/mycam-pwd-drive/service-worker.js',
  '/mycam-pwd-drive/icon-192.png',
  '/mycam-pwd-drive/icon-512.png'
];


// Install handler: open the cache and pre-cache the “app shell” files.
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(URLS_TO_CACHE);
      })
      .catch((err) => {
        console.error('[Service Worker] Install failed – one or more files missing:', err);
      })
  );
});


// Activate handler: delete any old cache whose name doesn’t match CACHE_NAME.
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
  // Claim any clients immediately so the page is under SW control without a reload.
  return self.clients.claim();
});


// Fetch handler: try cache first, then network, then cache the network response for future.
// BUT: only attempt to cache “same-origin” requests (i.e. http/https under our scope).
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return the cached response if found.
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise, do a network fetch
      return fetch(event.request).then((networkResponse) => {
        // If invalid response, just pass it through. No caching.
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // At this point, it’s a “basic” 200 OK from a same-origin request.
        // But double-check that the URL is under *this* service worker’s scope.
        // Use self.registration.scope, which (for GitHub Pages) will be:
        //   https://codermikhael.github.io/mycam-pwa-drive/
        // Any request with a URL starting with that string is safe to cache.
        const requestUrl = new URL(event.request.url);
        const swScope   = self.registration.scope; // e.g. "https://codermikhael.github.io/mycam-pwa-drive/"

        if (event.request.url.startsWith(swScope)) {
          // Clone the response so we can put one copy into cache and return the other copy to the page.
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(err => {
              console.warn('[Service Worker] cache.put failed for', event.request.url, err);
            });
          });
        }
        // Return the original network response to the page.
        return networkResponse;
      }).catch((error) => {
        // If both cache and network fail (e.g. offline and nothing cached), you could
        // return a fallback asset here. For now, just rethrow so the page sees the error.
        console.error('[Service Worker] Fetch failed for:', event.request.url, error);
        throw error;
      });
    })
  );
});
