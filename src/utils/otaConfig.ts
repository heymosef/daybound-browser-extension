/**
 * Over-The-Air (OTA) update configuration for Daybound.
 *
 * ── Architecture: Stale-While-Revalidate ──
 *
 * 1. Every new-tab open loads the BUNDLED app instantly (zero network).
 * 2. After render, <OtaUpdater /> checks VERSION_URL in the background.
 * 3. If a newer version exists, it pre-caches the remote app by loading
 *    it in a hidden iframe (warms browser / Service Worker cache).
 * 4. On the NEXT tab open, shell.js loads the remote iframe from cache
 *    (~50-200 ms).  If the cache miss or timeout, it falls straight
 *    back to the bundled version (<1 ms redirect).
 *
 * Result: users always get an instant new-tab page AND you can publish
 * updates to REMOTE_APP_URL without Chrome Web Store review.
 *
 * ── Setup ──
 * 1. Deploy the Vite build output to REMOTE_APP_URL.
 * 2. Put version.json at VERSION_URL:  { "version": "1.2.3" }
 * 3. (Recommended) Add a Service Worker to the remote app for
 *    aggressive cache-first behaviour — see /public/sw.js template.
 * 4. Bump BUNDLED_VERSION each time you publish to the Chrome Web Store.
 */

export const OTA_CONFIG = {
  /** Root URL of the remotely-hosted React app. */
  REMOTE_APP_URL: "https://app.daybound.com",

  /** JSON endpoint returning { "version": "x.y.z" }. */
  VERSION_URL: "https://app.daybound.com/version.json",

  /** Version baked into this Chrome Web Store package. */
  BUNDLED_VERSION: "1.0.0",

  /** Delay (ms) after app render before running the background check. */
  CHECK_DELAY_MS: 3_000,

  /** Max time (ms) to wait for the pre-cache iframe to load. */
  PRECACHE_TIMEOUT_MS: 15_000,

  // ── localStorage keys (shared with shell.js) ──
  LS_USE_REMOTE: "daybound_ota_use_remote",
  LS_REMOTE_VERSION: "daybound_ota_remote_version",
  LS_FAIL_COUNT: "daybound_ota_fail_count",
  LS_FAIL_TS: "daybound_ota_fail_ts",
} as const;

/** Semver comparison: 1 if a>b, -1 if a<b, 0 if equal. */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}
