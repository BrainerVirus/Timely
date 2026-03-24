import { buildInfo } from "@/core/services/BuildInfo/build-info";
import { resolveHolidayCountryCode } from "@/shared/utils/utils";

import type { Theme } from "@/core/hooks/use-theme/use-theme";
import type {
  AppPreferences,
  AppUpdateInfo,
  MotionPreference,
  ProviderConnection,
} from "@/shared/types/dashboard";
import type { WeekdayCode } from "@/shared/utils/utils";

export type UpdateSectionState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "upToDate" }
  | { status: "available"; update: AppUpdateInfo }
  | {
      status: "installing";
      update: AppUpdateInfo;
      downloadedBytes: number;
      totalBytes?: number;
    }
  | { status: "readyToRestart"; update: AppUpdateInfo }
  | { status: "error"; message: string };

export interface SummaryLabelsInput {
  preferences: AppPreferences;
  updateSectionState: UpdateSectionState;
  workdays: string[];
  netHours: string;
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  isConnected: boolean;
  primary: ProviderConnection | undefined;
  timezone: string;
  formatWeekdayFromCode: (code: WeekdayCode) => string;
  formatLanguageLabel: (value: string) => string;
  formatSyncIntervalLabel: (minutes: number) => string;
  t: (key: string, params?: Record<string, unknown>) => string;
}

function getThemeLabel(themeMode: Theme, t: SummaryLabelsInput["t"]): string {
  if (themeMode === "system") {
    return t("settings.system");
  }
  if (themeMode === "light") {
    return t("settings.light");
  }
  return t("settings.dark");
}

export function getMotionPreferenceLabel(
  preference: MotionPreference,
  t: SummaryLabelsInput["t"],
): string {
  if (preference === "system") {
    return t("settings.motionSystem");
  }
  if (preference === "reduced") {
    return t("settings.motionReduced");
  }
  return t("settings.motionFull");
}

export function computeSummaryLabels(input: SummaryLabelsInput): Record<string, string> {
  const {
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
  } = input;

  const connectionSummary = isConnected
    ? t("settings.connectedTo", { host: primary?.host ?? "GitLab" })
    : t("settings.notConnected");
  const scheduleSummary = `${workdays
    .map((day) => formatWeekdayFromCode(day as WeekdayCode))
    .join(", ")}, ${t("settings.hoursPerDaySummary", { hours: netHours })}`;
  const resolvedHolidayCountryCode = resolveHolidayCountryCode(
    preferences.holidayCountryMode,
    preferences.holidayCountryCode,
    timezone,
  );
  const holidaySummary = resolvedHolidayCountryCode ?? t("common.notSet");
  const themeLabel = getThemeLabel(preferences.themeMode, t);
  const themeSummary = t("settings.themeSummary", { theme: themeLabel });
  const motionPreferenceLabel = getMotionPreferenceLabel(preferences.motionPreference, t);
  const accessibilitySummary = t("settings.accessibilitySummary", {
    language: formatLanguageLabel(preferences.language),
    mode: motionPreferenceLabel,
  });
  const trayBehaviorSummary = preferences.closeToTray
    ? t("settings.traySummaryCloseToTray")
    : t("settings.traySummaryKeepTray");
  const traySummary = preferences.trayEnabled
    ? trayBehaviorSummary
    : t("settings.traySummaryDisabled");
  const syncSummary = autoSyncEnabled
    ? t("settings.everyInterval", {
        interval: formatSyncIntervalLabel(autoSyncIntervalMinutes),
      })
    : t("settings.manualOnly");
  const releaseChannelLabel = buildInfo.isPrerelease
    ? t("settings.updatesBuildChannelUnstable")
    : t("settings.updatesBuildChannelStable");
  const selectedUpdateChannelLabel =
    preferences.updateChannel === "stable"
      ? t("settings.updatesChannelStable")
      : t("settings.updatesChannelUnstable");

  let updatesSummary: string;
  if (updateSectionState.status === "available") {
    updatesSummary = t("settings.updatesAvailableShort", {
      version: updateSectionState.update.version,
    });
  } else if (updateSectionState.status === "readyToRestart") {
    updatesSummary = t("settings.updatesReadyShort");
  } else {
    updatesSummary = t("settings.updatesSummary", { channel: selectedUpdateChannelLabel });
  }

  return {
    connectionSummary,
    scheduleSummary,
    holidaySummary,
    themeSummary,
    accessibilitySummary,
    traySummary,
    syncSummary,
    releaseChannelLabel,
    updatesSummary,
  };
}
