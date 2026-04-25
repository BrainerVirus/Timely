import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import * as tauriModule from "@/app/desktop/TauriService/tauri";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { invalidateIssueDetailsSessionCache } from "@/features/issues/lib/issue-details-session-cache";
import { IssueHubPage } from "@/features/issues/screens/IssueHubPage/IssueHubPage";
import { getAssignedIssueStateBadgeClassName } from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issue-badge-tone";
import { mockBootstrap } from "@/test/fixtures/mock-data";

import type { IssueDetailsSnapshot } from "@/shared/types/dashboard";

vi.mock("@/app/desktop/TauriService/tauri", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/desktop/TauriService/tauri")>();
  return {
    ...actual,
    loadIssueDetails: vi.fn(),
    updateIssueMetadata: vi.fn(),
    logIssueTime: vi.fn(),
    createIssueComment: vi.fn(),
    loadIssueActivityPage: vi.fn(),
    deleteIssue: vi.fn(),
    openExternalUrl: vi.fn(),
  };
});

vi.mock("boneyard-js/react", () => ({
  Skeleton: ({
    loading,
    children,
    fallback,
  }: {
    loading: boolean;
    children?: ReactNode;
    fallback?: ReactNode;
  }) => (loading ? <>{fallback}</> : <>{children}</>),
}));

function createDetailsSnapshot(
  overrides: Partial<IssueDetailsSnapshot> = {},
): IssueDetailsSnapshot {
  return {
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
    milestoneTitle: "Platform sprint",
    iteration: { id: "iteration-1", label: "Sprint 21" },
    activity: [],
    capabilities: {
      status: {
        enabled: true,
        options: [{ id: "status::todo", label: "To do" }],
      },
      labels: {
        enabled: true,
        options: [{ id: "workflow::doing", label: "workflow::doing" }],
      },
      iteration: {
        enabled: false,
        reason: "Iteration editing is not available for this provider here yet.",
        options: [{ id: "iteration-1", label: "Sprint 21" }],
      },
      milestone: {
        enabled: false,
        options: [{ id: "milestone-1", label: "Platform sprint" }],
      },
      composer: {
        enabled: true,
        modes: ["write", "preview"],
        supportsQuickActions: true,
      },
      timeTracking: {
        enabled: true,
        supportsQuickActions: true,
      },
    },
    author: { name: "Cristhofer Pincetti", username: "cpincetti" },
    createdAt: "2026-04-19T09:30:00Z",
    updatedAt: "2026-04-19T10:00:00Z",
    status: { id: "status::todo", label: "To do" },
    statusOptions: [{ id: "status::todo", label: "To do" }],
    linkedItems: [
      {
        reference: { provider: "gitlab", issueId: "g/p#2" },
        key: "g/p#2",
        title: "Linked issue",
        relationLabel: "Related to",
        state: "opened",
        webUrl: "https://gitlab.example.com/g/p/-/issues/2",
        labels: [],
      },
    ],
    childItems: [
      {
        reference: { provider: "gitlab", issueId: "g/p#3" },
        key: "g/p#3",
        title: "Child issue",
        relationLabel: "Child item",
        state: "opened",
        webUrl: "https://gitlab.example.com/g/p/-/issues/3",
        labels: [],
      },
    ],
    ...overrides,
  } as unknown as IssueDetailsSnapshot;
}

