import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { IssueCard } from "@/features/worklog/ui/IssueCard/IssueCard";
import { easeOut, springGentle } from "@/shared/lib/animations/animations";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";

import type { useI18n as UseI18nHook } from "@/app/providers/I18nService/i18n";
import type { IssueBreakdown } from "@/shared/types/dashboard";
import type { ReactNode } from "react";

const ISSUES_PER_PAGE = 10;

interface IssuesContentProps {
  issues: IssueBreakdown[];
  dataKey: string;
}

export function IssuesContent({ issues, dataKey }: Readonly<IssuesContentProps>) {
  const { t } = useI18n();
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
  const [page, setPage] = useState(0);
  const issueSetKey = issues.map((issue) => issue.key).join("|");
  const totalPages = Math.max(1, Math.ceil(issues.length / ISSUES_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedIssues = issues.slice(
    safePage * ISSUES_PER_PAGE,
    (safePage + 1) * ISSUES_PER_PAGE,
  );
  const shouldEnter = allowDecorativeAnimation && windowVisibility === "visible";

  return (
    <>
      {renderIssuesList({
        allowDecorativeAnimation,
        dataKey,
        issueSetKey,
        paginatedIssues,
        safePage,
        shouldEnter,
        t,
        windowVisibility,
      })}

      {issues.length > 0 ? (
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((current) => current - 1)}
            className="cursor-pointer rounded-lg border-2 border-transparent p-1 text-muted-foreground transition-all hover:border-border-subtle hover:bg-field-hover hover:text-foreground disabled:cursor-default disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((current) => current + 1)}
            className="cursor-pointer rounded-lg border-2 border-transparent p-1 text-muted-foreground transition-all hover:border-border-subtle hover:bg-field-hover hover:text-foreground disabled:cursor-default disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </>
  );
}

function renderIssuesList({
  allowDecorativeAnimation,
  dataKey,
  issueSetKey,
  paginatedIssues,
  safePage,
  shouldEnter,
  t,
  windowVisibility,
}: {
  allowDecorativeAnimation: boolean;
  dataKey: string;
  issueSetKey: string;
  paginatedIssues: IssueBreakdown[];
  safePage: number;
  shouldEnter: boolean;
  t: ReturnType<typeof UseI18nHook>["t"];
  windowVisibility: "hidden" | "visible" | undefined;
}): ReactNode {
  const paginationKey = `${dataKey}:${safePage}:${issueSetKey}`;
  const animationProps = {
    initial: shouldEnter ? { opacity: 0, y: 10 } : false,
    animate: { opacity: 1, y: 0 },
    transition: shouldEnter ? { duration: 0.26, ease: easeOut } : { duration: 0 },
  };

  if (allowDecorativeAnimation && paginatedIssues.length > 0) {
    return (
      <AnimatePresence mode="wait">
        <m.div key={paginationKey} {...animationProps} className="space-y-2">
          {paginatedIssues.map((issue, index) => (
            <m.div
              key={`${issue.key}-${issue.title}`}
              initial={shouldEnter ? { opacity: 0, y: 16 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={
                shouldEnter ? { ...springGentle, delay: 0.08 + index * 0.04 } : { duration: 0 }
              }
            >
              <IssueCard issue={issue} />
            </m.div>
          ))}
        </m.div>
      </AnimatePresence>
    );
  }

  if (paginatedIssues.length > 0) {
    return (
      <div key={paginationKey} className="space-y-2">
        {paginatedIssues.map((issue) => (
          <div key={`${issue.key}-${issue.title}`}>
            <IssueCard issue={issue} />
          </div>
        ))}
      </div>
    );
  }

  if (allowDecorativeAnimation) {
    return (
      <m.div key={`${dataKey}:empty`} {...animationProps}>
        <EmptyState
          title={t("worklog.noIssues")}
          description={t("worklog.pickDifferentDate")}
          mood="idle"
          foxSize={80}
          variant="plain"
          animationStyle="together"
          disableInnerAnimation
          allowDecorativeAnimation={allowDecorativeAnimation}
          windowVisibility={windowVisibility}
        />
      </m.div>
    );
  }

  return (
    <EmptyState
      title={t("worklog.noIssues")}
      description={t("worklog.pickDifferentDate")}
      mood="idle"
      foxSize={80}
      variant="plain"
      animationStyle="together"
      allowDecorativeAnimation={allowDecorativeAnimation}
      windowVisibility={windowVisibility}
    />
  );
}
