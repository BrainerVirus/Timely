import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { DaySummaryPanel } from "@/features/worklog/ui/DaySummaryPanel/DaySummaryPanel";

vi.mock("@/app/state/AppStore/app-store", () => ({
  useAppStore: vi.fn(() => "hm"),
}));
vi.mock("@/app/providers/MotionService/motion", () => ({
  useMotionSettings: vi.fn(() => ({
    allowDecorativeAnimation: false,
    windowVisibility: "visible",
  })),
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

describe("DaySummaryPanel", () => {
  it("renders default title and summary grid", () => {
    render(
      <I18nProvider>
        <DaySummaryPanel selectedDay={mockDay} auditFlags={[]} />
      </I18nProvider>,
    );
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  it("renders custom title when provided", () => {
    render(
      <I18nProvider>
        <DaySummaryPanel selectedDay={mockDay} auditFlags={[]} title="Custom Title" />
      </I18nProvider>,
    );
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
  });
});
