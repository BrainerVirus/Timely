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
} from "@/core/services/StartupPrefs/startup-prefs";
import {
  clearDiagnostics,
  exportDiagnostics,
  getNotificationPermissionState,
  listDiagnostics,
  loadHolidayCountries,
  openSystemNotificationSettings,
  requestNotificationPermission,
  sendTestNotification,
} from "@/core/services/TauriService/tauri";
import { useAppStore } from "@/core/stores/AppStore/app-store";
import {
  buildWeekdaySchedulesInput,
  createInitialScheduleFormState,
  getEffectiveWeekStart,
  getOrderedWorkdays,
  scheduleFormReducer,
} from "@/features/settings/hooks/schedule-form/schedule-form";
import { resolveNextAutoHolidayPreferences } from "@/features/settings/utils/settings-holiday-helpers";
import { computeSummaryLabels } from "@/features/settings/utils/settings-summary-labels";
import { findPrimaryConnection, isConnectionActive } from "@/shared/types/dashboard";
import {
  getCountryCodeForTimezone,
  getSupportedTimezones,
  getWeekStartsOnIndex,
  resolveHolidayCountryCode,
} from "@/shared/utils/utils";

import type { UpdateSectionState } from "@/features/settings/utils/settings-summary-labels";
import type {
  AppPreferences,
  AppUpdateChannel,
  AppUpdateDownloadEvent,
  AppUpdateInfo,
  BootstrapPayload,
  HolidayCountryOption,
  DiagnosticLogEntry,
  NotificationThresholdToggles,
  ProviderConnection,
  ScheduleInput,
  SyncState,
  TimeFormat,
} from "@/shared/types/dashboard";

export type { UpdateSectionState } from "@/features/settings/utils/settings-summary-labels";

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

