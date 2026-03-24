import { useAnimate } from "motion/react";
import { useLayoutEffect, useRef } from "react";
import { useFormatHours } from "@/core/hooks/use-format-hours/use-format-hours";
import { useI18n } from "@/core/services/I18nService/i18n";
import { useMotionSettings } from "@/core/services/MotionService/motion";
import { Badge } from "@/shared/components/Badge/Badge";
import { EmptyState } from "@/shared/components/EmptyState/EmptyState";
import { SectionHeading } from "@/shared/components/SectionHeading/SectionHeading";
import { easeOut } from "@/shared/utils/animations";
import { cn } from "@/shared/utils/utils";

import type { DayOverview } from "@/shared/types/dashboard";

type GridAnimationControl = {
  stop: () => void;
};

type MeasuredGridItem = {
  element: HTMLElement;
  domIndex: number;
  rowIndex: number;
  colIndex: number;
  delay: number;
};

type PositionedGridItem = {
  element: HTMLElement;
  domIndex: number;
  top: number;
  left: number;
};

type GridMeasurement = {
  items: MeasuredGridItem[];
  signature: string;
};

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
  const [scope, animate] = useAnimate();
  const previousLayoutSignatureRef = useRef<string | null>(null);
  const hasAnimatedRef = useRef(false);
  const previousAnimationKeyRef = useRef<string | null>(null);
  const { allowDecorativeAnimation } = useMotionSettings();
  const resolvedTitle = title ?? t("dashboard.weekTitle");
  const resolvedNote = note ?? t("dashboard.weekNote");
  const gridClassName =
    viewMode === "period"
      ? "grid grid-cols-2 gap-3 @sm:grid-cols-3 @xl:grid-cols-4 @2xl:grid-cols-5"
      : "grid grid-cols-2 gap-3 @sm:grid-cols-3 @lg:grid-cols-5";
  const animationKey = `${viewMode}:${startDate ?? "none"}:${week.map((day) => day.date).join("|")}`;
  const isEmpty = week.length === 0;

  useLayoutEffect(() => {
    if (isEmpty) {
      previousLayoutSignatureRef.current = null;
      previousAnimationKeyRef.current = null;
      return;
    }

    if (!allowDecorativeAnimation) {
      const element = scope.current;
      if (!element) {
        return;
      }

      const itemElements = Array.from(
        element.querySelectorAll("[data-grid-stagger-item='true']"),
      ) as HTMLElement[];

      itemElements.forEach((item) => {
        item.style.opacity = "1";
        item.style.transform = "translateY(0)";
        item.style.willChange = "";
      });
      return;
    }

    const element = scope.current;
    if (!element) {
      return;
    }

    let frameId = 0;
    let controls: GridAnimationControl[] = [];
    let resizeObserver: ResizeObserver | null = null;

    const stopControls = () => {
      controls.forEach((control) => control.stop());
      controls = [];
    };

    const clearWillChange = (items: HTMLElement[]) => {
      items.forEach((item) => {
        item.style.willChange = "";
      });
    };

    const startGridAnimation = (measurement: GridMeasurement) => {
      controls = measurement.items.map((item) =>
        animate(
          item.element,
          { opacity: 1, y: 0 },
          {
            type: "tween",
            duration: 0.4,
            ease: [...easeOut],
            delay: item.delay,
          },
        ),
      );
      hasAnimatedRef.current = true;
    };

    const runAnimation = (forceReplay = false) => {
      const itemElements = Array.from(
        element.querySelectorAll("[data-grid-stagger-item='true']"),
      ) as HTMLElement[];
      if (itemElements.length === 0) {
        previousLayoutSignatureRef.current = null;
        return;
      }

      const measurement = measureGridItems(element, itemElements);
      const hasDataChange = previousAnimationKeyRef.current !== animationKey;
      if (!forceReplay && previousLayoutSignatureRef.current === measurement.signature) {
        return;
      }

      previousLayoutSignatureRef.current = measurement.signature;
      previousAnimationKeyRef.current = animationKey;
      stopControls();
      clearWillChange(itemElements);

      if (hasAnimatedRef.current && !forceReplay && !hasDataChange) {
        for (const item of itemElements) {
          item.style.opacity = "1";
          item.style.transform = "translateY(0)";
        }
        return;
      }

      for (const item of itemElements) {
        item.style.opacity = "0";
        item.style.transform = "translateY(8px)";
        item.style.willChange = "opacity, transform";
      }

      frameId = requestAnimationFrame(() => {
        startGridAnimation(measurement);
      });
    };

    runAnimation(!hasAnimatedRef.current || previousAnimationKeyRef.current !== animationKey);

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        cancelAnimationFrame(frameId);
        frameId = requestAnimationFrame(() => {
          runAnimation(false);
        });
      });
      resizeObserver.observe(element);
    }

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      const itemElements = Array.from(
        element.querySelectorAll("[data-grid-stagger-item='true']"),
      ) as HTMLElement[];
      stopControls();
      clearWillChange(itemElements);
    };
  }, [allowDecorativeAnimation, animate, animationKey, isEmpty, scope]);

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
          />
        </div>
      ) : (
        <div ref={scope} className={gridClassName}>
          {week.map((day, i) => {
            const date = startDate ? shiftDate(parseDateInputValue(startDate), i) : null;
            const cardDate = date ?? parseDateInputValue(day.date);
            const cardDateLabel = formatCardDateLabel(cardDate, formatDate, formatWeekdayFromDate);
            const isToday = day.isToday;
            const hasHoliday = Boolean(day.holidayName);
            const holidayTone = day.loggedHours > 0 ? "holiday-worked" : "holiday-empty";
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
              <div key={day.date} data-grid-stagger-item="true" className="h-full">
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
              </div>
            );
          })}
        </div>
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

