/* ========================================
   sw.js — StudyFlow Service Worker
   PWA offline support with smart caching
   ======================================== */

const CACHE_VERSION = 'v5';
const STATIC_CACHE = `studyflow-static-${CACHE_VERSION}`;
const CDN_CACHE = `studyflow-cdn-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `studyflow-dynamic-${CACHE_VERSION}`;

// ----- App Shell Assets (pre-cached on install) -----

const APP_SHELL = [
  './',
  './index.html',
  './css/main.css',
  './css/home.css',
  './css/player.css',
  './css/playlists.css',
  './css/modal.css',
  './css/updater.css',
  './css/notes.css',
  './js/storage.js',
  './js/router.js',
  './js/modal.js',
  './js/home.js',
  './js/player.js',
  './js/playlists.js',
  './js/updater.js',
  './js/notes.js',
  './version.json',
  './lib/lucide.min.js',
  './site.webmanifest',
  './assets/icons/favicon.ico',
  './assets/icons/favicon-16x16.png',
  './assets/icons/favicon-32x32.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/android-chrome-192x192.png',
  './assets/icons/android-chrome-512x512.png'
];

// CDN origins we cache with stale-while-revalidate
const CDN_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://unpkg.com'
];

// ----- Install: Pre-cache App Shell -----

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL);
    }).catch((err) => {
      // Storage might be blocked by tracking prevention or quota limits
      console.warn('[SW] Pre-cache failed (storage may be restricted):', err);
    })
  );
  // Do NOT call skipWaiting() here — let the new SW enter waiting state.
  // The page (UpdateManager) will send SKIP_WAITING when the user taps "Update Now".
});

// ----- Activate: Clean up old caches -----

self.addEventListener('activate', (event) => {
  const validCaches = [STATIC_CACHE, CDN_CACHE, DYNAMIC_CACHE];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('studyflow-') && !validCaches.includes(name))
          .map((name) => caches.delete(name).catch(() => false))
      );
    }).catch((err) => {
      console.warn('[SW] Cache cleanup failed (storage may be restricted):', err);
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// ----- Helper: Check if request is for a CDN resource -----

function isCDNRequest(url) {
  return CDN_ORIGINS.some((origin) => url.startsWith(origin));
}

// ----- Helper: Check if request is for YouTube -----

function isYouTubeRequest(url) {
  return url.includes('youtube.com') || url.includes('ytimg.com') || url.includes('youtu.be');
}

// ----- Fetch: Handle requests with appropriate strategy -----

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = request.url;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // version.json: always network-only (no caching) so update checks are fresh
  if (url.endsWith('version.json')) {
    try {
      event.respondWith(fetch(request));
    } catch (e) { /* storage blocked */ }
    return;
  }

  // Skip YouTube API/iframe/thumbnail requests — they go to the network
  if (isYouTubeRequest(url)) {
    try {
      event.respondWith(networkOnly(request));
    } catch (e) {
      // respondWith may throw if storage is blocked — safe to ignore
    }
    return;
  }

  // CDN resources (Google Fonts, Lucide): Stale-while-revalidate
  if (isCDNRequest(url)) {
    try {
      event.respondWith(staleWhileRevalidate(request, CDN_CACHE));
    } catch (e) {
      // respondWith may throw if storage is blocked
    }
    return;
  }

  // App shell & static assets: Cache-first
  if (isAppShellRequest(url)) {
    try {
      event.respondWith(cacheFirst(request));
    } catch (e) {
      // respondWith may throw if storage is blocked
    }
    return;
  }

  // Navigation requests (index.html): Network-first
  if (request.mode === 'navigate') {
    try {
      event.respondWith(networkFirst(request));
    } catch (e) {
      // respondWith may throw if storage is blocked
    }
    return;
  }

  // Everything else: Network-first with cache fallback
  try {
    event.respondWith(networkFirst(request));
  } catch (e) {
    // respondWith may throw if storage is blocked — fall through to network
  }
});

// ----- Helpers: Check if URL is an app shell asset -----

function isAppShellRequest(url) {
  try {
    const path = new URL(url).pathname;

    // Match CSS files
    if (path.endsWith('.css')) return true;
    // Match JS files
    if (path.endsWith('.js')) return true;
    // Match manifest
    if (path.endsWith('site.webmanifest')) return true;
    // Match icon/image assets
    if (path.includes('/assets/')) return true;
    // Match root (index.html)
    if (path.endsWith('/') || path.endsWith('/index.html')) return true;

    return false;
  } catch (e) {
    return false;
  }
}

// ----- Strategy: Cache First -----

async function cacheFirst(request) {
  try {
    const cached = await caches.match(request);

    if (cached) {
      // Return cached version, then update cache in background
      fetchAndCache(request, STATIC_CACHE).catch(() => {});
      return cached;
    }

    return fetchAndCache(request, STATIC_CACHE);
  } catch (err) {
    // Cache API unavailable (tracking prevention or quota exceeded)
    return fetch(request);
  }
}

// ----- Strategy: Network First -----

async function networkFirst(request) {
  try {
    const response = await fetchAndCache(request, DYNAMIC_CACHE);
    return response;
  } catch (err) {
    try {
      const cached = await caches.match(request);
      if (cached) return cached;

      // If index.html fails and we have a cached version, serve it
      if (request.mode === 'navigate') {
        const indexCache = await caches.match('./index.html');
        if (indexCache) return indexCache;
      }
    } catch (cacheErr) {
      // Cache unavailable
    }

    // Last resort: try network directly
    return fetch(request);
  }
}

// ----- Strategy: Stale-While-Revalidate -----

async function staleWhileRevalidate(request, cacheName) {
  try {
    const cached = await caches.match(request);

    // Fetch in background and update cache
    const fetchPromise = fetchAndCache(request, cacheName).catch(() => {});

    if (cached) {
      // Return cached version immediately, update in background
      return cached;
    }

    // Wait for the fetch if nothing cached
    return fetchPromise;
  } catch (err) {
    // Cache API unavailable
    return fetch(request);
  }
}

// ----- Strategy: Network Only -----

async function networkOnly(request) {
  return fetch(request);
}

// ----- Helper: Fetch and cache response -----

async function fetchAndCache(request, cacheName) {
  const response = await fetch(request);

  // Only cache valid responses (same-origin 'basic' or cross-origin 'cors')
  if (response && response.ok && (response.type === 'basic' || response.type === 'cors')) {
    const cache = await caches.open(cacheName);
    // Clone because response can only be consumed once
    cache.put(request, response.clone());
  }

  return response;
}

// ----- Message: Force skip waiting (for update prompt) -----

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
