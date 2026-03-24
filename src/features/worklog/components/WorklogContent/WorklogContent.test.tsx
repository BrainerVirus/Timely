import { render, screen } from "@testing-library/react";
import { WorklogContent } from "@/features/worklog/components/WorklogContent/WorklogContent";
import { mockBootstrap } from "@/test/fixtures/mock-data";

vi.mock("@/core/services/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({
    t: (key: string) => key,
    formatHours: (h: number) => `${h}h`,
  })),
}));

vi.mock("@/core/hooks/use-format-hours/use-format-hours", () => ({
  useFormatHours: vi.fn(() => (h: number) => `${h}h`),
}));

const mockSnapshot = {
  mode: "day" as const,
  range: {
    startDate: mockBootstrap.today.date,
    endDate: mockBootstrap.today.date,
    label: mockBootstrap.today.date,
  },
  selectedDay: mockBootstrap.today,
  days: mockBootstrap.week,
  month: mockBootstrap.month,
  auditFlags: mockBootstrap.auditFlags,
};

describe("WorklogContent", () => {
  const defaultProps = {
    currentSnapshot: mockSnapshot,
    currentWeekRange: "Mar 3 – Mar 9",
    displayMode: "day" as const,
    onOpenNestedDay: vi.fn(),
    comparisonDate: mockBootstrap.today.date,
    periodLabel: "Mar 2026",
    selectedDay: mockBootstrap.today,
  };

  it("renders DaySummaryPanel for day mode", () => {
    render(<WorklogContent {...defaultProps} />);
    expect(screen.getByText("worklog.daySummary")).toBeInTheDocument();
  });

  it("renders WeekView for week mode", () => {
    render(<WorklogContent {...defaultProps} displayMode="week" />);
    expect(screen.getByText("worklog.weekSummary")).toBeInTheDocument();
  });
});
