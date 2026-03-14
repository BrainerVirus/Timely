import { useEffect, useState } from "react";
import { loadAppPreferences, saveAppPreferences } from "@/lib/tauri";

export type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "timely-theme";
const VALID_THEMES = new Set<Theme>(["system", "light", "dark"]);

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_THEMES.has(stored as Theme)) {
      return stored as Theme;
    }
  } catch {
    // localStorage unavailable
  }
  return "system";
}

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

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  // Hydrate theme from backend preferences on mount
  useEffect(() => {
    void loadAppPreferences()
      .then((prefs) => {
        if (VALID_THEMES.has(prefs.themeMode as Theme)) {
          setThemeState(prefs.themeMode as Theme);
        }
      })
      .catch(() => {
        // fallback to localStorage
      });
  }, []);

  // Apply theme to DOM and persist
  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage unavailable
    }
  }, [theme]);

  function setTheme(next: Theme) {
    setThemeState(next);
    // Persist to backend (fire-and-forget, preserving other preferences)
    void loadAppPreferences()
      .then((prefs) => saveAppPreferences({ ...prefs, themeMode: next }))
      .catch(() => {
        // best effort
      });
  }

  return { theme, setTheme } as const;
}
