'use strict';
/* 离线缓存：把整局游戏（约 1MB）存到手机里，断网也能玩。
   每次发版把 CACHE 的版本号 +1，旧缓存会在 activate 时清掉。 */
const CACHE = 'zhangyuan-v1';
const ASSETS = [
  './index.html',
  './manifest.json',
  './css/ui.css',
  './js/data.js',
  './js/audio.js',
  './js/art.js',
  './js/game.js',
  './fonts/fpf-12-zh.woff2',
  './fonts/press-start-2p.woff2',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
