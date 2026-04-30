import { useEffect, useMemo, useRef, useState } from "react";
import { listProviderConnections, loadAssignedIssuesPage } from "@/app/desktop/TauriService/tauri";
import {
  activeFilters,
  buildAssignedIssuesQueryKey,
  createDefaultFilters,
  resolveValidFilters,
  toAssignedIssuesQueryInput,
} from "@/features/issues/ui/AssignedIssuesBoard/internal/use-assigned-issues-board-controller.lib";
import { useAssignedIssuesPageQuery } from "@/features/issues/ui/AssignedIssuesBoard/internal/use-assigned-issues-page-query";
import { useProviderFilterOptions } from "@/features/issues/ui/AssignedIssuesBoard/internal/use-provider-filter-options";
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
  ProviderConnection,
} from "@/shared/types/dashboard";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const SEARCH_DEBOUNCE_MS = 300;

interface UseAssignedIssuesBoardControllerOptions {
  loadPage?: (input: AssignedIssuesQueryInput) => Promise<AssignedIssuesPage>;
  listProviders?: () => Promise<ProviderConnection[]>;
}

export function useAssignedIssuesBoardController({
  loadPage = loadAssignedIssuesPage,
  listProviders = listProviderConnections,
}: Readonly<UseAssignedIssuesBoardControllerOptions> = {}) {
  const [searchInput, setSearchInput] = useState("");
  const providerOptions = useProviderFilterOptions(listProviders);
  const [queryState, setQueryState] = useState<QueryState>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    status: "todo",
    provider: FILTER_ALL,
    search: "",
    filtersByStatus: createDefaultFilters(),
  });

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

  const queryInput = useMemo(() => toAssignedIssuesQueryInput(queryState), [queryState]);
  const activeQueryKey = useMemo(() => buildAssignedIssuesQueryKey(queryInput), [queryInput]);
  const [reloadToken, setReloadToken] = useState(0);
  const autoSelectionKeyRef = useRef<string | null>(null);
  const { page, pageMatchesActiveQuery, visiblePage, error, loading } = useAssignedIssuesPageQuery({
    loadPage,
    queryInput,
    queryKey: activeQueryKey,
    reloadToken,
  });

  useEffect(() => {
    if (!page || !pageMatchesActiveQuery) return;
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
  }, [page, pageMatchesActiveQuery, queryState]);

  useEffect(() => {
    if (!page || !pageMatchesActiveQuery) return;
    const filters = activeFilters(queryState);
    if (filters.iterationId !== FILTER_ALL) return;
    const autoSelectionKey = `${queryState.status}:${filters.year}`;
    if (autoSelectionKeyRef.current === autoSelectionKey) return;
    autoSelectionKeyRef.current = autoSelectionKey;
    if (queryState.status !== "todo") return;
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
        todo: {
          year:
            current.filtersByStatus.todo.year === FILTER_ALL
              ? (nextIteration?.year ?? current.filtersByStatus.todo.year)
              : current.filtersByStatus.todo.year,
          iterationId: nextIterationId,
        },
      },
    }));
  }, [page, pageMatchesActiveQuery, queryState]);

  const iterationOptions = useMemo(
    () =>
      pageMatchesActiveQuery
        ? filterIterationsByYear(page?.iterationOptions ?? [], activeFilters(queryState).year)
        : [],
    [page?.iterationOptions, pageMatchesActiveQuery, queryState],
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
          visiblePage?.iterationOptions ?? [],
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
    issues: visiblePage?.items ?? ([] as AssignedIssueSnapshot[]),
    suggestions: visiblePage?.suggestions ?? [],
    years: visiblePage?.years ?? [],
    iterationOptions,
    catalogState: visiblePage?.catalogState ?? "ready",
    catalogMessage: visiblePage?.catalogMessage ?? null,
    loading,
    error,
    searchInput,
    appliedSearchValue: queryState.search,
    setSearchInput,
    provider: queryState.provider,
    providerOptions,
    setProvider: (value: string) =>
      setQueryState((current) => ({
        ...current,
        provider: value,
        page: 1,
      })),
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
    page: visiblePage?.page ?? queryState.page,
    pageSize: visiblePage?.pageSize ?? queryState.pageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    totalItems: visiblePage?.totalItems ?? 0,
    totalPages: visiblePage?.totalPages ?? 1,
    canGoPrevious: (visiblePage?.page ?? queryState.page) > 1,
    canGoNext: (visiblePage?.page ?? queryState.page) < (visiblePage?.totalPages ?? 1),
    retry: () => setReloadToken((current) => current + 1),
    goToPage: (nextPage: number) =>
      setQueryState((current) => ({ ...current, page: Math.max(1, nextPage) })),
    goToNextPage: () => {
      if (!visiblePage || queryState.page >= visiblePage.totalPages) return;
      setQueryState((current) => ({ ...current, page: current.page + 1 }));
    },
    goToPreviousPage: () =>
      setQueryState((current) => ({ ...current, page: Math.max(1, current.page - 1) })),
    setPageSize: (nextPageSize: number) =>
      setQueryState((current) => ({ ...current, page: 1, pageSize: nextPageSize })),
  };
}
