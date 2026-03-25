import { useEffect, useReducer, useState } from "react";
import { toast } from "sonner";
import { applyTheme, normalizeTheme, type Theme } from "@/core/hooks/use-theme/use-theme";
import { buildInfo } from "@/core/services/BuildInfo/build-info";
import { useI18n } from "@/core/services/I18nService/i18n";
import {
  getAppPreferencesCached,
  saveAppPreferencesCached,
} from "@/core/services/PreferencesCache/preferences-cache";
import {
  syncStartupPrefsWithPreferences,
  writeStartupPrefs,
} from "@/core/services/StartupPrefs/startup-prefs";
import {
  getNotificationPermissionState,
  loadHolidayCountries,
  requestNotificationPermission,
  sendTestNotification,
} from "@/core/services/TauriService/tauri";
import { useAppStore } from "@/core/stores/AppStore/app-store";
import {
  createInitialScheduleFormState,
  formatNetHours,
  getEffectiveWeekStart,
  getOrderedWorkdays,
  scheduleFormReducer,
} from "@/features/settings/hooks/schedule-form/schedule-form";
import { resolveNextAutoHolidayPreferences } from "@/features/settings/utils/settings-holiday-helpers";
import {
  computeSummaryLabels,
  type UpdateSectionState,
} from "@/features/settings/utils/settings-summary-labels";
import { findPrimaryConnection, isConnectionActive } from "@/shared/types/dashboard";
import {
  getCountryCodeForTimezone,
  getSupportedTimezones,
  getWeekStartsOnIndex,
  resolveHolidayCountryCode,
} from "@/shared/utils/utils";

import type {
  AppPreferences,
  AppUpdateChannel,
  AppUpdateDownloadEvent,
  AppUpdateInfo,
  BootstrapPayload,
  HolidayCountryOption,
  MotionPreference,
  NotificationThresholdToggles,
  ProviderConnection,
  ScheduleInput,
  SyncState,
  TimeFormat,
} from "@/shared/types/dashboard";

export type { UpdateSectionState };

export interface UseSettingsPageControllerProps {
  payload: BootstrapPayload;
  connections: ProviderConnection[];
  syncState: SyncState;
  onCheckForUpdates: (channel: AppUpdateChannel) => Promise<AppUpdateInfo | null>;
  onInstallUpdate: (
    channel: AppUpdateChannel,
    onEvent?: (event: AppUpdateDownloadEvent) => void,
  ) => Promise<void>;
  onRestartToUpdate: () => Promise<void>;
  onRefreshBootstrap?: () => Promise<void>;
  onUpdateSchedule?: (input: ScheduleInput) => Promise<void>;
}

