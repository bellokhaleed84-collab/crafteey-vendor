export type ThemeChoice = "light" | "dark" | "auto";

export const THEME_KEY = "crafteey-theme";

// What people get until they pick something. Change to "auto" to follow
// the phone's setting by default.
export const DEFAULT_THEME: ThemeChoice = "light";

export function getStoredTheme(): ThemeChoice {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark" || v === "auto") return v;
  } catch {
    // storage blocked: fall through to default
  }
  return DEFAULT_THEME;
}

export function applyTheme(choice: ThemeChoice) {
  const dark =
    choice === "dark" ||
    (choice === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function saveTheme(choice: ThemeChoice) {
  try {
    window.localStorage.setItem(THEME_KEY, choice);
  } catch {
    // storage blocked: still apply for this visit
  }
  applyTheme(choice);
}