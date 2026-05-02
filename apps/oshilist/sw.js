const CACHE = 'oshilist-v2';
const SHELL = [
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Tavily API は常にネットワーク
  if (e.request.url.includes('api.tavily.com')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // アプリシェル: キャッシュ優先
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