export function normalizeDiagnosticsFeatureFilter(
  diagnosticsFeatureFilter: string,
): string | undefined {
  return diagnosticsFeatureFilter === "all" ? undefined : diagnosticsFeatureFilter;
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
  const [notificationDiagnostics, setNotificationDiagnostics] = useState<DiagnosticLogEntry[]>([]);
  const [notificationDiagnosticsBusy, setNotificationDiagnosticsBusy] = useState(false);
  const [diagnosticsFeatureFilter, setDiagnosticsFeatureFilter] = useState("all");
  const diagnosticsFeatureFilterValue = normalizeDiagnosticsFeatureFilter(diagnosticsFeatureFilter);
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
    notificationPermissionRequested: false,
  });

  const [scheduleForm, dispatchScheduleForm] = useReducer(
    scheduleFormReducer,
    payload,
    createInitialScheduleFormState,
  );
  const { weekdaySchedules, timezone, weekStart, schedulePhase } = scheduleForm;
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

    const nextAutoHolidayPreferences = resolveNextAutoHolidayPreferences(preferences, timezone);

    dispatchScheduleForm({ type: "setSchedulePhase", phase: "saving" });

    try {
      await onUpdateSchedule({
        weekdaySchedules: buildWeekdaySchedulesInput(weekdaySchedules),
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

  async function refreshNotificationDiagnostics() {
    setNotificationDiagnosticsBusy(true);
    try {
      const next = await listDiagnostics({ feature: diagnosticsFeatureFilterValue });
      setNotificationDiagnostics(next);
    } catch {
      setNotificationDiagnostics([]);
    } finally {
      setNotificationDiagnosticsBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setNotificationDiagnosticsBusy(true);
    void listDiagnostics({ feature: diagnosticsFeatureFilterValue })
      .then((next) => {
        if (!cancelled) {
          setNotificationDiagnostics(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotificationDiagnostics([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setNotificationDiagnosticsBusy(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [diagnosticsFeatureFilterValue]);

  async function handleClearNotificationDiagnostics() {
    setNotificationDiagnosticsBusy(true);
    try {
      await clearDiagnostics(diagnosticsFeatureFilterValue);
      setNotificationDiagnostics([]);
      toast.success(t("settings.remindersDiagnosticsCleared"));
    } catch (error) {
      toast.error(t("settings.remindersDiagnosticsClearFailed"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
        duration: 5000,
      });
    } finally {
      setNotificationDiagnosticsBusy(false);
    }
  }

  async function handleCopyNotificationDiagnostics() {
    try {
      const report = await exportDiagnostics({
        feature: diagnosticsFeatureFilterValue,
      });
      await navigator.clipboard.writeText(report);
      toast.success(t("settings.remindersDiagnosticsCopied"));
    } catch (error) {
      toast.error(t("settings.remindersDiagnosticsCopyFailed"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
        duration: 5000,
      });
    }
  }

  async function handleExportNotificationDiagnostics() {
    try {
      const report = await exportDiagnostics({
        feature: diagnosticsFeatureFilterValue,
      });
      const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const scope = diagnosticsFeatureFilter === "all" ? "all" : diagnosticsFeatureFilter;
      anchor.download = `timely-diagnostics-${scope}-${new Date().toISOString().slice(0, 10)}.log`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(t("settings.remindersDiagnosticsExported"));
    } catch (error) {
      toast.error(t("settings.remindersDiagnosticsExportFailed"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
        duration: 5000,
      });
    }
  }

  function handleDiagnosticsFeatureFilterChange(value: string) {
    setDiagnosticsFeatureFilter(value);
  }

  async function handleOpenNotificationSystemSettings() {
    try {
      await openSystemNotificationSettings();
      toast.success(t("settings.remindersOpenSystemSettingsSuccess"));
    } catch (error) {
      toast.error(t("settings.remindersOpenSystemSettingsFailed"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
        duration: 5000,
      });
    }
  }

  async function handleSendTestNotification() {
    if (notificationPermission === "denied") {
      toast.error(t("settings.remindersTestFailed"), {
        description: t("settings.remindersPermissionDeniedCannotSend"),
        duration: 5000,
      });
      return;
    }
    try {
      await sendTestNotification({
        title: t("settings.remindersTestTitle"),
        body: t("settings.remindersTestBody"),
      });
      toast.success(t("settings.remindersTestSent"));
      void refreshNotificationDiagnostics();
    } catch (error) {
      toast.error(t("settings.remindersTestFailed"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
        duration: 5000,
      });
      void refreshNotificationDiagnostics();
    }
  }

  const formatSyncIntervalLabel = (minutes: number) =>
    minutes >= 60 && minutes % 60 === 0
      ? t("settings.intervalHours", { count: minutes / 60 })
      : t("settings.intervalMinutes", { count: minutes });

  const summaryLabels = computeSummaryLabels({
    preferences,
    updateSectionState,
    weekdaySchedules,
    orderedWorkdays,
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
  const diagnosticsSummary = t("settings.diagnosticsSummary", {
    count: notificationDiagnostics.length,
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
    weekdaySchedules,
    weekStart,
    schedulePhase,
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
    diagnosticsSummary,
    notificationPermission,
    notificationDiagnostics,
    notificationDiagnosticsBusy,
    diagnosticsFeatureFilter,
    syncSummary: summaryLabels.syncSummary,
    updatesSummary: summaryLabels.updatesSummary,
    releaseChannelLabel: summaryLabels.releaseChannelLabel,
    updateSectionState,
    formatLanguageLabel,
    formatSyncIntervalLabel,
    handleTimeFormatChange,
    handleLanguageChange,
    handleSavePreferences,
    handleTrayEnabledChange,
    handleCloseToTrayChange,
    handleNotificationsEnabledChange,
    handleNotificationThresholdChange,
    handleOpenNotificationSystemSettings,
    handleSendTestNotification,
    handleRefreshNotificationDiagnostics: () => void refreshNotificationDiagnostics(),
    handleDiagnosticsFeatureFilterChange,
    handleClearNotificationDiagnostics,
    handleCopyNotificationDiagnostics,
    handleExportNotificationDiagnostics,
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
