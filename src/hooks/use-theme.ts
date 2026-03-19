import { loadAppPreferences } from "@/lib/tauri";

export type Theme = "system" | "light" | "dark";

const VALID_THEMES = new Set<Theme>(["system", "light", "dark"]);

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
    root.style.colorScheme = "";
  } else {
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;
  }
}

export function normalizeTheme(value: string | undefined): Theme {
  return VALID_THEMES.has(value as Theme) ? (value as Theme) : "system";
}

export async function loadPersistedTheme(): Promise<Theme> {
  const preferences = await loadAppPreferences();
  return normalizeTheme(preferences.themeMode);
}
