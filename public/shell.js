/**
 * Daybound OTA Shell — Stale-While-Revalidate
 *
 * This script runs in the extension's new-tab page (shell.html).
 * Vanilla JS, no bundler, intentionally tiny.
 *
 * ── Strategy ──
 *
 *   FAST PATH (default):
 *     Redirect to the locally-bundled index.html immediately.
 *     The bundled React app handles background update checking.
 *
 *   CACHED REMOTE PATH:
 *     Only used when a previous session pre-cached the remote app
 *     (flag in localStorage).  Loads the remote iframe from browser
 *     cache with a very short timeout.  Falls back to bundled on any
 *     failure.
 *
 *   Result:
 *     • Every tab open feels instant (≤100 ms in any scenario)
 *     • OTA updates appear on the NEXT tab open after pre-caching
 *     • Offline always works (bundled fallback)
 *
 * ── Configuration ──
 * Edit the constants below or replace them at build time.
 */

// ═══════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════
var REMOTE_APP_URL  = "https://app.daybound.com";
var IFRAME_TIMEOUT  = 800;   // ms — must be very short (cache hit expected)

// localStorage keys (shared with OtaUpdater.tsx in the React app)
var OTA_USE_REMOTE  = "daybound_ota_use_remote";   // "true" | absent
var OTA_REMOTE_VER  = "daybound_ota_remote_version";
var OTA_FAIL_COUNT  = "daybound_ota_fail_count";
var OTA_FAIL_TS     = "daybound_ota_fail_ts";
var MAX_FAILURES    = 3;
var BACKOFF_MS      = 5 * 60 * 1000; // 5 min

// ═══════════════════════════════════════════════════════════════════════
// 1. EARLY THEME PAINT — read stored settings, apply background colour
//    (prevents white flash regardless of which path we take)
// ═══════════════════════════════════════════════════════════════════════
(function earlyThemePaint() {
  var THEME_BG = {
    gamut:  { light: "#ffffff", dark: "#292929" },
    "te-1": { light: "#ececec", dark: "#333333" },
    dos:    { light: "#f4f9f4", dark: "#022c22" }
  };
  var THEME_ACCENT = {
    gamut:  { light: "#6366f1", dark: "#818cf8" },
    "te-1": { light: "#f97316", dark: "#fb923c" },
    dos:    { light: "#059669", dark: "#34d399" }
  };

  try {
    var raw = localStorage.getItem("app_settings");
    var s = raw ? JSON.parse(raw) : {};
    var dt = s.designTheme || "gamut";
    var mode = s.theme || "system";
    var sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var isDark = mode === "dark" || (mode === "system" && sysDark);
    var palette = THEME_BG[dt] || THEME_BG.gamut;
    var accentPalette = THEME_ACCENT[dt] || THEME_ACCENT.gamut;
    document.documentElement.style.setProperty("--shell-bg", isDark ? palette.dark : palette.light);
    document.documentElement.style.setProperty("--shell-accent", isDark ? accentPalette.dark : accentPalette.light);
  } catch (e) { /* defaults in CSS are fine */ }
})();

// ═══════════════════════════════════════════════════════════════════════
// 2. ROUTING DECISION — bundled or cached remote?
// ═══════════════════════════════════════════════════════════════════════

/** Should we skip the remote due to repeated failures? */
function isInBackoff() {
  try {
    var count = parseInt(localStorage.getItem(OTA_FAIL_COUNT) || "0", 10);
    if (count < MAX_FAILURES) return false;
    var ts = parseInt(localStorage.getItem(OTA_FAIL_TS) || "0", 10);
    if (Date.now() - ts > BACKOFF_MS) {
      localStorage.setItem(OTA_FAIL_COUNT, "0");
      return false;
    }
    return true;
  } catch (e) { return false; }
}

function recordFailure() {
  try {
    var c = parseInt(localStorage.getItem(OTA_FAIL_COUNT) || "0", 10);
    localStorage.setItem(OTA_FAIL_COUNT, String(c + 1));
    localStorage.setItem(OTA_FAIL_TS, String(Date.now()));
  } catch (e) { /* ignore */ }
}

