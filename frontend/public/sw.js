/* Public app shell only. Member data and guarded media stay network-only. */
const VERSION = "mv-v8-2026-11-private-cache";
const SHELL = ["/", "/matches", "/register", "/porutham", "/safety", "/offline", "/manifest.webmanifest", "/icons/icon-192.png"];
const PUBLIC_ROOT_ASSETS = new Set(["/manifest.webmanifest", "/favicon.png", "/logo.png", "/og-image.png", "/dp-tsbride.png", "/dp-tsgroom1.png", "/next.svg", "/vercel.svg"]);
const PUBLIC_ASSET_PREFIXES = ["/_next/static/", "/icons/", "/editorial/", "/promo/"];
const isAsset = (url) => PUBLIC_ROOT_ASSETS.has(url.pathname) || PUBLIC_ASSET_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
const isShell = (url) => !url.search && SHELL.includes(url.pathname);
const mayStore = (request, response) => {
  const url = new URL(request.url);
  return request.method === "GET" && url.origin === self.location.origin &&
    (isAsset(url) || isShell(url)) && response.ok && !response.redirected &&
    !/(?:^|[,\s])(?:private|no-store)(?:$|[,\s=])/i.test(response.headers.get("Cache-Control") || "");
};
async function store(request, response) {
  if (mayStore(request, response)) {
    try { await (await caches.open(VERSION)).put(request, response.clone()); } catch { /* Cache quota must not break online use. */ }
  }
  return response;
}
async function cached(request) {
  return (await caches.open(VERSION)).match(request);
}
self.addEventListener("install", (event) => {
  event.waitUntil(Promise.all(SHELL.map(async (path) => {
    const request = new Request(new URL(path, self.location.origin), { cache: "reload" });
    try { await store(request, await fetch(request)); } catch { /* Available public shell entries can still be installed. */ }
  })).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Remove legacy app caches, including any guarded media stored by old workers.
    // Leave caches belonging to other applications on this origin untouched.
    await Promise.all((await caches.keys()).filter((name) => /^mv-v\d+-/.test(name) && name !== VERSION).map((name) => caches.delete(name)));
    const cache = await caches.open(VERSION);
    for (const request of await cache.keys()) {
      const response = await cache.match(request);
      if (!response || !mayStore(request, response)) await cache.delete(request);
    }
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (isAsset(url)) {
    event.respondWith((async () => (await cached(request)) || store(request, await fetch(request)))());
    return;
  }
  // API, voice, photos, cards, review links, RSC and every other nonnavigation
  // request use the network directly. Never replace protected bytes with HTML.
  if (request.mode !== "navigate") return;
  event.respondWith((async () => {
    try { return await store(request, await fetch(request)); }
    catch {
      const hit = isShell(url) ? await cached(request) : undefined;
      return hit || await cached(new URL("/offline", self.location.origin).href) || Response.error();
    }
  })());
});

self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });

/* 🔔 WAVE 38 — WEB PUSH (match alerts: title/body/url/icon/tag from backend queue) */
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = {}; }
  const title = d.title || "💍 మన వివాహ";
  const body = d.body || "కొత్త matches వచ్చాయి — చూడండి!";
  const url = d.url || "/matches";
  event.waitUntil(
    self.registration.showNotification(title, {
      body, icon: d.icon || "/icons/icon-192.png", badge: "/icons/icon-192.png",
      tag: d.tag || "mv-alert", data: { url }, requireInteraction: false,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/matches";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ("focus" in c) { c.navigate(url); return c.focus(); } }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
