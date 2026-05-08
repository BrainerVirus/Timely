import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { IssueCard } from "@/features/worklog/ui/IssueCard/IssueCard";

const schedulePrefetchIssueDetailsOnHover = vi.fn((_reference: unknown, _options: unknown) =>
  vi.fn(),
);

vi.mock("@/domains/issues/lib/issue-details-session-cache", () => ({
  schedulePrefetchIssueDetailsOnHover: (reference: unknown, options: unknown) =>
    schedulePrefetchIssueDetailsOnHover(reference, options),
}));

vi.mock("@/app/state/AppStore/app-store", () => ({
  useAppStore: vi.fn(() => "hm"),
}));

const mockIssue = {
  provider: "gitlab",
  issueId: "group/project#123",
  providerIssueRef: "gid://gitlab/Issue/123",
  key: "PROJ-123",
  title: "Fix bug",
  hours: 2.5,
  state: "opened",
  statusLabel: "In Progress",
  workflowStatus: "doing",
  webUrl: "https://gitlab.com/group/project/-/issues/123",
  tone: "emerald" as const,
};

describe("IssueCard", () => {
  beforeEach(() => {
    schedulePrefetchIssueDetailsOnHover.mockClear();
  });

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

  it("renders status and a useful provider badge", () => {
    render(
      <I18nProvider>
        <IssueCard issue={mockIssue} syncVersion={7} onOpenIssue={vi.fn()} onAddTime={vi.fn()} />
      </I18nProvider>,
    );

    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("GitLab")).toBeInTheDocument();
  });

  it("opens the issue from click and keyboard without triggering add time", () => {
    const onOpenIssue = vi.fn();
    const onAddTime = vi.fn();
    render(
      <I18nProvider>
        <IssueCard
          issue={mockIssue}
          syncVersion={7}
          onOpenIssue={onOpenIssue}
          onAddTime={onAddTime}
        />
      </I18nProvider>,
    );

    const card = screen.getByRole("button", { name: /Fix bug/i });
    fireEvent.click(card);
    fireEvent.keyDown(card, { key: "Enter" });

    expect(onOpenIssue).toHaveBeenCalledTimes(2);
    expect(onOpenIssue).toHaveBeenCalledWith({ provider: "gitlab", issueId: "group/project#123" });
    expect(onAddTime).not.toHaveBeenCalled();
  });

  it("keeps add time separate from card navigation", () => {
    const onOpenIssue = vi.fn();
    const onAddTime = vi.fn();
    render(
      <I18nProvider>
        <IssueCard
          issue={mockIssue}
          syncVersion={7}
          onOpenIssue={onOpenIssue}
          onAddTime={onAddTime}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /^Log time$/i }));

    expect(onAddTime).toHaveBeenCalledWith({ provider: "gitlab", issueId: "group/project#123" });
    expect(onOpenIssue).not.toHaveBeenCalled();
  });

  it("prefetches issue details on hover and focus", () => {
    render(
      <I18nProvider>
        <IssueCard issue={mockIssue} syncVersion={7} onOpenIssue={vi.fn()} onAddTime={vi.fn()} />
      </I18nProvider>,
    );

    const card = screen.getByRole("button", { name: /Fix bug/i });
    fireEvent.mouseEnter(card);
    fireEvent.focus(card);

    expect(schedulePrefetchIssueDetailsOnHover).toHaveBeenCalledWith(
      { provider: "gitlab", issueId: "group/project#123" },
      { syncVersion: 7 },
    );
  });
});
