const CACHE = 'nearsignal-shell-v24';
const SHELL = ['./', './index.html', './command-center.html', './review.html', './command-center.css', './review.css', './styles.css', './brand.css', './install.css', './access.css', './insights.css', './outcome-extra.css', './cohort.css', './app.js', './command-center.js', './access-command.js', './routing.js', './i18n.js', './brief-translation.js', './access-insight.js', './verified-arrival.js', './access-xray.js', './national-discovery.js', './zip-lookup.js', './config.js', './data/facilities.js', './data/review/evidence-network.js', './data/review/provider-enrichment.js', './data/zip/0.json', './data/zip/1.json', './data/zip/2.json', './data/zip/3.json', './data/zip/4.json', './data/zip/5.json', './data/zip/6.json', './data/zip/7.json', './data/zip/8.json', './data/zip/9.json', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});
self.addEventListener('activate', (event) => event.waitUntil(Promise.all([
  caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  self.clients.claim()
])));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const request = event.request.mode === 'navigate' ? new Request(event.request, { cache: 'reload' }) : event.request;
  event.respondWith(fetch(request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || (event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
