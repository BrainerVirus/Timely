import { useMemo } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { FILTER_ALL } from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issue-filters";
import { AssignedIssuesSearchBox } from "@/features/issues/ui/AssignedIssuesBoard/internal/AssignedIssuesSearchBox/AssignedIssuesSearchBox";
import { SearchCombobox } from "@/shared/ui/SearchCombobox/SearchCombobox";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/Tabs/Tabs";

import type {
  AssignedIssueSuggestion,
  AssignedIssuesIterationCodeOption,
  AssignedIssuesIterationOption,
  AssignedIssuesStatusFilter,
} from "@/shared/types/dashboard";

const codeComboboxInputClassName = "min-w-0 w-full max-w-none sm:w-36";
const weekComboboxInputClassName = "min-w-0 w-full max-w-none xl:w-[18rem]";
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
  iterationCodes: AssignedIssuesIterationCodeOption[];
  iterationCode: string;
  onIterationCodeChange: (value: string) => void;
  years: string[];
  year: string;
  onYearChange: (value: string) => void;
  iterations: AssignedIssuesIterationOption[];
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
  iterationCodes,
  iterationCode,
  onIterationCodeChange,
  years,
  year,
  onYearChange,
  iterations,
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

  const codeComboboxOptions = useMemo(
    () => [
      { value: FILTER_ALL, label: t("issues.filterAll") },
      ...iterationCodes.map((code) => ({
        value: code.id,
        label: code.label,
      })),
    ],
    [iterationCodes, t],
  );

  const iterationComboboxOptions = useMemo(
    () => [
      { value: FILTER_ALL, label: t("issues.filterAll") },
      ...iterations.map((iteration) => ({
        value: iteration.id,
        label: iteration.rangeLabel,
      })),
    ],
    [iterations, t],
  );

  return (
    <div className="space-y-2.5">
      <Tabs value={status} onValueChange={(value) => onStatusChange(value as AssignedIssuesStatusFilter)}>
        <TabsList className="justify-start">
          {statusOptions.map((option) => (
            <TabsTrigger key={option.value} value={option.value}>
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto] xl:items-center">
        <AssignedIssuesSearchBox
          className="min-w-[14rem] xl:min-w-0"
          value={searchValue}
          suggestions={suggestions}
          onValueChange={onSearchValueChange}
        />
        <div className="flex min-w-0 items-center gap-2 xl:justify-self-start">
          <span className={filterChipClassName}>{t("issues.filterCode")}</span>
          <SearchCombobox
            value={iterationCode}
            options={codeComboboxOptions}
            onChange={onIterationCodeChange}
            searchPlaceholder={t("common.search")}
            noResultsLabel={t("common.noResults")}
            disabled={disableIterationFilters}
            className={codeComboboxInputClassName}
            initialVisibleCount={10}
            visibleCountIncrement={10}
          />
        </div>
        <div className="flex min-w-0 items-center gap-2 xl:justify-self-start">
          <span className={filterChipClassName}>{t("issues.filterWeek")}</span>
          <SearchCombobox
            value={iterationId}
            options={iterationComboboxOptions}
            onChange={onIterationIdChange}
            searchPlaceholder={t("common.search")}
            noResultsLabel={t("common.noResults")}
            disabled={disableIterationFilters || iterationCode === FILTER_ALL}
            className={weekComboboxInputClassName}
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
