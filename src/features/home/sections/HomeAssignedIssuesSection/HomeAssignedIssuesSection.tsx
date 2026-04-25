import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useState } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { AssignedIssueListRow } from "@/features/issues/ui/AssignedIssueListRow/AssignedIssueListRow";
import {
  getWorkflowColumnId,
  workflowStatusFilterLabel,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/workflow-column";
import { easeOut, springGentle } from "@/shared/lib/animations/animations";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/Badge/Badge";
import { Button } from "@/shared/ui/Button/Button";

import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

const PAGE_SIZE = 5;
const DOT_SLOT_PX = 32;
const DOT_GAP_PX = 10;
const BLOB_W_PX = 28;
const BLOB_H_PX = 10;

interface HomeAssignedIssuesSectionProps {
  issues: AssignedIssueSnapshot[];
  syncVersion: number;
  onOpenBoard: () => void;
  onOpenIssue: (issue: AssignedIssueSnapshot) => void;
}

export function HomeAssignedIssuesSection({
  issues,
  syncVersion,
  onOpenBoard,
  onOpenIssue,
}: Readonly<HomeAssignedIssuesSectionProps>) {
  const { t } = useI18n();
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
  const [page, setPage] = useState(1);
  const [direction, setDirection] = useState(0);

  const total = issues.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const preview = issues.length === 0 ? [] : issues.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (issues.length === 0) {
    return null;
  }

  const showPager = totalPages > 1;
  const shouldEnterRow = allowDecorativeAnimation && windowVisibility === "visible";

  const stride = DOT_SLOT_PX + DOT_GAP_PX;
  const trackWidthPx = totalPages * DOT_SLOT_PX + (totalPages - 1) * DOT_GAP_PX;
  const blobX = (page - 1) * stride + (DOT_SLOT_PX - BLOB_W_PX) / 2;

  const scaleSequence = shouldEnterRow ? [1, 1.52, 1.06, 1] : [1];

  const blobTransition = shouldEnterRow
    ? {
        x: { type: "spring" as const, stiffness: 460, damping: 34, mass: 0.85 },
        scaleX: { duration: 0.58, times: [0, 0.28, 0.62, 1], ease: easeOut },
      }
    : { duration: 0 };

  const pageGroupTransition = shouldEnterRow ? { duration: 0.24, ease: easeOut } : { duration: 0 };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-semibold text-foreground">
            {t("home.assignedIssuesTitle")}
          </h2>
          <Badge
            tone="on_track"
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-normal normal-case shadow-none",
            )}
            aria-label={t("home.assignedIssuesCountBadge", { count: total })}
          >
            {total}
          </Badge>
        </div>
        <Button type="button" variant="soft" size="sm" onClick={onOpenBoard}>
          {t("home.assignedIssuesOpenBoard")}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <AnimatePresence initial={false} mode="wait">
        <m.div
          key={page}
          role="list"
          data-testid="home-assigned-issues-list-viewport"
          className="space-y-2.5"
          initial={shouldEnterRow ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldEnterRow ? { opacity: 0, y: -8 } : undefined}
          transition={pageGroupTransition}
        >
          {preview.map((issue, index) => (
            <m.div
              key={issue.key}
              initial={shouldEnterRow ? { opacity: 0, y: 16 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={
                shouldEnterRow ? { ...springGentle, delay: 0.06 + index * 0.04 } : { duration: 0 }
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
        </m.div>
      </AnimatePresence>

      {showPager ? (
        <nav className="flex justify-center pt-0.5" aria-label={t("home.assignedIssuesPagerNav")}>
          <div
            data-testid="home-assigned-issues-pager-track"
            className="relative mt-0.5 inline-flex items-center gap-2.5"
            style={{ width: trackWidthPx, height: 28 }}
          >
            <m.div
              aria-hidden
              className="pointer-events-none absolute top-1/2 z-0 -translate-y-1/2 rounded-full bg-primary shadow-sm"
              style={{
                width: BLOB_W_PX,
                height: BLOB_H_PX,
                left: 0,
                transformOrigin:
                  direction > 0 ? "left center" : direction < 0 ? "right center" : "center center",
              }}
              initial={false}
              animate={{
                x: blobX,
                scaleX: scaleSequence,
              }}
              transition={blobTransition}
            />
            {Array.from({ length: totalPages }, (_, index) => {
              const pageNumber = index + 1;

              return (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => {
                    if (pageNumber !== page) {
                      setDirection(pageNumber > page ? 1 : -1);
                      setPage(pageNumber);
                    }
                  }}
                  aria-label={t("home.assignedIssuesPageNav", { page: pageNumber })}
                  aria-current={page === pageNumber ? "page" : undefined}
                  className={cn(
                    "relative z-10 flex h-7 w-8 cursor-pointer items-center justify-center rounded-full",
                    "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                    "hover:bg-muted/25",
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      page === pageNumber ? "bg-transparent" : "bg-muted-foreground/40",
                    )}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
        </nav>
      ) : null}
    </section>
  );
}
