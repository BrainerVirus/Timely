import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { I18nProvider } from "@/core/services/I18nService/i18n";
import { useMotionSettings } from "@/core/services/MotionService/motion";
import { clearPreferencesCache } from "@/core/services/PreferencesCache/preferences-cache";
import * as tauriModule from "@/core/services/TauriService/tauri";
import { tourPayload } from "@/features/onboarding/tour-mock-data";
import { resetWorklogSnapshotCache } from "@/features/worklog/hooks/use-worklog-page-state/use-worklog-page-state";
import { WorklogPage } from "@/features/worklog/pages/WorklogPage/WorklogPage";
import { mockBootstrap } from "@/test/fixtures/mock-data";

import type { WorklogSnapshot } from "@/shared/types/dashboard";
import type React from "react";

const testNotificationPrefs = {
  notificationsEnabled: true,
  notificationThresholds: {
    minutes45: true,
    minutes30: true,
    minutes15: true,
    minutes5: true,
  },
} as const;

const noop = () => {};

const mockToastError = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    success: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
  },
}));

vi.mock("@/core/services/MotionService/motion", () => ({
  useMotionSettings: vi.fn(() => ({
    motionPreference: "system",
    windowVisibility: "visible",
    motionLevel: "full",
    allowDecorativeAnimation: true,
    allowLoopingAnimation: true,
    reducedMotionMode: "user",
  })),
}));

const fullMotionSettings = {
  motionPreference: "system",
  windowVisibility: "visible",
  motionLevel: "full",
  allowDecorativeAnimation: true,
  allowLoopingAnimation: true,
  reducedMotionMode: "user",
} as const;

const reducedMotionSettings = {
  motionPreference: "reduced",
  windowVisibility: "visible",
  motionLevel: "reduced",
  allowDecorativeAnimation: false,
  allowLoopingAnimation: false,
  reducedMotionMode: "always",
} as const;

const hiddenFullMotionSettings = {
  motionPreference: "full",
  windowVisibility: "hidden",
  motionLevel: "none",
  allowDecorativeAnimation: true,
  allowLoopingAnimation: false,
  reducedMotionMode: "always",
} as const;

function renderWorklogPage(props: Partial<React.ComponentProps<typeof WorklogPage>> = {}) {
  return render(
    <I18nProvider>
      <WorklogPage
        payload={mockBootstrap}
        mode="day"
        syncVersion={0}
        detailDate={null}
        onModeChange={noop}
        onOpenNestedDay={noop}
        onCloseNestedDay={noop}
        {...props}
      />
    </I18nProvider>,
  );
}

vi.mock("@/core/services/TauriService/tauri", async () => {
  const actual = await vi.importActual<typeof import("@/core/services/TauriService/tauri")>(
    "@/core/services/TauriService/tauri",
  );
  return {
    ...actual,
    loadAppPreferences: vi.fn(),
    loadHolidayYear: vi.fn(),
    loadWorklogSnapshot: vi.fn(),
  };
});

// driver.js guard (not needed here but avoids any import side-effects)
vi.mock("driver.js", () => ({ driver: vi.fn(() => ({ drive: vi.fn(), destroy: vi.fn() })) }));

function makeSnapshot(entriesSynced = 5): WorklogSnapshot {
  return {
    mode: "day",
    range: { startDate: "2026-03-04", endDate: "2026-03-04", label: "Tue, Mar 4" },
    selectedDay: { ...mockBootstrap.today, loggedHours: entriesSynced },
    days: mockBootstrap.week,
    month: mockBootstrap.month,
    auditFlags: [],
  };
}

function makeWeekSnapshot(): WorklogSnapshot {
  const loggedHours = tourPayload.week.reduce((sum, day) => sum + day.loggedHours, 0);
  const targetHours = tourPayload.week.reduce((sum, day) => sum + day.targetHours, 0);
  const cleanDays = tourPayload.week.filter(
    (day) => day.status === "met_target" || day.status === "on_track",
  ).length;
  const overflowDays = tourPayload.week.filter((day) => day.status === "over_target").length;

  return {
    mode: "week",
    range: { startDate: "2026-03-02", endDate: "2026-03-08", label: "Week of Mar 2" },
    selectedDay: tourPayload.week[0],
    days: tourPayload.week,
    month: {
      loggedHours,
      targetHours,
      consistencyScore: targetHours > 0 ? Math.round((loggedHours / targetHours) * 100) : 0,
      cleanDays,
      overflowDays,
    },
    auditFlags: tourPayload.auditFlags,
  };
}

