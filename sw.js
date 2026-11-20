const CACHE_NAME = 'aktipiti-web-v1.7';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './aktivitas_data.js',
  './app.js',
  './user_sheet_live.csv',
  './manifest.json',
  './icons/icon16.png',
  './icons/icon32.png',
  './icons/icon48.png',
  './icons/icon128.png',
  './icons/app-logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
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
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // Jangan cache panggilan API eksternal (Groq, Google API, Apps Script)
  const url = event.request.url;
  if (url.includes('api.groq.com') || url.includes('googleapis.com') || url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return networkResponse;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
