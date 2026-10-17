const CACHE_NAME = 'gramsetu-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip APIs, browser extensions, cross-origin resources, and Next data/RSC requests.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api') ||
      url.pathname.startsWith('/_next/data') || url.protocol === 'chrome-extension:') {
    return;
  }

  const isNavigation = event.request.mode === 'navigate';
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      if (isNavigation) {
        try {
          const response = await fetch(event.request);
          if (response.ok) await cache.put(event.request, response.clone());
          return response;
        } catch {
          return (await cache.match(event.request)) || (await cache.match('/')) ||
            new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        }
      }

      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response.ok && response.type === 'basic') await cache.put(event.request, response.clone());
        return response;
      } catch {
        return new Response('', { status: 503, statusText: 'Offline' });
      }
    })()
  );
});
