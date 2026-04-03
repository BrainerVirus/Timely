import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { IssuesSection } from "@/features/worklog/ui/IssuesSection/IssuesSection";

vi.mock("@/app/state/AppStore/app-store", () => ({
  useAppStore: vi.fn(() => "hm"),
}));
vi.mock("@/app/providers/MotionService/motion", () => ({
  useMotionSettings: vi.fn(() => ({
    allowDecorativeAnimation: false,
    windowVisibility: "visible",
  })),
}));

const mockIssues = [
  { key: "PROJ-1", title: "Task one", hours: 2, tone: "emerald" as const },
  { key: "PROJ-2", title: "Task two", hours: 3, tone: "amber" as const },
];

describe("IssuesSection", () => {
  it("renders title and issues", () => {
    render(
      <I18nProvider>
        <IssuesSection title="Issues" issues={mockIssues} dataKey="day-1" />
      </I18nProvider>,
    );
    expect(screen.getByText("Issues")).toBeInTheDocument();
    expect(screen.getByText("Task one")).toBeInTheDocument();
    expect(screen.getByText("Task two")).toBeInTheDocument();
  });

  it("renders empty state when no issues", () => {
    render(
      <I18nProvider>
        <IssuesSection title="Issues" issues={[]} dataKey="day-1" />
      </I18nProvider>,
    );
    expect(screen.getByText("Issues")).toBeInTheDocument();
  });
});
