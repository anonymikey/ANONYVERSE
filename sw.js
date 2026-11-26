// Network-first service worker: always tries the live site, falls back to the cached shell when offline.
const V = "anv-v2";
self.addEventListener("install", (e) => { self.skipWaiting(); e.waitUntil(caches.open(V).then((c) => c.addAll(["/", "/styles.css", "/app.js", "/assets/logo.png"]))); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== V).map((x) => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
  e.respondWith(fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)); } return res; }).catch(() => caches.match(r).then((m) => m || caches.match("/"))));
});
