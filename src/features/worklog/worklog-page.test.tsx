import { render, waitFor } from "@testing-library/react";
import { WorklogPage } from "@/features/worklog/worklog-page";
import * as tauriModule from "@/lib/tauri";
import { mockBootstrap } from "@/lib/mock-data";

import type { WorklogSnapshot } from "@/types/dashboard";

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

beforeEach(() => {
  vi.mocked(tauriModule.loadWorklogSnapshot).mockReset().mockResolvedValue(makeSnapshot(5));
});

describe("WorklogPage", () => {
  it("fetches worklog data on mount", async () => {
    render(
      <WorklogPage
        payload={mockBootstrap}
        mode="day"
        syncVersion={0}
        onModeChange={() => {}}
      />,
    );

    await waitFor(() => {
      expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalledTimes(1);
    });
  });

  it("re-fetches when syncVersion increments (simulates post-sync refresh)", async () => {
    const { rerender } = render(
      <WorklogPage
        payload={mockBootstrap}
        mode="day"
        syncVersion={0}
        onModeChange={() => {}}
      />,
    );

    await waitFor(() => expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalledTimes(1));

    // Simulate a sync completing — version bumps from 0 → 1
    vi.mocked(tauriModule.loadWorklogSnapshot).mockResolvedValue(makeSnapshot(8));

    rerender(
      <WorklogPage
        payload={mockBootstrap}
        mode="day"
        syncVersion={1}
        onModeChange={() => {}}
      />,
    );

    await waitFor(() => expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalledTimes(2));
  });

  it("does NOT re-fetch when unrelated props change (mode stays same, syncVersion stays same)", async () => {
    const { rerender } = render(
      <WorklogPage
        payload={mockBootstrap}
        mode="day"
        syncVersion={0}
        onModeChange={() => {}}
      />,
    );

    await waitFor(() => expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalledTimes(1));

    // Re-render with same mode and syncVersion — no new fetch expected
    rerender(
      <WorklogPage
        payload={mockBootstrap}
        mode="day"
        syncVersion={0}
        onModeChange={() => {}}
      />,
    );

    // Small delay to ensure no extra call sneaks in
    await new Promise((r) => setTimeout(r, 50));
    expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalledTimes(1);
  });

  it("re-fetches when mode changes (existing behaviour preserved)", async () => {
    const { rerender } = render(
      <WorklogPage
        payload={mockBootstrap}
        mode="day"
        syncVersion={0}
        onModeChange={() => {}}
      />,
    );

    await waitFor(() => expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalledTimes(1));

    rerender(
      <WorklogPage
        payload={mockBootstrap}
        mode="week"
        syncVersion={0}
        onModeChange={() => {}}
      />,
    );

    await waitFor(() => expect(tauriModule.loadWorklogSnapshot).toHaveBeenCalledTimes(2));
    expect(tauriModule.loadWorklogSnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: "week" }),
    );
  });
});
