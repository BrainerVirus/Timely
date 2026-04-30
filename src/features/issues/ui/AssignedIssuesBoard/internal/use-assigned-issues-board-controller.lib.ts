import { FILTER_ALL } from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issue-filters";

import type {
  AssignedIssuesPage,
  AssignedIssuesQueryInput,
  AssignedIssuesStatusFilter,
  ProviderConnection,
} from "@/shared/types/dashboard";

export interface FilterState {
  year: string;
  iterationId: string;
}

export interface QueryState {
  page: number;
  pageSize: number;
  status: AssignedIssuesStatusFilter;
  provider: string;
  search: string;
  filtersByStatus: Record<AssignedIssuesStatusFilter, FilterState>;
}

export function createDefaultFilters(): Record<AssignedIssuesStatusFilter, FilterState> {
  return {
    opened: { year: FILTER_ALL, iterationId: FILTER_ALL },
    todo: { year: FILTER_ALL, iterationId: FILTER_ALL },
    doing: { year: FILTER_ALL, iterationId: FILTER_ALL },
    blocked: { year: FILTER_ALL, iterationId: FILTER_ALL },
    done: { year: FILTER_ALL, iterationId: FILTER_ALL },
    all: { year: FILTER_ALL, iterationId: FILTER_ALL },
  };
}

export function activeFilters(queryState: QueryState): FilterState {
  return queryState.filtersByStatus[queryState.status];
}

export function toAssignedIssuesQueryInput(queryState: QueryState): AssignedIssuesQueryInput {
  const filters = activeFilters(queryState);
  return {
    page: queryState.page,
    pageSize: queryState.pageSize,
    status: queryState.status,
    provider: queryState.provider === FILTER_ALL ? undefined : queryState.provider,
    year: filters.year === FILTER_ALL ? undefined : filters.year,
    iterationId: filters.iterationId === FILTER_ALL ? undefined : filters.iterationId,
    search: queryState.search || undefined,
  };
}

export function buildAssignedIssuesQueryKey(input: AssignedIssuesQueryInput): string {
  return JSON.stringify({
    page: input.page,
    pageSize: input.pageSize,
    status: input.status,
    provider: input.provider ?? null,
    year: input.year ?? null,
    iterationId: input.iterationId ?? null,
    search: input.search ?? null,
  });
}

export function resolveValidFilters(filters: FilterState, page: AssignedIssuesPage): FilterState {
  const nextYear =
    filters.year !== FILTER_ALL &&
    !page.years.includes(filters.year) &&
    !page.iterationOptions.some((iteration) => iteration.year === filters.year)
      ? FILTER_ALL
      : filters.year;
  const visibleIterations = page.iterationOptions.filter(
    (iteration) => nextYear === FILTER_ALL || !iteration.year || iteration.year === nextYear,
  );
  return {
    year: nextYear,
    iterationId:
      filters.iterationId !== FILTER_ALL &&
      !visibleIterations.some((iteration) => iteration.id === filters.iterationId)
        ? FILTER_ALL
        : filters.iterationId,
  };
}

export function createProviderFilterOptions(providers: ProviderConnection[]) {
  const toProviderLabel = (provider: ProviderConnection): string => {
    const normalizedProvider = provider.provider.trim().toLowerCase();
    const normalizedDisplayName = provider.displayName.trim().toLowerCase();
    const normalizedHost = provider.host.trim().toLowerCase();

    if (
      normalizedProvider === "gitlab" ||
      normalizedDisplayName.includes("gitlab") ||
      normalizedHost.includes("gitlab")
    ) {
      return "GitLab";
    }

    if (
      normalizedProvider === "youtrack" ||
      normalizedDisplayName.includes("youtrack") ||
      normalizedHost.includes("youtrack")
    ) {
      return "YouTrack";
    }

    return provider.displayName || provider.provider;
  };

  const seen = new Set<string>();
  const options = providers
    .filter((provider) => provider.hasToken || Boolean(provider.clientId))
    .map((provider) => ({
      value: provider.provider.toLowerCase(),
      label: toProviderLabel(provider),
    }))
    .filter((provider) => {
      if (seen.has(provider.value)) return false;
      seen.add(provider.value);
      return true;
    });

  return [{ value: FILTER_ALL, label: "All" }, ...options];
}
