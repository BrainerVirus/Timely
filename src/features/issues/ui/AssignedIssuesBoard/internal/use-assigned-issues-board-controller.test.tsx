import { act, renderHook } from "@testing-library/react";
import { useAssignedIssuesBoardController } from "@/features/issues/ui/AssignedIssuesBoard/internal/use-assigned-issues-board-controller";

import type { AssignedIssueSnapshot, AssignedIssuesPage } from "@/shared/types/dashboard";

function createPage(overrides: Partial<AssignedIssuesPage> = {}): AssignedIssuesPage {
  return {
    items: [],
    suggestions: [],
    years: [],
    iterationOptions: [],
    catalogState: "ready",
    catalogMessage: undefined,
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
    ...(overrides as object),
  } as AssignedIssuesPage;
}

function createIssue(key: string, state: AssignedIssueSnapshot["state"]): AssignedIssueSnapshot {
  return {
    provider: "gitlab",
    issueId: key,
    providerIssueRef: `gid://gitlab/Issue/${key}`,
    key,
    title: key,
    state,
    labels: [],
    milestoneTitle: undefined,
  };
}

function createDeferredPage() {
  let resolve!: (value: AssignedIssuesPage) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<AssignedIssuesPage>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

describe("useAssignedIssuesBoardController", () => {
  it("loads the board in open-only mode by default", async () => {
    const loadPage = vi.fn().mockResolvedValue(createPage());

    renderHook(() => useAssignedIssuesBoardController({ loadPage }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadPage).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 10,
        status: "opened",
      }),
    );
  });

  it("debounces search before reloading", async () => {
    const loadPage = vi.fn().mockResolvedValue(createPage());

    const { result } = renderHook(() => useAssignedIssuesBoardController({ loadPage }));

    await act(async () => {
      await Promise.resolve();
    });
    expect(loadPage).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.setSearchInput("timely");
    });

    expect(result.current.searchInput).toBe("timely");
    expect(result.current.appliedSearchValue).toBe("");

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    });
    expect(loadPage).toHaveBeenCalledTimes(1);
    expect(result.current.appliedSearchValue).toBe("");

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 200));
      await Promise.resolve();
    });

    expect(loadPage).toHaveBeenCalledTimes(2);
    expect(result.current.appliedSearchValue).toBe("timely");
    expect(loadPage.mock.lastCall?.[0]).toMatchObject({ search: "timely" });
  });

  it("auto-selects the current iteration when exactly one visible option is current", async () => {
    const page = createPage({
      iterationOptions: [
        {
          id: "web-current",
          label: "WEB · Apr 6 - 19, 2026",
          badge: "WEB",
          searchText: "web current apr 6",
          year: "2026",
          startDate: "2026-04-06",
          dueDate: "2026-04-19",
          isCurrent: true,
          issueCount: 4,
        },
        {
          id: "web-next",
          label: "WEB · Apr 20 - May 3, 2026",
          badge: "WEB",
          searchText: "web apr 20",
          year: "2026",
          startDate: "2026-04-20",
          dueDate: "2026-05-03",
          isCurrent: false,
          issueCount: 2,
        },
      ],
    });
    const loadPage = vi.fn().mockResolvedValue(page);

    renderHook(() => useAssignedIssuesBoardController({ loadPage }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadPage.mock.lastCall?.[0]).toMatchObject({
      iterationId: "web-current",
      year: "2026",
    });
  });

  it("clears the selected iteration when the chosen year no longer matches it", async () => {
    const loadPage = vi.fn().mockResolvedValue(
      createPage({
        iterationOptions: [
          {
            id: "web-current",
            label: "WEB · Apr 6 - 19, 2026",
            badge: "WEB",
            searchText: "web current apr 6",
            year: "2026",
            startDate: "2026-04-06",
            dueDate: "2026-04-19",
            isCurrent: true,
            issueCount: 4,
          },
          {
            id: "web-2025",
            label: "WEB · Mar 10 - 23, 2025",
            badge: "WEB",
            searchText: "web mar 10",
            year: "2025",
            startDate: "2025-03-10",
            dueDate: "2025-03-23",
            isCurrent: false,
            issueCount: 2,
          },
        ],
      }),
    );

    const { result } = renderHook(() => useAssignedIssuesBoardController({ loadPage }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      result.current.setIterationId("web-current");
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setYear("2025");
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadPage.mock.lastCall?.[0]).toMatchObject({
      year: "2025",
      iterationId: undefined,
    });
  });

  it("passes only iterationId for merged iteration filtering", async () => {
    const loadPage = vi.fn().mockResolvedValue(
      createPage({
        iterationOptions: [
          {
            id: "web-current",
            label: "WEB · Apr 6 - 19, 2026",
            badge: "WEB",
            searchText: "web current apr 6",
            year: "2026",
            startDate: "2026-04-06",
            dueDate: "2026-04-19",
            isCurrent: true,
            issueCount: 4,
          },
        ],
      }),
    );

    const { result } = renderHook(() => useAssignedIssuesBoardController({ loadPage }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      result.current.setIterationId("web-current");
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadPage.mock.lastCall?.[0]).toMatchObject({
      iterationId: "web-current",
    });
    expect(loadPage.mock.lastCall?.[0]).not.toHaveProperty("iterationCode");
  });

  it("keeps year and iteration remembered per status tab", async () => {
    const openedPage = createPage({
      years: ["2026"],
      iterationOptions: [
        {
          id: "web-open",
          label: "WEB · Apr 6 - 19, 2026",
          badge: "WEB",
          searchText: "web apr 6",
          year: "2026",
          startDate: "2026-04-06",
          dueDate: "2026-04-19",
          isCurrent: false,
          issueCount: 2,
        },
      ],
    });
    const closedPage = createPage({
      years: ["2025"],
      iterationOptions: [
        {
          id: "web-closed",
          label: "WEB · Mar 23 - Apr 5, 2026",
          badge: "WEB",
          searchText: "web mar 23",
          year: "2025",
          startDate: "2025-03-23",
          dueDate: "2025-04-05",
          isCurrent: false,
          issueCount: 3,
        },
      ],
    });
    const loadPage = vi.fn().mockImplementation((input) => {
      if (input.status === "closed") {
        return Promise.resolve(closedPage);
      }
      return Promise.resolve(openedPage);
    });

    const { result } = renderHook(() => useAssignedIssuesBoardController({ loadPage }));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setYear("2026");
      result.current.setIterationId("web-open");
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setStatus("closed");
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadPage.mock.lastCall?.[0]).toMatchObject({
      status: "closed",
      year: undefined,
      iterationId: undefined,
    });

    act(() => {
      result.current.setYear("2025");
      result.current.setIterationId("web-closed");
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setStatus("opened");
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadPage.mock.lastCall?.[0]).toMatchObject({
      status: "opened",
      year: "2026",
      iterationId: "web-open",
    });
  });

  it("clears invalid saved filters when tab data no longer contains them", async () => {
    const loadPage = vi
      .fn()
      .mockResolvedValueOnce(
        createPage({
          years: ["2026"],
          iterationOptions: [
            {
              id: "web-current",
              label: "WEB · Apr 6 - 19, 2026",
              badge: "WEB",
              searchText: "web current apr 6",
              year: "2026",
              startDate: "2026-04-06",
              dueDate: "2026-04-19",
              isCurrent: false,
              issueCount: 4,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        createPage({
          years: ["2025"],
          iterationOptions: [],
        }),
      )
      .mockResolvedValue(createPage({ years: ["2025"], iterationOptions: [] }));

    const { result } = renderHook(() => useAssignedIssuesBoardController({ loadPage }));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setYear("2026");
      result.current.setIterationId("web-current");
      result.current.setStatus("closed");
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadPage.mock.lastCall?.[0]).toMatchObject({
      status: "closed",
      year: undefined,
      iterationId: undefined,
    });
  });

  it("keeps issues empty while switching from all to closed until closed data arrives", async () => {
    const openedRequest = createDeferredPage();
    const allRequest = createDeferredPage();
    const closedRequest = createDeferredPage();
    const loadPage = vi.fn((input) => {
      if (input.status === "all") {
        return allRequest.promise;
      }
      if (input.status === "closed") {
        return closedRequest.promise;
      }
      return openedRequest.promise;
    });

    const { result } = renderHook(() => useAssignedIssuesBoardController({ loadPage }));

    await act(async () => {
      openedRequest.resolve(
        createPage({
          items: [createIssue("opened-1", "opened")],
          totalItems: 1,
        }),
      );
      await Promise.resolve();
    });

    expect(result.current.issues.map((issue) => issue.key)).toEqual(["opened-1"]);

    act(() => {
      result.current.setStatus("all");
    });

    expect(result.current.status).toBe("all");
    expect(result.current.issues).toEqual([]);

    act(() => {
      result.current.setStatus("closed");
    });

    expect(result.current.status).toBe("closed");
    expect(result.current.issues).toEqual([]);

    await act(async () => {
      allRequest.resolve(
        createPage({
          items: [createIssue("all-1", "opened"), createIssue("all-2", "closed")],
          totalItems: 2,
        }),
      );
      await Promise.resolve();
    });

    expect(result.current.status).toBe("closed");
    expect(result.current.issues).toEqual([]);

    await act(async () => {
      closedRequest.resolve(
        createPage({
          items: [createIssue("closed-1", "closed")],
          totalItems: 1,
        }),
      );
      await Promise.resolve();
    });

    expect(result.current.issues.map((issue) => issue.key)).toEqual(["closed-1"]);
  });

  it("ignores a late closed response after switching back to opened", async () => {
    const initialOpenedRequest = createDeferredPage();
    const closedRequest = createDeferredPage();
    const reopenedRequest = createDeferredPage();
    let openedCallCount = 0;
    const loadPage = vi.fn((input) => {
      if (input.status === "closed") {
        return closedRequest.promise;
      }
      openedCallCount += 1;
      return openedCallCount === 1 ? initialOpenedRequest.promise : reopenedRequest.promise;
    });

    const { result } = renderHook(() => useAssignedIssuesBoardController({ loadPage }));

    await act(async () => {
      initialOpenedRequest.resolve(
        createPage({
          items: [createIssue("opened-initial", "opened")],
          totalItems: 1,
        }),
      );
      await Promise.resolve();
    });

    expect(result.current.issues.map((issue) => issue.key)).toEqual(["opened-initial"]);

    act(() => {
      result.current.setStatus("closed");
    });

    expect(result.current.status).toBe("closed");
    expect(result.current.issues).toEqual([]);

    act(() => {
      result.current.setStatus("opened");
    });

    expect(result.current.status).toBe("opened");
    expect(result.current.issues).toEqual([]);

    await act(async () => {
      closedRequest.resolve(
        createPage({
          items: [createIssue("closed-late", "closed")],
          totalItems: 1,
        }),
      );
      await Promise.resolve();
    });

    expect(result.current.status).toBe("opened");
    expect(result.current.issues).toEqual([]);

    await act(async () => {
      reopenedRequest.resolve(
        createPage({
          items: [createIssue("opened-final", "opened")],
          totalItems: 1,
        }),
      );
      await Promise.resolve();
    });

    expect(result.current.issues.map((issue) => issue.key)).toEqual(["opened-final"]);
  });
});
