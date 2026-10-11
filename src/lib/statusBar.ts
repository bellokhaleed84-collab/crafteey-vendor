import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

export const SPLASH_PURPLE = "#2A025E";

let splashActive = false;

// Reads the page colour from the same CSS variable the app uses, so the
// status bar always matches the screen in Light and Dark mode.
function pageColor(): string {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--page").trim();
    const parts = raw.split(/\s+/).map(Number);
    if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
      return "#" + parts.map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase();
    }
  } catch {
    // fall through
  }
  return "#FFFFFF";
}

export function setSplashActive(active: boolean) {
  splashActive = active;
  syncStatusBar();
}

export function syncStatusBar() {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) return;
  const dark = splashActive || document.documentElement.classList.contains("dark");
  const color = splashActive ? SPLASH_PURPLE : pageColor();
  (async () => {
    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
    } catch {
      // not supported on this phone: ignore
    }
    try {
      await StatusBar.setBackgroundColor({ color });
    } catch {
      // ignore
    }
    try {
      // Style.Dark = light icons (for dark bars). Style.Light = dark icons (for light bars).
      await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    } catch {
      // ignore
    }
  })();
}