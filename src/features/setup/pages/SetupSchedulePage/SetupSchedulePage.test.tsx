import { fireEvent, render, screen } from "@testing-library/react";
import { createWeekdayScheduleFormRows } from "@/features/settings/hooks/schedule-form/schedule-form";
import { SetupSchedulePage } from "@/features/setup/pages/SetupSchedulePage/SetupSchedulePage";
import { mockBootstrap } from "@/test/fixtures/mock-data";

vi.mock("@/core/services/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({
    t: (key: string) => key,
    formatWeekdayFromCode: (code: string) => code,
  })),
}));

describe("SetupSchedulePage", () => {
  const defaultProps = {
    weekdaySchedules: createWeekdayScheduleFormRows(mockBootstrap.schedule),
    timezone: "America/Santiago",
    weekStart: "monday" as const,
    orderedWorkdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const,
    schedulePhase: "idle" as const,
    onBack: vi.fn(),
    onNext: vi.fn(),
    onTimezoneChange: vi.fn(),
    onWeekStartChange: vi.fn(),
    onSetWeekdayEnabled: vi.fn(),
    onSetWeekdayField: vi.fn(),
    onCopyWeekdaySchedule: vi.fn(),
    onSave: vi.fn(),
  };

  it("renders title", () => {
    render(<SetupSchedulePage {...defaultProps} />);
    expect(screen.getByText("setup.scheduleTitle")).toBeInTheDocument();
  });

  it("calls onBack when back clicked", () => {
    render(<SetupSchedulePage {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "common.back" }));
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });
});
