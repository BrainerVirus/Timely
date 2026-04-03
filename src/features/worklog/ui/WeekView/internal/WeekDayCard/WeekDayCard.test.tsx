import { fireEvent, render, screen } from "@testing-library/react";
import { WeekDayCard } from "@/features/worklog/ui/WeekView/internal/WeekDayCard/WeekDayCard";

import type { DayOverview } from "@/shared/types/dashboard";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({
    t: (key: string) => key,
    formatDayStatus: (status: string) => status,
  })),
}));

vi.mock("@/app/hooks/use-format-hours/use-format-hours", () => ({
  useFormatHours: vi.fn(() => (hours: number) => `${hours}h`),
}));

const mockDay: DayOverview = {
  date: "2026-03-30",
  shortLabel: "Mon",
  dateLabel: "Monday 30",
  loggedHours: 6,
  focusHours: 5,
  overflowHours: 1,
  topIssues: [],
  targetHours: 8,
  status: "on_track" as const,
  holidayName: undefined,
  isToday: false,
};

describe("WeekDayCard", () => {
  it("renders the day summary content", () => {
    render(
      <WeekDayCard
        day={mockDay}
        date={new Date("2026-03-30")}
        cardDateLabel="Monday 30"
        allowDecorativeAnimation={false}
        transition={{ duration: 0 }}
      />,
    );

    expect(screen.getByText("Monday 30")).toBeInTheDocument();
    expect(screen.getByText(/week.target/i)).toBeInTheDocument();
  });

  it("calls onSelectDay when the card is interactive", () => {
    const onSelectDay = vi.fn();
    const date = new Date("2026-03-30");

    render(
      <WeekDayCard
        day={mockDay}
        date={date}
        cardDateLabel="Monday 30"
        allowDecorativeAnimation={false}
        onSelectDay={onSelectDay}
        transition={{ duration: 0 }}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(onSelectDay).toHaveBeenCalledWith(mockDay, date);
  });
});
