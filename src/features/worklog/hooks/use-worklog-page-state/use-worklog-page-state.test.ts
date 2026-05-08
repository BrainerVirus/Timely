import { act, renderHook, waitFor } from "@testing-library/react";
import { loadWorklogSnapshot } from "@/app/desktop/TauriService/tauri";
import {
  prefetchWorklogSnapshots,
  resetWorklogSnapshotCache,
  useWorklogPageData,
} from "@/features/worklog/hooks/use-worklog-page-state/use-worklog-page-state";
import { toDateInputValue } from "@/features/worklog/lib/worklog-date-utils";
import { mockBootstrap } from "@/test/fixtures/mock-data";

import type { BootstrapPayload } from "@/shared/types/dashboard";

vi.mock("@/app/desktop/TauriService/tauri", () => ({
  loadWorklogSnapshot: vi.fn(() =>
    Promise.resolve({
      mode: "day",
      range: {
        startDate: mockBootstrap.today.date,
        endDate: mockBootstrap.today.date,
        label: mockBootstrap.today.date,
      },
      selectedDay: mockBootstrap.today,
      days: mockBootstrap.week,
      month: mockBootstrap.month,
      auditFlags: [],
    }),
  ),
  loadHolidayYear: vi.fn(() => Promise.resolve({ holidays: [] })),
}));

vi.mock("@/app/bootstrap/PreferencesCache/preferences-cache", () => ({
  getAppPreferencesCached: vi.fn(() =>
    Promise.resolve({
      holidayCountryMode: "manual",
      holidayCountryCode: undefined,
      weekStart: "monday",
    }),
  ),
}));

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({
    t: (key: string) => key,
    formatDateShort: (d: Date) => d.toISOString().slice(0, 10),
    formatDateRange: () => "",
  })),
}));

describe("use-worklog-page-state", () => {
  beforeEach(() => {
    resetWorklogSnapshotCache();
    vi.mocked(loadWorklogSnapshot).mockClear();
  });

  it("returns state with displayMode and selectedDay", () => {
    const { result } = renderHook(() =>
      useWorklogPageData({
        payload: mockBootstrap,
        mode: "day",
        syncVersion: 0,
        detailDate: null,
        onCloseNestedDay: () => {},
      }),
    );
    expect(result.current.displayMode).toBe("day");
    expect(result.current.selectedDay).toBeDefined();
  });

  it("exports prefetchWorklogSnapshots and resetWorklogSnapshotCache", () => {
    expect(typeof prefetchWorklogSnapshots).toBe("function");
    expect(typeof resetWorklogSnapshotCache).toBe("function");
  });

  it("closes the nested day view when selecting a new week date", () => {
    const onCloseNestedDay = vi.fn();
    const { result } = renderHook(() =>
      useWorklogPageData({
        payload: mockBootstrap,
        mode: "week",
        syncVersion: 0,
        detailDate: new Date("2026-03-30"),
        onCloseNestedDay,
      }),
    );

    act(() => {
      result.current.onWeekSelectDate(new Date("2026-04-01"));
    });

    expect(onCloseNestedDay).toHaveBeenCalledTimes(1);
  });

  it("invalidates and refetches day, week, and period snapshots when syncVersion changes", async () => {
    const { rerender } = renderHook(
      ({ syncVersion }) =>
        useWorklogPageData({
          payload: mockBootstrap,
          mode: "day",
          syncVersion,
          detailDate: null,
          onCloseNestedDay: () => {},
        }),
      { initialProps: { syncVersion: 0 } },
    );

    await waitFor(() => expect(loadWorklogSnapshot).toHaveBeenCalledTimes(3));
    vi.mocked(loadWorklogSnapshot).mockClear();

    rerender({ syncVersion: 1 });

    await waitFor(() => {
      expect(vi.mocked(loadWorklogSnapshot).mock.calls.map(([input]) => input.mode).sort()).toEqual([
        "day",
        "range",
        "week",
      ]);
    });
  });

  it("moves the selected day to the refreshed current date on rollover", () => {
    const { result, rerender } = renderHook(
      ({ payload }) =>
        useWorklogPageData({
          payload,
          mode: "day",
          syncVersion: 0,
          detailDate: null,
          onCloseNestedDay: () => {},
        }),
      { initialProps: { payload: createPayloadForDate("2026-03-07") } },
    );

    rerender({ payload: createPayloadForDate("2026-03-08") });

    expect(toDateInputValue(result.current.activeDate)).toBe("2026-03-08");
  });

  it("preserves an intentional past day selection on rollover", () => {
    const { result, rerender } = renderHook(
      ({ payload }) =>
        useWorklogPageData({
          payload,
          mode: "day",
          syncVersion: 0,
          detailDate: null,
          onCloseNestedDay: () => {},
        }),
      { initialProps: { payload: createPayloadForDate("2026-03-07") } },
    );

    act(() => {
      result.current.onDaySelectDate(new Date(2026, 2, 5));
    });
    rerender({ payload: createPayloadForDate("2026-03-08") });

    expect(toDateInputValue(result.current.activeDate)).toBe("2026-03-05");
  });

  it("moves only the current week and current period ranges on date rollover", () => {
    const initialPayload = createPayloadForDate("2026-03-31");
    const nextPayload = createPayloadForDate("2026-04-01");
    const { result, rerender } = renderHook(
      ({ payload, mode }) =>
        useWorklogPageData({
          payload,
          mode,
          syncVersion: 0,
          detailDate: null,
          onCloseNestedDay: () => {},
        }),
      { initialProps: { payload: initialPayload, mode: "period" as const } },
    );

    rerender({ payload: nextPayload, mode: "period" });
    expect(toDateInputValue(result.current.periodRange.from)).toBe("2026-04-01");

    act(() => {
      result.current.onPeriodSelectRange({ from: new Date(2026, 1, 1), to: new Date(2026, 1, 28) });
    });
    rerender({ payload: createPayloadForDate("2026-04-02"), mode: "period" });

    expect(toDateInputValue(result.current.periodRange.from)).toBe("2026-02-01");
  });
});

function createPayloadForDate(date: string): BootstrapPayload {
  return {
    ...mockBootstrap,
    today: {
      ...mockBootstrap.today,
      date,
      dateLabel: date,
    },
    week: [],
  };
}
