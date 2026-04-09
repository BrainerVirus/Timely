import { useEffect, useMemo, useRef, useState } from "react";
import { loadAssignedIssuesPage } from "@/app/desktop/TauriService/tauri";
import {
  FILTER_ALL,
  filterIterationsByYear,
  findAutoSelectedIterationId,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issue-filters";

import type {
  AssignedIssueSnapshot,
  AssignedIssuesPage,
  AssignedIssuesQueryInput,
  AssignedIssuesStatusFilter,
} from "@/shared/types/dashboard";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const SEARCH_DEBOUNCE_MS = 300;

interface QueryState {
  page: number;
  pageSize: number;
  year: string;
  iterationId: string;
  status: AssignedIssuesStatusFilter;
  search: string;
}

interface UseAssignedIssuesBoardControllerOptions {
  loadPage?: (input: AssignedIssuesQueryInput) => Promise<AssignedIssuesPage>;
}

function toAssignedIssuesQueryInput(queryState: QueryState): AssignedIssuesQueryInput {
  return {
    page: queryState.page,
    pageSize: queryState.pageSize,
    status: queryState.status,
    year: queryState.year === FILTER_ALL ? undefined : queryState.year,
    iterationId: queryState.iterationId === FILTER_ALL ? undefined : queryState.iterationId,
    search: queryState.search || undefined,
  };
}

export function useAssignedIssuesBoardController({
  loadPage = loadAssignedIssuesPage,
}: Readonly<UseAssignedIssuesBoardControllerOptions> = {}) {
  const [searchInput, setSearchInput] = useState("");
  const [queryState, setQueryState] = useState<QueryState>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    year: FILTER_ALL,
    iterationId: FILTER_ALL,
    status: "opened",
    search: "",
  });
  const [page, setPage] = useState<AssignedIssuesPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const autoSelectionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQueryState((current) =>
        current.search === searchInput.trim()
          ? current
          : {
              ...current,
              page: 1,
              search: searchInput.trim(),
            },
      );
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    const input = toAssignedIssuesQueryInput(queryState);
    setLoading(true);
    setError(null);
    void loadPage(input)
      .then((result) => {
        if (cancelled) return;
        setPage(result);
      })
      .catch((caught) => {
        if (cancelled) return;
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
  }, [loadPage, queryState, reloadToken]);

  useEffect(() => {
    if (!page || queryState.iterationId !== FILTER_ALL) return;
    const autoSelectionKey = `${queryState.status}:${queryState.year}`;
    if (autoSelectionKeyRef.current === autoSelectionKey) return;
    autoSelectionKeyRef.current = autoSelectionKey;
    if (queryState.status !== "opened") return;
    const visibleIterations = filterIterationsByYear(page.iterationOptions ?? [], queryState.year);
    const nextIterationId = findAutoSelectedIterationId(visibleIterations);
    if (!nextIterationId) return;
    const nextIteration = page.iterationOptions.find((iteration) => iteration.id === nextIterationId);
    setQueryState((current) => ({
      ...current,
      page: 1,
      year: current.year === FILTER_ALL ? (nextIteration?.year ?? current.year) : current.year,
      iterationId: nextIterationId,
    }));
  }, [page, queryState.iterationId, queryState.status, queryState.year]);

  const iterationOptions = useMemo(
    () => filterIterationsByYear(page?.iterationOptions ?? [], queryState.year),
    [page?.iterationOptions, queryState.year],
  );

  function updateFilters(
    patch: Partial<Pick<QueryState, "year" | "iterationId" | "status">>,
    options: { resetIterationWhenInvalid?: boolean } = {},
  ) {
    setQueryState((current) => {
      const next = {
        ...current,
        ...patch,
        page: 1,
      };

      if (options.resetIterationWhenInvalid && next.iterationId !== FILTER_ALL) {
        const visibleIterations = filterIterationsByYear(page?.iterationOptions ?? [], next.year);
        const selectedIteration =
          visibleIterations.find((iteration) => iteration.id === next.iterationId) ?? null;
        if (!selectedIteration) next.iterationId = FILTER_ALL;
      }
      return next;
    });
  }

  function retry() {
    setReloadToken((current) => current + 1);
  }

  function goToNextPage() {
    if (!page || queryState.page >= page.totalPages) return;
    setQueryState((current) => ({
      ...current,
      page: current.page + 1,
    }));
  }

  function goToPreviousPage() {
    setQueryState((current) => ({
      ...current,
      page: Math.max(1, current.page - 1),
    }));
  }

  function goToPage(nextPage: number) {
    setQueryState((current) => ({
      ...current,
      page: Math.max(1, nextPage),
    }));
  }

  function setPageSize(nextPageSize: number) {
    setQueryState((current) => ({
      ...current,
      page: 1,
      pageSize: nextPageSize,
    }));
  }

  return {
    issues: page?.items ?? ([] as AssignedIssueSnapshot[]),
    suggestions: page?.suggestions ?? [],
    years: page?.years ?? [],
    iterationOptions,
    catalogState: page?.catalogState ?? "ready",
    catalogMessage: page?.catalogMessage ?? null,
    loading,
    error,
    searchInput,
    setSearchInput,
    year: queryState.year,
    setYear: (value: string) =>
      updateFilters({ year: value }, { resetIterationWhenInvalid: true }),
    iterationId: queryState.iterationId,
    setIterationId: (value: string) => updateFilters({ iterationId: value }),
    status: queryState.status,
    setStatus: (value: AssignedIssuesStatusFilter) =>
      updateFilters({ status: value }, { resetIterationWhenInvalid: true }),
    page: page?.page ?? queryState.page,
    pageSize: page?.pageSize ?? queryState.pageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    totalItems: page?.totalItems ?? 0,
    totalPages: page?.totalPages ?? 1,
    canGoPrevious: (page?.page ?? queryState.page) > 1,
    canGoNext: (page?.page ?? queryState.page) < (page?.totalPages ?? 1),
    retry,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    setPageSize,
  };
}
