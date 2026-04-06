import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import {
  FILTER_ALL,
  filterFortnightsByStartYear,
  uniqueFortnightStartYears,
  uniqueIterationTokens,
  type FortnightWindow,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issue-filters";
import { AssignedIssuesSearchBox } from "@/features/issues/ui/AssignedIssuesBoard/internal/AssignedIssuesSearchBox/AssignedIssuesSearchBox";
import { cn } from "@/shared/lib/utils";
import { SearchCombobox } from "@/shared/ui/SearchCombobox/SearchCombobox";

import type {
  AssignedIssueSnapshot,
  AssignedIssueSuggestion,
  AssignedIssuesStatusFilter,
} from "@/shared/types/dashboard";

const comboboxInputClassName = "min-w-0 w-full max-w-none";

interface AssignedIssuesFiltersProps {
  issues: AssignedIssueSnapshot[];
  searchValue: string;
  suggestions: AssignedIssueSuggestion[];
  onSearchValueChange: (value: string) => void;
  sortedFortnightWindows: FortnightWindow[];
  iterationToken: string;
  onIterationTokenChange: (value: string) => void;
  fortnightId: string;
  onFortnightIdChange: (value: string) => void;
  statusKey: AssignedIssuesStatusFilter;
  onStatusKeyChange: (value: AssignedIssuesStatusFilter) => void;
}

export function AssignedIssuesFilters({
  issues,
  searchValue,
  suggestions,
  onSearchValueChange,
  sortedFortnightWindows,
  iterationToken,
  onIterationTokenChange,
  fortnightId,
  onFortnightIdChange,
  statusKey,
  onStatusKeyChange,
}: Readonly<AssignedIssuesFiltersProps>) {
  const { t, formatDateShort } = useI18n();
  const [periodYear, setPeriodYear] = useState(FILTER_ALL);

  const periodWindows = useMemo(
    () => filterFortnightsByStartYear(sortedFortnightWindows, periodYear),
    [periodYear, sortedFortnightWindows],
  );

  useEffect(() => {
    if (fortnightId === FILTER_ALL) {
      return;
    }
    if (!periodWindows.some((w) => w.id === fortnightId)) {
      onFortnightIdChange(FILTER_ALL);
    }
  }, [fortnightId, onFortnightIdChange, periodWindows]);

  const iterationComboboxOptions = useMemo(
    () => [
      { value: FILTER_ALL, label: t("issues.filterAll") },
      ...uniqueIterationTokens(issues).map((token) => ({ value: token, label: token })),
    ],
    [issues, t],
  );

  const yearComboboxOptions = useMemo(
    () => [
      { value: FILTER_ALL, label: t("issues.filterAll") },
      ...uniqueFortnightStartYears(sortedFortnightWindows).map((y) => ({
        value: String(y),
        label: String(y),
      })),
    ],
    [sortedFortnightWindows, t],
  );

  const periodComboboxOptions = useMemo(
    () => [
      { value: FILTER_ALL, label: t("issues.filterAll") },
      ...periodWindows.map((w) => ({
        value: w.id,
        label: `${formatDateShort(w.start)} – ${formatDateShort(w.end)}`,
      })),
    ],
    [formatDateShort, periodWindows, t],
  );

  const statusComboboxOptions = useMemo(
    () => [
      { value: "all", label: t("issues.filterAll") },
      { value: "opened", label: t("issues.filterOpened") },
      { value: "closed", label: t("issues.filterClosed") },
    ],
    [t],
  );

  return (
    <div className="grid gap-3 rounded-2xl border-2 border-border-subtle bg-panel/70 p-4 shadow-clay">
      <AssignedIssuesSearchBox
        value={searchValue}
        suggestions={suggestions}
        onValueChange={onSearchValueChange}
      />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-1.5 text-sm">
        <span className="font-medium text-foreground">{t("issues.filterIteration")}</span>
        <SearchCombobox
          value={iterationToken}
          options={iterationComboboxOptions}
          onChange={onIterationTokenChange}
          searchPlaceholder={t("common.search")}
          noResultsLabel={t("common.noResults")}
          className={comboboxInputClassName}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 text-sm">
        <span className="font-medium text-foreground">{t("issues.filterFortnight")}</span>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
          <SearchCombobox
            value={periodYear}
            options={yearComboboxOptions}
            onChange={setPeriodYear}
            searchPlaceholder={t("common.search")}
            noResultsLabel={t("common.noResults")}
            className={cn(comboboxInputClassName, "sm:max-w-[7.5rem] sm:shrink-0")}
          />
          <SearchCombobox
            value={fortnightId}
            options={periodComboboxOptions}
            onChange={onFortnightIdChange}
            searchPlaceholder={t("common.search")}
            noResultsLabel={t("common.noResults")}
            className={cn(comboboxInputClassName, "min-w-0 flex-1")}
          />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 text-sm">
        <span className="font-medium text-foreground">{t("issues.filterWorkflowStatus")}</span>
        <SearchCombobox
          value={statusKey}
          options={statusComboboxOptions}
          onChange={(value) => onStatusKeyChange(value as AssignedIssuesStatusFilter)}
          searchPlaceholder={t("common.search")}
          noResultsLabel={t("common.noResults")}
          className={comboboxInputClassName}
        />
      </div>
      </div>
    </div>
  );
}
