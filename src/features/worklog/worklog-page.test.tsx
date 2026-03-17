import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { tourPayload } from "@/features/onboarding/tour-mock-data";
import { WorklogPage } from "@/features/worklog/worklog-page";
import { I18nProvider } from "@/lib/i18n";
import { mockBootstrap } from "@/lib/mock-data";
import * as tauriModule from "@/lib/tauri";

import type { WorklogSnapshot } from "@/types/dashboard";
import type React from "react";

const noop = () => {};

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

vi.mock("@/lib/tauri", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tauri")>("@/lib/tauri");
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
  return {
    mode: "week",
    range: { startDate: "2026-03-02", endDate: "2026-03-08", label: "Week of Mar 2" },
    selectedDay: tourPayload.week[0]!,
    days: tourPayload.week,
    month: tourPayload.month,
    auditFlags: tourPayload.auditFlags,
  };
}

beforeEach(() => {
  vi.mocked(tauriModule.loadAppPreferences).mockReset().mockResolvedValue({
    themeMode: "system",
    language: "en",
    holidayCountryMode: "auto",
    holidayCountryCode: "CL",
    timeFormat: "hm",
    autoSyncEnabled: false,
    autoSyncIntervalMinutes: 30,
    trayEnabled: true,
    closeToTray: true,
    onboardingCompleted: false,
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

  it("loads holiday data for the visible picker year", async () => {
    renderWorklogPage({ mode: "period", payload: mockBootstrap });

    await waitFor(() => {
      expect(tauriModule.loadHolidayYear).toHaveBeenCalledWith("CL", 2026);
    });
  });

  it("re-fetches when syncVersion increments (simulates post-sync refresh)", async () => {
    const { rerender } = renderWorklogPage();

    await waitFor(() => expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalledTimes(1));

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

    await waitFor(() => expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalledTimes(2));
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

    await waitFor(() => expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalledTimes(1));

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
    expect(tauriModule.loadWorklogSnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: "week" }),
    );
    expect(vi.mocked(tauriModule.loadWorklogSnapshot).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("uses range snapshots behind the Period mode", async () => {
    renderWorklogPage({ mode: "period", payload: mockBootstrap });

    await waitFor(() => expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalledTimes(1));
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

    expect(screen.getByText("Logged time")).toBeInTheDocument();
    expect(screen.getByText("Target time")).toBeInTheDocument();
    expect(screen.getByText("Days within target")).toBeInTheDocument();
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
      fireEvent.click(screen.getByRole("button", { name: /This week/i }));
    });

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
    expect(screen.queryByRole("button", { name: /This week/i })).not.toBeInTheDocument();
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
    const marchGrid = within(dialog).getAllByRole("grid")[0]!;
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
    const marchGrid = within(dialog).getAllByRole("grid")[0]!;
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
      language: "es",
      holidayCountryMode: "auto",
      holidayCountryCode: "CL",
      timeFormat: "hm",
      autoSyncEnabled: false,
      autoSyncIntervalMinutes: 30,
      trayEnabled: true,
      closeToTray: true,
      onboardingCompleted: false,
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

  it("localizes period picker calendar labels in Spanish", async () => {
    vi.mocked(tauriModule.loadAppPreferences).mockResolvedValue({
      themeMode: "system",
      language: "es",
      holidayCountryMode: "auto",
      holidayCountryCode: "CL",
      timeFormat: "hm",
      autoSyncEnabled: false,
      autoSyncIntervalMinutes: 30,
      trayEnabled: true,
      closeToTray: true,
      onboardingCompleted: false,
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
