/**
 * Daybound Service Worker — Cache-First Strategy
 *
 * Deploy this alongside the React app at REMOTE_APP_URL.
 * It aggressively caches all app assets so that when the extension
 * shell loads the remote iframe, assets come from SW cache (~50ms)
 * rather than network (~300-800ms).
 *
 * ── Cache Strategy ──
 * • App shell (HTML)  → cache-first, revalidate in background
 * • JS/CSS bundles    → cache-first (hashed filenames = immutable)
 * • Fonts/images      → cache-first with long TTL
 * • version.json      → network-only (must always be fresh)
 *
 * ── Usage ──
 * Register this SW from your index.html (the remotely-hosted version):
 *
 *   <script>
 *     if ('serviceWorker' in navigator) {
 *       navigator.serviceWorker.register('/sw.js');
 *     }
 *   </script>
 *
 * ── Update Flow ──
 * 1. You deploy new files to the server.
 * 2. The browser detects sw.js has changed → installs new SW.
 * 3. New SW activates → deletes old caches.
 * 4. Next iframe load serves fresh files from the new cache.
 */

var CACHE_NAME = "daybound-v1";

// Assets to pre-cache on SW install (add your critical-path files)
var PRECACHE_URLS = [
  "/",
  "/index.html",
];

// ── Install: pre-cache shell ──
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// ── Activate: clean old caches ──
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// ── Fetch: cache-first for app assets, network-only for version.json ──
self.addEventListener("fetch", function (event) {
  var url = new URL(event.request.url);

  // version.json must always be fresh
  if (url.pathname === "/version.json") {
    event.respondWith(fetch(event.request));
    return;
  }

  // Everything else: cache-first with background revalidation
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      // Return cached immediately, revalidate in background
      var fetchPromise = fetch(event.request).then(function (response) {
        if (response && response.status === 200 && response.type === "basic") {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function () {
        // Network failed — cached version is fine
        return cached;
      });

      return cached || fetchPromise;
    })
  );
});
