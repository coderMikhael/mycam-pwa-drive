// service-worker.js

// Give this cache a unique name. Bump it whenever you modify any of the files below.
const CACHE_NAME = 'mycam-pwa-v1';

// These must match exactly the filenames you have in the same folder as this SW file.
// For example, if this SW lives at
//   https://codermikhael.github.io/mycam-pwa-drive/service-worker.js
// then each string below resolves to:
//   https://codermikhael.github.io/mycam-pwa-drive/index.html
//   https://codermikhael.github.io/mycam-pwa-drive/manifest.json
//   https://codermikhael.github.io/mycam-pwa-drive/icon-192.png
//   https://codermikhael.github.io/mycam-pwa-drive/icon-512.png
//   https://codermikhael.github.io/mycam-pwa-drive/service-worker.js
//
// If any of these five files is missing (404), the SW install will fail. Make sure
// each one really exists at exactly that path.
const ASSETS_TO_CACHE = [
  'index.html',
  'manifest.json',
  'service-worker.js',
  'icon-192.png',
  'icon-512.png'
];


// 1) INSTALL: Pre-cache the “app shell” (all five files above).
self.addEventListener('install', (event) => {
  console.log('[SW] Install: caching app shell');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        // Force this SW to become active immediately, without waiting.
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Install failed – make sure all five files exist:', err);
      })
  );
});


// 2) ACTIVATE: Clean up any old caches, then claim clients so the new SW takes control.
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate: clearing old caches');
  event.waitUntil(
    caches.keys().then(allKeys => {
      return Promise.all(
        allKeys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});


// 3) FETCH: 
//   • If the request URL exactly matches one of our five ASSETS_TO_CACHE, serve from cache.
//   • If it’s same-origin but not in ASSETS_TO_CACHE, do a normal network fetch (no caching).
//   • If it’s a cross-origin or a chrome-extension://… request, do nothing (let the browser handle it).
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const requestURL = new URL(event.request.url);
  const sameOrigin = (requestURL.origin === self.location.origin);

  // 3a) If it’s one of our five pre-cached files (exact pathname match),
  //     return it from cache immediately.
  //     ASSETS_TO_CACHE entries have no leading “/”, so we slice the leading “/” off pathname.
  const pathname = requestURL.pathname.substring(1); // e.g. “index.html”
  if (sameOrigin && ASSETS_TO_CACHE.includes(pathname)) {
    event.respondWith(
      caches.match(event.request).then(cachedResp => {
        if (cachedResp) {
          // Found in cache → return it
          return cachedResp;
        }
        // If somehow it’s not in the cache, fall back to network.
        return fetch(event.request);
      })
    );
    return; // We’ve handled this request; do not go any further.
  }

  // 3b) If it’s a same-origin request but not one of the five ASSETS_TO_CACHE,
  //     just let it go to the network (no caching).
  if (sameOrigin) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 3c) If it’s cross-origin (e.g. Google API, Drive calls) or a chrome-extension://… URL,
  //     do nothing. Let the browser handle it as usual.
  //     We explicitly do NOT call event.respondWith(…) for these requests.
});
