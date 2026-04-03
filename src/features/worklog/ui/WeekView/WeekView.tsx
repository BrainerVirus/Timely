import { m } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { WeekDayCard } from "@/features/worklog/ui/WeekView/internal/WeekDayCard/WeekDayCard";
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
  const animationKey = `${viewMode}:${startDate ?? "none"}:${week.map((day) => day.date).join("|")}`;
  const isEmpty = week.length === 0;

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
          {week.map((day, i) => {
            const { date, cardDate } = resolveCardDate(day, startDate, i);
            const cardDateLabel = formatCardDateLabel(cardDate, formatDate, formatWeekdayFromDate);
            const delay = allowDecorativeAnimation
              ? getGridCascadeDelay(i, gridColumns, week.length)
              : 0;

            return (
              <WeekDayCard
                key={day.date}
                day={day}
                date={date ?? cardDate}
                cardDateLabel={cardDateLabel}
                allowDecorativeAnimation={allowDecorativeAnimation}
                onSelectDay={date ? onSelectDay : undefined}
                transition={getCardAnimation(allowDecorativeAnimation, delay)}
              />
            );
          })}
        </m.div>
      )}
    </div>
  );
}
