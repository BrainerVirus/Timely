import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { IssueHubPage } from "@/features/issues/screens/IssueHubPage/IssueHubPage";
import { mockBootstrap } from "@/test/fixtures/mock-data";

vi.mock("@/app/desktop/TauriService/tauri", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/desktop/TauriService/tauri")>();
  return {
    ...actual,
    createGitLabTimelog: vi.fn(),
    createGitLabIssueNote: vi.fn(),
    openExternalUrl: vi.fn(),
  };
});

describe("IssueHubPage", () => {
  it("shows not found when the issue is not in the payload", () => {
    render(
      <I18nProvider>
        <IssueHubPage
          payload={mockBootstrap}
          issueGid="gid://gitlab/Issue/999"
          onBack={vi.fn()}
          onRefreshBootstrap={vi.fn()}
        />
      </I18nProvider>,
    );
    expect(screen.getByText(/not in cache/i)).toBeInTheDocument();
  });

  it("renders the issue title when the gid matches", () => {
    const payload = {
      ...mockBootstrap,
      assignedIssues: [
        {
          key: "g/p#1",
          title: "Fix the thing",
          state: "opened",
          issueGraphqlId: "gid://gitlab/Issue/42",
          labels: [],
        },
      ],
    };

    render(
      <I18nProvider>
        <IssueHubPage
          payload={payload}
          issueGid="gid://gitlab/Issue/42"
          onBack={vi.fn()}
          onRefreshBootstrap={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("heading", { name: "Fix the thing" })).toBeInTheDocument();
  });
});
