import { render, screen } from "@testing-library/react";
import { TrayEntry } from "@/layout/TrayLayout/TrayLayout";

vi.mock("@/core/services/TauriService/tauri", () => ({
  loadBootstrapPayload: vi.fn(() =>
    Promise.resolve({
      appName: "Timely",
      phase: "",
      demoMode: true,
      lastSyncedAt: null,
      profile: { alias: "Pilot", level: 1, xp: 0, streakDays: 0, companion: "Aurora fox" },
      streak: { currentDays: 0, window: [] },
      providerStatus: [],
      schedule: { hoursPerDay: 8, workdays: "Mon-Fri", timezone: "UTC", weekStart: "monday" },
      today: {
        date: "2026-03-05",
        shortLabel: "Wed",
        dateLabel: "Wed 05",
        isToday: true,
        holidayName: undefined,
        loggedHours: 0,
        targetHours: 8,
        focusHours: 0,
        overflowHours: 0,
        status: "empty",
        topIssues: [],
      },
      week: [],
      month: { loggedHours: 0, targetHours: 0, consistencyScore: 0, cleanDays: 0, overflowDays: 0 },
      auditFlags: [],
      quests: [],
    }),
  ),
  logFrontendBootTiming: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/core/services/PreferencesCache/preferences-cache", () => ({
  getAppPreferencesCached: vi.fn(() =>
    Promise.resolve({
      themeMode: "system",
      motionPreference: "system",
    }),
  ),
}));

vi.mock("@/features/tray/components/TrayPanel/TrayPanel", () => ({
  TrayPanel: () => <div data-testid="tray-panel">Tray</div>,
}));

describe("TrayLayout", () => {
  it("renders TrayEntry loading state initially", () => {
    render(<TrayEntry />);
    expect(screen.getByText(/loading tray status/i)).toBeInTheDocument();
  });
});
