import { computeSummaryLabels } from "@/features/settings/utils/settings-summary-labels";

import type { AppPreferences } from "@/shared/types/dashboard";

const defaultPreferences: AppPreferences = {
  themeMode: "system",
  motionPreference: "system",
  language: "en",
  updateChannel: "stable",
  holidayCountryMode: "manual",
  holidayCountryCode: "CL",
  timeFormat: "hm",
  autoSyncEnabled: true,
  autoSyncIntervalMinutes: 60,
  trayEnabled: true,
  closeToTray: true,
  onboardingCompleted: true,
  notificationsEnabled: true,
  notificationThresholds: {
    minutes45: true,
    minutes30: false,
    minutes15: false,
    minutes5: false,
  },
};

function renderScheduleSummary(
  weekdaySchedules: Array<{
    day: "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";
    enabled: boolean;
    shiftStart: string;
    shiftEnd: string;
    lunchMinutes: string;
  }>,
) {
  return computeSummaryLabels({
    preferences: defaultPreferences,
    updateSectionState: { status: "idle" },
    weekdaySchedules,
    orderedWorkdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    autoSyncEnabled: true,
    autoSyncIntervalMinutes: 60,
    isConnected: false,
    primary: undefined,
    timezone: "America/Santiago",
    formatWeekdayFromCode: (code) =>
      (
        ({
          Mon: "Mon",
          Tue: "Tue",
          Wed: "Wed",
          Thu: "Thu",
          Fri: "Fri",
          Sat: "Sat",
          Sun: "Sun",
        }) as Record<string, string>
      )[code],
    formatLanguageLabel: () => "English",
    formatSyncIntervalLabel: (minutes) => `${minutes} min`,
    t: (key, values) => {
      if (key === "settings.hoursPerDaySummary") {
        return `${values?.hours ?? "--"}h/day`;
      }

      if (key === "settings.connectedTo") {
        return `Connected to ${values?.host ?? "GitLab"}`;
      }

      if (key === "settings.themeSummary") {
        return `Theme ${values?.theme ?? ""}`;
      }

      if (key === "settings.accessibilitySummary") {
        return `${values?.language ?? ""} · ${values?.mode ?? ""}`;
      }

      if (key === "settings.remindersSummaryOn") {
        return `Reminders ${values?.list ?? ""}`;
      }

      if (key === "settings.everyInterval") {
        return `Every ${values?.interval ?? ""}`;
      }

      if (key === "settings.updatesSummary") {
        return `Updates ${values?.channel ?? ""}`;
      }

      return (
        (
          {
            "common.notSet": "Not set",
            "settings.notConnected": "Not connected",
            "settings.system": "System",
            "settings.light": "Light",
            "settings.dark": "Dark",
            "settings.motionSystem": "System",
            "settings.motionReduced": "Reduced",
            "settings.motionFull": "Full",
            "settings.traySummaryCloseToTray": "Close to tray",
            "settings.traySummaryKeepTray": "Keep visible",
            "settings.traySummaryDisabled": "Tray disabled",
            "settings.remindersSummaryOff": "Reminders off",
            "settings.remindersNoTimes": "No reminder times",
            "settings.manualOnly": "Manual only",
            "settings.updatesBuildChannelStable": "Stable build",
            "settings.updatesBuildChannelUnstable": "Unstable build",
            "settings.updatesChannelStable": "Stable",
            "settings.updatesChannelUnstable": "Unstable",
            "settings.updatesReadyShort": "Restart to update",
          } as Record<string, string>
        )[key] ?? key
      );
    },
  }).scheduleSummary;
}

describe("computeSummaryLabels", () => {
  it("groups contiguous weekdays that share the same schedule", () => {
    const scheduleSummary = renderScheduleSummary([
      { day: "Mon", enabled: true, shiftStart: "09:00", shiftEnd: "18:00", lunchMinutes: "60" },
      { day: "Tue", enabled: true, shiftStart: "09:00", shiftEnd: "18:00", lunchMinutes: "60" },
      { day: "Wed", enabled: true, shiftStart: "09:00", shiftEnd: "18:00", lunchMinutes: "60" },
      { day: "Thu", enabled: true, shiftStart: "09:00", shiftEnd: "18:00", lunchMinutes: "60" },
      { day: "Fri", enabled: true, shiftStart: "09:00", shiftEnd: "17:00", lunchMinutes: "60" },
      { day: "Sat", enabled: false, shiftStart: "09:00", shiftEnd: "17:00", lunchMinutes: "60" },
      { day: "Sun", enabled: false, shiftStart: "09:00", shiftEnd: "17:00", lunchMinutes: "60" },
    ]);

    expect(scheduleSummary).toBe("Mon-Thu 8.0h/day, Fri 7.0h/day");
  });

  it("falls back to not set when every weekday is disabled", () => {
    const scheduleSummary = renderScheduleSummary([
      { day: "Mon", enabled: false, shiftStart: "09:00", shiftEnd: "18:00", lunchMinutes: "60" },
      { day: "Tue", enabled: false, shiftStart: "09:00", shiftEnd: "18:00", lunchMinutes: "60" },
      { day: "Wed", enabled: false, shiftStart: "09:00", shiftEnd: "18:00", lunchMinutes: "60" },
      { day: "Thu", enabled: false, shiftStart: "09:00", shiftEnd: "18:00", lunchMinutes: "60" },
      { day: "Fri", enabled: false, shiftStart: "09:00", shiftEnd: "18:00", lunchMinutes: "60" },
      { day: "Sat", enabled: false, shiftStart: "09:00", shiftEnd: "18:00", lunchMinutes: "60" },
      { day: "Sun", enabled: false, shiftStart: "09:00", shiftEnd: "18:00", lunchMinutes: "60" },
    ]);

    expect(scheduleSummary).toBe("Not set");
  });
});
