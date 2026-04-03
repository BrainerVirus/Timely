import { m } from "motion/react";
import { buildInfo } from "@/app/bootstrap/BuildInfo/build-info";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { useAppStore } from "@/app/state/AppStore/app-store";
import { AboutDialog } from "@/app/overlays/AboutDialog/AboutDialog";
import { SettingsAboutSection } from "@/features/settings/sections/SettingsAboutSection/SettingsAboutSection";
import { SettingsAccessibilitySection } from "@/features/settings/sections/SettingsAccessibilitySection/SettingsAccessibilitySection";
import { SettingsAppearanceSection } from "@/features/settings/sections/SettingsAppearanceSection/SettingsAppearanceSection";
import { SettingsCalendarSection } from "@/features/settings/sections/SettingsCalendarSection/SettingsCalendarSection";
import { SettingsConnectionSection } from "@/features/settings/sections/SettingsConnectionSection/SettingsConnectionSection";
import { SettingsDataManagementSection } from "@/features/settings/sections/SettingsDataManagementSection/SettingsDataManagementSection";
import { SettingsDiagnosticsSection } from "@/features/settings/sections/SettingsDiagnosticsSection/SettingsDiagnosticsSection";
import { SettingsNotificationsSection } from "@/features/settings/sections/SettingsNotificationsSection/SettingsNotificationsSection";
import { SettingsSchedulePreferencesSection } from "@/features/settings/sections/SettingsSchedulePreferencesSection/SettingsSchedulePreferencesSection";
import { SettingsScheduleSection } from "@/features/settings/sections/SettingsScheduleSection/SettingsScheduleSection";
import { SettingsSyncSection } from "@/features/settings/sections/SettingsSyncSection/SettingsSyncSection";
import { SettingsUpdatesSection } from "@/features/settings/sections/SettingsUpdatesSection/SettingsUpdatesSection";
import { SettingsWindowBehaviorSection } from "@/features/settings/sections/SettingsWindowBehaviorSection/SettingsWindowBehaviorSection";
import { useSettingsPageController } from "@/features/settings/hooks/use-settings-page-controller/use-settings-page-controller";
import { staggerContainer } from "@/shared/lib/animations/animations";

import type {
  AppUpdateChannel,
  AppUpdateDownloadEvent,
  AppUpdateInfo,
  AuthLaunchPlan,
  BootstrapPayload,
  GitLabConnectionInput,
  GitLabUserInfo,
  OAuthCallbackResolution,
  ProviderConnection,
  ScheduleInput,
  SyncState,
} from "@/shared/types/dashboard";

export interface SettingsPageProps {
  payload: BootstrapPayload;
  connections: ProviderConnection[];
  syncState: SyncState;
  onStartSync: () => Promise<void>;
  onCheckForUpdates: (channel: AppUpdateChannel) => Promise<AppUpdateInfo | null>;
  onInstallUpdate: (
    channel: AppUpdateChannel,
    onEvent?: (event: AppUpdateDownloadEvent) => void,
  ) => Promise<void>;
  onRestartToUpdate: () => Promise<void>;
  onSaveConnection: (input: GitLabConnectionInput) => Promise<ProviderConnection>;
  onSavePat: (host: string, token: string) => Promise<ProviderConnection>;
  onBeginOAuth: (input: GitLabConnectionInput) => Promise<AuthLaunchPlan>;
  onResolveCallback: (sessionId: string, callbackUrl: string) => Promise<OAuthCallbackResolution>;
  onValidateToken?: (host: string) => Promise<GitLabUserInfo>;
  onListenOAuthEvents?: (
    onSuccess: (payload: OAuthCallbackResolution) => void,
    onError: (message: string) => void,
  ) => Promise<() => void>;
  onUpdateSchedule?: (input: ScheduleInput) => Promise<void>;
  onRefreshBootstrap?: () => Promise<void>;
  onResetAllData: () => Promise<void>;
}

