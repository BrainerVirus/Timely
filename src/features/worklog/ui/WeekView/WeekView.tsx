import { m } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { groupPeriodDaysByCalendarWeek } from "@/features/worklog/lib/worklog-date-utils";
import {
  formatCardDateLabel,
  getCardAnimation,
  getFallbackGridColumnCount,
  getGridCascadeDelay,
  getGridClassName,
  readGridColumnCount,
  resolveCardDate,
  type GridColumnCount,
} from "@/features/worklog/ui/WeekView/internal/week-view-helpers";
import { WeekDayCard } from "@/features/worklog/ui/WeekView/internal/WeekDayCard/WeekDayCard";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { SectionHeading } from "@/shared/ui/SectionHeading/SectionHeading";

import type { DayOverview } from "@/shared/types/dashboard";

interface WeekViewProps {
  week: DayOverview[];
  title?: string;
  note?: string;
  showHeading?: boolean;
  dataOnboarding?: string;
  startDate?: string;
  rangeEndDate?: string;
  weekStart?: string;
  timezone?: string;
  viewMode?: "week" | "period";
  onSelectDay?: (day: DayOverview, date: Date) => void;
}

export type { WeekViewProps };

export function WeekView({
  week,
  title,
  note,
  showHeading = true,
  dataOnboarding,
  startDate,
  rangeEndDate,
  weekStart,
  timezone = "UTC",
  viewMode = "week",
  onSelectDay,
}: Readonly<WeekViewProps>) {
  const { formatDate, formatWeekdayFromDate, t } = useI18n();
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const resolvedTitle = title ?? t("dashboard.weekTitle");
  const resolvedNote = note ?? t("dashboard.weekNote");
  const [gridColumns, setGridColumns] = useState<GridColumnCount>(() =>
    getFallbackGridColumnCount(viewMode),
  );
  const gridClassName = getGridClassName(viewMode);
  const weekDatesKey = week.map((day) => day.date).join("|");
  const animationKey =
    viewMode === "period"
      ? [viewMode, startDate ?? "none", rangeEndDate ?? "none", weekStart ?? "auto", timezone, weekDatesKey].join(":")
      : [viewMode, startDate ?? "none", weekDatesKey].join(":");
  const isEmpty = week.length === 0;
  const periodCells =
    viewMode === "period" && startDate && rangeEndDate
      ? groupPeriodDaysByCalendarWeek(week, startDate, rangeEndDate, weekStart, timezone).flat()
      : week.map((day) => ({ kind: "day" as const, date: day.date, day }));

  useLayoutEffect(() => {
    const element = gridRef.current;
    if (!element) {
      return;
    }

    const nextColumnCount = readGridColumnCount(element, viewMode);
    if (nextColumnCount !== gridColumns) {
      setGridColumns(nextColumnCount);
    }
  }, [animationKey, gridColumns, viewMode]);

  return (
    <div className="space-y-4" data-onboarding={dataOnboarding}>
      {showHeading ? <SectionHeading title={resolvedTitle} note={resolvedNote} /> : null}
      {isEmpty ? (
        <div className="flex min-h-64 items-center justify-center">
          <EmptyState
            title={t("worklog.noIssues")}
            description={t("worklog.pickDifferentDate")}
            mood="idle"
            foxSize={84}
            variant="plain"
            animationStyle="together"
            disableInnerAnimation
            allowDecorativeAnimation={allowDecorativeAnimation}
            windowVisibility={windowVisibility}
          />
        </div>
      ) : (
        <m.div
          key={animationKey}
          ref={gridRef}
          className={gridClassName}
          data-grid-animation-key={animationKey}
          initial={false}
        >
          {periodCells.map((cell, i) => {
            if (cell.kind === "placeholder") {
              return (
                <m.div
                  key={`placeholder:${cell.date}`}
                  data-grid-stagger-item="true"
                  aria-disabled="true"
                  className="min-h-44 rounded-2xl border-2 border-dashed border-border-subtle/70 bg-muted/30 shadow-card"
                  initial={
                    allowDecorativeAnimation ? { opacity: 0, y: 8 } : { opacity: 1, y: 0 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  transition={getCardAnimation(
                    allowDecorativeAnimation,
                    allowDecorativeAnimation
                      ? getGridCascadeDelay(i, gridColumns, periodCells.length)
                      : 0,
                  )}
                />
              );
            }

            const day = cell.day;
            const date = resolveCardDate(day);
            const cardDateLabel = formatCardDateLabel(date, formatDate, formatWeekdayFromDate);
            const delay = allowDecorativeAnimation
              ? getGridCascadeDelay(i, gridColumns, periodCells.length)
              : 0;

            return (
              <WeekDayCard
                key={day.date}
                day={day}
                date={date}
                cardDateLabel={cardDateLabel}
                allowDecorativeAnimation={allowDecorativeAnimation}
                onSelectDay={onSelectDay}
                transition={getCardAnimation(allowDecorativeAnimation, delay)}
              />
            );
          })}
        </m.div>
      )}
    </div>
  );
}
