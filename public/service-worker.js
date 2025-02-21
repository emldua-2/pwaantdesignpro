const CACHE_NAME = "cache-data-v1.1";
const STATIC_ASSETS = [
    "/", 
    "/#/index.html", 
    "/#/favicon.ico",
    "/#/dashboard", 
    "/#/monitor",
    "/#/workplace",
    "/#/manifest.json"
];

// Install Service Worker dan cache asset statis + chunk async
self.addEventListener("install", (event) => {
  event.waitUntil(
    fetch("/asset-manifest.json") // Ambil daftar file yang dihasilkan Umi.js
      .then((response) => response.json())
      .then((assets) => {
        const urlsToCache = Object.values(assets).filter(
          (url) => url.endsWith(".js") || url.endsWith(".css")
        );

        return caches.open(CACHE_NAME).then((cache) => {
          return cache.addAll([...STATIC_ASSETS, ...urlsToCache]);
        });
      })
      .catch(() => {
        return caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS));
      })
  );
  self.skipWaiting();
});

// Fetch event handler dengan strategi Cache First
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        return (
          cachedResponse ||
          fetch(event.request)
            .then((networkResponse) => {
              // Cache setiap file yang berhasil dimuat
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            })
            .catch(() => {
              // Jika gagal fetch dan request HTML, kembalikan index.html (SPA fallback)
              if (event.request.mode === "navigate") {
                return cache.match("/index.html");
              }
            })
        );
      });
    })
  );
});

// Hapus cache lama saat Service Worker diperbarui
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});
