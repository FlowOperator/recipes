const CACHE_NAME = 'recipe-site-v1';

// Precache app shell on install (Requirement 17.2)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/recipes/', '/recipes/index.html'])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Cache-first for app shell; network-first for API/data (Requirement 17.3)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Don't cache non-GET or cross-origin requests
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // App shell assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => caches.match('/recipes/index.html'))
  );
});
