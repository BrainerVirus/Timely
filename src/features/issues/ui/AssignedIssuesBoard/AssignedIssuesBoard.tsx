import { AnimatePresence, m } from "motion/react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { AssignedIssueListRow } from "@/features/issues/ui/AssignedIssuesBoard/internal/AssignedIssueListRow/AssignedIssueListRow";
import { AssignedIssuesFilters } from "@/features/issues/ui/AssignedIssuesBoard/internal/AssignedIssuesFilters/AssignedIssuesFilters";
import { AssignedIssuesPagination } from "@/features/issues/ui/AssignedIssuesBoard/internal/AssignedIssuesPagination/AssignedIssuesPagination";
import {
  getWorkflowColumnId,
  workflowStatusFilterLabel,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/workflow-column";
import { easeOut, springGentle, staggerItem } from "@/shared/lib/animations/animations";
import { cn } from "@/shared/lib/utils";

import type {
  AssignedIssueSnapshot,
  AssignedIssueSuggestion,
  AssignedIssuesIterationOption,
  AssignedIssuesStatusFilter,
} from "@/shared/types/dashboard";

interface AssignedIssuesBoardProps {
  issues: AssignedIssueSnapshot[];
  loading: boolean;
  error?: string | null;
  catalogState: "ready" | "partial" | "error";
  catalogMessage?: string | null;
  searchInputValue: string;
  appliedSearchValue: string;
  suggestions: AssignedIssueSuggestion[];
  onSearchValueChange: (value: string) => void;
  status: AssignedIssuesStatusFilter;
  onStatusChange: (value: AssignedIssuesStatusFilter) => void;
  years: string[];
  year: string;
  onYearChange: (value: string) => void;
  iterationOptions: AssignedIssuesIterationOption[];
  iterationId: string;
  onIterationIdChange: (value: string) => void;
  page: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRetry: () => void;
  onOpenIssue: (issue: AssignedIssueSnapshot) => void;
  syncVersion: number;
  className?: string;
}

export function AssignedIssuesBoard({
  issues,
  loading,
  error,
  catalogState,
  catalogMessage,
  searchInputValue,
  appliedSearchValue,
  suggestions,
  onSearchValueChange,
  status,
  onStatusChange,
  years,
  year,
  onYearChange,
  iterationOptions,
  iterationId,
  onIterationIdChange,
  page,
  pageSize,
  pageSizeOptions,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onOpenIssue,
  syncVersion,
  className,
}: Readonly<AssignedIssuesBoardProps>) {
  const { t } = useI18n();
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
  const filtersUnavailable =
    catalogState !== "ready" && iterationOptions.length === 0 && years.length === 0;
  const catalogNotice =
    catalogState === "partial"
      ? catalogMessage || t("issues.catalogPartial")
      : catalogState === "error"
        ? catalogMessage || t("issues.catalogError")
        : null;
  const hasActiveFilters =
    appliedSearchValue || year !== "all" || iterationId !== "all" || status !== "opened";
  const contentKey = [
    status,
    year,
    iterationId,
    appliedSearchValue,
    page,
    totalItems,
    issues.map((issue) => issue.key).join("|"),
    error ?? "",
    loading ? "loading" : "ready",
  ].join(":");
  const shouldEnter = allowDecorativeAnimation && windowVisibility === "visible";
  const contentAnimationProps = {
    initial: shouldEnter ? { opacity: 0, y: 10 } : false,
    animate: { opacity: 1, y: 0 },
    transition: shouldEnter ? { duration: 0.26, ease: easeOut } : { duration: 0 },
  };

  return (
    <div className={cn("space-y-3", className)}>
      <m.div variants={staggerItem}>
        <AssignedIssuesFilters
          status={status}
          onStatusChange={onStatusChange}
          disableIterationFilters={filtersUnavailable}
          searchValue={searchInputValue}
          appliedSearchValue={appliedSearchValue}
          suggestions={suggestions}
          onSearchValueChange={onSearchValueChange}
          years={years}
          year={year}
          onYearChange={onYearChange}
          iterationOptions={iterationOptions}
          iterationId={iterationId}
          onIterationIdChange={onIterationIdChange}
        />
      </m.div>

      <AnimatePresence mode="wait">
        <m.div key={contentKey} {...contentAnimationProps} className="space-y-3">
          {catalogNotice ? (
            <div
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm",
                catalogState === "error"
                  ? "border-rose-400/40 bg-rose-500/10 text-rose-100"
                  : "border-amber-300/30 bg-amber-500/10 text-amber-50",
              )}
            >
              {catalogNotice}
            </div>
          ) : null}

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
          ) : issues.length === 0 ? (
            <div
              className={cn(
                "rounded-3xl border-2 border-border-subtle bg-panel/80 p-8 text-center shadow-card",
                className,
              )}
            >
              <p className="font-display text-lg font-semibold text-foreground">
                {hasActiveFilters ? t("issues.listEmptyAfterFilters") : t("issues.boardEmptyTitle")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {appliedSearchValue || year !== "all" || iterationId !== "all"
                  ? t("issues.filterEmptyHint")
                  : status === "closed"
                    ? t("issues.boardEmptyHintClosed")
                    : status === "all"
                      ? t("issues.boardEmptyHintAll")
                      : t("issues.boardEmptyHint")}
              </p>
            </div>
          ) : (
            <>
              <div role="list" className="space-y-2.5">
                {issues.map((issue, index) => (
                  <m.div
                    key={issue.key}
                    initial={shouldEnter ? { opacity: 0, y: 16 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      shouldEnter
                        ? { ...springGentle, delay: 0.08 + index * 0.04 }
                        : { duration: 0 }
                    }
                  >
                    <AssignedIssueListRow
                      issue={issue}
                      workflowLabel={workflowStatusFilterLabel(getWorkflowColumnId(issue), t)}
                      onOpen={() => onOpenIssue(issue)}
                      syncVersion={syncVersion}
                    />
                  </m.div>
                ))}
              </div>
              <AssignedIssuesPagination
                page={page}
                pageSize={pageSize}
                pageSizeOptions={pageSizeOptions}
                totalItems={totalItems}
                totalPages={totalPages}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
              />
            </>
          )}
        </m.div>
      </AnimatePresence>
    </div>
  );
}
