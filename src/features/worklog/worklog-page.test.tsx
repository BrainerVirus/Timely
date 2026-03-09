import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { tourPayload } from "@/features/onboarding/tour-mock-data";
import { WorklogPage } from "@/features/worklog/worklog-page";
import * as tauriModule from "@/lib/tauri";
import { mockBootstrap } from "@/lib/mock-data";

import type React from "react";
import type { WorklogSnapshot } from "@/types/dashboard";

const noop = () => {};

function renderWorklogPage(
  props: Partial<React.ComponentProps<typeof WorklogPage>> = {},
) {
  return render(
    <WorklogPage
      payload={mockBootstrap}
      mode="day"
      syncVersion={0}
      detailDate={null}
      onModeChange={noop}
      onOpenNestedDay={noop}
      onCloseNestedDay={noop}
      {...props}
    />,
  );
}

vi.mock("@/lib/tauri", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tauri")>("@/lib/tauri");
  return {
    ...actual,
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
  vi.mocked(tauriModule.loadWorklogSnapshot).mockReset().mockResolvedValue(makeSnapshot(5));
});

describe("WorklogPage", () => {
  it("fetches worklog data on mount", async () => {
    renderWorklogPage();

    await waitFor(() => {
      expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalledTimes(1);
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

    await waitFor(() => expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalledTimes(1));

    // Re-render with same mode and syncVersion — no new fetch expected
    rerender(
      <WorklogPage
        payload={mockBootstrap}
        mode="day"
        syncVersion={0}
        detailDate={null}
        onModeChange={noop}
        onOpenNestedDay={noop}
        onCloseNestedDay={noop}
      />,
    );

    // Small delay to ensure no extra call sneaks in
    await new Promise((r) => setTimeout(r, 50));
    expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalledTimes(1);
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

    await waitFor(() => expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalledTimes(2));
    expect(tauriModule.loadWorklogSnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: "week" }),
    );
  });

  it("uses range snapshots behind the Period mode", async () => {
    renderWorklogPage({ mode: "period", payload: mockBootstrap });

    await waitFor(() => expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalledTimes(1));
    expect(tauriModule.loadWorklogSnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: "range" }),
    );
    expect(screen.getByRole("tab", { name: "Period" })).toHaveAttribute("data-state", "active");
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
      fireEvent.click(screen.getByRole("button", { name: /Mon Mon 01/i }));
    });

    expect(onOpenNestedDay).toHaveBeenCalled();
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

    await waitFor(() => expect(screen.getByRole("button", { name: /Back to week/i })).toBeInTheDocument());
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
});