describe("IssueHubPage", () => {
  const intersectionCallbacks: IntersectionObserverCallback[] = [];

  beforeEach(() => {
    invalidateIssueDetailsSessionCache();
    vi.spyOn(tauriModule, "loadIssueDetails").mockResolvedValue(createDetailsSnapshot());
    intersectionCallbacks.length = 0;
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn(function MockIntersectionObserver(callback: IntersectionObserverCallback) {
        intersectionCallbacks.push(callback);
        return {
          observe: vi.fn(),
          disconnect: vi.fn(),
          unobserve: vi.fn(),
          takeRecords: vi.fn(),
          root: null,
          rootMargin: "",
          thresholds: [],
        };
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads provider-backed issue details even when the issue is not in the bootstrap cache", async () => {
    render(
      <I18nProvider>
        <IssueHubPage
          payload={mockBootstrap}
          issueReference={{ provider: "gitlab", issueId: "g/p#1" }}
          syncVersion={0}
          onBack={vi.fn()}
          onRefreshBootstrap={vi.fn()}
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(tauriModule.loadIssueDetails).toHaveBeenCalledWith(
      "gitlab",
      "g/p#1",
      expect.any(Object),
    );
    });
    expect(screen.queryAllByRole("heading", { name: "Fix the thing" })).toHaveLength(1);
    expect(screen.getByText("g/p#1")).toBeInTheDocument();
    expect(screen.getAllByText("Open").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Open")[0]).toHaveClass(
      ...getAssignedIssueStateBadgeClassName("opened").split(" "),
    );
  });

  it("renders a skeleton while provider-backed details are being fetched", () => {
    const payload = {
      ...mockBootstrap,
      assignedIssues: [],
    };

    render(
      <I18nProvider>
        <IssueHubPage
          payload={payload}
          issueReference={{ provider: "gitlab", issueId: "g/p#999" }}
          syncVersion={0}
          onBack={vi.fn()}
          onRefreshBootstrap={vi.fn()}
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByTestId("issue-hub-skeleton")).toBeInTheDocument();
  });

  it("renders provider-backed workflow status and metadata", async () => {
    vi.spyOn(tauriModule, "loadIssueDetails").mockResolvedValue(createDetailsSnapshot());

    render(
      <I18nProvider>
        <IssueHubPage
          payload={mockBootstrap}
          issueReference={{ provider: "gitlab", issueId: "g/p#1" }}
          syncVersion={0}
          onBack={vi.fn()}
          onRefreshBootstrap={vi.fn()}
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(tauriModule.loadIssueDetails).toHaveBeenCalledWith(
      "gitlab",
      "g/p#1",
      expect.any(Object),
    );
    });
    expect(screen.getAllByText("workflow::doing")).toHaveLength(1);
    expect(screen.getAllByText("To do").length).toBeGreaterThan(0);
    expect(screen.getByText("Platform sprint")).toBeInTheDocument();
  });

  it("shows hub skeleton when issueReference changes after details were ready", async () => {
    let resolveSecond: (value: IssueDetailsSnapshot) => void;
    const secondPromise = new Promise<IssueDetailsSnapshot>((resolve) => {
      resolveSecond = resolve;
    });

    vi.spyOn(tauriModule, "loadIssueDetails").mockImplementation((_provider, issueId, _opts) => {
      if (issueId === "g/p#1") {
        return Promise.resolve(createDetailsSnapshot());
      }

      if (issueId === "g/p#2") {
        return secondPromise;
      }

      return Promise.reject(new Error(`unexpected issue ${issueId}`));
    });

    const { rerender } = render(
      <I18nProvider>
        <IssueHubPage
          payload={mockBootstrap}
          issueReference={{ provider: "gitlab", issueId: "g/p#1" }}
          syncVersion={0}
          onBack={vi.fn()}
          onRefreshBootstrap={vi.fn()}
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );

    await screen.findByRole("heading", { name: "Fix the thing" });

    rerender(
      <I18nProvider>
        <IssueHubPage
          payload={mockBootstrap}
          issueReference={{ provider: "gitlab", issueId: "g/p#2" }}
          syncVersion={0}
          onBack={vi.fn()}
          onRefreshBootstrap={vi.fn()}
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByTestId("issue-hub-skeleton")).toBeInTheDocument();

    await act(async () => {
      resolveSecond(
        createDetailsSnapshot({
          reference: {
            provider: "gitlab",
            issueId: "g/p#2",
            providerIssueRef: "gid://gitlab/Issue/99",
          },
          key: "g/p#2",
          title: "Second issue",
        }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByTestId("issue-hub-skeleton")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "Second issue" })).toBeInTheDocument();
  });

  it("keeps seeded metadata visible and shows refresh warning when live refresh fails", async () => {
    const issue = {
      provider: "gitlab",
      issueId: "g/p#1",
      providerIssueRef: "gid://gitlab/Issue/42",
      key: "g/p#1",
      title: "Fix the thing",
      state: "opened",
      labels: ["workflow::doing"],
      updatedAt: "2026-04-19T10:00:00Z",
    };
    const payload = {
      ...mockBootstrap,
      assignedIssues: [issue],
    };
    vi.spyOn(tauriModule, "loadIssueDetails").mockRejectedValue(new Error("refresh failed"));

    render(
      <I18nProvider>
        <IssueHubPage
          payload={payload}
          issueReference={{ provider: issue.provider, issueId: issue.issueId }}
          syncVersion={0}
          onBack={vi.fn()}
          onRefreshBootstrap={vi.fn()}
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getAllByText(issue.title).length).toBeGreaterThan(0);
    expect(screen.getByText(issue.key)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("refresh failed")).toBeInTheDocument();
    });
  });

  it("forwards related issue navigation from linked and child sections", async () => {
    const onOpenIssue = vi.fn();

    render(
      <I18nProvider>
        <IssueHubPage
          payload={mockBootstrap}
          issueReference={{ provider: "gitlab", issueId: "g/p#1" }}
          syncVersion={0}
          onBack={vi.fn()}
          onRefreshBootstrap={vi.fn()}
          onOpenIssue={onOpenIssue}
        />
      </I18nProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /linked issue/i }));
    fireEvent.click(screen.getByRole("button", { name: /child issue/i }));

    expect(onOpenIssue).toHaveBeenNthCalledWith(1, {
      provider: "gitlab",
      issueId: "g/p#2",
    });
    expect(onOpenIssue).toHaveBeenNthCalledWith(2, {
      provider: "gitlab",
      issueId: "g/p#3",
    });
  });

  it("reveals a condensed sticky issue bar after the main title block scrolls away", async () => {
    render(
      <I18nProvider>
        <IssueHubPage
          payload={mockBootstrap}
          issueReference={{ provider: "gitlab", issueId: "g/p#1" }}
          syncVersion={0}
          onBack={vi.fn()}
          onRefreshBootstrap={vi.fn()}
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );

    await screen.findByRole("heading", { name: "Fix the thing" });
    expect(screen.getByTestId("issue-sticky-bar")).toHaveAttribute("data-visible", "false");

    intersectionCallbacks[0]?.(
      [
        {
          isIntersecting: false,
          target: document.createElement("div"),
          intersectionRatio: 0,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: 0,
        },
      ],
      {} as IntersectionObserver,
    );

    await waitFor(() => {
      expect(screen.getByTestId("issue-sticky-bar")).toHaveAttribute("data-visible", "true");
    });
  });

  it("resets nearest scroll parent to top when issueReference changes", async () => {
    vi.mocked(tauriModule.loadIssueDetails).mockImplementation((_provider, issueId, _opts) =>
      issueId === "g/p#2"
        ? Promise.resolve(
            createDetailsSnapshot({
              reference: {
                provider: "gitlab",
                issueId: "g/p#2",
                providerIssueRef: "gid://gitlab/Issue/2",
              },
              key: "g/p#2",
              title: "Second issue",
            }),
          )
        : Promise.resolve(createDetailsSnapshot()),
    );

    const { rerender } = render(
      <div data-testid="scroll-host" style={{ height: 240, overflowY: "auto" }}>
        <I18nProvider>
          <IssueHubPage
            payload={mockBootstrap}
            issueReference={{ provider: "gitlab", issueId: "g/p#1" }}
            syncVersion={0}
            onBack={vi.fn()}
            onRefreshBootstrap={vi.fn()}
            onOpenIssue={vi.fn()}
          />
        </I18nProvider>
      </div>,
    );

    await screen.findByRole("heading", { name: "Fix the thing" });
    const scrollHost = screen.getByTestId("scroll-host");
    scrollHost.scrollTop = 160;
    expect(scrollHost.scrollTop).toBe(160);

    rerender(
      <div data-testid="scroll-host" style={{ height: 240, overflowY: "auto" }}>
        <I18nProvider>
          <IssueHubPage
            payload={mockBootstrap}
            issueReference={{ provider: "gitlab", issueId: "g/p#2" }}
            syncVersion={0}
            onBack={vi.fn()}
            onRefreshBootstrap={vi.fn()}
            onOpenIssue={vi.fn()}
          />
        </I18nProvider>
      </div>,
    );

    await waitFor(() => {
      expect(scrollHost.scrollTop).toBe(0);
    });
    await screen.findByRole("heading", { name: "Second issue" });
  });

  it("shows Edit description inside the actions menu and opens the editor in the main column", async () => {
    render(
      <I18nProvider>
        <IssueHubPage
          payload={mockBootstrap}
          issueReference={{ provider: "gitlab", issueId: "g/p#1" }}
          syncVersion={0}
          onBack={vi.fn()}
          onRefreshBootstrap={vi.fn()}
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(tauriModule.loadIssueDetails).toHaveBeenCalledWith(
      "gitlab",
      "g/p#1",
      expect.any(Object),
    );
    });

    const actionButtons = screen.getAllByRole("button", { name: /issue actions/i });
    fireEvent.click(actionButtons[actionButtons.length - 1]!);
    fireEvent.click(screen.getByRole("button", { name: /edit description/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/write the issue description/i)).toBeInTheDocument();
    });
  });

  it("opens delete confirmation dialog from issue actions menu", async () => {
    render(
      <I18nProvider>
        <IssueHubPage
          payload={mockBootstrap}
          issueReference={{ provider: "gitlab", issueId: "g/p#1" }}
          syncVersion={0}
          onBack={vi.fn()}
          onRefreshBootstrap={vi.fn()}
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(tauriModule.loadIssueDetails).toHaveBeenCalledWith(
      "gitlab",
      "g/p#1",
      expect.any(Object),
    );
    });

    fireEvent.click(screen.getAllByRole("button", { name: /issue actions/i })[0]!);
    fireEvent.click(screen.getByRole("button", { name: /delete issue/i }));

    expect(screen.getByRole("heading", { name: /delete issue\\?/i })).toBeInTheDocument();
  });
});
