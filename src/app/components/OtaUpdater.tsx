import { useEffect } from "react";
import { OTA_CONFIG, compareSemver } from "../../utils/otaConfig";

/**
 * Background OTA update checker.
 *
 * Renders nothing. Runs once after the app has been visible for a few
 * seconds and does the following:
 *
 *   1. Fetches version.json from the remote server.
 *   2. If the remote version is newer than the bundled version:
 *      a. Creates a hidden <iframe> pointing at the remote app.
 *      b. Waits for it to fully load (warming the browser + SW cache).
 *      c. Sets a localStorage flag so the next shell.html load will
 *         serve the remote version from cache instead of redirecting
 *         to the bundled index.html.
 *   3. If the remote is unreachable or the version is the same,
 *      it silently does nothing.
 *
 * This component should be rendered near the bottom of <App /> so it
 * never blocks the initial paint.
 */
export function OtaUpdater() {
  useEffect(() => {
    // Don't run in iframe context (we'd be the remote app already)
    if (window.self !== window.top) return;

    const timer = setTimeout(runCheck, OTA_CONFIG.CHECK_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return null;
}

async function runCheck(): Promise<void> {
  try {
    // 1. Fetch remote version manifest
    const res = await fetch(OTA_CONFIG.VERSION_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return;

    const { version } = (await res.json()) as { version: string };
    if (!version) return;

    // 2. Compare with bundled version
    if (compareSemver(version, OTA_CONFIG.BUNDLED_VERSION) <= 0) {
      // Remote is same or older — nothing to do.
      // Clear the "use remote" flag in case it was set from a previous
      // session that had a newer remote version (e.g. rollback scenario).
      localStorage.removeItem(OTA_CONFIG.LS_USE_REMOTE);
      return;
    }

    // 3. Check if we already pre-cached this version
    const cachedVersion = localStorage.getItem(OTA_CONFIG.LS_REMOTE_VERSION);
    if (cachedVersion === version) {
      // Already pre-cached — just make sure the flag is set
      localStorage.setItem(OTA_CONFIG.LS_USE_REMOTE, "true");
      return;
    }

    // 4. Pre-cache: load the remote app in a hidden iframe
    console.debug("[OTA] New version available:", version, "— pre-caching…");

    const success = await precacheRemoteApp();

    if (success) {
      localStorage.setItem(OTA_CONFIG.LS_USE_REMOTE, "true");
      localStorage.setItem(OTA_CONFIG.LS_REMOTE_VERSION, version);
      // Clear any failure tracking from previous attempts
      localStorage.removeItem(OTA_CONFIG.LS_FAIL_COUNT);
      localStorage.removeItem(OTA_CONFIG.LS_FAIL_TS);
      console.debug("[OTA] Pre-cache complete. Next tab will use version", version);
    }
  } catch (err) {
    // Network error, timeout, bad JSON — all fine, we'll try again next tab
    console.debug("[OTA] Background check failed (will retry next tab):", err);
  }
}

/**
 * Load the remote app in a hidden iframe so the browser (and the
 * remote app's Service Worker, if any) caches all assets.
 *
 * Returns true if the iframe loaded successfully.
 */
function precacheRemoteApp(): Promise<boolean> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");

    // Make it completely invisible and non-interactive
    Object.assign(iframe.style, {
      position: "fixed",
      width: "0",
      height: "0",
      border: "none",
      opacity: "0",
      pointerEvents: "none",
      // Place off-screen to avoid any layout shifts
      top: "-9999px",
      left: "-9999px",
    });

    // Restrict the hidden iframe for security
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
    iframe.setAttribute("aria-hidden", "true");
    iframe.tabIndex = -1;

    let settled = false;

    const cleanup = () => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };

    const done = (success: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      // Small delay before cleanup to let SW finish caching
      setTimeout(cleanup, 1_000);
      resolve(success);
    };

    const timeout = setTimeout(() => {
      console.debug("[OTA] Pre-cache timed out");
      done(false);
    }, OTA_CONFIG.PRECACHE_TIMEOUT_MS);

    iframe.addEventListener("load", () => done(true));
    iframe.addEventListener("error", () => done(false));

    iframe.src = OTA_CONFIG.REMOTE_APP_URL;
    document.body.appendChild(iframe);
  });
}
