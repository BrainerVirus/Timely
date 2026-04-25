import * as tauriModule from "@/app/desktop/TauriService/tauri";
import {
  getIssueDetailsSeed,
  invalidateIssueDetailsSessionCache,
  loadOrRevalidateIssueDetails,
  prefetchIssueDetailsIntent,
} from "@/features/issues/lib/issue-details-session-cache";

import type { AssignedIssueSnapshot, IssueDetailsSnapshot } from "@/shared/types/dashboard";

vi.mock("@/app/desktop/TauriService/tauri", () => ({
  loadIssueDetails: vi.fn(),
  loadIssueActivityPage: vi.fn(),
}));

function createFullSnapshot(
  issueId: string,
  overrides: Partial<IssueDetailsSnapshot> = {},
): IssueDetailsSnapshot {
  return {
    reference: {
      provider: "gitlab",
      issueId,
      providerIssueRef: `gid://gitlab/Issue/${issueId}`,
    },
    key: issueId,
    title: `Issue ${issueId}`,
    state: "opened",
    description: "Loaded from API",
    labels: [],
    activity: [],
    capabilities: {
      status: { enabled: false, options: [] },
      labels: { enabled: true, options: [] },
      iteration: { enabled: false, options: [] },
      milestone: { enabled: false, options: [] },
      composer: { enabled: true, modes: ["write", "preview"], supportsQuickActions: true },
      timeTracking: { enabled: true, supportsQuickActions: true },
    },
    ...overrides,
  };
}

function createAssignedIssue(issueId: string, updatedAt?: string): AssignedIssueSnapshot {
  return {
    provider: "gitlab",
    issueId,
    providerIssueRef: `gid://gitlab/Issue/${issueId}`,
    key: issueId,
    title: `Issue ${issueId}`,
    state: "opened",
    labels: ["workflow::doing"],
    updatedAt,
  };
}

describe("issue-details-session-cache", () => {
  beforeEach(() => {
    invalidateIssueDetailsSessionCache();
    vi.mocked(tauriModule.loadIssueDetails).mockReset();
    vi.mocked(tauriModule.loadIssueActivityPage).mockReset();
  });

  it("dedupes hover prefetch and hub open for same issue", async () => {
    let resolveLoad!: (value: IssueDetailsSnapshot) => void;
    const pendingLoad = new Promise<IssueDetailsSnapshot>((resolve) => {
      resolveLoad = resolve;
    });
    vi.mocked(tauriModule.loadIssueDetails).mockReturnValue(pendingLoad);

    const reference = { provider: "gitlab", issueId: "g/p#1" };
    const assigned = [createAssignedIssue("g/p#1")];

    const prefetchPromise = prefetchIssueDetailsIntent(reference, {
      syncVersion: 4,
      assignedIssues: assigned,
    });
    const openPromise = loadOrRevalidateIssueDetails(reference, {
      syncVersion: 4,
      assignedIssues: assigned,
    });

    expect(tauriModule.loadIssueDetails).toHaveBeenCalledTimes(1);

    resolveLoad(createFullSnapshot("g/p#1"));
    await expect(prefetchPromise).resolves.toBeUndefined();
    await expect(openPromise).resolves.toEqual(
      expect.objectContaining({
        snapshot: expect.objectContaining({ key: "g/p#1" }),
      }),
    );
  });

  it("uses matching assigned issue updatedAt to skip primary issue GET on reopen", async () => {
    const snapshot = createFullSnapshot("g/p#1", {
      issueEtag: '"etag-1"',
      updatedAt: "2026-04-20T10:00:00Z",
    });
    vi.mocked(tauriModule.loadIssueDetails).mockResolvedValue(snapshot);
    vi.mocked(tauriModule.loadIssueActivityPage).mockResolvedValue({
      items: [
        {
          id: "note-1",
          type: "comment",
          body: "Fresh note",
          createdAt: "2026-04-20T10:01:00Z",
          system: false,
        },
      ],
      hasNextPage: false,
      nextPage: undefined,
    });

    const reference = { provider: "gitlab", issueId: "g/p#1" };
    const assigned = [createAssignedIssue("g/p#1", "2026-04-20T10:00:00Z")];

    await loadOrRevalidateIssueDetails(reference, {
      syncVersion: 1,
      assignedIssues: assigned,
    });
    vi.mocked(tauriModule.loadIssueDetails).mockClear();

    const result = await loadOrRevalidateIssueDetails(reference, {
      syncVersion: 1,
      assignedIssues: assigned,
    });

    expect(tauriModule.loadIssueDetails).not.toHaveBeenCalled();
    expect(tauriModule.loadIssueActivityPage).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: expect.objectContaining({ issueId: "g/p#1", provider: "gitlab" }),
        page: 1,
      }),
    );
    expect(result.snapshot.activity).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "note-1" })]),
    );
  });

  it("returns optimistic seed when full cache missing", () => {
    const seed = getIssueDetailsSeed(
      { provider: "gitlab", issueId: "g/p#1" },
      {
        syncVersion: 1,
        assignedIssues: [createAssignedIssue("g/p#1", "2026-04-20T10:00:00Z")],
      },
    );

    expect(seed.snapshot).toEqual(
      expect.objectContaining({
        key: "g/p#1",
        title: "Issue g/p#1",
      }),
    );
    expect(seed.source).toBe("optimistic");
  });
});
