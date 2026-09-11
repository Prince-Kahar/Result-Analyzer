// Service Worker for SASCMA STERS Result Analyzer PWA (Desktop + Mobile)
const CACHE_NAME = 'sascma-vnsgu-v2';
const PRECACHE_ASSETS = [
  '/',
  '/assets/logo.png',
  '/assets/vnsgu.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache asset warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // SPA navigation fallback: when offline or reloading standalone window, serve root app shell
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/') || caches.match('/index.html'))
    );
    return;
  }

  // Network first with cache fallback for static assets
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && (req.url.includes('/assets/') || req.url.includes('fonts.'))) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