function makeEmptyWeekSnapshot(): WorklogSnapshot {
  return {
    mode: "week",
    range: { startDate: "2026-03-02", endDate: "2026-03-08", label: "Week of Mar 2" },
    selectedDay: mockBootstrap.today,
    days: [],
    month: mockBootstrap.month,
    auditFlags: [],
  };
}

beforeEach(() => {
  resetWorklogSnapshotCache();
  clearPreferencesCache();
  mockToastError.mockReset();
  vi.mocked(useMotionSettings).mockReturnValue(fullMotionSettings);
  vi.mocked(tauriModule.loadAppPreferences)
    .mockReset()
    .mockResolvedValue({
      themeMode: "system",
      motionPreference: "system",
      language: "en",
      updateChannel: "stable",
      holidayCountryMode: "auto",
      holidayCountryCode: "CL",
      timeFormat: "hm",
      autoSyncEnabled: false,
      autoSyncIntervalMinutes: 30,
      trayEnabled: true,
      closeToTray: true,
      onboardingCompleted: false,
      ...testNotificationPrefs,
    });
  vi.mocked(tauriModule.loadHolidayYear)
    .mockReset()
    .mockResolvedValue({
      countryCode: "CL",
      year: 2026,
      holidays: [{ date: "2026-03-19", name: "Holiday" }],
    });
  vi.mocked(tauriModule.loadWorklogSnapshot).mockReset().mockResolvedValue(makeSnapshot(5));
});

