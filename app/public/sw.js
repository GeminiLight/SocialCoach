/* Cache successful static assets; navigation has a clear offline recovery page.
 * No model responses, credentials or learner archive are stored in this cache. */
const CACHE = "socialcoach-v2";
const OFFLINE = "/offline.html";
const PRECACHE = ["/manifest.webmanifest", "/icon.svg", OFFLINE, "/offline.js"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("socialcoach-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin || e.request.method !== "GET" || url.pathname.startsWith("/api/")) return;
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(async () => await caches.match(OFFLINE) || new Response("SocialCoach", {status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}})));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || PRECACHE.includes(url.pathname)) {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        e.waitUntil(caches.open(CACHE).then(async (c) => {
          await c.put(e.request, copy);
          const assets = (await c.keys()).filter(request => new URL(request.url).pathname.startsWith("/_next/static/"));
          await Promise.all(assets.slice(0, Math.max(0, assets.length - 200)).map(request => c.delete(request)));
        }));
      }
      return res;
    })));
  }
});
