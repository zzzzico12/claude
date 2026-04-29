const CACHE_NAME = 'realtime-translator-v1';
const STATIC_ASSETS = [
  './realtime-translator.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];
// 翻訳APIはキャッシュしない
const NETWORK_ONLY = ['api.mymemory.translated.net'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // 翻訳API・音声認識は常にネットワーク
  if (NETWORK_ONLY.some((host) => url.hostname.includes(host))) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        // CDNリソースはキャッシュに追加
        if (['unpkg.com', 'cdn.tailwindcss.com', 'fonts.googleapis.com', 'fonts.gstatic.com']
            .some((h) => url.hostname.includes(h))) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
