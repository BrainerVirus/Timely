import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getAppPreferencesCached,
  saveAppPreferencesCached,
} from "@/app/bootstrap/PreferencesCache/preferences-cache";
import { syncStartupPrefsWithPreferences } from "@/app/bootstrap/StartupPrefs/startup-prefs";
import {
  getNotificationPermissionState,
  loadHolidayCountries,
  requestNotificationPermission,
} from "@/app/desktop/TauriService/tauri";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { applyTheme, normalizeTheme, type Theme } from "@/app/providers/use-theme/use-theme";
import { createDefaultSettingsPreferences } from "@/features/settings/lib/settings-default-preferences";

import type {
  AppPreferences,
  HolidayCountryOption,
  NotificationThresholdToggles,
  TimeFormat,
} from "@/shared/types/dashboard";

type TranslateFn = ReturnType<typeof useI18n>["t"];

interface UseSettingsPreferencesControllerOptions {
  timezone: string;
  setLanguagePreference: (language: AppPreferences["language"]) => void;
  setTimeFormat: (format: TimeFormat) => void;
  t: TranslateFn;
}

export function useSettingsPreferencesController({
  timezone,
  setLanguagePreference,
  setTimeFormat,
  t,
}: UseSettingsPreferencesControllerOptions) {
  const [countries, setCountries] = useState<HolidayCountryOption[]>([]);
  const [notificationPermission, setNotificationPermission] = useState("unknown");
  const [preferences, setPreferences] = useState<AppPreferences>(() =>
    createDefaultSettingsPreferences(timezone),
  );

  useEffect(() => {
    void getAppPreferencesCached()
      .then(async (loadedPreferences) => {
        setPreferences(loadedPreferences);
        syncStartupPrefsWithPreferences(loadedPreferences);

        if (loadedPreferences.notificationPermissionRequested !== true) {
          try {
            const nextPermission = await requestNotificationPermission();
            setNotificationPermission(nextPermission);
          } catch {
            // best effort prompt; some desktop targets won't show a runtime prompt
          }

          const markedPreferences = {
            ...loadedPreferences,
            notificationPermissionRequested: true,
          };
          setPreferences(markedPreferences);

          try {
            const persisted = await saveAppPreferencesCached(markedPreferences);
            setPreferences(persisted);
            syncStartupPrefsWithPreferences(persisted);
          } catch {
            // best effort; retrying every launch is worse than one-time optimistic flag
          }
        }
      })
      .catch(() => {
        // best effort, use defaults
      });

    void loadHolidayCountries()
      .then(setCountries)
      .catch(() => {
        // fallback to empty options
      });

    void getNotificationPermissionState()
      .then(setNotificationPermission)
      .catch(() => {
        setNotificationPermission("unknown");
      });
  }, []);

  async function handleTimeFormatChange(format: TimeFormat) {
    setTimeFormat(format);
    const updated = { ...preferences, timeFormat: format };
    setPreferences(updated);

    try {
      await saveAppPreferencesCached(updated);
    } catch {
      // best effort - store already updated
    }
  }

  async function handleLanguageChange(language: AppPreferences["language"]) {
    const updated = { ...preferences, language };
    setPreferences(updated);
    setLanguagePreference(language);

    try {
      const persisted = await saveAppPreferencesCached(updated);
      setPreferences(persisted);
    } catch {
      // best effort; reload will restore persisted value later
    }
  }

  async function handleSavePreferences(nextPreferences: AppPreferences) {
    try {
      const persisted = await saveAppPreferencesCached(nextPreferences);
      setPreferences(persisted);
    } catch (error) {
      toast.error(t("settings.failedHolidayPreferences"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
        duration: 5000,
      });
      throw error;
    }
  }

  async function handleThemeChange(nextTheme: Theme) {
    const updated = { ...preferences, themeMode: nextTheme };
    setPreferences(updated);
    applyTheme(nextTheme);

    try {
      const persisted = await saveAppPreferencesCached(updated);
      setPreferences(persisted);
      syncStartupPrefsWithPreferences(persisted);
      applyTheme(normalizeTheme(persisted.themeMode));
    } catch {
      // best effort; keep the current session theme applied
    }
  }

  async function handleTrayEnabledChange(enabled: boolean) {
    const updated = {
      ...preferences,
      trayEnabled: enabled,
      closeToTray: enabled ? preferences.closeToTray : false,
    };
    setPreferences(updated);

    try {
      const persisted = await saveAppPreferencesCached(updated);
      setPreferences(persisted);
    } catch {
      // best effort; reload will restore persisted value later
    }
  }

  async function handleCloseToTrayChange(enabled: boolean) {
    const updated = {
      ...preferences,
      trayEnabled: enabled ? true : preferences.trayEnabled,
      closeToTray: enabled,
    };
    setPreferences(updated);

    try {
      const persisted = await saveAppPreferencesCached(updated);
      setPreferences(persisted);
    } catch {
      // best effort; reload will restore persisted value later
    }
  }

  async function handleNotificationsEnabledChange(enabled: boolean) {
    const updated = { ...preferences, notificationsEnabled: enabled };
    setPreferences(updated);

    try {
      const persisted = await saveAppPreferencesCached(updated);
      setPreferences(persisted);
    } catch {
      // best effort
    }
  }

  async function handleNotificationThresholdChange(
    key: keyof NotificationThresholdToggles,
    enabled: boolean,
  ) {
    const updated = {
      ...preferences,
      notificationThresholds: { ...preferences.notificationThresholds, [key]: enabled },
    };
    setPreferences(updated);

    try {
      const persisted = await saveAppPreferencesCached(updated);
      setPreferences(persisted);
    } catch {
      // best effort
    }
  }

  return {
    countries,
    notificationPermission,
    preferences,
    setPreferences,
    handleTimeFormatChange,
    handleLanguageChange,
    handleSavePreferences,
    handleThemeChange,
    handleTrayEnabledChange,
    handleCloseToTrayChange,
    handleNotificationsEnabledChange,
    handleNotificationThresholdChange,
  };
}
