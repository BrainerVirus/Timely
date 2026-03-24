import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/core/services/I18nService/i18n";
import { NestedDayView } from "@/features/worklog/components/NestedDayView/NestedDayView";

vi.mock("@/core/stores/AppStore/app-store", () => ({
  useAppStore: vi.fn(() => "hm"),
}));

const mockDay = {
  date: "2025-03-15",
  shortLabel: "Sat",
  dateLabel: "Sat 15",
  isToday: false,
  loggedHours: 6,
  targetHours: 8,
  focusHours: 0,
  overflowHours: 0,
  status: "under_target" as const,
  topIssues: [],
};

describe("NestedDayView", () => {
  it("renders back button", () => {
    render(
      <I18nProvider>
        <NestedDayView parentMode="week" onBack={vi.fn()} selectedDay={mockDay} auditFlags={[]} />
      </I18nProvider>,
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("calls onBack when back button is clicked", () => {
    const onBack = vi.fn();
    render(
      <I18nProvider>
        <NestedDayView parentMode="week" onBack={onBack} selectedDay={mockDay} auditFlags={[]} />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