describe("WorklogPage", () => {
  it("fetches worklog data on mount", async () => {
    renderWorklogPage();

    await waitFor(() => {
      expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(tauriModule.loadAppPreferences).toHaveBeenCalled();
    });
  });

  it("keeps the last local worklog view visible and raises a toast when refresh fails", async () => {
    vi.mocked(tauriModule.loadWorklogSnapshot).mockRejectedValue(new Error("worklog unavailable"));

    renderWorklogPage();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Failed to load worklog", {
        description: "worklog unavailable",
        duration: 7000,
      });
    });

    expect(screen.getByText("Day summary")).toBeInTheDocument();
    expect(screen.queryByText("worklog unavailable")).not.toBeInTheDocument();
  });

  it("loads holiday data for the visible picker year", async () => {
    renderWorklogPage({ mode: "period", payload: mockBootstrap });

    await waitFor(() => {
      expect(tauriModule.loadHolidayYear).toHaveBeenCalledWith("CL", 2026);
    });
  });

  it("re-fetches when syncVersion increments (simulates post-sync refresh)", async () => {
    const { rerender } = renderWorklogPage();

    await waitFor(() => expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalledTimes(3));

    // Simulate a sync completing — version bumps from 0 → 1
    vi.mocked(tauriModule.loadWorklogSnapshot).mockResolvedValue(makeSnapshot(8));

    rerender(
      <WorklogPage
        payload={mockBootstrap}
        mode="day"
        syncVersion={1}
        detailDate={null}
        onModeChange={noop}
        onOpenNestedDay={noop}
        onCloseNestedDay={noop}
      />,
    );

    await waitFor(() => expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalledTimes(6));
  });

  it("does NOT re-fetch when unrelated props change (mode stays same, syncVersion stays same)", async () => {
    const { rerender } = renderWorklogPage();

    await waitFor(() => expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalled());
    const initialCallCount = vi.mocked(tauriModule.loadWorklogSnapshot).mock.calls.length;

    // Re-render with same mode and syncVersion — no new fetch expected
    rerender(
      <I18nProvider>
        <WorklogPage
          payload={mockBootstrap}
          mode="day"
          syncVersion={0}
          detailDate={null}
          onModeChange={noop}
          onOpenNestedDay={noop}
          onCloseNestedDay={noop}
        />
      </I18nProvider>,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(vi.mocked(tauriModule.loadWorklogSnapshot).mock.calls.length).toBe(initialCallCount);
  });

  it("re-fetches when mode changes (existing behaviour preserved)", async () => {
    const { rerender } = renderWorklogPage();

    await waitFor(() => expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalledTimes(3));

    rerender(
      <WorklogPage
        payload={mockBootstrap}
        mode="week"
        syncVersion={0}
        detailDate={null}
        onModeChange={noop}
        onOpenNestedDay={noop}
        onCloseNestedDay={noop}
      />,
    );

    await waitFor(() => expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalled());
    expect(
      vi
        .mocked(tauriModule.loadWorklogSnapshot)
        .mock.calls.some(([args]) => (args as { mode?: string }).mode === "week"),
    ).toBe(true);
    expect(vi.mocked(tauriModule.loadWorklogSnapshot).mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("uses range snapshots behind the Period mode", async () => {
    renderWorklogPage({ mode: "period", payload: mockBootstrap });

    await waitFor(() => expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalledTimes(3));
    expect(tauriModule.loadWorklogSnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: "range", anchorDate: "2026-03-01", endDate: "2026-03-31" }),
    );
    expect(screen.getByRole("tab", { name: "Period" })).toHaveAttribute("data-state", "active");
  });

  it("shows the same summary cards in week mode", async () => {
    vi.mocked(tauriModule.loadWorklogSnapshot).mockResolvedValue(makeWeekSnapshot());

    renderWorklogPage({ mode: "week", payload: tourPayload });

    await waitFor(() => {
      expect(screen.getByText("Week summary")).toBeInTheDocument();
    });

    expect(screen.getByText("Logged")).toBeInTheDocument();
    expect(screen.getByText("Through yesterday")).toBeInTheDocument();
    expect(screen.getByText("Missing")).toBeInTheDocument();
    expect(screen.getByText("Target")).toBeInTheDocument();
  });

  it("uses the full range label for historical summaries", async () => {
    vi.mocked(tauriModule.loadWorklogSnapshot).mockResolvedValue({
      ...makeWeekSnapshot(),
      range: { startDate: "2026-03-02", endDate: "2026-03-04", label: "Week of Mar 2" },
      days: tourPayload.week.slice(0, 3),
    });

    renderWorklogPage({ mode: "week", payload: mockBootstrap });

    await waitFor(() => {
      expect(screen.getByText("Week summary")).toBeInTheDocument();
    });

    expect(screen.getByText("Range total")).toBeInTheDocument();
    expect(screen.queryByText("Through yesterday")).not.toBeInTheDocument();
  });

  it("shows the empty placeholder in week breakdown when week data is empty", async () => {
    vi.mocked(tauriModule.loadWorklogSnapshot).mockResolvedValue(makeEmptyWeekSnapshot());

    renderWorklogPage({ mode: "week", payload: mockBootstrap });

    await waitFor(() => {
      expect(screen.getByText("Week summary")).toBeInTheDocument();
    });

    expect(screen.getByText("Weekly breakdown")).toBeInTheDocument();
    expect(screen.getByText("No issues logged for this day")).toBeInTheDocument();
  });

  it("keeps period shell with empty placeholder and only toasts after changing period ranges", async () => {
    vi.mocked(tauriModule.loadWorklogSnapshot).mockImplementation(async (input) => {
      if (input.mode === "range") {
        throw new Error("No primary GitLab connection found");
      }

      if (input.mode === "week") {
        return makeWeekSnapshot();
      }

      return makeSnapshot(0);
    });

    renderWorklogPage({ mode: "period", payload: mockBootstrap });

    await waitFor(() => {
      expect(screen.getByText("Period summary")).toBeInTheDocument();
    });

    expect(screen.getByText("Logged")).toBeInTheDocument();
    expect(screen.getByText("Through yesterday")).toBeInTheDocument();
    expect(screen.getByText("Missing")).toBeInTheDocument();
    expect(screen.getByText("Target")).toBeInTheDocument();
    expect(screen.getByText("Daily breakdown")).toBeInTheDocument();
    expect(screen.getByText("No issues logged for this day")).toBeInTheDocument();
    expect(screen.queryByText("Loading worklog")).not.toBeInTheDocument();
    expect(mockToastError).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Pick period" }));
    });

    const dialog = await screen.findByRole("dialog");
    const marchGrid = within(dialog).getAllByRole("grid")[0];
    const marchTwelve = within(marchGrid).getByRole("button", { name: /March 12th, 2026/i });

    await act(async () => {
      fireEvent.click(marchTwelve);
    });

    await act(async () => {
      fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", { name: /March 12th, 2026/i }),
      );
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Failed to load worklog", {
        description: "Connect GitLab in Settings to load your worklog.",
        duration: 7000,
      });
    });
  });

  it("uses the compact calendar trigger in period mode without showing range text in the button", async () => {
    renderWorklogPage({ mode: "period", payload: mockBootstrap });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pick period" })).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /Mar\s+\d+\s+to\s+Mar\s+\d+/i }),
    ).not.toBeInTheDocument();
  });

  it("resets tab-local controls when changing modes", async () => {
    const onModeChange = vi.fn();
    const { rerender } = renderWorklogPage({ mode: "week", payload: tourPayload, onModeChange });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pick week" })).toBeInTheDocument(),
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Next Week" }));
    });

    expect(screen.queryByRole("button", { name: /This week/i })).not.toBeInTheDocument();

    rerender(
      <WorklogPage
        payload={tourPayload}
        mode="period"
        syncVersion={0}
        detailDate={null}
        onModeChange={onModeChange}
        onOpenNestedDay={noop}
        onCloseNestedDay={noop}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /This period/i })).toBeInTheDocument(),
    );

    expect(screen.getByRole("button", { name: /This period/i })).toBeInTheDocument();

    rerender(
      <WorklogPage
        payload={tourPayload}
        mode="week"
        syncVersion={0}
        detailDate={null}
        onModeChange={onModeChange}
        onOpenNestedDay={noop}
        onCloseNestedDay={noop}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /This week/i })).toBeInTheDocument();
    });
  });

  it("seeds week summaries from the week snapshot instead of the month total", async () => {
    vi.mocked(tauriModule.loadWorklogSnapshot).mockImplementation(async (input) => {
      if (input.mode === "week") {
        return makeWeekSnapshot();
      }

      return makeSnapshot(5);
    });

    renderWorklogPage({ mode: "week", payload: tourPayload });

    await waitFor(() => expect(screen.getByText("Week summary")).toBeInTheDocument());
    expect(screen.getByText("40h")).toBeInTheDocument();
  });

  it("keeps the current worklog shell visible while refetching", async () => {
    let resolveSnapshot: ((value: WorklogSnapshot) => void) | null = null;
    vi.mocked(tauriModule.loadWorklogSnapshot)
      .mockResolvedValueOnce(makeSnapshot(5))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSnapshot = resolve;
          }),
      );

    const { rerender } = renderWorklogPage();

    await waitFor(() => expect(screen.getByText("Day summary")).toBeInTheDocument());

    rerender(
      <I18nProvider>
        <WorklogPage
          payload={mockBootstrap}
          mode="week"
          syncVersion={0}
          detailDate={null}
          onModeChange={noop}
          onOpenNestedDay={noop}
          onCloseNestedDay={noop}
        />
      </I18nProvider>,
    );

    expect(screen.queryByText("Loading worklog")).not.toBeInTheDocument();
    expect(screen.getByText("Week summary")).toBeInTheDocument();
    expect(screen.queryByText("Failed to load worklog")).not.toBeInTheDocument();

    expect(resolveSnapshot).toBeTypeOf("function");
    resolveSnapshot!(makeWeekSnapshot());

    await waitFor(() => {
      expect(screen.getByText("Week summary")).toBeInTheDocument();
    });
  });

  it("keeps worklog headings stable while day data updates", async () => {
    const firstDay = makeSnapshot(5);
    const secondDay = {
      ...makeSnapshot(8),
      selectedDay: {
        ...makeSnapshot(8).selectedDay,
        date: "2026-03-05",
      },
    } satisfies WorklogSnapshot;

    vi.mocked(tauriModule.loadWorklogSnapshot)
      .mockResolvedValueOnce(firstDay)
      .mockResolvedValueOnce(makeWeekSnapshot())
      .mockResolvedValueOnce(makeSnapshot(5))
      .mockResolvedValueOnce(secondDay)
      .mockResolvedValue(secondDay);

    const { rerender } = renderWorklogPage();

    await waitFor(() => expect(screen.getByText("Day summary")).toBeInTheDocument());
    const heading = screen.getByText("Day summary");

    rerender(
      <I18nProvider>
        <WorklogPage
          payload={mockBootstrap}
          mode="day"
          syncVersion={1}
          detailDate={null}
          onModeChange={noop}
          onOpenNestedDay={noop}
          onCloseNestedDay={noop}
        />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("8h")).toBeInTheDocument();
    });

    expect(screen.getByText("Day summary")).toBe(heading);
  });

  it("does not refetch when browsing months in the day picker", async () => {
    renderWorklogPage();

    await waitFor(() => expect(screen.getByText("Day summary")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Pick day" }));
    const callsBefore = vi.mocked(tauriModule.loadWorklogSnapshot).mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Next month" }));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(vi.mocked(tauriModule.loadWorklogSnapshot).mock.calls.length).toBe(callsBefore);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("prefetches week and period snapshots after the initial day load", async () => {
    renderWorklogPage();

    await waitFor(() => {
      expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalledTimes(3);
    });

    expect(tauriModule.loadWorklogSnapshot).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ mode: "day" }),
    );
    expect(tauriModule.loadWorklogSnapshot).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ mode: "week" }),
    );
    expect(tauriModule.loadWorklogSnapshot).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ mode: "range" }),
    );
  });

  it("starts a new period range on first click without immediately closing", async () => {
    renderWorklogPage({ mode: "period", payload: mockBootstrap });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pick period" })).toBeInTheDocument(),
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Pick period" }));
    });

    const dialog = await screen.findByRole("dialog");
    const marchGrid = within(dialog).getAllByRole("grid")[0];
    const marchTwelve = within(marchGrid).getByRole("button", { name: /March 12th, 2026/i });

    await act(async () => {
      fireEvent.click(marchTwelve);
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByText("Pick an end date")).not.toBeInTheDocument();
    expect(
      within(marchGrid).queryByRole("button", { name: /March 1st, 2026/i, pressed: true }),
    ).not.toBeInTheDocument();
  });

  it("commits a one-day period range after clicking the same day twice", async () => {
    renderWorklogPage({ mode: "period", payload: mockBootstrap });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pick period" })).toBeInTheDocument(),
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Pick period" }));
    });

    const dialog = await screen.findByRole("dialog");
    const marchGrid = within(dialog).getAllByRole("grid")[0];
    const marchTwelve = within(marchGrid).getByRole("button", { name: /March 12th, 2026/i });

    await act(async () => {
      fireEvent.click(marchTwelve);
    });

    await act(async () => {
      fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", { name: /March 12th, 2026/i }),
      );
    });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(tauriModule.loadWorklogSnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: "range", anchorDate: "2026-03-12", endDate: "2026-03-12" }),
    );
  });

  it("opens nested day detail when selecting a week day card", async () => {
    vi.mocked(tauriModule.loadWorklogSnapshot).mockResolvedValue(makeWeekSnapshot());
    const onOpenNestedDay = vi.fn();

    renderWorklogPage({
      payload: tourPayload,
      mode: "week",
      onOpenNestedDay,
    });

    await waitFor(() => expect(screen.getByText("Weekly breakdown")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Monday 02/i }));
    });

    expect(onOpenNestedDay).toHaveBeenCalled();
  });

  it("localizes week card day labels in Spanish with full weekday names", async () => {
    vi.mocked(tauriModule.loadAppPreferences).mockResolvedValue({
      themeMode: "system",
      motionPreference: "system",
      language: "es",
      updateChannel: "stable",
      holidayCountryMode: "auto",
      holidayCountryCode: "CL",
      timeFormat: "hm",
      autoSyncEnabled: false,
      autoSyncIntervalMinutes: 30,
      trayEnabled: true,
      closeToTray: true,
      onboardingCompleted: false,
      ...testNotificationPrefs,
    });
    vi.mocked(tauriModule.loadWorklogSnapshot).mockResolvedValue(makeWeekSnapshot());

    renderWorklogPage({
      payload: tourPayload,
      mode: "week",
    });

    await waitFor(() => expect(screen.getByText("Desglose semanal")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /lunes 02/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mon Mon 02/i })).not.toBeInTheDocument();
  });

  it("renders nested detail with back button when detailDate is present", async () => {
    vi.mocked(tauriModule.loadWorklogSnapshot).mockResolvedValue(makeWeekSnapshot());
    const onCloseNestedDay = vi.fn();

    renderWorklogPage({
      payload: tourPayload,
      mode: "week",
      detailDate: new Date(2026, 2, 2),
      onCloseNestedDay,
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Back to week/i })).toBeInTheDocument(),
    );
    expect(screen.getByText("Day summary")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Week" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Pick week")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Back to week/i }));
    });

    expect(onCloseNestedDay).toHaveBeenCalledTimes(1);
  });

  it("shows holiday styling cues in the summary grid without a stale selected state", async () => {
    vi.mocked(tauriModule.loadWorklogSnapshot).mockResolvedValue(makeWeekSnapshot());

    renderWorklogPage({
      payload: tourPayload,
      mode: "week",
    });

    await waitFor(() => expect(screen.getByText("Weekly breakdown")).toBeInTheDocument());
    expect(screen.getByText("Founders Day")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
  });

  it("removes redundant day metadata from the day issues header", async () => {
    renderWorklogPage();

    await waitFor(() => expect(screen.getByText("Day summary")).toBeInTheDocument());
    expect(screen.queryByText(/Friday, March 6/i)).not.toBeInTheDocument();
  });

  it("renders summary cards and empty issues state without motion styles in reduced mode", async () => {
    vi.mocked(useMotionSettings).mockReturnValue(reducedMotionSettings);
    vi.mocked(tauriModule.loadWorklogSnapshot).mockResolvedValue({
      ...makeSnapshot(0),
      selectedDay: {
        ...makeSnapshot(0).selectedDay,
        topIssues: [],
      },
      auditFlags: [],
    });

    const { container } = renderWorklogPage();

    await waitFor(() => expect(screen.getByText("Day summary")).toBeInTheDocument());
    expect(screen.getByText("No issues logged for this day")).toBeInTheDocument();
    expect(container.querySelector('[style*="opacity: 0"]')).toBeNull();
  });

  it("keeps summary cards and empty issues mounted without hidden entrance states while hidden", async () => {
    vi.mocked(useMotionSettings).mockReturnValue(hiddenFullMotionSettings);
    vi.mocked(tauriModule.loadWorklogSnapshot).mockResolvedValue({
      ...makeSnapshot(0),
      selectedDay: {
        ...makeSnapshot(0).selectedDay,
        topIssues: [],
      },
      auditFlags: [],
    });

    const { container } = renderWorklogPage();

    await waitFor(() => expect(screen.getByText("Day summary")).toBeInTheDocument());
    expect(screen.getByText("No issues logged for this day")).toBeInTheDocument();
    expect(container.querySelector('[style*="opacity: 0"]')).toBeNull();
  });

  it("keeps the empty issues state in sync with day summary cards on day changes", async () => {
    const firstDay = {
      ...makeSnapshot(0),
      selectedDay: {
        ...makeSnapshot(0).selectedDay,
        date: "2026-03-04",
        topIssues: [],
      },
      auditFlags: [],
    } satisfies WorklogSnapshot;
    const secondDay = {
      ...makeSnapshot(0),
      selectedDay: {
        ...makeSnapshot(0).selectedDay,
        date: "2026-03-05",
        topIssues: [],
      },
      auditFlags: [],
    } satisfies WorklogSnapshot;

    vi.mocked(tauriModule.loadWorklogSnapshot)
      .mockResolvedValueOnce(firstDay)
      .mockResolvedValueOnce(makeWeekSnapshot())
      .mockResolvedValueOnce(makeSnapshot(0))
      .mockResolvedValueOnce(secondDay)
      .mockResolvedValue(secondDay);

    const { rerender } = renderWorklogPage();

    await waitFor(() => expect(screen.getByText("Day summary")).toBeInTheDocument());
    expect(screen.getByText("No issues logged for this day")).toBeInTheDocument();

    rerender(
      <I18nProvider>
        <WorklogPage
          payload={mockBootstrap}
          mode="day"
          syncVersion={1}
          detailDate={null}
          onModeChange={noop}
          onOpenNestedDay={noop}
          onCloseNestedDay={noop}
        />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("No issues logged for this day")).toBeInTheDocument();
    });

    expect(screen.getAllByText("0h").length).toBeGreaterThan(0);
  });

  it("renders the no-issues placeholder with the fox and message together", async () => {
    vi.mocked(tauriModule.loadWorklogSnapshot).mockResolvedValue({
      ...makeSnapshot(0),
      selectedDay: {
        ...makeSnapshot(0).selectedDay,
        topIssues: [],
      },
      auditFlags: [],
    });

    const { container } = renderWorklogPage();

    await waitFor(() =>
      expect(screen.getByText("No issues logged for this day")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("img", { name: /Timely fox mascot/i })).not.toBeInTheDocument();
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it("localizes period picker calendar labels in Spanish", async () => {
    vi.mocked(tauriModule.loadAppPreferences).mockResolvedValue({
      themeMode: "system",
      motionPreference: "system",
      language: "es",
      updateChannel: "stable",
      holidayCountryMode: "auto",
      holidayCountryCode: "CL",
      timeFormat: "hm",
      autoSyncEnabled: false,
      autoSyncIntervalMinutes: 30,
      trayEnabled: true,
      closeToTray: true,
      onboardingCompleted: false,
      ...testNotificationPrefs,
    });

    renderWorklogPage({ mode: "period", payload: mockBootstrap });

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Período" })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Elegir período" }));
    });

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/marzo/i)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Anterior" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Siguiente" })).toBeInTheDocument();
  });
});
