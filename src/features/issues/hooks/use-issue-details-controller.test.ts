import { act, renderHook, waitFor } from "@testing-library/react";
import { useIssueDetailsController } from "@/features/issues/hooks/use-issue-details-controller";
import * as issueDetailsCacheModule from "@/features/issues/lib/issue-details-session-cache";

import type { IssueDetailsSnapshot } from "@/shared/types/dashboard";

vi.mock("@/features/issues/lib/issue-details-session-cache", () => ({
  loadOrRevalidateIssueDetails: vi.fn(),
  setCachedIssueDetails: vi.fn(),
}));

vi.mock("@/app/desktop/TauriService/tauri", () => ({
  createIssueComment: vi.fn(),
  deleteIssue: vi.fn(),
  deleteIssueComment: vi.fn(),
  loadIssueDetails: vi.fn(),
  loadIssueActivityPage: vi.fn(),
  logIssueTime: vi.fn(),
  updateIssueComment: vi.fn(),
  updateIssueMetadata: vi.fn(),
}));

function snapshotForIssue(issueId: string): IssueDetailsSnapshot {
  return {
    reference: {
      provider: "gitlab",
      issueId,
      providerIssueRef: `gid://gitlab/Issue/${issueId}`,
    },
    key: issueId,
    title: `Issue ${issueId}`,
    state: "opened",
    description: "",
    labels: [],
    activity: [],
    capabilities: {
      status: { enabled: false, options: [] },
      labels: { enabled: false, options: [] },
      iteration: { enabled: false, reason: "", options: [] },
      milestone: { enabled: false, options: [] },
      composer: { enabled: true, modes: ["write"], supportsQuickActions: false },
      timeTracking: { enabled: false, supportsQuickActions: false },
    },
  } as unknown as IssueDetailsSnapshot;
}

describe("useIssueDetailsController", () => {
  beforeEach(() => {
    vi.mocked(issueDetailsCacheModule.loadOrRevalidateIssueDetails).mockReset();
  });

  it("sets loadState to loading when issueReference changes away from the ready snapshot", async () => {
    let resolveSecond: (value: IssueDetailsSnapshot) => void;
    const secondLoad = new Promise<IssueDetailsSnapshot>((resolve) => {
      resolveSecond = resolve;
    });

    vi.mocked(issueDetailsCacheModule.loadOrRevalidateIssueDetails).mockImplementation(
      async (reference) => {
        const issueId = reference.issueId;
        if (issueId === "g/p#a") {
          return { snapshot: snapshotForIssue("g/p#a"), source: "hub" };
        }

        if (issueId === "g/p#b") {
          return { snapshot: await secondLoad, source: "hub" };
        }

        return Promise.reject(new Error(`unexpected issue ${issueId}`));
      },
    );

    const { result, rerender } = renderHook(
      ({ issueId }: { issueId: string }) =>
        useIssueDetailsController({
          issueReference: { provider: "gitlab", issueId },
          syncVersion: 0,
        }),
      { initialProps: { issueId: "g/p#a" } },
    );

    await waitFor(() => {
      expect(result.current.loadState.status).toBe("ready");
    });

    rerender({ issueId: "g/p#b" });

    await waitFor(() => {
      expect(result.current.loadState.status).toBe("loading");
    });

    await act(async () => {
      resolveSecond(snapshotForIssue("g/p#b"));
    });

    await waitFor(() => {
      expect(result.current.loadState).toEqual(
        expect.objectContaining({
          status: "ready",
          details: expect.objectContaining({
            reference: expect.objectContaining({ issueId: "g/p#b" }),
          }),
        }),
      );
    });
  });

  it("keeps ready loadState when refreshDetails refetches the same issue", async () => {
    vi.mocked(issueDetailsCacheModule.loadOrRevalidateIssueDetails).mockResolvedValue({
      snapshot: snapshotForIssue("g/p#x"),
      source: "hub",
    });

    const { result } = renderHook(() =>
      useIssueDetailsController({
        issueReference: { provider: "gitlab", issueId: "g/p#x" },
        syncVersion: 0,
      }),
    );

    await waitFor(() => {
      expect(result.current.loadState.status).toBe("ready");
    });

    await act(async () => {
      await result.current.refreshDetails();
    });

    expect(result.current.loadState.status).toBe("ready");
    expect(issueDetailsCacheModule.loadOrRevalidateIssueDetails).toHaveBeenCalledTimes(2);
  });

  it("reseeds immediately when route changes with a cached snapshot", async () => {
    const first = snapshotForIssue("g/p#a");
    const second = snapshotForIssue("g/p#b");
    let resolveSecond: (value: { snapshot: IssueDetailsSnapshot; source: "hub" }) => void;
    const pendingSecond = new Promise<{ snapshot: IssueDetailsSnapshot; source: "hub" }>(
      (resolve) => {
        resolveSecond = resolve;
      },
    );

    vi.mocked(issueDetailsCacheModule.loadOrRevalidateIssueDetails).mockImplementation(
      async (reference) => {
        if (reference.issueId === "g/p#a") {
          return { snapshot: first, source: "hub" };
        }

        if (reference.issueId === "g/p#b") {
          return pendingSecond;
        }

        throw new Error(`unexpected issue ${reference.issueId}`);
      },
    );

    const { result, rerender } = renderHook(
      ({ issueId, initialSnapshot }: { issueId: string; initialSnapshot?: IssueDetailsSnapshot }) =>
        useIssueDetailsController({
          issueReference: { provider: "gitlab", issueId },
          initialSnapshot,
          syncVersion: 0,
        }),
      {
        initialProps: {
          issueId: "g/p#a",
          initialSnapshot: first,
        },
      },
    );

    await waitFor(() => {
      expect(result.current.loadState).toEqual({
        status: "ready",
        details: expect.objectContaining({
          reference: expect.objectContaining({ issueId: "g/p#a" }),
        }),
      });
    });

    rerender({
      issueId: "g/p#b",
      initialSnapshot: second,
    });

    expect(result.current.loadState).toEqual({
      status: "ready",
      details: expect.objectContaining({
        reference: expect.objectContaining({ issueId: "g/p#b" }),
      }),
    });

    await act(async () => {
      resolveSecond({ snapshot: second, source: "hub" });
    });
  });
});
