import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as tauriModule from "@/app/desktop/TauriService/tauri";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
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
    openExternalUrl: vi.fn(),
  };
});

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
          onBack={vi.fn()}
          onRefreshBootstrap={vi.fn()}
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(tauriModule.loadIssueDetails).toHaveBeenCalledWith("gitlab", "g/p#1");
    });
    expect(screen.queryAllByRole("heading", { name: "Fix the thing" })).toHaveLength(1);
    expect(screen.getByText("g/p#1")).toBeInTheDocument();
    expect(screen.getAllByText("Open").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Open")[0]).toHaveClass(
      ...getAssignedIssueStateBadgeClassName("opened").split(" "),
    );
  });

  it("renders the loading state while provider-backed details are being fetched", () => {
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
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(/loading issue details/i)).toBeInTheDocument();
  });

  it("renders provider-backed workflow status and metadata", async () => {
    vi.spyOn(tauriModule, "loadIssueDetails").mockResolvedValue(createDetailsSnapshot());

    render(
      <I18nProvider>
        <IssueHubPage
          payload={mockBootstrap}
          issueReference={{ provider: "gitlab", issueId: "g/p#1" }}
          onBack={vi.fn()}
          onRefreshBootstrap={vi.fn()}
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(tauriModule.loadIssueDetails).toHaveBeenCalledWith("gitlab", "g/p#1");
    });
    expect(screen.getAllByText("workflow::doing")).toHaveLength(1);
    expect(screen.getAllByText("To do").length).toBeGreaterThan(0);
    expect(screen.getByText("Platform sprint")).toBeInTheDocument();
  });

  it("forwards related issue navigation from linked and child sections", async () => {
    const onOpenIssue = vi.fn();

    render(
      <I18nProvider>
        <IssueHubPage
          payload={mockBootstrap}
          issueReference={{ provider: "gitlab", issueId: "g/p#1" }}
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
});
