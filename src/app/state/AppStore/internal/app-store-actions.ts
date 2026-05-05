import { getBootElapsedMs } from "@/app/bootstrap/BootTiming/boot-timing";
import {
  primeAppPreferencesCache,
  saveAppPreferencesCached,
} from "@/app/bootstrap/PreferencesCache/preferences-cache";
import { syncStartupPrefsWithPreferences } from "@/app/bootstrap/StartupPrefs/startup-prefs";
import {
  listProviderConnections,
  loadAppPreferences,
  loadBootstrapPayload,
  loadSetupState,
  logFrontendBootTiming,
  requestNotificationPermission,
  saveSetupState,
} from "@/app/desktop/TauriService/tauri";
import {
  persistStartupSnapshot,
  syncTrayIcon,
} from "@/app/state/AppStore/internal/app-store-snapshot";
import { getCountryCodeForTimezone, normalizeHolidayCountryMode } from "@/shared/lib/utils";

import type { AppStoreGet, AppStoreSet } from "@/app/state/AppStore/internal/app-store-types";

export function logStoreBoot(message: string): void {
  const elapsed = getBootElapsedMs();
  void logFrontendBootTiming(`[app-store] ${message}`, elapsed).catch(() => {
    // best effort logging only
  });
}

async function timedStoreCall<T>(label: string, run: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    const value = await run();
    logStoreBoot(`${label} ok in ${Math.round(performance.now() - start)}ms`);
    return value;
  } catch (error) {
    logStoreBoot(`${label} failed in ${Math.round(performance.now() - start)}ms`);
    throw error;
  }
}

export function createBootstrapAction(set: AppStoreSet, get: AppStoreGet) {
  return async () => {
    const bootstrapStart = performance.now();
    logStoreBoot("bootstrap started");

    try {
      let [payload, connections, setupState, preferences] = await Promise.all([
        timedStoreCall("bootstrap_dashboard", () => loadBootstrapPayload()),
        timedStoreCall("list_provider_connections", () => listProviderConnections()),
        timedStoreCall("load_setup_state", () => loadSetupState()),
        timedStoreCall("load_app_preferences", () => loadAppPreferences()),
      ]);

      if (!setupState.isComplete) {
        setupState = { currentStep: "welcome", isComplete: false, completedSteps: [] };
        void saveSetupState(setupState).catch(() => {});
      }

      const detectedHolidayCountryCode = getCountryCodeForTimezone(payload.schedule.timezone);
      const shouldSyncAutoHolidayCountry =
        normalizeHolidayCountryMode(preferences.holidayCountryMode) === "auto" &&
        detectedHolidayCountryCode != null &&
        preferences.holidayCountryCode !== detectedHolidayCountryCode;

      if (shouldSyncAutoHolidayCountry) {
        preferences = await timedStoreCall("save_app_preferences(auto-holiday)", () =>
          saveAppPreferencesCached({
            ...preferences,
            holidayCountryMode: "auto",
            holidayCountryCode: detectedHolidayCountryCode,
          }),
        );
        payload = await timedStoreCall("bootstrap_dashboard(auto-holiday-refresh)", () =>
          loadBootstrapPayload(),
        );
      }

      if (!preferences.notificationPermissionRequested) {
        try {
          await requestNotificationPermission();
        } catch {}

        const nextPreferences = { ...preferences, notificationPermissionRequested: true };

        try {
          preferences = await timedStoreCall("save_app_preferences(notification-permission)", () =>
            saveAppPreferencesCached(nextPreferences),
          );
        } catch {
          preferences = nextPreferences;
        }
      }

      set({
        lifecycle: { phase: "ready", payload },
        connections,
        setupState,
        timeFormat: preferences.timeFormat,
        autoSyncEnabled: preferences.autoSyncEnabled,
        autoSyncIntervalMinutes: preferences.autoSyncIntervalMinutes,
        onboardingCompleted: preferences.onboardingCompleted,
      });
      persistStartupSnapshot({
        payload,
        connections,
        setupState,
        timeFormat: preferences.timeFormat,
        autoSyncEnabled: preferences.autoSyncEnabled,
        autoSyncIntervalMinutes: preferences.autoSyncIntervalMinutes,
        onboardingCompleted: preferences.onboardingCompleted,
      });
      syncStartupPrefsWithPreferences(preferences);
      primeAppPreferencesCache(preferences);
      syncTrayIcon(payload);
      logStoreBoot(`bootstrap finished in ${Math.round(performance.now() - bootstrapStart)}ms`);
    } catch (error) {
      logStoreBoot(`bootstrap failed in ${Math.round(performance.now() - bootstrapStart)}ms`);
      if (get().lifecycle.phase !== "ready") {
        set({ lifecycle: { phase: "error", error: String(error) } });
      }
    }
  };
}
