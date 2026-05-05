import { AnimatePresence, m } from "motion/react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { AssignedIssueListRow } from "@/features/issues/ui/AssignedIssueListRow/AssignedIssueListRow";
import { AssignedIssuesPagination } from "@/features/issues/ui/AssignedIssuesBoard/internal/AssignedIssuesPagination/AssignedIssuesPagination";
import { buildAssignedIssuesContentKey } from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issues-content-key";
import {
  getWorkflowColumnId,
  workflowStatusFilterLabel,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/workflow-column";
import { easeOut, springGentle } from "@/shared/lib/animations/animations";
import { cn } from "@/shared/lib/utils";

import type { AssignedIssueSnapshot, AssignedIssuesStatusFilter } from "@/shared/types/dashboard";

interface AssignedIssuesBoardContentProps {
  issues: AssignedIssueSnapshot[];
  loading: boolean;
  error?: string | null;
  catalogState: "ready" | "partial" | "error";
  catalogMessage?: string | null;
  appliedSearchValue: string;
  provider: string;
  status: AssignedIssuesStatusFilter;
  year: string;
  iterationId: string;
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
}

export function AssignedIssuesBoardContent({
  issues,
  loading,
  error,
  catalogState,
  catalogMessage,
  appliedSearchValue,
  provider,
  status,
  year,
  iterationId,
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
}: Readonly<AssignedIssuesBoardContentProps>) {
  const { t } = useI18n();
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
  const catalogNotice =
    catalogState === "partial"
      ? catalogMessage || t("issues.catalogPartial")
      : catalogState === "error"
        ? catalogMessage || t("issues.catalogError")
        : null;
  const hasActiveFilters = Boolean(
    appliedSearchValue ||
    year !== "all" ||
    iterationId !== "all" ||
    status !== "opened" ||
    provider !== "all",
  );
  const contentKey = buildAssignedIssuesContentKey({
    status,
    provider,
    year,
    iterationId,
    appliedSearchValue,
    page,
    totalItems,
    issues,
    error,
    loading,
  });
  const shouldEnter = allowDecorativeAnimation && windowVisibility === "visible";
  const contentAnimationProps = {
    initial: shouldEnter ? { opacity: 0, y: 10 } : false,
    animate: { opacity: 1, y: 0 },
    transition: shouldEnter ? { duration: 0.26, ease: easeOut } : { duration: 0 },
  };

  return (
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
        {renderContent()}
      </m.div>
    </AnimatePresence>
  );

  function renderContent() {
    if (error) {
      return (
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
      );
    }
    if (loading) {
      return (
        <div className="rounded-2xl border-2 border-border-subtle bg-panel/50 p-8 text-center text-sm text-muted-foreground">
          {t("issues.loadingList")}
        </div>
      );
    }
    if (issues.length === 0) {
      return (
        <div className="rounded-3xl border-2 border-border-subtle bg-panel/80 p-8 text-center shadow-card">
          <p className="font-display text-lg font-semibold text-foreground">
            {hasActiveFilters ? t("issues.listEmptyAfterFilters") : t("issues.boardEmptyTitle")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{emptyHint()}</p>
        </div>
      );
    }
    return (
      <>
        <div role="list" className="space-y-2.5">
          {issues.map((issue, index) => (
            <m.div
              key={issue.key}
              initial={shouldEnter ? { opacity: 0, y: 16 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={
                shouldEnter ? { ...springGentle, delay: 0.08 + index * 0.04 } : { duration: 0 }
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
    );
  }

  function emptyHint() {
    if (hasActiveFilters) return t("issues.filterEmptyHint");
    if (status === "all") return t("issues.boardEmptyHintAll");
    return t("issues.boardEmptyHint");
  }
}
