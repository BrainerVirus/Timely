import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle.js";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.js";
import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { useI18n } from "@/core/services/I18nService/i18n";
import { useMotionSettings } from "@/core/services/MotionService/motion";
import { IssueCard } from "@/features/worklog/components/IssueCard/IssueCard";
import { Badge } from "@/shared/components/Badge/Badge";
import { EmptyState } from "@/shared/components/EmptyState/EmptyState";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/Sheet/Sheet";
import { easeOut, springGentle } from "@/shared/utils/animations";

import type { AuditFlag, IssueBreakdown } from "@/shared/types/dashboard";
import type { ReactNode } from "react";

const ISSUES_PER_PAGE = 10;

interface IssuesSectionProps {
  title: string;
  issues: IssueBreakdown[];
  auditFlags?: AuditFlag[];
  dataKey: string;
}

export function IssuesSection({
  title,
  issues,
  auditFlags,
  dataKey,
}: Readonly<IssuesSectionProps>) {
  const issueSetKey = issues.map((issue) => issue.key).join("|");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
      </div>

      <IssuesContent key={issueSetKey} issues={issues} auditFlags={auditFlags} dataKey={dataKey} />
    </div>
  );
}

interface IssuesContentProps {
  issues: IssueBreakdown[];
  auditFlags?: AuditFlag[];
  dataKey: string;
}

function IssuesContent({ issues, auditFlags, dataKey }: Readonly<IssuesContentProps>) {
  const { formatAuditSeverity, t } = useI18n();
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
  const [page, setPage] = useState(0);
  const [auditSheetOpen, setAuditSheetOpen] = useState(false);
  const issueSetKey = issues.map((issue) => issue.key).join("|");
  const totalPages = Math.max(1, Math.ceil(issues.length / ISSUES_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedIssues = issues.slice(
    safePage * ISSUES_PER_PAGE,
    (safePage + 1) * ISSUES_PER_PAGE,
  );
  const shouldEnter = allowDecorativeAnimation && windowVisibility === "visible";

  const renderIssuesList = (): ReactNode => {
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
            {paginatedIssues.map((issue, i) => (
              <m.div
                key={`${issue.key}-${issue.title}`}
                initial={shouldEnter ? { opacity: 0, y: 16 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  shouldEnter ? { ...springGentle, delay: 0.08 + i * 0.04 } : { duration: 0 }
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
  };

  let auditFlagsContent: ReactNode = null;
  if (auditFlags && auditFlags.length > 0) {
    auditFlagsContent = (
      <Sheet open={auditSheetOpen} onOpenChange={setAuditSheetOpen}>
        <SheetTrigger asChild>
          <button type="button" className="cursor-pointer">
            <Badge tone="high">
              <AlertTriangle className="mr-1 h-3 w-3" />
              {t("worklog.auditFlagCount", { count: auditFlags.length })}
            </Badge>
          </button>
        </SheetTrigger>
        <SheetContent side="right" closeButtonAriaLabel={t("ui.close")}>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              {t("worklog.auditFlags")}
            </SheetTitle>
            <SheetDescription>{t("worklog.auditFlagsDescription")}</SheetDescription>
          </SheetHeader>
          <div className="space-y-2 px-4 pb-4">
            {auditFlags.map((flag) => (
              <div
                key={`${flag.title}-${flag.detail}`}
                className="rounded-xl border-2 border-border-subtle bg-field p-3 shadow-clay-inset"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{flag.title}</p>
                  <Badge tone={flag.severity} className="shrink-0">
                    {formatAuditSeverity(flag.severity)}
                  </Badge>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {flag.detail}
                </p>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    );
  } else if (auditFlags) {
    auditFlagsContent = (
      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-success" />
        {t("common.noFlags")}
      </span>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-end gap-3">{auditFlagsContent}</div>

      {renderIssuesList()}

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