function clearFailures() {
  try {
    localStorage.removeItem(OTA_FAIL_COUNT);
    localStorage.removeItem(OTA_FAIL_TS);
  } catch (e) { /* ignore */ }
}

function goToBundled() {
  window.location.replace("index.html");
}

// ── Decision ──
var useRemote = false;
try {
  useRemote = localStorage.getItem(OTA_USE_REMOTE) === "true";
} catch (e) { /* ignore */ }

var isOnline = navigator.onLine !== false; // treat unknown as online

if (!useRemote || !isOnline || isInBackoff()) {
  // ══ FAST PATH — instant redirect to bundled app ══
  goToBundled();
} else {
  // ══ CACHED REMOTE PATH — try iframe with short timeout ══
  var frame = document.getElementById("app-frame");
  var loader = document.getElementById("shell-loader");
  var settled = false;

  function settle(success) {
    if (settled) return;
    settled = true;
    clearTimeout(timer);

    if (success) {
      // Iframe loaded — hide spinner, show frame
      clearFailures();
      if (loader) loader.classList.add("hidden");
    } else {
      // Failed or timed out — fall back to bundled
      recordFailure();
      // Clear the flag so next tab opens instantly (bundled)
      try { localStorage.removeItem(OTA_USE_REMOTE); } catch (e) {}
      goToBundled();
    }
  }

  // Start the very-short timer (cache hit should be <200ms)
  var timer = setTimeout(function () { settle(false); }, IFRAME_TIMEOUT);

  frame.src = REMOTE_APP_URL;
  frame.addEventListener("load", function () { settle(true); });
  frame.addEventListener("error", function () { settle(false); });

  // ═════════════════════════════════════════════════════════════════════
  // 3. STORAGE BRIDGE — only active when the remote iframe is shown
  // ═════════════════════════════════════════════════════════════════════
  window.addEventListener("message", function (event) {
    if (!frame || event.source !== frame.contentWindow) return;
    var msg = event.data;
    if (!msg || typeof msg.type !== "string") return;

    // ── Handshake ──
    if (msg.type === "daybound-iframe-ready") {
      frame.contentWindow.postMessage({ type: "daybound-bridge-ready" }, "*");
      return;
    }

    // ── GET ──
    if (msg.type === "daybound-storage-get") {
      var id = msg.id;
      var keys = msg.keys || [];
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(keys, function (result) {
          frame.contentWindow.postMessage(
            { type: "daybound-storage-result", id: id, data: result || {} }, "*"
          );
        });
      } else {
        var res = {};
        for (var i = 0; i < keys.length; i++) {
          try {
            var v = localStorage.getItem(keys[i]);
            if (v !== null) res[keys[i]] = JSON.parse(v);
          } catch (e) { /* ignore */ }
        }
        frame.contentWindow.postMessage(
          { type: "daybound-storage-result", id: id, data: res }, "*"
        );
      }
      return;
    }

    // ── SET ──
    if (msg.type === "daybound-storage-set") {
      var setId = msg.id;
      var data = msg.data || {};
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set(data, function () {
          frame.contentWindow.postMessage(
            { type: "daybound-storage-set-ack", id: setId }, "*"
          );
        });
      } else {
        var ks = Object.keys(data);
        for (var k = 0; k < ks.length; k++) {
          try { localStorage.setItem(ks[k], JSON.stringify(data[ks[k]])); }
          catch (e) { /* ignore */ }
        }
        frame.contentWindow.postMessage(
          { type: "daybound-storage-set-ack", id: setId }, "*"
        );
      }
      return;
    }
  });

  // ── Forward chrome.storage.onChanged → iframe ──
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== "sync" || !frame || !frame.contentWindow) return;
      frame.contentWindow.postMessage(
        { type: "daybound-storage-changed", changes: changes }, "*"
      );
    });
  }
}
