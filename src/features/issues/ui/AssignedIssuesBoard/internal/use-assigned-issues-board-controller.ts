import { useEffect, useMemo, useState } from "react";
import { loadAssignedIssuesPage } from "@/app/desktop/TauriService/tauri";
import {
  buildFortnightWindows,
  FILTER_ALL,
  sortFortnightsNewestFirst,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issue-filters";

import type {
  AssignedIssueSnapshot,
  AssignedIssuesPage,
  AssignedIssuesQueryInput,
  AssignedIssuesStatusFilter,
} from "@/shared/types/dashboard";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

interface QueryState {
  cursor?: string;
  history: Array<string | undefined>;
  iterationToken: string;
  fortnightId: string;
  status: AssignedIssuesStatusFilter;
  search: string;
}

interface UseAssignedIssuesBoardControllerOptions {
  loadPage?: (input: AssignedIssuesQueryInput) => Promise<AssignedIssuesPage>;
}

export function useAssignedIssuesBoardController({
  loadPage = loadAssignedIssuesPage,
}: Readonly<UseAssignedIssuesBoardControllerOptions> = {}) {
  const sortedFortnightWindows = useMemo(
    () => sortFortnightsNewestFirst(buildFortnightWindows()),
    [],
  );
  const [searchInput, setSearchInput] = useState("");
  const [queryState, setQueryState] = useState<QueryState>({
    history: [],
    iterationToken: FILTER_ALL,
    fortnightId: FILTER_ALL,
    status: "all",
    search: "",
  });
  const [page, setPage] = useState<AssignedIssuesPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQueryState((current) =>
        current.search === searchInput.trim()
          ? current
          : {
              ...current,
              cursor: undefined,
              history: [],
              search: searchInput.trim(),
            },
      );
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const selectedFortnight = useMemo(
    () => sortedFortnightWindows.find((window) => window.id === queryState.fortnightId),
    [queryState.fortnightId, sortedFortnightWindows],
  );

  useEffect(() => {
    let cancelled = false;
    const input: AssignedIssuesQueryInput = {
      cursor: queryState.cursor,
      pageSize: PAGE_SIZE,
      status: queryState.status,
      iterationCode:
        queryState.iterationToken === FILTER_ALL ? undefined : queryState.iterationToken,
      iterationPeriod:
        queryState.fortnightId === FILTER_ALL || !selectedFortnight
          ? undefined
          : {
              start: toLocalIsoDate(selectedFortnight.start),
              end: toLocalIsoDate(selectedFortnight.end),
            },
      search: queryState.search || undefined,
    };

    setLoading(true);
    setError(null);

    void loadPage(input)
      .then((result) => {
        if (cancelled) {
          return;
        }
        setPage(result);
      })
      .catch((caught) => {
        if (cancelled) {
          return;
        }
        setPage(null);
        setError(caught instanceof Error ? caught.message : "Could not load assigned issues.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadPage, queryState, reloadToken, selectedFortnight]);

  function updateFilters(
    patch: Partial<Pick<QueryState, "iterationToken" | "fortnightId" | "status">>,
  ) {
    setQueryState((current) => ({
      ...current,
      ...patch,
      cursor: undefined,
      history: [],
    }));
  }

  function retry() {
    setReloadToken((current) => current + 1);
  }

  function goToNextPage() {
    if (!page?.hasNextPage || !page.endCursor) {
      return;
    }
    setQueryState((current) => ({
      ...current,
      history: [...current.history, current.cursor],
      cursor: page.endCursor,
    }));
  }

  function goToPreviousPage() {
    setQueryState((current) => {
      const previous = current.history.at(-1);
      return {
        ...current,
        cursor: previous,
        history: current.history.slice(0, -1),
      };
    });
  }

  return {
    issues: page?.items ?? ([] as AssignedIssueSnapshot[]),
    suggestions: page?.suggestions ?? [],
    sortedFortnightWindows,
    loading,
    error,
    searchInput,
    setSearchInput,
    iterationToken: queryState.iterationToken,
    setIterationToken: (value: string) => updateFilters({ iterationToken: value }),
    fortnightId: queryState.fortnightId,
    setFortnightId: (value: string) => updateFilters({ fortnightId: value }),
    status: queryState.status,
    setStatus: (value: AssignedIssuesStatusFilter) => updateFilters({ status: value }),
    canGoPrevious: queryState.history.length > 0,
    canGoNext: Boolean(page?.hasNextPage && page.endCursor),
    pageLabel: String(queryState.history.length + 1),
    retry,
    goToNextPage,
    goToPreviousPage,
  };
}

function toLocalIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
