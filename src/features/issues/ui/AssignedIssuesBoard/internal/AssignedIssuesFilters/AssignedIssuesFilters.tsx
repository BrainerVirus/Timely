import { useMemo } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { AssignedIssuesSearchBox } from "@/features/issues/ui/AssignedIssuesBoard/internal/AssignedIssuesSearchBox/AssignedIssuesSearchBox";
import { FILTER_ALL } from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issue-filters";
import { SearchCombobox } from "@/shared/ui/SearchCombobox/SearchCombobox";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/Tabs/Tabs";

import type {
  AssignedIssueSuggestion,
  AssignedIssuesIterationOption,
  AssignedIssuesStatusFilter,
} from "@/shared/types/dashboard";

const iterationComboboxInputClassName = "min-w-0 w-full max-w-none xl:w-[18rem]";
const yearComboboxInputClassName = "min-w-0 w-full max-w-none sm:w-36";
const filterChipClassName =
  "inline-flex h-8 shrink-0 items-center rounded-lg border-2 border-border-subtle bg-field px-3 text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground shadow-clay-inset";

interface AssignedIssuesFiltersProps {
  status: AssignedIssuesStatusFilter;
  onStatusChange: (value: AssignedIssuesStatusFilter) => void;
  disableIterationFilters?: boolean;
  searchValue: string;
  suggestions: AssignedIssueSuggestion[];
  onSearchValueChange: (value: string) => void;
  years: string[];
  year: string;
  onYearChange: (value: string) => void;
  iterationOptions: AssignedIssuesIterationOption[];
  iterationId: string;
  onIterationIdChange: (value: string) => void;
}

export function AssignedIssuesFilters({
  status,
  onStatusChange,
  disableIterationFilters = false,
  searchValue,
  suggestions,
  onSearchValueChange,
  years,
  year,
  onYearChange,
  iterationOptions,
  iterationId,
  onIterationIdChange,
}: Readonly<AssignedIssuesFiltersProps>) {
  const { t } = useI18n();
  const statusOptions = useMemo(
    () =>
      [
        { value: "opened", label: t("issues.filterOpened") },
        { value: "closed", label: t("issues.filterClosed") },
        { value: "all", label: t("issues.filterAll") },
      ] satisfies Array<{ value: AssignedIssuesStatusFilter; label: string }>,
    [t],
  );

  const yearComboboxOptions = useMemo(
    () => [
      { value: FILTER_ALL, label: t("issues.filterAll") },
      ...years.map((item) => ({
        value: item,
        label: item,
      })),
    ],
    [t, years],
  );

  const iterationComboboxOptions = useMemo(
    () => [
      { value: FILTER_ALL, label: t("issues.filterAll") },
      ...iterationOptions.map((iteration) => {
        const label = iteration.id === "none" ? t("issues.noIterationFilter") : iteration.label;
        return {
          value: iteration.id,
          label,
          badge: iteration.badge,
          searchText:
            iteration.id === "none"
              ? `${iteration.searchText} ${t("issues.noIterationFilter")}`
              : iteration.searchText,
        };
      }),
    ],
    [iterationOptions, t],
  );

  return (
    <div className="space-y-2.5">
      <Tabs
        value={status}
        onValueChange={(value) => onStatusChange(value as AssignedIssuesStatusFilter)}
      >
        <TabsList className="justify-start">
          {statusOptions.map((option) => (
            <TabsTrigger key={option.value} value={option.value}>
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
        <AssignedIssuesSearchBox
          className="min-w-[14rem] xl:min-w-0"
          value={searchValue}
          suggestions={suggestions}
          onValueChange={onSearchValueChange}
        />
        <div className="flex min-w-0 items-center gap-2 xl:justify-self-start">
          <span className={filterChipClassName}>{t("issues.filterIteration")}</span>
          <SearchCombobox
            value={iterationId}
            options={iterationComboboxOptions}
            onChange={onIterationIdChange}
            replaceOnFocus
            searchPlaceholder={t("common.search")}
            noResultsLabel={t("common.noResults")}
            disabled={disableIterationFilters}
            className={iterationComboboxInputClassName}
            initialVisibleCount={10}
            visibleCountIncrement={10}
          />
        </div>
        <div className="flex min-w-0 items-center gap-2 xl:justify-self-end">
          <span className={filterChipClassName}>{t("issues.filterYear")}</span>
          <SearchCombobox
            value={year}
            options={yearComboboxOptions}
            onChange={onYearChange}
            replaceOnFocus
            searchPlaceholder={t("common.search")}
            noResultsLabel={t("common.noResults")}
            disabled={disableIterationFilters}
            className={yearComboboxInputClassName}
            initialVisibleCount={10}
            visibleCountIncrement={10}
          />
        </div>
      </div>
    </div>
  );
}
