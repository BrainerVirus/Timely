import { buildInfo } from "@/core/services/BuildInfo/build-info";
import { formatWeekdayScheduleHours } from "@/features/settings/hooks/schedule-form/schedule-form";
import { resolveHolidayCountryCode } from "@/shared/utils/utils";

import type { Theme } from "@/core/hooks/use-theme/use-theme";
import type { I18nContextValue } from "@/core/services/I18nService/i18n";
import type { WeekdayScheduleFormRow } from "@/features/settings/hooks/schedule-form/schedule-form";
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
  weekdaySchedules: WeekdayScheduleFormRow[];
  orderedWorkdays: WeekdayCode[];
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  isConnected: boolean;
  primary: ProviderConnection | undefined;
  timezone: string;
  formatWeekdayFromCode: (code: WeekdayCode) => string;
  formatLanguageLabel: I18nContextValue["formatLanguageLabel"];
  formatSyncIntervalLabel: (minutes: number) => string;
  t: I18nContextValue["t"];
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
  } = input;

  const connectionSummary = isConnected
    ? t("settings.connectedTo", { host: primary?.host ?? "GitLab" })
    : t("settings.notConnected");
  const scheduleSummary =
    formatScheduleSummary(weekdaySchedules, orderedWorkdays, formatWeekdayFromCode, t) ??
    t("common.notSet");
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
  const reminderParts: string[] = [];
  if (preferences.notificationThresholds.minutes45) {
    reminderParts.push("45′");
  }
  if (preferences.notificationThresholds.minutes30) {
    reminderParts.push("30′");
  }
  if (preferences.notificationThresholds.minutes15) {
    reminderParts.push("15′");
  }
  if (preferences.notificationThresholds.minutes5) {
    reminderParts.push("5′");
  }
  let remindersSummary: string;
  if (!preferences.notificationsEnabled) {
    remindersSummary = t("settings.remindersSummaryOff");
  } else if (reminderParts.length === 0) {
    remindersSummary = t("settings.remindersSummaryOn", {
      list: t("settings.remindersNoTimes"),
    });
  } else {
    remindersSummary = t("settings.remindersSummaryOn", {
      list: reminderParts.join(" · "),
    });
  }
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
    remindersSummary,
    syncSummary,
    releaseChannelLabel,
    updatesSummary,
  };
}

function formatScheduleSummary(
  weekdaySchedules: WeekdayScheduleFormRow[],
  orderedWorkdays: WeekdayCode[],
  formatWeekdayFromCode: SummaryLabelsInput["formatWeekdayFromCode"],
  t: SummaryLabelsInput["t"],
): string | undefined {
  const scheduleByDay = new Map(
    weekdaySchedules.map((schedule) => [schedule.day, schedule] as const),
  );
  const enabledSchedules = orderedWorkdays
    .map((day) => scheduleByDay.get(day))
    .filter((schedule): schedule is WeekdayScheduleFormRow => Boolean(schedule?.enabled));

  if (enabledSchedules.length === 0) {
    return undefined;
  }

  const groups: WeekdayScheduleFormRow[][] = [];

  for (const schedule of enabledSchedules) {
    const previousGroup = groups[groups.length - 1];
    const previous = previousGroup?.[previousGroup.length - 1];

    if (previous && getScheduleSignature(previous) === getScheduleSignature(schedule)) {
      previousGroup.push(schedule);
      continue;
    }

    groups.push([schedule]);
  }

  return groups
    .map((group) => {
      const firstDay = group[0].day;
      const lastDay = group[group.length - 1].day;
      const label =
        firstDay === lastDay
          ? formatWeekdayFromCode(firstDay as WeekdayCode)
          : `${formatWeekdayFromCode(firstDay as WeekdayCode)}-${formatWeekdayFromCode(
              lastDay as WeekdayCode,
            )}`;

      return `${label} ${t("settings.hoursPerDaySummary", {
        hours: formatWeekdayScheduleHours(group[0]),
      })}`;
    })
    .join(", ");
}

function getScheduleSignature(schedule: WeekdayScheduleFormRow): string {
  return [
    schedule.shiftStart,
    schedule.shiftEnd,
    Number.parseInt(schedule.lunchMinutes, 10) || 0,
  ].join("|");
}
