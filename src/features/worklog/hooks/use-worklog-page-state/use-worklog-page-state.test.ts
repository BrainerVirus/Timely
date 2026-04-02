import { renderHook } from "@testing-library/react";
import {
  prefetchWorklogSnapshots,
  resetWorklogSnapshotCache,
  useWorklogPageData,
} from "@/features/worklog/hooks/use-worklog-page-state/use-worklog-page-state";
import { mockBootstrap } from "@/test/fixtures/mock-data";

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
});