export function SettingsPage({
  payload,
  connections,
  syncState,
  onStartSync,
  onCheckForUpdates,
  onInstallUpdate,
  onRestartToUpdate,
  onSaveConnection,
  onSavePat,
  onBeginOAuth,
  onResolveCallback,
  onValidateToken,
  onListenOAuthEvents,
  onUpdateSchedule,
  onRefreshBootstrap,
  onResetAllData,
}: Readonly<SettingsPageProps>) {
  const { allowDecorativeAnimation } = useMotionSettings();
  const controller = useSettingsPageController({
    payload,
    connections,
    syncState,
    onCheckForUpdates,
    onInstallUpdate,
    onRestartToUpdate,
    onRefreshBootstrap,
    onUpdateSchedule,
  });

  return (
    <m.div
      variants={staggerContainer}
      initial={allowDecorativeAnimation ? "initial" : false}
      animate="animate"
      className="space-y-3"
    >
      <SettingsConnectionSection
        connectionSummary={controller.connectionSummary}
        isConnected={controller.isConnected}
        connections={connections}
        onSaveConnection={onSaveConnection}
        onSavePat={onSavePat}
        onBeginOAuth={onBeginOAuth}
        onResolveCallback={onResolveCallback}
        onValidateToken={onValidateToken}
        onListenOAuthEvents={onListenOAuthEvents}
      />

      <SettingsScheduleSection
        scheduleSummary={controller.scheduleSummary}
        weekdaySchedules={controller.weekdaySchedules}
        orderedWorkdays={controller.orderedWorkdays}
        onSetWeekdayEnabled={(day, enabled) =>
          controller.dispatchScheduleForm({ type: "setWeekdayEnabled", day, enabled })
        }
        onSetWeekdayField={(day, field, value) =>
          controller.dispatchScheduleForm({ type: "setWeekdayField", day, field, value })
        }
        onCopyWeekdaySchedule={(sourceDay, targetDays) =>
          controller.dispatchScheduleForm({
            type: "copyWeekdaySchedule",
            sourceDay,
            targetDays,
          })
        }
      />

      <SettingsSchedulePreferencesSection
        timezone={controller.timezone}
        timezoneOptions={controller.timezoneOptions}
        weekStart={controller.weekStart}
        timeFormat={controller.timeFormat}
        schedulePhase={controller.schedulePhase}
        onSetTimezone={(value) => controller.dispatchScheduleForm({ type: "setTimezone", value })}
        onSetWeekStart={(value) => controller.dispatchScheduleForm({ type: "setWeekStart", value })}
        onChangeTimeFormat={(format) => void controller.handleTimeFormatChange(format)}
        onSaveSchedule={onUpdateSchedule ? () => void controller.handleSaveSchedule() : undefined}
      />

      <SettingsCalendarSection
        holidaySummary={controller.holidaySummary}
        timezone={controller.timezone}
        calendarWeekStartsOn={controller.calendarWeekStartsOn}
        preferences={controller.preferences}
        resolvedHolidayCountryCode={controller.resolvedHolidayCountryCode}
        countries={controller.countries}
        onSavePreferences={controller.handleSavePreferences}
      />

      <SettingsNotificationsSection
        remindersSummary={controller.remindersSummary}
        notificationsEnabled={controller.preferences.notificationsEnabled}
        notificationThresholds={controller.preferences.notificationThresholds}
        notificationPermission={controller.notificationPermission}
        onToggleNotificationsEnabled={() =>
          void controller.handleNotificationsEnabledChange(
            !controller.preferences.notificationsEnabled,
          )
        }
        onToggleThreshold={(key, enabled) =>
          void controller.handleNotificationThresholdChange(key, enabled)
        }
        onOpenSystemSettings={() => void controller.handleOpenNotificationSystemSettings()}
        onSendTest={() => void controller.handleSendTestNotification()}
      />

      <SettingsSyncSection
        syncSummary={controller.syncSummary}
        syncState={syncState}
        syncing={controller.syncing}
        autoSyncEnabled={controller.autoSyncEnabled}
        autoSyncIntervalMinutes={controller.autoSyncIntervalMinutes}
        formatSyncIntervalLabel={controller.formatSyncIntervalLabel}
        onStartSync={() => void onStartSync()}
        onToggleAutoSync={controller.handleToggleAutoSync}
        onSetAutoSyncInterval={controller.handleSetAutoSyncInterval}
        onOpenLog={() => useAppStore.getState().setSyncLogOpen(true)}
      />

      <SettingsUpdatesSection
        updatesSummary={controller.updatesSummary}
        installedVersion={buildInfo.appVersion}
        releaseChannelLabel={controller.releaseChannelLabel}
        selectedChannel={controller.preferences.updateChannel}
        status={controller.updateSectionState}
        onChangeChannel={(channel) => void controller.handleUpdateChannelChange(channel)}
        onCheckForUpdates={() => void controller.handleCheckForUpdates()}
        onInstallUpdate={() => void controller.handleInstallUpdate()}
        onRestartToUpdate={() => void controller.handleRestartToUpdate()}
      />

      <SettingsAppearanceSection
        themeSummary={controller.themeSummary}
        theme={controller.theme}
        onChangeTheme={controller.setTheme}
      />

      <SettingsAccessibilitySection
        accessibilitySummary={controller.accessibilitySummary}
        currentLanguage={controller.preferences.language}
        formatLanguageLabel={controller.formatLanguageLabel}
        onChangeLanguage={(language) => void controller.handleLanguageChange(language)}
      />

      <SettingsWindowBehaviorSection
        traySummary={controller.traySummary}
        trayEnabled={controller.preferences.trayEnabled}
        closeToTray={controller.preferences.closeToTray}
        onToggleTrayEnabled={() =>
          void controller.handleTrayEnabledChange(!controller.preferences.trayEnabled)
        }
        onSetCloseToTray={(enabled) => void controller.handleCloseToTrayChange(enabled)}
      />

      <SettingsDiagnosticsSection
        diagnosticsSummary={controller.diagnosticsSummary}
        diagnostics={controller.notificationDiagnostics}
        diagnosticsBusy={controller.notificationDiagnosticsBusy}
        selectedFeatureFilter={controller.diagnosticsFeatureFilter}
        onChangeFeatureFilter={controller.handleDiagnosticsFeatureFilterChange}
        onRefreshDiagnostics={controller.handleRefreshNotificationDiagnostics}
        onClearDiagnostics={() => void controller.handleClearNotificationDiagnostics()}
        onCopyDiagnostics={() => void controller.handleCopyNotificationDiagnostics()}
        onExportDiagnostics={() => void controller.handleExportNotificationDiagnostics()}
      />

      <SettingsAboutSection
        appVersion={buildInfo.appVersion}
        onOpenAbout={() => controller.setAboutOpen(true)}
      />

      <SettingsDataManagementSection onResetAllData={() => void onResetAllData()} />

      <AboutDialog open={controller.aboutOpen} onOpenChange={controller.setAboutOpen} />
    </m.div>
  );
}
