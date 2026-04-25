import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import { AnimatePresence, animate, m } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
/** Inactive dot + compressed indicator: 10×10 px */
const DOT_SIZE = 10;
/** Expanded active pill: 20×10 px */
const PILL_W = 20;
const PILL_H = 10;
const PILL_RADIUS = PILL_H / 2;
/**
 * Center-to-center stride so dot↔pill edge gap matches dot↔dot gap visually.
 * `STRIDE >= DOT_SIZE/2 + minGap + PILL_W/2` keeps pill from crowding neighbors.
 */
const MIN_GAP = 6;
const DOT_STRIDE = DOT_SIZE / 2 + MIN_GAP + PILL_W / 2; // 21px
const DOT_GAP_PX = DOT_STRIDE - DOT_SIZE; // 11px (flex gap between dot buttons)
/**
 * Track horizontal padding so the pill (PILL_W) can center on edge dots
 * without clipping. `left: 0` for absolute children is at the padding edge.
 */
const TRACK_PAD_X = (PILL_W - DOT_SIZE) / 2; // 5px
const TRACK_H_PX = 32;
const INDICATOR_TOP_PX = (TRACK_H_PX - PILL_H) / 2;

const TRANS_COMPRESS = { type: "spring" as const, stiffness: 720, damping: 36, mass: 0.72 };
const TRANS_TRAVEL = { type: "spring" as const, stiffness: 560, damping: 30, mass: 0.78 };
const TRANS_EXPAND = { type: "spring" as const, stiffness: 440, damping: 22, mass: 0.92 };

/**
 * Pill x from the track padding-edge (= absolute `left: 0`).
 * Aligns pill center with dot center in the flex row.
 */
function pillX(page1: number): number {
  return (page1 - 1) * DOT_STRIDE;
}

/**
 * Indicator x when compressed to dot size during travel.
 * Must account for TRACK_PAD_X because absolute origin is before the padding.
 */
function dotX(page1: number): number {
  return TRACK_PAD_X + (page1 - 1) * DOT_STRIDE;
}

function trackWidthPx(totalPages: number): number {
  return 2 * TRACK_PAD_X + totalPages * DOT_SIZE + (totalPages - 1) * DOT_GAP_PX;
}

