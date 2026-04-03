import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { MonthView } from "@/features/worklog/ui/MonthView/MonthView";

vi.mock("@/app/state/AppStore/app-store", () => ({
  useAppStore: vi.fn(() => "hm"),
}));
vi.mock("@/app/providers/MotionService/motion", () => ({
  useMotionSettings: vi.fn(() => ({
    allowDecorativeAnimation: false,
    windowVisibility: "visible",
  })),
}));

const mockMonth = {
  loggedHours: 32,
  targetHours: 40,
  consistencyScore: 0,
  cleanDays: 0,
  overflowDays: 0,
};

const mockDays = [
  {
    date: "2025-03-10",
    shortLabel: "Mon",
    dateLabel: "Mon 10",
    isToday: false,
    loggedHours: 8,
    targetHours: 8,
    focusHours: 0,
    overflowHours: 0,
    status: "met_target" as const,
    topIssues: [],
  },
];

describe("MonthView", () => {
  it("renders RangeSummarySection and WeekView", () => {
    render(
      <I18nProvider>
        <MonthView
          month={mockMonth}
          days={mockDays}
          note="Mar 10 - Mar 31"
          rangeStartDate="2025-03-10"
          rangeEndDate="2025-03-31"
          comparisonDate="2025-03-15"
        />
      </I18nProvider>,
    );
    expect(screen.getByText("Mar 10 - Mar 31")).toBeInTheDocument();
  });

  it("has month-card onboarding attribute", () => {
    const { container } = render(
      <I18nProvider>
        <MonthView
          month={mockMonth}
          days={[]}
          note="Note"
          rangeStartDate="2025-03-10"
          rangeEndDate="2025-03-31"
          comparisonDate="2025-03-15"
        />
      </I18nProvider>,
    );
    expect(container.querySelector('[data-onboarding="month-card"]')).toBeInTheDocument();
  });
});
