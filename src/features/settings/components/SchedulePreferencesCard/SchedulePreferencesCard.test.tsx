import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/core/services/I18nService/i18n";
import { SchedulePreferencesCard } from "@/features/settings/components/SchedulePreferencesCard/SchedulePreferencesCard";

const defaultProps = {
  shiftStart: "09:00",
  shiftEnd: "18:00",
  lunchMinutes: "60",
  workdays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  timezone: "America/Santiago",
  netHours: "8.0",
  schedulePhase: "idle" as const,
  canSave: true,
  onShiftStartChange: vi.fn(),
  onShiftEndChange: vi.fn(),
  onLunchMinutesChange: vi.fn(),
  onToggleWorkday: vi.fn(),
  onSave: vi.fn(),
};

function renderWithI18n(props = {}) {
  return render(
    <I18nProvider>
      <SchedulePreferencesCard {...defaultProps} {...props} />
    </I18nProvider>,
  );
}

describe("SchedulePreferencesCard", () => {
  it("renders work schedule heading", () => {
    renderWithI18n();
    expect(screen.getByText("Work schedule")).toBeInTheDocument();
  });

  it("shows save button when canSave is true", () => {
    renderWithI18n({ canSave: true });
    expect(screen.getByRole("button", { name: /save schedule/i })).toBeInTheDocument();
  });

  it("hides save button when canSave is false", () => {
    renderWithI18n({ canSave: false });
    expect(screen.queryByRole("button", { name: /save schedule/i })).not.toBeInTheDocument();
  });

  it("displays net hours", () => {
    renderWithI18n({ netHours: "7.5" });
    expect(screen.getByText("7.5h")).toBeInTheDocument();
  });

  it("toggles workday when day button is clicked", () => {
    const onToggleWorkday = vi.fn();
    renderWithI18n({ onToggleWorkday });
    fireEvent.click(screen.getByRole("button", { name: "Mon" }));
    expect(onToggleWorkday).toHaveBeenCalledWith("Mon");
  });

  it("calls onSave when save button is clicked", () => {
    const onSave = vi.fn();
    renderWithI18n({ canSave: true, onSave });
    fireEvent.click(screen.getByRole("button", { name: /save schedule/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
