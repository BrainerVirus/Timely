import { fireEvent, render, screen } from "@testing-library/react";
import { createWeekdayScheduleFormRows } from "@/domains/schedule/state/schedule-form/schedule-form";
import { SetupSchedulePage } from "@/features/setup/screens/SetupSchedulePage/SetupSchedulePage";
import { mockBootstrap } from "@/test/fixtures/mock-data";

import type { WeekdayCode } from "@/domains/schedule/state/schedule-form/schedule-form";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({
    t: (key: string) => key,
    formatWeekdayFromCode: (code: string) => code,
  })),
}));

vi.mock("@/domains/schedule/ui/ScheduleWorkspace/ScheduleWorkspace", () => ({
  ScheduleWorkspace: () => <div data-testid="schedule-workspace" />,
}));

vi.mock("@/domains/schedule/ui/SchedulePreferencesFields/SchedulePreferencesFields", () => ({
  SchedulePreferencesFields: () => <div data-testid="schedule-preferences-fields" />,
}));

describe("SetupSchedulePage", () => {
  const timezoneOptions = [
    { value: "America/Santiago", label: "(GMT-3) Santiago", badge: "America" },
  ];

  const defaultProps = {
    scheduleSubStep: 0 as const,
    weekdaySchedules: createWeekdayScheduleFormRows(mockBootstrap.schedule),
    timezone: "America/Santiago",
    weekStart: "monday" as const,
    orderedWorkdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as WeekdayCode[],
    timezoneOptions,
    timeFormat: "hm" as const,
    schedulePhase: "idle" as const,
    onBack: vi.fn(),
    onNext: vi.fn(),
    onAdvanceSubStep: vi.fn(),
    onBackSubStep: vi.fn(),
    onTimezoneChange: vi.fn(),
    onWeekStartChange: vi.fn(),
    onTimeFormatChange: vi.fn(),
    onSetWeekdayEnabled: vi.fn(),
    onSetWeekdayField: vi.fn(),
    onCopyWeekdaySchedule: vi.fn(),
    onSave: vi.fn(),
  };

  it("renders preferences step on substep 0", () => {
    render(<SetupSchedulePage {...defaultProps} />);
    expect(screen.getByText("setup.scheduleStepPreferencesTitle")).toBeInTheDocument();
    expect(screen.getByTestId("schedule-preferences-fields")).toBeInTheDocument();
  });

  it("calls onBack when back clicked on preferences step", () => {
    render(<SetupSchedulePage {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "common.back" }));
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it("renders weekly workspace on substep 1", () => {
    render(<SetupSchedulePage {...defaultProps} scheduleSubStep={1} />);
    expect(screen.getByTestId("schedule-workspace")).toBeInTheDocument();
    expect(screen.getByText("setup.scheduleStepWeeklyTitle")).toBeInTheDocument();
  });
});
