import { render, screen } from "@testing-library/react";
import { RangeSummarySection } from "@/features/worklog/components/RangeSummarySection/RangeSummarySection";
import { I18nProvider } from "@/core/services/I18nService/i18n";

vi.mock("@/core/stores/AppStore/app-store", () => ({
  useAppStore: vi.fn(() => "hm"),
}));
vi.mock("@/core/services/MotionService/motion", () => ({
  useMotionSettings: vi.fn(() => ({
    allowDecorativeAnimation: false,
    windowVisibility: "visible",
  })),
}));

const mockSummary = {
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

describe("RangeSummarySection", () => {
  it("renders title and note", () => {
    render(
      <I18nProvider>
        <RangeSummarySection
          summary={mockSummary}
          days={mockDays}
          title="Week Summary"
          note="Mar 10 - Mar 16"
          rangeStartDate="2025-03-10"
          rangeEndDate="2025-03-16"
          comparisonDate="2025-03-15"
        />
      </I18nProvider>,
    );
    expect(screen.getByText("Week Summary")).toBeInTheDocument();
    expect(screen.getByText("Mar 10 - Mar 16")).toBeInTheDocument();
  });

  it("renders logged, expected, missing, and target stat panels", () => {
    const { container } = render(
      <I18nProvider>
        <RangeSummarySection
          summary={mockSummary}
          days={[]}
          title="Summary"
          note="Note"
          rangeStartDate="2025-03-10"
          rangeEndDate="2025-03-16"
          comparisonDate="2025-03-15"
        />
      </I18nProvider>,
    );
    expect(screen.getByText("Logged")).toBeInTheDocument();
    expect(screen.getByText("Expected")).toBeInTheDocument();
    expect(screen.getByText("Missing")).toBeInTheDocument();
    expect(screen.getByText("Target")).toBeInTheDocument();
    expect(container.textContent).toContain("32h");
    expect(container.textContent).toContain("40h");
  });

  it("uses days to compute logged hours when days provided", () => {
    const { container } = render(
      <I18nProvider>
        <RangeSummarySection
          summary={mockSummary}
          days={mockDays}
          title="Summary"
          note="Note"
          rangeStartDate="2025-03-10"
          rangeEndDate="2025-03-16"
          comparisonDate="2025-03-15"
        />
      </I18nProvider>,
    );
    expect(container.textContent).toContain("8h");
  });
});
