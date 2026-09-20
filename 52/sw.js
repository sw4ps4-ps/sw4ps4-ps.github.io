const CACHE_NAME = 'ps4-offline-v12';
const ASSETS = [
  './',
  'index.html',
  'jb.html',
  'jb.js',
  'bg.jpg',
  'core.js',
  'int64.js',
  'mem.js',
  'ps4_offsets.js',
  'rpc_worker.js',
  'payload2.bin',
  'patches/1302.bin',
  'patches/1350.bin',
  'patches/1352.bin'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evt) => {
  evt.respondWith(
    caches.match(evt.request).then((res) => {
      return res || fetch(evt.request);
    })
  );
});