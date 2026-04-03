import { fireEvent, render, screen } from "@testing-library/react";
import { ScheduleWorkspace } from "@/domains/schedule/ui/ScheduleWorkspace/ScheduleWorkspace";
import { createWeekdayScheduleFormRows } from "@/domains/schedule/state/schedule-form/schedule-form";
import { mockBootstrap } from "@/test/fixtures/mock-data";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({
    t: (key: string, params?: Record<string, string>) =>
      key === "settings.hoursPerDaySummary" ? `${params?.hours ?? ""}h/day` : key,
    formatWeekdayFromCode: (code: string, style?: string) =>
      style === "long"
        ? {
            Mon: "Monday",
            Tue: "Tuesday",
            Wed: "Wednesday",
            Thu: "Thursday",
            Fri: "Friday",
            Sat: "Saturday",
            Sun: "Sunday",
          }[code] ?? code
        : code,
  })),
}));

describe("ScheduleWorkspace", () => {
  const defaultProps = {
    weekdaySchedules: createWeekdayScheduleFormRows(mockBootstrap.schedule),
    orderedWorkdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const,
    onSetWeekdayEnabled: vi.fn(),
    onSetWeekdayField: vi.fn(),
    onCopyWeekdaySchedule: vi.fn(),
  };

  beforeEach(() => {
    defaultProps.onSetWeekdayEnabled.mockReset();
    defaultProps.onSetWeekdayField.mockReset();
    defaultProps.onCopyWeekdaySchedule.mockReset();
  });

  it("renders the work week canvas and opens monday details by default", () => {
    render(<ScheduleWorkspace {...defaultProps} />);

    expect(screen.queryByText("settings.workWeek")).not.toBeInTheDocument();
    expect(screen.queryByText("settings.quickPresets")).not.toBeInTheDocument();
    expect(screen.getByTestId("schedule-calendar-viewport")).toBeInTheDocument();
    expect(screen.getByText("settings.hours")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Monday" })).toBeInTheDocument();
    expect(screen.queryByText(/Mar 30/i)).not.toBeInTheDocument();
  });

  it("applies matching-day copies from the selected day", () => {
    render(<ScheduleWorkspace {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /settings.applyToMatchingDays/i }));

    expect(defaultProps.onCopyWeekdaySchedule).toHaveBeenCalledWith("Mon", [
      "Tue",
      "Wed",
      "Thu",
      "Fri",
    ]);
  });

  it("uses a generic workweek without holiday markers or dated labels", () => {
    render(<ScheduleWorkspace {...defaultProps} />);

    expect(screen.queryByText(/Founders Day/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Holiday/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Apr /i)).not.toBeInTheDocument();
  });
});
