import { fireEvent, render, screen } from "@testing-library/react";
import { SetupSchedulePage } from "@/features/setup/pages/SetupSchedulePage/SetupSchedulePage";

vi.mock("@/core/services/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({
    t: (key: string) => key,
    formatWeekdayFromCode: (code: string) => code,
  })),
}));

describe("SetupSchedulePage", () => {
  const defaultProps = {
    shiftStart: "09:00",
    shiftEnd: "18:00",
    lunchMinutes: "60",
    workdays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    timezone: "America/Santiago",
    weekStart: "monday" as const,
    netHours: "8h",
    schedulePhase: "idle" as const,
    onBack: vi.fn(),
    onNext: vi.fn(),
    onShiftStartChange: vi.fn(),
    onShiftEndChange: vi.fn(),
    onLunchMinutesChange: vi.fn(),
    onTimezoneChange: vi.fn(),
    onWeekStartChange: vi.fn(),
    onToggleWorkday: vi.fn(),
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
