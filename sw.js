/* Service Worker: Cache-first, vollständige Offline-Nutzung. Keine externen Anfragen. */
const CACHE = 'lohnklar-v4';
const DATEIEN = ['./', './index.html', './css/style.css', './js/decimal.js', './js/lohnsteuer2026.js', './js/rechner.js', './js/krankenkassen.js', './js/app.js',
  './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => {
    const kopie = res.clone(); caches.open(CACHE).then(c => c.put(e.request, kopie)); return res;
  }).catch(() => caches.match('./index.html'))));
});
