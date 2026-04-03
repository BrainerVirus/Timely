import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { IssuesContent } from "@/features/worklog/ui/IssuesSection/internal/IssuesContent/IssuesContent";

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

describe("IssuesContent", () => {
  it("renders issues on the current page", () => {
    render(
      <I18nProvider>
        <IssuesContent issues={mockIssues} dataKey="day-1" />
      </I18nProvider>,
    );

    expect(screen.getByText("Task one")).toBeInTheDocument();
    expect(screen.getByText("Task two")).toBeInTheDocument();
  });

  it("renders the empty state when there are no issues", () => {
    render(
      <I18nProvider>
        <IssuesContent issues={[]} dataKey="day-1" />
      </I18nProvider>,
    );

    expect(screen.getByText(/no issues/i)).toBeInTheDocument();
  });
});
