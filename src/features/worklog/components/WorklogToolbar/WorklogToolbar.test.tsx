import { render, screen } from "@testing-library/react";
import { WorklogToolbar } from "@/features/worklog/components/WorklogToolbar/WorklogToolbar";

vi.mock("@/core/services/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({
    t: (key: string) => key,
    formatDateShort: (d: Date) => d.toISOString().slice(0, 10),
  })),
}));

const defaultProps = {
  activeDate: new Date(2026, 2, 5),
  calendarHolidays: [],
  calendarWeekStartsOn: 1 as const,
  currentWeekRange: "Mar 3 – Mar 9",
  dayCalendarOpen: false,
  dayVisibleMonth: new Date(2026, 2, 1),
  displayMode: "day" as const,
  isCurrentDay: false,
  isCurrentPeriod: false,
  isCurrentWeek: false,
  onDayCalendarOpenChange: vi.fn(),
  onDaySelectDate: vi.fn(),
  onDayVisibleMonthChange: vi.fn(),
  onModeChange: vi.fn(),
  periodCalendarOpen: false,
  onPeriodCalendarOpenChange: vi.fn(),
  onPeriodDraftRangeChange: vi.fn(),
  onPeriodSelectRange: vi.fn(),
  onPeriodVisibleMonthChange: vi.fn(),
  onResetCurrentPeriod: vi.fn(),
  onShiftCurrentPeriod: vi.fn(),
  onWeekCalendarOpenChange: vi.fn(),
  onWeekSelectDate: vi.fn(),
  onWeekVisibleMonthChange: vi.fn(),
  periodDraftRange: undefined,
  periodLabel: "Mar 1 – Mar 31",
  periodRange: {
    from: new Date(2026, 2, 1),
    to: new Date(2026, 2, 31),
  },
  periodRangeDays: 31,
  periodVisibleMonth: new Date(2026, 2, 1),
  weekCalendarOpen: false,
  weekVisibleMonth: new Date(2026, 2, 1),
};

describe("WorklogToolbar", () => {
  it("renders day, week, period tabs", () => {
    render(<WorklogToolbar {...defaultProps} />);
    expect(screen.getByRole("tab", { name: "common.day" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "common.week" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "common.period" })).toBeInTheDocument();
  });

  it("renders PagerControl for day mode", () => {
    render(<WorklogToolbar {...defaultProps} />);
    expect(screen.getByText("common.day")).toBeInTheDocument();
  });
});
