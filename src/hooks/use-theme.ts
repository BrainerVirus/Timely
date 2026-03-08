import { useEffect, useState } from "react";
import { loadAppPreferences, saveAppPreferences } from "@/lib/tauri";

export type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "pulseboard-theme";

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return "system";
}

function applyTheme(theme: Theme) {
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
  const [language, setLanguage] = useState("en");
  const [holidayCountryCode, setHolidayCountryCode] = useState<string | undefined>();
  const [holidayRegionCode, setHolidayRegionCode] = useState<string | undefined>();

  useEffect(() => {
    void loadAppPreferences()
      .then((preferences) => {
        if (
          preferences.themeMode === "light" ||
          preferences.themeMode === "dark" ||
          preferences.themeMode === "system"
        ) {
          setThemeState(preferences.themeMode);
        }
        setLanguage(preferences.language);
        setHolidayCountryCode(preferences.holidayCountryCode);
        setHolidayRegionCode(preferences.holidayRegionCode);
      })
      .catch(() => {
        // fallback to local storage only
      });
  }, []);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage unavailable
    }

    void saveAppPreferences({
      themeMode: theme,
      language,
      holidayCountryCode,
      holidayRegionCode,
    }).catch(() => {
      // backend persistence is best effort for now
    });
  }, [theme, language, holidayCountryCode, holidayRegionCode]);

  return { theme, setTheme: setThemeState } as const;
}
