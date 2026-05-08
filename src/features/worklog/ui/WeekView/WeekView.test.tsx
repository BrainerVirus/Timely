import { fireEvent, render, screen } from "@testing-library/react";
import { WeekView } from "@/features/worklog/ui/WeekView/WeekView";
import { mockBootstrap } from "@/test/fixtures/mock-data";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({
    t: (key: string) => key,
    formatDate: (d: Date, _opts: Intl.DateTimeFormatOptions) => d.toISOString().slice(0, 10),
    formatDayStatus: (status: string) => status,
    formatWeekdayFromDate: (d: Date) => d.toLocaleDateString("en", { weekday: "long" }),
  })),
}));

vi.mock("@/app/providers/MotionService/motion", () => ({
  useMotionSettings: vi.fn(() => ({ allowDecorativeAnimation: false })),
}));

vi.mock("@/app/hooks/use-format-hours/use-format-hours", () => ({
  useFormatHours: vi.fn(() => (h: number) => `${h}h`),
}));

describe("WeekView", () => {
  it("renders empty state when week is empty", () => {
    render(<WeekView week={[]} />);
    expect(screen.getByText("worklog.noIssues")).toBeInTheDocument();
  });

  it("renders day cards when week has days", () => {
    render(<WeekView week={mockBootstrap.week} />);
    expect(screen.getByText("dashboard.weekTitle")).toBeInTheDocument();
  });

  it("uses each day item date when selecting a period card", () => {
    const onSelectDay = vi.fn();
    const day = {
      date: "2025-03-12",
      shortLabel: "Wed",
      dateLabel: "Wed 12",
      isToday: false,
      loggedHours: 5,
      targetHours: 8,
      focusHours: 0,
      overflowHours: 0,
      status: "under_target" as const,
      topIssues: [],
    };

    render(
      <WeekView
        week={[day]}
        startDate="2025-03-10"
        rangeEndDate="2025-03-12"
        viewMode="period"
        weekStart="monday"
        timezone="UTC"
        onSelectDay={onSelectDay}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /2025-03-12/i }));

    expect(onSelectDay).toHaveBeenCalledWith(day, new Date(2025, 2, 12));
  });
});
