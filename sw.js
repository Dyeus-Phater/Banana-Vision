
const CACHE_NAME = 'banana-vision-cache-v1';
const urlsToCache = [
  '/index.html',
  '/', // Cache the root path
  '/index.css',
  '/index.tsx', // This will be handled by Vite in dev, and its bundled output in prod
  '/manifest.json',
  // Add paths to your icons. Ensure these files exist in an /icons/ directory.
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-icon-192x192.png',
  '/icons/maskable-icon-512x512.png',
  // Add other critical assets if any (e.g., specific fonts if locally hosted)
  // For ESM.sh dependencies, they are typically handled by browser cache or would require more complex SW strategies.
  // This basic SW focuses on the app shell.
];

self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(urlsToCache.map(url => new Request(url, {cache: 'reload'}))); // Force reload from network for initial cache
      })
      .then(() => {
        console.log('[ServiceWorker] Skip waiting on install');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[ServiceWorker] Cache addAll failed:', error);
      })
  );
});

self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] Claiming clients');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  // console.log('[ServiceWorker] Fetch event for:', event.request.url);
  // We only want to handle GET requests for our caching strategy
  if (event.request.method !== 'GET') {
    // console.log('[ServiceWorker] Ignoring non-GET request:', event.request.method, event.request.url);
    return;
  }

  // For navigation requests, try network first, then cache (Network-First strategy for HTML)
  // This ensures users get the latest HTML if online, but can still load from cache if offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If a new version is fetched, cache it.
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache.
          return caches.match(event.request)
            .then(cachedResponse => {
              return cachedResponse || caches.match('/index.html'); // Fallback to index.html if specific page not cached
            });
        })
    );
    return;
  }

  // For other requests (CSS, JS, images), use Cache-First strategy.
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // console.log('[ServiceWorker] Returning from cache:', event.request.url);
          return cachedResponse;
        }
        // console.log('[ServiceWorker] Not in cache, fetching from network:', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
              // For opaque responses (like from CDN without CORS), we can't check status, but still might want to cache if needed.
              // However, typically you only cache 'basic' or 'cors' responses.
              // console.log('[ServiceWorker] Fetch error or invalid response, not caching:', event.request.url, networkResponse);
              return networkResponse;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // console.log('[ServiceWorker] Caching new resource:', event.request.url);
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
          console.error('[ServiceWorker] Fetch failed; returning offline page instead.', error);
          // Optionally, return a custom offline fallback page or image here
          // For example: return caches.match('/offline.html');
          // For now, just let the browser handle the error.
        });
      })
  );
});
