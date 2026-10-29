// TelApp Service Worker
const CACHE_NAME = 'telapp-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/aistudio/image_23f1ad3d.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Pass through Firebase, external APIs and media blobs
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('identitytoolkit.googleapis.com') ||
    event.request.url.includes('firebaseio.com') ||
    event.request.url.startsWith('blob:')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type !== 'basic'
        ) {
          return networkResponse;
        }
        // Cache static scripts and assets dynamically
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          if (event.request.method === 'GET' && !event.request.url.includes('/api/')) {
            cache.put(event.request, responseToCache);
          }
        });
        return networkResponse;
      }).catch(() => {
        // Fallback for document requests
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      });
    })
  );
});
