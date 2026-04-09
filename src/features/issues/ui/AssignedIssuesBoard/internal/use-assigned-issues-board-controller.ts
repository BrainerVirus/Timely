import { useEffect, useMemo, useRef, useState } from "react";
import { loadAssignedIssuesPage } from "@/app/desktop/TauriService/tauri";
import {
  activeFilters,
  createDefaultFilters,
  resolveValidFilters,
  toAssignedIssuesQueryInput,
} from "@/features/issues/ui/AssignedIssuesBoard/internal/use-assigned-issues-board-controller.lib";
import {
  FILTER_ALL,
  filterIterationsByYear,
  findAutoSelectedIterationId,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issue-filters";

import type {
  FilterState,
  QueryState,
} from "@/features/issues/ui/AssignedIssuesBoard/internal/use-assigned-issues-board-controller.lib";
import type {
  AssignedIssueSnapshot,
  AssignedIssuesPage,
  AssignedIssuesQueryInput,
  AssignedIssuesStatusFilter,
} from "@/shared/types/dashboard";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const SEARCH_DEBOUNCE_MS = 300;

interface UseAssignedIssuesBoardControllerOptions {
  loadPage?: (input: AssignedIssuesQueryInput) => Promise<AssignedIssuesPage>;
}

export function useAssignedIssuesBoardController({
  loadPage = loadAssignedIssuesPage,
}: Readonly<UseAssignedIssuesBoardControllerOptions> = {}) {
  const [searchInput, setSearchInput] = useState("");
  const [queryState, setQueryState] = useState<QueryState>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    status: "opened",
    search: "",
    filtersByStatus: createDefaultFilters(),
  });
  const [page, setPage] = useState<AssignedIssuesPage | null>(null);
  const [loadedStatus, setLoadedStatus] = useState<AssignedIssuesStatusFilter>("opened");
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
        setLoadedStatus(input.status);
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
    if (!page || loadedStatus !== queryState.status) return;
    const filters = activeFilters(queryState);
    const nextFilters = resolveValidFilters(filters, page);
    if (nextFilters.year === filters.year && nextFilters.iterationId === filters.iterationId) {
      return;
    }
    setQueryState((current) => ({
      ...current,
      page: 1,
      filtersByStatus: {
        ...current.filtersByStatus,
        [current.status]: nextFilters,
      },
    }));
  }, [loadedStatus, page, queryState]);

  useEffect(() => {
    if (!page || loadedStatus !== queryState.status) return;
    const filters = activeFilters(queryState);
    if (filters.iterationId !== FILTER_ALL) return;
    const autoSelectionKey = `${queryState.status}:${filters.year}`;
    if (autoSelectionKeyRef.current === autoSelectionKey) return;
    autoSelectionKeyRef.current = autoSelectionKey;
    if (queryState.status !== "opened") return;
    const visibleIterations = filterIterationsByYear(page.iterationOptions ?? [], filters.year);
    const nextIterationId = findAutoSelectedIterationId(visibleIterations);
    if (!nextIterationId) return;
    const nextIteration = page.iterationOptions.find(
      (iteration) => iteration.id === nextIterationId,
    );
    setQueryState((current) => ({
      ...current,
      page: 1,
      filtersByStatus: {
        ...current.filtersByStatus,
        opened: {
          year:
            current.filtersByStatus.opened.year === FILTER_ALL
              ? (nextIteration?.year ?? current.filtersByStatus.opened.year)
              : current.filtersByStatus.opened.year,
          iterationId: nextIterationId,
        },
      },
    }));
  }, [loadedStatus, page, queryState]);

  const iterationOptions = useMemo(
    () =>
      loadedStatus === queryState.status
        ? filterIterationsByYear(page?.iterationOptions ?? [], activeFilters(queryState).year)
        : [],
    [loadedStatus, page?.iterationOptions, queryState],
  );

  function updateFilters(
    patch: Partial<Pick<FilterState, "year" | "iterationId">>,
    options: { resetIterationWhenInvalid?: boolean } = {},
  ) {
    setQueryState((current) => {
      const currentFilters = current.filtersByStatus[current.status];
      const nextFilters = {
        ...currentFilters,
        ...patch,
      };
      if (options.resetIterationWhenInvalid && nextFilters.iterationId !== FILTER_ALL) {
        const visibleIterations = filterIterationsByYear(
          page?.iterationOptions ?? [],
          nextFilters.year,
        );
        const selectedIteration =
          visibleIterations.find((iteration) => iteration.id === nextFilters.iterationId) ?? null;
        if (!selectedIteration) nextFilters.iterationId = FILTER_ALL;
      }
      return {
        ...current,
        page: 1,
        filtersByStatus: {
          ...current.filtersByStatus,
          [current.status]: nextFilters,
        },
      };
    });
  }

  return {
    issues: page?.items ?? ([] as AssignedIssueSnapshot[]),
    suggestions: page?.suggestions ?? [],
    years: loadedStatus === queryState.status ? (page?.years ?? []) : [],
    iterationOptions,
    catalogState: page?.catalogState ?? "ready",
    catalogMessage: page?.catalogMessage ?? null,
    loading,
    error,
    searchInput,
    setSearchInput,
    year: activeFilters(queryState).year,
    setYear: (value: string) => updateFilters({ year: value }, { resetIterationWhenInvalid: true }),
    iterationId: activeFilters(queryState).iterationId,
    setIterationId: (value: string) => updateFilters({ iterationId: value }),
    status: queryState.status,
    setStatus: (value: AssignedIssuesStatusFilter) =>
      setQueryState((current) => ({
        ...current,
        status: value,
        page: 1,
      })),
    page: page?.page ?? queryState.page,
    pageSize: page?.pageSize ?? queryState.pageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    totalItems: page?.totalItems ?? 0,
    totalPages: page?.totalPages ?? 1,
    canGoPrevious: (page?.page ?? queryState.page) > 1,
    canGoNext: (page?.page ?? queryState.page) < (page?.totalPages ?? 1),
    retry: () => setReloadToken((current) => current + 1),
    goToPage: (nextPage: number) =>
      setQueryState((current) => ({ ...current, page: Math.max(1, nextPage) })),
    goToNextPage: () => {
      if (!page || queryState.page >= page.totalPages) return;
      setQueryState((current) => ({ ...current, page: current.page + 1 }));
    },
    goToPreviousPage: () =>
      setQueryState((current) => ({ ...current, page: Math.max(1, current.page - 1) })),
    setPageSize: (nextPageSize: number) =>
      setQueryState((current) => ({ ...current, page: 1, pageSize: nextPageSize })),
  };
}
