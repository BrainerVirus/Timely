import { useMemo } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import {
  FILTER_ALL,
  type FortnightWindow,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issue-filters";
import { AssignedIssuesFilters } from "@/features/issues/ui/AssignedIssuesBoard/internal/AssignedIssuesFilters/AssignedIssuesFilters";
import { AssignedIssueListRow } from "@/features/issues/ui/AssignedIssuesBoard/internal/AssignedIssueListRow/AssignedIssueListRow";
import {
  getWorkflowColumnId,
  workflowStatusFilterLabel,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/workflow-column";
import { cn } from "@/shared/lib/utils";
import { PagerControl } from "@/shared/ui/PagerControl/PagerControl";

import type {
  AssignedIssueSnapshot,
  AssignedIssueSuggestion,
  AssignedIssuesStatusFilter,
} from "@/shared/types/dashboard";

interface AssignedIssuesBoardProps {
  issues: AssignedIssueSnapshot[];
  loading: boolean;
  error?: string | null;
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
  canGoPrevious: boolean;
  canGoNext: boolean;
  pageLabel: string;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onRetry: () => void;
  onOpenIssue: (issue: AssignedIssueSnapshot) => void;
  className?: string;
}

export function AssignedIssuesBoard({
  issues,
  loading,
  error,
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
  canGoPrevious,
  canGoNext,
  pageLabel,
  onPreviousPage,
  onNextPage,
  onRetry,
  onOpenIssue,
  className,
}: Readonly<AssignedIssuesBoardProps>) {
  const { t } = useI18n();

  const sorted = useMemo(
    () =>
      [...issues].sort((a, b) => {
        const ia = a.iterationTitle ?? "";
        const ib = b.iterationTitle ?? "";
        if (ia !== ib) {
          return ia.localeCompare(ib);
        }
        return a.title.localeCompare(b.title);
      }),
    [issues],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <AssignedIssuesFilters
        issues={issues}
        searchValue={searchValue}
        suggestions={suggestions}
        onSearchValueChange={onSearchValueChange}
        sortedFortnightWindows={sortedFortnightWindows}
        iterationToken={iterationToken}
        onIterationTokenChange={onIterationTokenChange}
        fortnightId={fortnightId}
        onFortnightIdChange={onFortnightIdChange}
        statusKey={statusKey}
        onStatusKeyChange={onStatusKeyChange}
      />

      {error ? (
        <div className="rounded-2xl border-2 border-rose-200/70 bg-rose-50/70 p-6 text-center text-sm text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100">
          <p>{t("issues.loadError")}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex rounded-xl border-2 border-border-subtle bg-field px-3 py-2 font-medium text-foreground transition hover:bg-field-hover"
          >
            {t("common.retry")}
          </button>
        </div>
      ) : loading ? (
        <div className="rounded-2xl border-2 border-border-subtle bg-panel/50 p-8 text-center text-sm text-muted-foreground">
          {t("issues.loadingList")}
        </div>
      ) : sorted.length === 0 ? (
        <div
          className={cn(
            "rounded-3xl border-2 border-border-subtle bg-panel/80 p-8 text-center shadow-card",
            className,
          )}
        >
          <p className="font-display text-lg font-semibold text-foreground">
            {searchValue ||
            iterationToken !== FILTER_ALL ||
            fortnightId !== FILTER_ALL ||
            statusKey !== "all"
              ? t("issues.listEmptyAfterFilters")
              : t("issues.boardEmptyTitle")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchValue ||
            iterationToken !== FILTER_ALL ||
            fortnightId !== FILTER_ALL ||
            statusKey !== "all"
              ? t("issues.filterEmptyHint")
              : t("issues.boardEmptyHint")}
          </p>
        </div>
      ) : (
        <>
        <ul className="space-y-2">
          {sorted.map((issue) => (
            <AssignedIssueListRow
              key={issue.key}
              issue={issue}
              workflowLabel={workflowStatusFilterLabel(getWorkflowColumnId(issue), t)}
              onOpen={() => onOpenIssue(issue)}
            />
          ))}
        </ul>
          <div className="flex justify-end">
            <PagerControl
              label={t("issues.pageNumber", { page: pageLabel })}
              scopeLabel={t("issues.pageTitle")}
              onPrevious={onPreviousPage}
              onCurrent={() => {}}
              onNext={onNextPage}
              disabled={!canGoPrevious && !canGoNext}
              disablePrevious={!canGoPrevious}
              disableNext={!canGoNext}
              compact
            />
          </div>
        </>
      )}
    </div>
  );
}
