import { act, renderHook, waitFor } from "@testing-library/react";
import * as tauriModule from "@/app/desktop/TauriService/tauri";
import { useIssueDetailsController } from "@/features/issues/hooks/use-issue-details-controller";

import type { IssueDetailsSnapshot } from "@/shared/types/dashboard";

vi.mock("@/app/desktop/TauriService/tauri", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/desktop/TauriService/tauri")>();
  return {
    ...actual,
    loadIssueDetails: vi.fn(),
  };
});

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
    vi.mocked(tauriModule.loadIssueDetails).mockReset();
  });

  it("sets loadState to loading when issueReference changes away from the ready snapshot", async () => {
    let resolveSecond: (value: IssueDetailsSnapshot) => void;
    const secondLoad = new Promise<IssueDetailsSnapshot>((resolve) => {
      resolveSecond = resolve;
    });

    vi.mocked(tauriModule.loadIssueDetails).mockImplementation((_provider, issueId) => {
      if (issueId === "g/p#a") {
        return Promise.resolve(snapshotForIssue("g/p#a"));
      }

      if (issueId === "g/p#b") {
        return secondLoad;
      }

      return Promise.reject(new Error(`unexpected issue ${issueId}`));
    });

    const { result, rerender } = renderHook(
      ({ issueId }: { issueId: string }) =>
        useIssueDetailsController({
          issueReference: { provider: "gitlab", issueId },
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
    vi.mocked(tauriModule.loadIssueDetails).mockResolvedValue(snapshotForIssue("g/p#x"));

    const { result } = renderHook(() =>
      useIssueDetailsController({
        issueReference: { provider: "gitlab", issueId: "g/p#x" },
      }),
    );

    await waitFor(() => {
      expect(result.current.loadState.status).toBe("ready");
    });

    await act(async () => {
      await result.current.refreshDetails();
    });

    expect(result.current.loadState.status).toBe("ready");
    expect(tauriModule.loadIssueDetails).toHaveBeenCalledTimes(2);
  });
});
