// Service worker: app shell offline, audio served from the saved cache with Range support
// (<audio> seeks with Range requests, which the Cache API does not answer by itself).
const VERSION = "v10";
const SHELL_CACHE = `lga-shell-${VERSION}`;
const DATA_CACHE = "lga-data-v1";
const AUDIO_CACHE = "lga-audio-v1";

const SHELL = [
  "./",
  "index.html",
  "styles.css",
  "manifest.webmanifest",
  "icons/icon.svg",
  "js/app.js",
  "js/data.js",
  "js/icons.js",
  "js/offline.js",
  "js/player.js",
  "js/store.js",
  "fonts/bricolage-grotesque-latin-opsz-normal.woff2",
  "fonts/literata-latin-wght-normal.woff2",
  "fonts/literata-latin-wght-italic.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("lga-shell-") && k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function rangeResponse(request, cached) {
  return cached.arrayBuffer().then((buf) => {
    const header = request.headers.get("range");
    const m = /bytes=(\d*)-(\d*)/.exec(header ?? "");
    if (!m) return cached;
    const start = m[1] ? parseInt(m[1], 10) : 0;
    const end = m[2] ? Math.min(parseInt(m[2], 10), buf.byteLength - 1) : buf.byteLength - 1;
    if (start >= buf.byteLength) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${buf.byteLength}` } });
    return new Response(buf.slice(start, end + 1), {
      status: 206,
      statusText: "Partial Content",
      headers: {
        "Content-Type": cached.headers.get("Content-Type") || "audio/mpeg",
        "Content-Range": `bytes ${start}-${end}/${buf.byteLength}`,
        "Content-Length": String(end - start + 1),
        "Accept-Ranges": "bytes",
      },
    });
  });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname;

  // saved audio: answer from cache (with Range), otherwise let the network stream it
  if (path.includes("/audio/") && path.endsWith(".mp3")) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const hit = await cache.match(url.pathname);
        return hit ? rangeResponse(request, hit) : fetch(request);
      }),
    );
    return;
  }

  // lesson data: network first so new quarters show up, cache as the offline fallback
  if (path.includes("/audio/") && path.endsWith(".json")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(DATA_CACHE).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(() => caches.open(DATA_CACHE).then((c) => c.match(url.pathname)).then((hit) => hit ?? Response.error())),
    );
    return;
  }

  // app shell: cache first, refreshed in the background
  event.respondWith(
    caches.open(SHELL_CACHE).then(async (cache) => {
      const hit = await cache.match(request, { ignoreSearch: true });
      const refresh = fetch(request)
        .then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit ?? refresh;
    }),
  );
});
