/**
 * Daybound Shell — Packaged-Only Loader
 *
 * This script runs in the extension's new-tab page (shell.html).
 * It reads stored theme settings and applies a matching background
 * before redirecting to the bundled React app (index.html).
 */

// Apply stored theme background before navigation to prevent FOUC
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

// Always load the bundled app
window.location.replace("index.html");