const iconPagerButtonClass = cn(
  "inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-lg",
  "border-0 bg-transparent p-0 shadow-none outline-none",
  "text-muted-foreground transition-colors hover:text-foreground",
  "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "disabled:cursor-default disabled:opacity-30 disabled:hover:text-muted-foreground",
);

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

  const indicatorRef = useRef<HTMLDivElement>(null);
  const morphTokenRef = useRef(0);
  const pageRef = useRef(page);
  const pagerAnimatingRef = useRef(false);

  const total = issues.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const issueSetKey = issues.map((issue) => issue.key).join("|");
  const paginationKey = `${syncVersion}:${page}:${issueSetKey}`;

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    return () => {
      morphTokenRef.current += 1;
    };
  }, []);

  const preview = issues.length === 0 ? [] : issues.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (issues.length === 0) {
    return null;
  }

  const showPager = totalPages > 1;
  const shouldEnterRow = allowDecorativeAnimation && windowVisibility === "visible";

  const pageGroupTransition = shouldEnterRow
    ? { duration: 0.26, ease: easeOut }
    : { duration: 0 };

  const snapIndicator = useCallback((p: number) => {
    const el = indicatorRef.current;
    if (!el) {
      return;
    }
    void animate(
      el,
      {
        x: pillX(p),
        width: PILL_W,
        height: PILL_H,
        borderRadius: PILL_RADIUS,
      },
      { duration: 0 },
    );
  }, []);

  useLayoutEffect(() => {
    if (!showPager) {
      return;
    }
    if (pagerAnimatingRef.current) {
      return;
    }
    snapIndicator(page);
  }, [showPager, page, totalPages, snapIndicator]);

  const runMorphToPage = useCallback(
    async (target: number) => {
      const current = pageRef.current;
      if (target === current || target < 1 || target > totalPages) {
        return;
      }

      if (!shouldEnterRow) {
        setPage(target);
        requestAnimationFrame(() => {
          snapIndicator(target);
        });
        return;
      }

      const el = indicatorRef.current;
      if (!el) {
        setPage(target);
        return;
      }

      const token = ++morphTokenRef.current;
      const start = current;
      pagerAnimatingRef.current = true;

      try {
        await animate(
          el,
          {
            x: dotX(start),
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: DOT_SIZE / 2,
          },
          TRANS_COMPRESS,
        );
        if (token !== morphTokenRef.current) {
          return;
        }

        setPage(target);

        await animate(el, { x: dotX(target) }, TRANS_TRAVEL);
        if (token !== morphTokenRef.current) {
          return;
        }

        await animate(
          el,
          {
            x: pillX(target),
            width: PILL_W,
            height: PILL_H,
            borderRadius: PILL_RADIUS,
          },
          TRANS_EXPAND,
        );
      } finally {
        if (token === morphTokenRef.current) {
          pagerAnimatingRef.current = false;
          snapIndicator(pageRef.current);
        }
      }
    },
    [shouldEnterRow, snapIndicator, totalPages],
  );

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

      <AnimatePresence mode="wait">
        <m.div
          key={paginationKey}
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
              key={`${issue.key}-${issue.title}`}
              initial={shouldEnterRow ? { opacity: 0, y: 16 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={
                shouldEnterRow ? { ...springGentle, delay: 0.08 + index * 0.04 } : { duration: 0 }
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="home-assigned-issues-pager-prev"
              className={iconPagerButtonClass}
              disabled={page <= 1}
              aria-label={t("home.assignedIssuesPagerPrev")}
              onClick={() => void runMorphToPage(page - 1)}
            >
              <ChevronLeft className="size-6 shrink-0" aria-hidden strokeWidth={2} />
            </button>

            <div
              data-testid="home-assigned-issues-pager-track"
              className="relative mt-0.5 inline-flex shrink-0 items-center"
              style={{
                width: trackWidthPx(totalPages),
                height: TRACK_H_PX,
                paddingLeft: TRACK_PAD_X,
                paddingRight: TRACK_PAD_X,
                gap: DOT_GAP_PX,
              }}
            >
              <m.div
                ref={indicatorRef}
                aria-hidden
                className="pointer-events-none absolute left-0 z-0 bg-primary shadow-sm"
                style={{
                  top: INDICATOR_TOP_PX,
                  width: PILL_W,
                  height: PILL_H,
                  borderRadius: PILL_RADIUS,
                }}
              />
              {Array.from({ length: totalPages }, (_, index) => {
                const pageNumber = index + 1;
                const isCurrent = page === pageNumber;

                return (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => void runMorphToPage(pageNumber)}
                    disabled={isCurrent}
                    aria-label={t("home.assignedIssuesPageNav", { page: pageNumber })}
                    aria-current={isCurrent ? "page" : undefined}
                    className={cn(
                      "group relative z-10 flex size-2.5 shrink-0 cursor-pointer items-center justify-center rounded-full",
                      "border-0 bg-transparent p-0 shadow-none outline-none",
                      "focus-visible:outline-none",
                      "disabled:pointer-events-none",
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none size-2.5 rounded-full transition-colors",
                        "ring-offset-2 ring-offset-background",
                        "group-focus-visible:ring-2 group-focus-visible:ring-ring/55",
                        isCurrent
                          ? "bg-transparent"
                          : "bg-muted-foreground/45 group-hover:bg-foreground/65",
                      )}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              data-testid="home-assigned-issues-pager-next"
              className={iconPagerButtonClass}
              disabled={page >= totalPages}
              aria-label={t("home.assignedIssuesPagerNext")}
              onClick={() => void runMorphToPage(page + 1)}
            >
              <ChevronRight className="size-6 shrink-0" aria-hidden strokeWidth={2} />
            </button>
          </div>
        </nav>
      ) : null}
    </section>
  );
}
