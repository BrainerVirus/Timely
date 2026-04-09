import { act, renderHook } from "@testing-library/react";
import { useAssignedIssuesBoardController } from "@/features/issues/ui/AssignedIssuesBoard/internal/use-assigned-issues-board-controller";

import type { AssignedIssuesPage } from "@/shared/types/dashboard";

function createPage(overrides: Partial<AssignedIssuesPage> = {}): AssignedIssuesPage {
  return {
    items: [],
    suggestions: [],
    years: [],
    iterationCodes: [],
    iterations: [],
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

  it("resets page when the status tab changes", async () => {
    const loadPage = vi
      .fn()
      .mockResolvedValueOnce(
        createPage({
          page: 1,
          pageSize: 10,
          totalItems: 32,
          totalPages: 4,
        }),
      )
      .mockResolvedValue(
        createPage({
          page: 3,
          pageSize: 10,
          totalItems: 32,
          totalPages: 4,
        }),
      )
      .mockResolvedValue(
        createPage({
          page: 1,
          pageSize: 10,
          totalItems: 5,
          totalPages: 1,
        }),
      );

    const { result } = renderHook(() => useAssignedIssuesBoardController({ loadPage }));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.goToPage(3);
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
      page: 1,
      status: "closed",
    });
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

  it("resets pagination when a filter changes", async () => {
    const loadPage = vi
      .fn()
      .mockResolvedValueOnce(
        createPage({
          page: 1,
          pageSize: 10,
          totalItems: 23,
          totalPages: 3,
        }),
      )
      .mockResolvedValue(createPage());

    const { result } = renderHook(() => useAssignedIssuesBoardController({ loadPage }));

    await act(async () => {
      await Promise.resolve();
    });
    expect(loadPage).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.goToNextPage();
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(loadPage).toHaveBeenCalledTimes(2);
    expect(loadPage.mock.lastCall?.[0]).toMatchObject({ page: 2 });

    act(() => {
      result.current.setYear("2026");
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(loadPage).toHaveBeenCalledTimes(3);
    expect(loadPage.mock.lastCall?.[0]).toMatchObject({ page: 1, year: "2026" });
  });

  it("selecting a code resets page 1 and clears an invalid selected week", async () => {
    const initialPage = createPage({
      iterationCodes: [
        { id: "WEB", label: "WEB", issueCount: 4, hasCurrentIteration: true },
        { id: "CCP", label: "CCP", issueCount: 2, hasCurrentIteration: true },
      ],
      iterations: [
        {
          id: "web-current",
          code: "WEB",
          rangeLabel: "Apr 6 - 19, 2026",
          fullLabel: "WEB · Apr 6 - 19, 2026",
          year: "2026",
          startDate: "2026-04-06",
          dueDate: "2026-04-19",
          isCurrent: true,
          issueCount: 4,
        },
        {
          id: "ccp-current",
          code: "CCP",
          rangeLabel: "Apr 6 - 19, 2026",
          fullLabel: "CCP · Apr 6 - 19, 2026",
          year: "2026",
          startDate: "2026-04-06",
          dueDate: "2026-04-19",
          isCurrent: true,
          issueCount: 2,
        },
      ],
      totalItems: 23,
      totalPages: 3,
    });
    const loadPage = vi.fn().mockResolvedValue(initialPage);

    const { result } = renderHook(() => useAssignedIssuesBoardController({ loadPage }));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setIterationId("web-current");
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.goToPage(2);
      result.current.setIterationCode("CCP");
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadPage.mock.lastCall?.[0]).toMatchObject({
      page: 1,
      iterationCode: "CCP",
      iterationId: "ccp-current",
    });
  });

  it("auto-selects the current week only within the selected code", async () => {
    const page = createPage({
      iterationCodes: [
        { id: "WEB", label: "WEB", issueCount: 4, hasCurrentIteration: true },
        { id: "CCP", label: "CCP", issueCount: 2, hasCurrentIteration: true },
      ],
      iterations: [
        {
          id: "web-current",
          code: "WEB",
          rangeLabel: "Apr 6 - 19, 2026",
          fullLabel: "WEB · Apr 6 - 19, 2026",
          year: "2026",
          startDate: "2026-04-06",
          dueDate: "2026-04-19",
          isCurrent: true,
          issueCount: 4,
        },
        {
          id: "ccp-current",
          code: "CCP",
          rangeLabel: "Apr 6 - 19, 2026",
          fullLabel: "CCP · Apr 6 - 19, 2026",
          year: "2026",
          startDate: "2026-04-06",
          dueDate: "2026-04-19",
          isCurrent: true,
          issueCount: 2,
        },
      ],
    });
    const loadPage = vi.fn().mockResolvedValue(page);
    const { result } = renderHook(() => useAssignedIssuesBoardController({ loadPage }));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setIterationCode("WEB");
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadPage.mock.lastCall?.[0]).toMatchObject({
      iterationCode: "WEB",
      iterationId: "web-current",
    });
  });

  it("auto-selects the current open week when there is only one match", async () => {
    const loadPage = vi.fn().mockResolvedValue(
      createPage({
        iterationCodes: [{ id: "WEB", label: "WEB", issueCount: 4, hasCurrentIteration: true }],
        iterations: [
          {
            id: "iter-current",
            code: "WEB",
            rangeLabel: "Apr 6 - 19, 2026",
            fullLabel: "WEB · Apr 6 - 19, 2026",
            year: "2026",
            startDate: "2026-04-06",
            dueDate: "2026-04-19",
            isCurrent: true,
            issueCount: 4,
          },
        ],
      }),
    );

    renderHook(() => useAssignedIssuesBoardController({ loadPage }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadPage).toHaveBeenCalledTimes(2);
    expect(loadPage.mock.lastCall?.[0]).toMatchObject({
      iterationCode: "WEB",
      iterationId: "iter-current",
      year: "2026",
      page: 1,
      status: "opened",
    });
  });

  it("leaves code and week unset when multiple current weeks exist", async () => {
    const loadPage = vi.fn().mockResolvedValue(
      createPage({
        iterationCodes: [
          { id: "WEB", label: "WEB", issueCount: 4, hasCurrentIteration: true },
          { id: "CCP", label: "CCP", issueCount: 2, hasCurrentIteration: true },
        ],
        iterations: [
          {
            id: "iter-web-current",
            code: "WEB",
            rangeLabel: "Apr 6 - 19, 2026",
            fullLabel: "WEB · Apr 6 - 19, 2026",
            year: "2026",
            startDate: "2026-04-06",
            dueDate: "2026-04-19",
            isCurrent: true,
            issueCount: 4,
          },
          {
            id: "iter-ccp-current",
            code: "CCP",
            rangeLabel: "Apr 6 - 19, 2026",
            fullLabel: "CCP · Apr 6 - 19, 2026",
            year: "2026",
            startDate: "2026-04-06",
            dueDate: "2026-04-19",
            isCurrent: true,
            issueCount: 2,
          },
        ],
      }),
    );

    renderHook(() => useAssignedIssuesBoardController({ loadPage }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadPage).toHaveBeenCalledTimes(1);
    expect(loadPage).toHaveBeenCalledWith(
      expect.objectContaining({
        iterationCode: undefined,
        iterationId: undefined,
        page: 1,
        status: "opened",
      }),
    );
  });

  it("clears the selected iteration when the chosen year no longer matches it", async () => {
    const page2026 = createPage({
      years: ["2026", "2025"],
      iterations: [
        {
          id: "iter-current",
          code: "WEB",
          rangeLabel: "Apr 6 - 19, 2026",
          fullLabel: "WEB · Apr 6 - 19, 2026",
          year: "2026",
          startDate: "2026-04-06",
          dueDate: "2026-04-19",
          isCurrent: true,
          issueCount: 4,
        },
      ],
    });
    const page2025 = createPage({
      years: ["2026", "2025"],
      iterations: [
        {
          id: "iter-old",
          code: "WEB",
          rangeLabel: "Mar 10 - 23, 2025",
          fullLabel: "WEB · Mar 10 - 23, 2025",
          year: "2025",
          startDate: "2025-03-10",
          dueDate: "2025-03-23",
          isCurrent: false,
          issueCount: 2,
        },
      ],
    });
    const loadPage = vi
      .fn()
      .mockResolvedValueOnce(page2026)
      .mockResolvedValueOnce(page2026)
      .mockResolvedValueOnce(page2025);

    const { result } = renderHook(() => useAssignedIssuesBoardController({ loadPage }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      result.current.setYear("2025");
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadPage.mock.lastCall?.[0]).toMatchObject({
      page: 1,
      year: "2025",
      iterationId: undefined,
    });
  });

  it("resets to the first page when page size changes", async () => {
    const loadPage = vi
      .fn()
      .mockResolvedValueOnce(
        createPage({
          page: 1,
          pageSize: 10,
          totalItems: 47,
          totalPages: 5,
        }),
      )
      .mockResolvedValue(
        createPage({
          page: 3,
          pageSize: 10,
          totalItems: 47,
          totalPages: 5,
        }),
      )
      .mockResolvedValue(createPage());

    const { result } = renderHook(() => useAssignedIssuesBoardController({ loadPage }));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.goToPage(3);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadPage.mock.lastCall?.[0]).toMatchObject({
      page: 3,
      pageSize: 10,
    });

    act(() => {
      result.current.setPageSize(20);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadPage.mock.lastCall?.[0]).toMatchObject({
      page: 1,
      pageSize: 20,
    });
  });
});
