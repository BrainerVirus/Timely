import { m } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { useFormatHours } from "@/app/hooks/use-format-hours/use-format-hours";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { Badge } from "@/shared/ui/Badge/Badge";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { SectionHeading } from "@/shared/ui/SectionHeading/SectionHeading";
import { easeOut } from "@/shared/lib/animations/animations";
import { cn } from "@/shared/lib/utils";

import type { DayOverview } from "@/shared/types/dashboard";

type GridColumnCount = 2 | 3 | 4 | 5;

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
  const fh = useFormatHours();
  const { formatDate, formatDayStatus, formatWeekdayFromDate, t } = useI18n();
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
            const date = startDate ? shiftDate(parseDateInputValue(startDate), i) : null;
            const cardDate = date ?? parseDateInputValue(day.date);
            const cardDateLabel = formatCardDateLabel(cardDate, formatDate, formatWeekdayFromDate);
            const isToday = day.isToday;
            const hasHoliday = Boolean(day.holidayName);
            const holidayTone = day.loggedHours > 0 ? "holiday-worked" : "holiday-empty";
            const delay = allowDecorativeAnimation
              ? getGridCascadeDelay(i, gridColumns, week.length)
              : 0;
            const cardClassName = cn(
              "flex h-full min-h-44 w-full flex-col rounded-2xl border-2 border-border-subtle bg-panel-elevated p-3 text-left transition-all",
              "shadow-card",
              isToday &&
                "border-primary/55 bg-[color-mix(in_oklab,var(--color-panel-elevated)_82%,var(--color-primary)_18%)] shadow-button-soft",
              hasHoliday &&
                (holidayTone === "holiday-empty"
                  ? "border-warning/65 bg-[color-mix(in_oklab,var(--color-panel-elevated)_78%,var(--color-warning)_22%)] shadow-card"
                  : "border-warning/65 bg-[color-mix(in_oklab,var(--color-panel)_72%,var(--color-warning)_28%)] shadow-card"),
              isToday &&
                hasHoliday &&
                "ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
              onSelectDay &&
                "cursor-pointer hover:border-primary/20 hover:bg-panel active:translate-y-px active:shadow-none",
            );

            const content = (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-base font-semibold text-foreground capitalize">
                    {cardDateLabel}
                  </span>
                </div>

                {isToday || hasHoliday ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {isToday ? (
                      <Badge tone="planned" className="text-[0.62rem]">
                        {t("common.today")}
                      </Badge>
                    ) : null}
                    {hasHoliday ? (
                      <Badge tone="holiday" className="max-w-full truncate text-[0.62rem]">
                        {day.holidayName}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}

                <p className="mt-2 font-display text-2xl font-semibold text-foreground">
                  {fh(day.loggedHours)}
                </p>
                <p className="mt-0.5 text-xs tracking-wide text-muted-foreground uppercase">
                  {t("week.target", { hours: fh(day.targetHours) })}
                </p>

                <div className="mt-auto pt-3">
                  <Badge tone={day.status} className="text-[0.65rem]">
                    {formatDayStatus(day.status)}
                  </Badge>
                </div>
              </>
            );

            return (
              <m.div
                key={day.date}
                data-grid-stagger-item="true"
                className="h-full"
                initial={allowDecorativeAnimation ? { opacity: 0, y: 8 } : { opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  allowDecorativeAnimation
                    ? {
                        type: "tween",
                        duration: 0.4,
                        ease: [...easeOut],
                        delay,
                      }
                    : { duration: 0 }
                }
              >
                {onSelectDay && date ? (
                  <button
                    type="button"
                    onClick={() => onSelectDay(day, date)}
                    className={cardClassName}
                  >
                    {content}
                  </button>
                ) : (
                  <div className={cardClassName}>{content}</div>
                )}
              </m.div>
            );
          })}
        </m.div>
      )}
    </div>
  );
}

function formatCardDateLabel(
  date: Date,
  formatDate: (date: Date, options: Intl.DateTimeFormatOptions) => string,
  formatWeekdayFromDate: (date: Date, style?: "short" | "narrow" | "long") => string,
) {
  return `${formatWeekdayFromDate(date, "long")} ${formatDate(date, { day: "2-digit" })}`;
}

function getGridClassName(viewMode: WeekViewProps["viewMode"]) {
  if (viewMode === "period") {
    return "grid grid-cols-2 gap-3 [--worklog-grid-columns:2] @sm:grid-cols-3 @sm:[--worklog-grid-columns:3] @xl:grid-cols-4 @xl:[--worklog-grid-columns:4] @2xl:grid-cols-5 @2xl:[--worklog-grid-columns:5]";
  }

  return "grid grid-cols-2 gap-3 [--worklog-grid-columns:2] @sm:grid-cols-3 @sm:[--worklog-grid-columns:3] @lg:grid-cols-5 @lg:[--worklog-grid-columns:5]";
}

function getFallbackGridColumnCount(viewMode: WeekViewProps["viewMode"]): GridColumnCount {
  return viewMode === "period" ? 2 : 2;
}

function readGridColumnCount(
  element: HTMLElement,
  viewMode: WeekViewProps["viewMode"],
): GridColumnCount {
  const rawValue = Number.parseInt(
    window.getComputedStyle(element).getPropertyValue("--worklog-grid-columns").trim(),
    10,
  );

  if (viewMode === "period") {
    if (rawValue === 3 || rawValue === 4 || rawValue === 5) {
      return rawValue;
    }
    return 2;
  }

  if (rawValue === 3 || rawValue === 5) {
    return rawValue;
  }
  return 2;
}

function getGridCascadeDelay(index: number, columns: GridColumnCount, totalItems: number) {
  const rowIndex = Math.floor(index / columns);
  const colIndex = index % columns;
  const maxRowIndex = Math.floor(Math.max(0, totalItems - 1) / columns);
  const maxColIndex = Math.min(columns - 1, Math.max(0, totalItems - 1));
  const maxDistance = Math.hypot(maxColIndex, maxRowIndex);
  const distance = Math.hypot(colIndex, rowIndex);
  const maxDelay = maxDistance === 0 ? 0 : Math.max(0.22, maxDistance * 0.065);

  return maxDistance === 0 ? 0.04 : 0.04 + (distance / maxDistance) * maxDelay;
}

function parseDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function shiftDate(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}
