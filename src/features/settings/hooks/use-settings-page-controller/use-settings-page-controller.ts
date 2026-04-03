import { useState } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useAppStore } from "@/app/state/AppStore/app-store";
import { useSettingsDiagnosticsController } from "@/features/settings/hooks/use-settings-diagnostics-controller/use-settings-diagnostics-controller";
import { useSettingsPreferencesController } from "@/features/settings/hooks/use-settings-preferences-controller/use-settings-preferences-controller";
import { useSettingsScheduleController } from "@/features/settings/hooks/use-settings-schedule-controller/use-settings-schedule-controller";
import { useSettingsUpdatesController } from "@/features/settings/hooks/use-settings-updates-controller/use-settings-updates-controller";
import { computeSummaryLabels } from "@/features/settings/lib/settings-summary-labels";
import { findPrimaryConnection, isConnectionActive } from "@/shared/types/dashboard";
import { resolveHolidayCountryCode } from "@/shared/lib/utils";

import type { UpdateSectionState } from "@/features/settings/lib/settings-summary-labels";
import type {
  AppUpdateChannel,
  AppUpdateDownloadEvent,
  AppUpdateInfo,
  BootstrapPayload,
  ProviderConnection,
  ScheduleInput,
  SyncState,
} from "@/shared/types/dashboard";

export type { UpdateSectionState } from "@/features/settings/lib/settings-summary-labels";
export { normalizeDiagnosticsFeatureFilter } from "@/features/settings/hooks/use-settings-diagnostics-controller/use-settings-diagnostics-controller";

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
  const [aboutOpen, setAboutOpen] = useState(false);
  const primary = findPrimaryConnection(connections);
  const isConnected = primary != null && isConnectionActive(primary);
  const syncing = syncState.status === "syncing";

  const preferencesController = useSettingsPreferencesController({
    timezone: payload.schedule.timezone,
    setLanguagePreference,
    setTimeFormat,
    t,
  });
  const updatesController = useSettingsUpdatesController({
    preferences: preferencesController.preferences,
    setPreferences: preferencesController.setPreferences,
    onCheckForUpdates,
    onInstallUpdate,
    onRestartToUpdate,
    t,
  });
  const scheduleController = useSettingsScheduleController({
    payload,
    preferences: preferencesController.preferences,
    formatTimezoneOffset,
    onRefreshBootstrap,
    onSavePreferences: preferencesController.handleSavePreferences,
    onUpdateSchedule,
    t,
  });
  const diagnosticsController = useSettingsDiagnosticsController({
    notificationPermission: preferencesController.notificationPermission,
    t,
  });

  function handleToggleAutoSync() {
    void useAppStore.getState().setAutoSyncPrefs(!autoSyncEnabled, autoSyncIntervalMinutes);
  }

  function handleSetAutoSyncInterval(minutes: number) {
    void useAppStore.getState().setAutoSyncPrefs(autoSyncEnabled, minutes);
  }

  const formatSyncIntervalLabel = (minutes: number) =>
    minutes >= 60 && minutes % 60 === 0
      ? t("settings.intervalHours", { count: minutes / 60 })
      : t("settings.intervalMinutes", { count: minutes });

  const summaryLabels = computeSummaryLabels({
    preferences: preferencesController.preferences,
    updateSectionState: updatesController.updateSectionState,
    weekdaySchedules: scheduleController.weekdaySchedules,
    orderedWorkdays: scheduleController.orderedWorkdays,
    autoSyncEnabled,
    autoSyncIntervalMinutes,
    isConnected,
    primary,
    timezone: scheduleController.timezone,
    formatWeekdayFromCode,
    formatLanguageLabel,
    formatSyncIntervalLabel,
    t,
  });
  const diagnosticsSummary = t("settings.diagnosticsSummary", {
    count: diagnosticsController.notificationDiagnostics.length,
  });

  return {
    aboutOpen,
    setAboutOpen,
    preferences: preferencesController.preferences,
    countries: preferencesController.countries,
    timezone: scheduleController.timezone,
    calendarWeekStartsOn: scheduleController.calendarWeekStartsOn,
    resolvedHolidayCountryCode: resolveHolidayCountryCode(
      preferencesController.preferences.holidayCountryMode,
      preferencesController.preferences.holidayCountryCode,
      scheduleController.timezone,
    ),
    weekdaySchedules: scheduleController.weekdaySchedules,
    weekStart: scheduleController.weekStart,
    schedulePhase: scheduleController.schedulePhase,
    orderedWorkdays: scheduleController.orderedWorkdays,
    timezoneOptions: scheduleController.timezoneOptions,
    theme: preferencesController.preferences.themeMode,
    setTheme: preferencesController.handleThemeChange,
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
    notificationPermission: preferencesController.notificationPermission,
    notificationDiagnostics: diagnosticsController.notificationDiagnostics,
    notificationDiagnosticsBusy: diagnosticsController.notificationDiagnosticsBusy,
    diagnosticsFeatureFilter: diagnosticsController.diagnosticsFeatureFilter,
    syncSummary: summaryLabels.syncSummary,
    updatesSummary: summaryLabels.updatesSummary,
    releaseChannelLabel: summaryLabels.releaseChannelLabel,
    updateSectionState: updatesController.updateSectionState,
    formatLanguageLabel,
    formatSyncIntervalLabel,
    handleTimeFormatChange: preferencesController.handleTimeFormatChange,
    handleLanguageChange: preferencesController.handleLanguageChange,
    handleSavePreferences: preferencesController.handleSavePreferences,
    handleTrayEnabledChange: preferencesController.handleTrayEnabledChange,
    handleCloseToTrayChange: preferencesController.handleCloseToTrayChange,
    handleNotificationsEnabledChange: preferencesController.handleNotificationsEnabledChange,
    handleNotificationThresholdChange: preferencesController.handleNotificationThresholdChange,
    handleOpenNotificationSystemSettings:
      diagnosticsController.handleOpenNotificationSystemSettings,
    handleSendTestNotification: diagnosticsController.handleSendTestNotification,
    handleRefreshNotificationDiagnostics:
      diagnosticsController.handleRefreshNotificationDiagnostics,
    handleDiagnosticsFeatureFilterChange:
      diagnosticsController.handleDiagnosticsFeatureFilterChange,
    handleClearNotificationDiagnostics: diagnosticsController.handleClearNotificationDiagnostics,
    handleCopyNotificationDiagnostics: diagnosticsController.handleCopyNotificationDiagnostics,
    handleExportNotificationDiagnostics:
      diagnosticsController.handleExportNotificationDiagnostics,
    handleUpdateChannelChange: updatesController.handleUpdateChannelChange,
    handleCheckForUpdates: updatesController.handleCheckForUpdates,
    handleInstallUpdate: updatesController.handleInstallUpdate,
    handleRestartToUpdate: updatesController.handleRestartToUpdate,
    handleSaveSchedule: scheduleController.handleSaveSchedule,
    handleToggleAutoSync,
    handleSetAutoSyncInterval,
    dispatchScheduleForm: scheduleController.dispatchScheduleForm,
  };
}