function measureGridItems(container: HTMLElement, items: HTMLElement[]): GridMeasurement {
  const containerRect = container.getBoundingClientRect();
  const positionedItems = items.map((element, domIndex) => {
    const rect = element.getBoundingClientRect();

    return {
      element,
      domIndex,
      top: rect.top - containerRect.top,
      left: rect.left - containerRect.left,
    } satisfies PositionedGridItem;
  });
  const rowBands = createBands(positionedItems.map((item) => item.top));
  const columnBands = createBands(positionedItems.map((item) => item.left));
  const indexedItems = positionedItems.map((item) => ({
    ...item,
    rowIndex: getBandIndex(rowBands, item.top),
    colIndex: getBandIndex(columnBands, item.left),
  }));
  const origin = indexedItems.reduce((current, item) => {
    if (item.rowIndex < current.rowIndex) return item;
    if (item.rowIndex === current.rowIndex && item.colIndex < current.colIndex) return item;
    return current;
  }, indexedItems[0]);
  const maxDistance = indexedItems.reduce((current, item) => {
    const distance = Math.hypot(item.colIndex - origin.colIndex, item.rowIndex - origin.rowIndex);
    return Math.max(current, distance);
  }, 0);
  const maxDelay = maxDistance === 0 ? 0 : Math.max(0.22, maxDistance * 0.065);
  const measuredItems = indexedItems
    .map((item) => {
      const distance = Math.hypot(item.colIndex - origin.colIndex, item.rowIndex - origin.rowIndex);

      return {
        element: item.element,
        domIndex: item.domIndex,
        rowIndex: item.rowIndex,
        colIndex: item.colIndex,
        delay: maxDistance === 0 ? 0.04 : 0.04 + (distance / maxDistance) * maxDelay,
      } satisfies MeasuredGridItem;
    })
    .sort((a, b) => {
      if (a.delay !== b.delay) return a.delay - b.delay;
      if (a.rowIndex !== b.rowIndex) return a.rowIndex - b.rowIndex;
      if (a.colIndex !== b.colIndex) return a.colIndex - b.colIndex;
      return a.domIndex - b.domIndex;
    });

  return {
    items: measuredItems,
    signature: measuredItems
      .map((item) => `${item.domIndex}:${item.rowIndex}:${item.colIndex}`)
      .join("|"),
  };
}

function createBands(values: number[]) {
  const sortedValues = [...values].sort((a, b) => a - b);
  const bands: number[] = [];

  for (const value of sortedValues) {
    const lastBand = bands[bands.length - 1];
    if (lastBand === undefined || Math.abs(value - lastBand) > 8) {
      bands.push(value);
    }
  }

  return bands;
}

function getBandIndex(bands: number[], value: number) {
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  bands.forEach((band, index) => {
    const distance = Math.abs(band - value);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
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
