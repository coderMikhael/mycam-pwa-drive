// service-worker.js (when hosted at https://codermikhael.github.io/)

// A version identifier—bump this to force clients to re-download cached files
const CACHE_NAME = 'mycam-pwa-v1';

// Because the PWA is at the root (and this SW is at /service-worker.js), these
// relative URLs will correctly map to https://codermikhael.github.io/index.html, etc.
const URLS_TO_CACHE = [
  'index.html',
  'manifest.json',
  'service-worker.js',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', (evt) => {
  console.log('[Service Worker] Installing…');
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(URLS_TO_CACHE);
    }).catch((err) => {
      console.error('[Service Worker] Install failed (one or more files missing):', err);
    })
  );
});

self.addEventListener('activate', (evt) => {
  console.log('[Service Worker] Activating…');
  evt.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  if (evt.request.method !== 'GET') return;

  evt.respondWith(
    caches.match(evt.request).then((resp) => {
      if (resp) {
        return resp;
      }
      return fetch(evt.request).then((netRes) => {
        if (!netRes || netRes.status !== 200 || netRes.type !== 'basic') {
          return netRes;
        }

        // Only cache if we're truly under our own scope (i.e. same-origin root)
        const requestUrl = new URL(evt.request.url);
        if (requestUrl.origin === self.location.origin) {
          const responseToCache = netRes.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(evt.request, responseToCache).catch(err => {
              console.warn('[Service Worker] cache.put failed:', evt.request.url, err);
            });
          });
        }
        return netRes;
      }).catch((err) => {
        console.error('[Service Worker] Fetch failed:', evt.request.url, err);
        throw err;
      });
    })
  );
});
