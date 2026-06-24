const CACHE_NAME = 'tradererp-cache-v1';
const PRECACHE_ASSETS = [
  '/dashboard',
  '/sales',
  '/customers',
  '/inventory',
  '/notifications',
  '/login',
  '/manifest.json',
  '/globe.svg',
  '/next.svg',
  '/window.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip caching for Supabase API, Auth Callback, Next.js HMR/Hot Reloads, and non-GET requests
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.includes('webpack-hmr') ||
    url.pathname.includes('hot-update') ||
    url.pathname.includes('socket.io') ||
    url.hostname.includes('supabase.co') ||
    request.method !== 'GET'
  ) {
    return;
  }

  // Network-First strategy for pages / dynamic routes
  if (request.mode === 'navigate') {
    // If client is offline, serve from cache directly
    if (!navigator.onLine) {
      event.respondWith(
        caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // Fallback shell pages if no exact match found
          if (url.pathname.startsWith('/sales')) return caches.match('/sales');
          if (url.pathname.startsWith('/customers')) return caches.match('/customers');
          if (url.pathname.startsWith('/inventory')) return caches.match('/inventory');
          return caches.match('/dashboard');
        })
      );
      return;
    }

    event.respondWith(
      fetch(request)
        .then((response) => {
          // If the server redirected to login (due to auth check) or returned server error
          const isErrorOrRedirect = response.status >= 500 || 
                                    (response.redirected && response.url.includes('/login'));
          
          if (isErrorOrRedirect) {
            return caches.match(request).then((cachedResponse) => {
              if (cachedResponse) return cachedResponse;
              if (url.pathname.startsWith('/sales')) return caches.match('/sales');
              if (url.pathname.startsWith('/customers')) return caches.match('/customers');
              if (url.pathname.startsWith('/inventory')) return caches.match('/inventory');
              return response;
            });
          }

          // Clone and store in cache
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseCopy);
          });
          return response;
        })
        .catch(() => {
          // Offline fallback - match cached page
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            // Fallback shell pages if no exact match found
            if (url.pathname.startsWith('/sales')) return caches.match('/sales');
            if (url.pathname.startsWith('/customers')) return caches.match('/customers');
            if (url.pathname.startsWith('/inventory')) return caches.match('/inventory');
            return caches.match('/dashboard');
          });
        })
    );
    return;
  }

  // General Cache-First strategy with Offline-Aware reject for unmatched requests
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const isLocalDev = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      const isNextAsset = url.pathname.includes('_next');
      const networkFirstForDev = isLocalDev && isNextAsset && navigator.onLine;

      // Serve from cache if available, except when in local dev and online (where we want fresh hot-reloads)
      if (cachedResponse && !networkFirstForDev) {
        // Fetch in background to update cache (stale-while-revalidate) if online
        if (navigator.onLine) {
          fetch(request).then((response) => {
            if (response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response);
              });
            }
          }).catch(() => {});
        }
        return cachedResponse;
      }

      // If not in cache and offline, simulate fetch failure to trigger fallbacks
      if (!navigator.onLine) {
        return Promise.reject(new TypeError('Failed to fetch (offline)'));
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      });
    })
  );
});
