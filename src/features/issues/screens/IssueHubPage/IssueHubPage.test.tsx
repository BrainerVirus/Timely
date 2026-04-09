import { render, screen, waitFor } from "@testing-library/react";
import * as tauriModule from "@/app/desktop/TauriService/tauri";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { IssueHubPage } from "@/features/issues/screens/IssueHubPage/IssueHubPage";
import { mockBootstrap } from "@/test/fixtures/mock-data";

vi.mock("@/app/desktop/TauriService/tauri", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/desktop/TauriService/tauri")>();
  return {
    ...actual,
    loadIssueDetails: vi.fn(),
    updateIssueMetadata: vi.fn(),
    logIssueTime: vi.fn(),
    createIssueComment: vi.fn(),
    openExternalUrl: vi.fn(),
  };
});

describe("IssueHubPage", () => {
  beforeEach(() => {
    vi.spyOn(tauriModule, "loadIssueDetails").mockResolvedValue({
      reference: {
        provider: "gitlab",
        issueId: "g/p#1",
        providerIssueRef: "gid://gitlab/Issue/42",
      },
      key: "g/p#1",
      title: "Fix the thing",
      state: "opened",
      description: "Body",
      labels: [],
      activity: [],
      capabilities: {
        status: {
          enabled: true,
          options: [
            { id: "opened", label: "Open" },
            { id: "closed", label: "Closed" },
          ],
        },
        labels: {
          enabled: true,
          options: [],
        },
        iteration: {
          enabled: false,
          reason: "GitLab does not expose iteration changes for this view yet.",
          options: [],
        },
        composer: {
          enabled: true,
          modes: ["write", "preview", "split"],
          supportsQuickActions: true,
        },
        timeTracking: {
          enabled: true,
          supportsQuickActions: true,
        },
      },
    });
  });

  it("shows not found when the issue is not in the payload", () => {
    render(
      <I18nProvider>
        <IssueHubPage
          payload={mockBootstrap}
          issueReference={{ provider: "gitlab", issueId: "g/p#999" }}
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
          provider: "gitlab",
          issueId: "g/p#1",
          providerIssueRef: "gid://gitlab/Issue/42",
          key: "g/p#1",
          title: "Fix the thing",
          state: "opened",
          labels: [],
        },
      ],
    };

    render(
      <I18nProvider>
        <IssueHubPage
          payload={payload}
          issueReference={{ provider: "gitlab", issueId: "g/p#1" }}
          onBack={vi.fn()}
          onRefreshBootstrap={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(/loading issue details/i)).toBeInTheDocument();
  });

  it("loads provider-backed issue details for the matching route reference", async () => {
    vi.spyOn(tauriModule, "loadIssueDetails").mockResolvedValue({
      reference: {
        provider: "gitlab",
        issueId: "g/p#1",
        providerIssueRef: "gid://gitlab/Issue/42",
      },
      key: "g/p#1",
      title: "Fix the thing",
      state: "opened",
      description: "### Description from API",
      labels: [{ id: "workflow::doing", label: "workflow::doing" }],
      activity: [],
      capabilities: {
        status: {
          enabled: true,
          options: [
            { id: "opened", label: "Open" },
            { id: "closed", label: "Closed" },
          ],
        },
        labels: {
          enabled: true,
          options: [{ id: "workflow::doing", label: "workflow::doing" }],
        },
        iteration: {
          enabled: false,
          reason: "GitLab does not expose iteration changes for this view yet.",
          options: [],
        },
        composer: {
          enabled: true,
          modes: ["write", "preview", "split"],
          supportsQuickActions: true,
        },
        timeTracking: {
          enabled: true,
          supportsQuickActions: true,
        },
      },
    });

    const payload = {
      ...mockBootstrap,
      assignedIssues: [
        {
          provider: "gitlab",
          issueId: "g/p#1",
          providerIssueRef: "gid://gitlab/Issue/42",
          key: "g/p#1",
          title: "Fix the thing",
          state: "opened",
          labels: [],
        },
      ],
    };

    render(
      <I18nProvider>
        <IssueHubPage
          payload={payload}
          issueReference={{ provider: "gitlab", issueId: "g/p#1" }}
          onBack={vi.fn()}
          onRefreshBootstrap={vi.fn()}
        />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(tauriModule.loadIssueDetails).toHaveBeenCalledWith("gitlab", "g/p#1");
    });
    expect(screen.getAllByText("workflow::doing")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Closed" })).toBeInTheDocument();
  });
});
