const CACHE_NAME = 'recipe-site-v3';

// On install: skip waiting so the new SW activates immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// On activate: delete ALL old caches and take control of all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy: network-first for everything.
// Try network first; only fall back to cache if offline.
// This ensures the latest deploy is always served when online.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache a copy for offline use
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline: serve from cache if available
        return caches.match(event.request).then((cached) => {
          return cached || new Response('Offline - content not cached', { status: 503 });
        });
      })
  );
});
