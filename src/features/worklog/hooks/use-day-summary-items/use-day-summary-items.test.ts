import { renderHook } from "@testing-library/react";
import { useDaySummaryItems } from "@/features/worklog/hooks/use-day-summary-items/use-day-summary-items";
import { I18nProvider } from "@/core/services/I18nService/i18n";

vi.mock("@/core/stores/AppStore/app-store", () => ({
  useAppStore: vi.fn(() => "hm"),
}));

const mockDayOverview = {
  date: "2025-03-15",
  shortLabel: "Sat",
  dateLabel: "Sat 15",
  isToday: false,
  loggedHours: 6,
  targetHours: 8,
  focusHours: 0,
  overflowHours: 0,
  status: "under_target" as const,
  topIssues: [{ key: "PROJ-1", title: "Task", hours: 2, tone: "emerald" as const }],
};

describe("useDaySummaryItems", () => {
  it("returns 4 summary items", () => {
    const { result } = renderHook(
      () => useDaySummaryItems(mockDayOverview),
      { wrapper: I18nProvider },
    );
    expect(result.current).toHaveLength(4);
    expect(result.current[0]).toHaveProperty("title");
    expect(result.current[0]).toHaveProperty("value");
    expect(result.current[0]).toHaveProperty("note");
    expect(result.current[0]).toHaveProperty("icon");
  });

  it("includes logged, target, delta, issuesCount items", () => {
    const { result } = renderHook(
      () => useDaySummaryItems(mockDayOverview),
      { wrapper: I18nProvider },
    );
    const icons = result.current.map((i) => i.icon);
    expect(icons).toContain("timer");
    expect(icons).toContain("target");
    expect(icons).toContain("sparkles");
  });

  it("includes fourth item for issues count", () => {
    const { result } = renderHook(
      () => useDaySummaryItems(mockDayOverview, 0),
      { wrapper: I18nProvider },
    );
    expect(result.current[3].value).toBe("1");
  });
});
