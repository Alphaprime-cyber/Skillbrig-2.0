const CACHE_NAME = "skillbridge-static-v1";
const STATIC_ASSETS = ["./offline.html", "./icons/icon-192.svg", "./icons/icon-512.svg", "./icons/icon-192.png", "./icons/icon-512.png", "./manifest.webmanifest"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("skillbridge-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  // Never cache Firebase, auth, payment, or other API requests.
  if (/firebase|googleapis|paystack|cloudfunctions|identitytoolkit|firestore/i.test(url.hostname + url.pathname)) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => (await caches.match("./offline.html")) || Response.error()));
    return;
  }
  if (url.pathname.endsWith(".css") || url.pathname.endsWith(".js") || url.pathname.endsWith(".svg") || url.pathname.endsWith(".webmanifest")) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(request, copy)); }
      return response;
    }).catch(async () => (await caches.match(request)) || Response.error()));
  }
});
