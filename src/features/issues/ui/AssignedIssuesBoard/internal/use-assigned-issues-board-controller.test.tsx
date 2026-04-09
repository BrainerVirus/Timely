import { act, renderHook } from "@testing-library/react";
import { useAssignedIssuesBoardController } from "@/features/issues/ui/AssignedIssuesBoard/internal/use-assigned-issues-board-controller";

import type { AssignedIssuesPage } from "@/shared/types/dashboard";

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

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    });
    expect(loadPage).toHaveBeenCalledTimes(1);

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 200));
      await Promise.resolve();
    });

    expect(loadPage).toHaveBeenCalledTimes(2);
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
});
