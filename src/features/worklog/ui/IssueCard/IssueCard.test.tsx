import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { IssueCard } from "@/features/worklog/ui/IssueCard/IssueCard";

vi.mock("@/app/state/AppStore/app-store", () => ({
  useAppStore: vi.fn(() => "hm"),
}));

const mockIssue = {
  key: "PROJ-123",
  title: "Fix bug",
  hours: 2.5,
  tone: "emerald" as const,
};

describe("IssueCard", () => {
  it("renders issue title and key", () => {
    render(
      <I18nProvider>
        <IssueCard issue={mockIssue} />
      </I18nProvider>,
    );
    expect(screen.getByText("Fix bug")).toBeInTheDocument();
    expect(screen.getByText("PROJ-123")).toBeInTheDocument();
  });

  it("renders formatted hours", () => {
    render(
      <I18nProvider>
        <IssueCard issue={mockIssue} />
      </I18nProvider>,
    );
    expect(screen.getByText(/2.*30/)).toBeInTheDocument();
  });
});
