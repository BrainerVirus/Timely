import { act, renderHook } from "@testing-library/react";
import { useAssignedIssuesBoardController } from "@/features/issues/ui/AssignedIssuesBoard/internal/use-assigned-issues-board-controller";

import type { AssignedIssuesPage } from "@/shared/types/dashboard";

const emptyPage: AssignedIssuesPage = {
  items: [],
  hasNextPage: false,
  endCursor: undefined,
  suggestions: [],
};

describe("useAssignedIssuesBoardController", () => {
  it("debounces search before reloading", async () => {
    const loadPage = vi.fn().mockResolvedValue(emptyPage);

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
      .mockResolvedValueOnce({
        items: [],
        hasNextPage: true,
        endCursor: "next-cursor",
        suggestions: [],
      })
      .mockResolvedValue(emptyPage);

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
    expect(loadPage.mock.lastCall?.[0]).toMatchObject({ cursor: "next-cursor" });

    act(() => {
      result.current.setStatus("closed");
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(loadPage).toHaveBeenCalledTimes(3);
    expect(loadPage.mock.lastCall?.[0]).toMatchObject({ cursor: undefined, status: "closed" });
  });
});