export function useSettingsPageController({
  payload,
  connections,
  syncState,
  onCheckForUpdates,
  onInstallUpdate,
  onRestartToUpdate,
  onRefreshBootstrap,
  onUpdateSchedule,
}: UseSettingsPageControllerProps) {
  const {
    formatLanguageLabel,
    formatTimezoneOffset,
    formatWeekdayFromCode,
    setLanguagePreference,
    t,
  } = useI18n();
  const { timeFormat, setTimeFormat, autoSyncEnabled, autoSyncIntervalMinutes } = useAppStore();

  const [countries, setCountries] = useState<HolidayCountryOption[]>([]);
  const [notificationPermission, setNotificationPermission] = useState("unknown");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [updateSectionState, setUpdateSectionState] = useState<UpdateSectionState>({
    status: "idle",
  });
  const [preferences, setPreferences] = useState<AppPreferences>({
    themeMode: "system",
    language: "auto",
    updateChannel: buildInfo.defaultUpdateChannel,
    lastInstalledVersion: undefined,
    lastSeenReleaseHighlightsVersion: undefined,
    holidayCountryMode: "auto",
    holidayCountryCode: getCountryCodeForTimezone(payload.schedule.timezone),
    motionPreference: "system",
    timeFormat: "hm",
    autoSyncEnabled: false,
    autoSyncIntervalMinutes: 30,
    trayEnabled: true,
    closeToTray: true,
    onboardingCompleted: false,
    notificationsEnabled: true,
    notificationThresholds: {
      minutes45: true,
      minutes30: true,
      minutes15: true,
      minutes5: true,
    },
  });

  const [scheduleForm, dispatchScheduleForm] = useReducer(
    scheduleFormReducer,
    payload,
    createInitialScheduleFormState,
  );
  const { shiftStart, shiftEnd, lunchMinutes, workdays, timezone, weekStart, schedulePhase } =
    scheduleForm;

  const netHours = formatNetHours(shiftStart, shiftEnd, lunchMinutes);
  const resolvedWeekStart = getEffectiveWeekStart(weekStart, timezone);
  const calendarWeekStartsOn = getWeekStartsOnIndex(weekStart, timezone);
  const orderedWorkdays = getOrderedWorkdays(weekStart, timezone);
  const [timezoneOptions] = useState(() =>
    getSupportedTimezones(timezone).map((tz) => {
      const city = tz.split("/").pop()?.replaceAll("_", " ") ?? tz;
      const offset = formatTimezoneOffset(tz);

      return {
        value: tz,
        label: `(${offset}) ${city}`,
        badge: tz.split("/")[0],
      };
    }),
  );

  const primary = findPrimaryConnection(connections);
  const isConnected = primary != null && isConnectionActive(primary);
  const syncing = syncState.status === "syncing";

  useEffect(() => {
    void getAppPreferencesCached()
      .then((loadedPreferences) => {
        setPreferences(loadedPreferences);
        syncStartupPrefsWithPreferences(loadedPreferences);
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

  useEffect(() => {
    if (schedulePhase !== "saved") {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "idle" });
    }, 1600);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [schedulePhase]);

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

  async function handleUpdateChannelChange(channel: AppUpdateChannel) {
    const previous = preferences;
    const updated = { ...preferences, updateChannel: channel };
    setPreferences(updated);
    setUpdateSectionState({ status: "idle" });

    try {
      const persisted = await saveAppPreferencesCached(updated);
      setPreferences(persisted);
    } catch (error) {
      setPreferences(previous);
      toast.error(t("settings.updatesChannelSaveFailed"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
        duration: 5000,
      });
    }
  }

  async function handleCheckForUpdates() {
    setUpdateSectionState({ status: "checking" });
    toast.info(t("settings.updatesChecking"), {
      description: t("settings.updatesToastChecking"),
      duration: 2500,
    });

    try {
      const update = await onCheckForUpdates(preferences.updateChannel);

      if (!update) {
        setUpdateSectionState({ status: "upToDate" });
        toast.success(t("settings.updatesUpToDate"), {
          description: t("settings.updatesNoUpdate"),
          duration: 3500,
        });
        return;
      }

      setUpdateSectionState({ status: "available", update });
      toast.success(t("settings.updatesAvailable", { version: update.version }), {
        description: t("settings.updatesAvailableDescription"),
        duration: 4000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("settings.tryAgain");
      setUpdateSectionState({
        status: "error",
        message,
      });
      toast.error(t("settings.updatesCheckFailed"), {
        description: message,
        duration: 5000,
      });
    }
  }

  async function handleInstallUpdate() {
    const currentState = updateSectionState;
    if (currentState.status !== "available") {
      return;
    }

    let downloadedBytes = 0;
    let totalBytes: number | undefined;

    setUpdateSectionState({
      status: "installing",
      update: currentState.update,
      downloadedBytes: 0,
      totalBytes: undefined,
    });

    try {
      await onInstallUpdate(preferences.updateChannel, (event) => {
        if (event.event === "Started") {
          totalBytes = event.data.contentLength;
          setUpdateSectionState({
            status: "installing",
            update: currentState.update,
            downloadedBytes,
            totalBytes,
          });
          toast.info(t("settings.updatesInstalling"), {
            description: t("settings.updatesToastInstalling"),
            duration: 2500,
          });
          return;
        }

        if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          setUpdateSectionState({
            status: "installing",
            update: currentState.update,
            downloadedBytes,
            totalBytes,
          });
          return;
        }

        setUpdateSectionState({
          status: "readyToRestart",
          update: currentState.update,
        });
        toast.success(t("settings.updatesReady", { version: currentState.update.version }), {
          description: t("settings.updatesReadyDescription"),
          duration: 5000,
        });
      });

      setUpdateSectionState({
        status: "readyToRestart",
        update: currentState.update,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("settings.tryAgain");
      setUpdateSectionState({
        status: "error",
        message,
      });
      toast.error(t("settings.updatesInstallFailed"), {
        description: message,
        duration: 5000,
      });
    }
  }

  async function handleRestartToUpdate() {
    try {
      toast.info(t("settings.updatesRestart"), {
        description: t("settings.updatesToastRestarting"),
        duration: 2500,
      });
      await onRestartToUpdate();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("settings.tryAgain");
      setUpdateSectionState({
        status: "error",
        message,
      });
      toast.error(t("settings.updatesRestartFailed"), {
        description: message,
        duration: 5000,
      });
    }
  }

  async function handleSaveSchedule() {
    if (!onUpdateSchedule) {
      return;
    }

    const lunchMinutesValue = Number.parseInt(lunchMinutes) || 0;
    const nextAutoHolidayPreferences = resolveNextAutoHolidayPreferences(preferences, timezone);

    dispatchScheduleForm({ type: "setSchedulePhase", phase: "saving" });

    try {
      await onUpdateSchedule({
        shiftStart,
        shiftEnd,
        lunchMinutes: lunchMinutesValue,
        workdays,
        timezone,
        weekStart: resolvedWeekStart,
      });
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "saved" });

      if (onRefreshBootstrap) {
        await onRefreshBootstrap();
      }
    } catch (error) {
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "idle" });
      toast.error(t("settings.failedSchedule"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
        duration: 6000,
      });
      return;
    }

    if (nextAutoHolidayPreferences) {
      void handleSavePreferences(nextAutoHolidayPreferences).catch(() => {});
    }
  }

  function handleToggleAutoSync() {
    void useAppStore.getState().setAutoSyncPrefs(!autoSyncEnabled, autoSyncIntervalMinutes);
  }

  function handleSetAutoSyncInterval(minutes: number) {
    void useAppStore.getState().setAutoSyncPrefs(autoSyncEnabled, minutes);
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

  async function handleRequestNotificationPermission() {
    try {
      const next = await requestNotificationPermission();
      setNotificationPermission(next);
    } catch (error) {
      toast.error(t("settings.remindersPermissionRequestFailed"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
        duration: 5000,
      });
    }
  }

  async function handleSendTestNotification() {
    try {
      await sendTestNotification({
        title: t("settings.remindersTestTitle"),
        body: t("settings.remindersTestBody"),
      });
      toast.success(t("settings.remindersTestSent"));
    } catch (error) {
      toast.error(t("settings.remindersTestFailed"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
        duration: 5000,
      });
    }
  }

  const formatSyncIntervalLabel = (minutes: number) =>
    minutes >= 60 && minutes % 60 === 0
      ? t("settings.intervalHours", { count: minutes / 60 })
      : t("settings.intervalMinutes", { count: minutes });

  const summaryLabels = computeSummaryLabels({
    preferences,
    updateSectionState,
    workdays,
    netHours,
    autoSyncEnabled,
    autoSyncIntervalMinutes,
    isConnected,
    primary,
    timezone,
    formatWeekdayFromCode,
    formatLanguageLabel,
    formatSyncIntervalLabel,
    t,
  });

  return {
    aboutOpen,
    setAboutOpen,
    preferences,
    countries,
    timezone,
    calendarWeekStartsOn,
    resolvedHolidayCountryCode: resolveHolidayCountryCode(
      preferences.holidayCountryMode,
      preferences.holidayCountryCode,
      timezone,
    ),
    shiftStart,
    shiftEnd,
    lunchMinutes,
    workdays,
    weekStart,
    schedulePhase,
    netHours,
    orderedWorkdays,
    timezoneOptions,
    theme: preferences.themeMode,
    setTheme: handleThemeChange,
    timeFormat,
    autoSyncEnabled,
    autoSyncIntervalMinutes,
    isConnected,
    syncing,
    connectionSummary: summaryLabels.connectionSummary,
    scheduleSummary: summaryLabels.scheduleSummary,
    holidaySummary: summaryLabels.holidaySummary,
    themeSummary: summaryLabels.themeSummary,
    accessibilitySummary: summaryLabels.accessibilitySummary,
    traySummary: summaryLabels.traySummary,
    remindersSummary: summaryLabels.remindersSummary,
    notificationPermission,
    syncSummary: summaryLabels.syncSummary,
    updatesSummary: summaryLabels.updatesSummary,
    releaseChannelLabel: summaryLabels.releaseChannelLabel,
    updateSectionState,
    formatLanguageLabel,
    formatSyncIntervalLabel,
    handleTimeFormatChange,
    handleMotionPreferenceChange: async (motionPreference: MotionPreference) => {
      const updated = { ...preferences, motionPreference };
      setPreferences(updated);
      writeStartupPrefs({ motionPreference });

      try {
        const persisted = await saveAppPreferencesCached(updated);
        setPreferences(persisted);
        syncStartupPrefsWithPreferences(persisted);
        await useAppStore.getState().setMotionPreference(persisted.motionPreference);
      } catch {
        void useAppStore.getState().setMotionPreference(motionPreference);
      }
    },
    handleLanguageChange,
    handleSavePreferences,
    handleTrayEnabledChange,
    handleCloseToTrayChange,
    handleNotificationsEnabledChange,
    handleNotificationThresholdChange,
    handleRequestNotificationPermission,
    handleSendTestNotification,
    handleUpdateChannelChange,
    handleCheckForUpdates,
    handleInstallUpdate,
    handleRestartToUpdate,
    handleSaveSchedule,
    handleToggleAutoSync,
    handleSetAutoSyncInterval,
    dispatchScheduleForm,
  };
}
