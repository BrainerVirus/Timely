import { useAnimate } from "motion/react";
import { useLayoutEffect, useRef } from "react";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { useFormatHours } from "@/hooks/use-format-hours";
import { easeOut } from "@/lib/animations";
import { cn } from "@/lib/utils";

import type { DayOverview } from "@/types/dashboard";

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
  title = "Week",
  note = "Hours across the current week.",
  showHeading = true,
  dataOnboarding,
  startDate,
  viewMode = "week",
  onSelectDay,
}: WeekViewProps) {
  const fh = useFormatHours();
  const [scope, animate] = useAnimate();
  const previousLayoutSignatureRef = useRef<string | null>(null);
  const gridClassName =
    viewMode === "period"
      ? "grid grid-cols-2 gap-3 @sm:grid-cols-3 @xl:grid-cols-4 @2xl:grid-cols-5"
      : "grid grid-cols-2 gap-3 @sm:grid-cols-3 @lg:grid-cols-5";
  const animationKey = `${viewMode}:${startDate ?? "none"}:${week.map((day) => day.date).join("|")}`;

  useLayoutEffect(() => {
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

    const runAnimation = (forceReplay = false) => {
      const itemElements = Array.from(
        element.querySelectorAll("[data-grid-stagger-item='true']"),
      ) as HTMLElement[];
      if (itemElements.length === 0) {
        previousLayoutSignatureRef.current = null;
        return;
      }

      const measurement = measureGridItems(element, itemElements);
      if (!forceReplay && previousLayoutSignatureRef.current === measurement.signature) {
        return;
      }

      previousLayoutSignatureRef.current = measurement.signature;
      stopControls();
      clearWillChange(itemElements);

      for (const item of itemElements) {
        item.style.opacity = "0";
        item.style.transform = "translateY(8px)";
        item.style.willChange = "opacity, transform";
      }

      frameId = requestAnimationFrame(() => {
        controls = measurement.items.map((item) =>
          animate(
            item.element,
            { opacity: 1, y: 0 },
            {
              type: "tween",
              duration: 0.34,
              ease: [...easeOut],
              delay: item.delay,
            },
          ),
        );
      });
    };

    runAnimation(true);

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
  }, [animate, animationKey, scope]);

  return (
    <div className="space-y-4" data-onboarding={dataOnboarding}>
      {showHeading ? <SectionHeading title={title} note={note} /> : null}
      <div ref={scope} className={gridClassName}>
        {week.map((day, i) => {
          const date = startDate ? shiftDate(parseDateInputValue(startDate), i) : null;
          const isToday = day.isToday;
          const hasHoliday = Boolean(day.holidayName);
          const holidayTone = day.loggedHours > 0 ? "holiday-worked" : "holiday-empty";
          const cardClassName = cn(
            "flex h-full min-h-44 w-full flex-col rounded-2xl border-2 border-border bg-muted p-3 text-left transition-all",
            "shadow-[2px_2px_0_0_var(--color-border)]",
            isToday &&
              "border-primary/55 bg-[color-mix(in_oklab,var(--color-card)_80%,var(--color-primary)_20%)] shadow-[2px_2px_0_0_var(--color-primary)]",
            hasHoliday &&
              (holidayTone === "holiday-empty"
                ? "border-warning/65 bg-[color-mix(in_oklab,var(--color-card)_76%,var(--color-warning)_24%)] shadow-[2px_2px_0_0_color-mix(in_oklab,var(--color-warning)_65%,var(--color-border))]"
                : "border-warning/65 bg-[color-mix(in_oklab,var(--color-card)_70%,var(--color-warning)_30%)] shadow-[2px_2px_0_0_color-mix(in_oklab,var(--color-warning)_70%,var(--color-border))]"),
            isToday &&
              hasHoliday &&
              "ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
            onSelectDay &&
              "cursor-pointer hover:border-primary/20 hover:bg-card active:translate-y-[1px] active:shadow-none",
          );

          const content = (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-base font-semibold text-foreground">
                  {day.shortLabel}
                </span>
                <span className="text-xs text-muted-foreground">{day.dateLabel}</span>
              </div>

              {isToday || hasHoliday ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {isToday ? (
                    <Badge tone="planned" className="text-[0.62rem]">
                      Today
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
                target {fh(day.targetHours)}
              </p>

              <div className="mt-auto pt-3">
                <Badge tone={day.status} className="text-[0.65rem]">
                  {day.status.replaceAll("_", " ")}
                </Badge>
              </div>
            </>
          );

          return (
            <div
              key={day.date}
              data-grid-stagger-item="true"
              className="h-full"
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
            </div>
          );
        })}
      </div>
    </div>
  );
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
  });
  const maxDistance = indexedItems.reduce((current, item) => {
    const distance = Math.hypot(item.colIndex - origin.colIndex, item.rowIndex - origin.rowIndex);
    return Math.max(current, distance);
  }, 0);
  const maxDelay = maxDistance === 0 ? 0 : Math.max(0.18, maxDistance * 0.055);
  const measuredItems = indexedItems
    .map((item) => {
      const distance = Math.hypot(item.colIndex - origin.colIndex, item.rowIndex - origin.rowIndex);

      return {
        element: item.element,
        domIndex: item.domIndex,
        rowIndex: item.rowIndex,
        colIndex: item.colIndex,
        delay: maxDistance === 0 ? 0.02 : 0.02 + (distance / maxDistance) * maxDelay,
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
