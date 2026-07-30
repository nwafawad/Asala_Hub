const CACHE_NAME = 'asala-lms-v1';
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/manifest.json',
];

// Install Service Worker and pre-cache static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache each asset individually so one missing/failing asset (e.g. favicon.ico)
      // doesn't abort caching of the rest of the shell (cache.addAll is all-or-nothing).
      return Promise.all(
        STATIC_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn(`PWA Pre-cache asset failed (${asset}):`, err);
          })
        )
      );
    })
  );
});

// Activate Service Worker and clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== 'asala-audio-v1') {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event listener: Cache-First for assets & Network-First for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests or browser extension URLs
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // API Requests: Network-First with Cache Fallback
  const isApiRequest = ['/api/', '/auth/', '/courses/', '/assignments/', '/admin/', '/sync', '/health'].some(
    (prefix) => url.pathname.startsWith(prefix)
  );
  if (isApiRequest) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || new Response(JSON.stringify({ offline: true }), {
              headers: { 'Content-Type': 'application/json' },
            });
          });
        })
    );
    return;
  }

  // Static Assets & Audio: Cache-First with Network Fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse.ok) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        }
        return networkResponse;
      });
    })
  );
});

// Background Sync event listener for offline log flushing (NFR-PWA)
self.addEventListener('sync', (event) => {
  if (event.tag === 'asala-bg-sync') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({ type: 'ASALA_TRIGGER_BACKGROUND_SYNC' });
        }
      })
    );
  }
});
