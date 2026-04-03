import { easeOut } from "@/shared/lib/animations/animations";

import type { DayOverview } from "@/shared/types/dashboard";
import type { WeekViewProps } from "@/features/worklog/ui/WeekView/WeekView";
import type { Transition } from "motion/react";

export type GridColumnCount = 2 | 3 | 4 | 5;

export function formatCardDateLabel(
  date: Date,
  formatDate: (date: Date, options: Intl.DateTimeFormatOptions) => string,
  formatWeekdayFromDate: (date: Date, style?: "short" | "narrow" | "long") => string,
) {
  return `${formatWeekdayFromDate(date, "long")} ${formatDate(date, { day: "2-digit" })}`;
}

export function getGridClassName(viewMode: WeekViewProps["viewMode"]) {
  if (viewMode === "period") {
    return "grid grid-cols-2 gap-3 [--worklog-grid-columns:2] @sm:grid-cols-3 @sm:[--worklog-grid-columns:3] @xl:grid-cols-4 @xl:[--worklog-grid-columns:4] @2xl:grid-cols-5 @2xl:[--worklog-grid-columns:5]";
  }

  return "grid grid-cols-2 gap-3 [--worklog-grid-columns:2] @sm:grid-cols-3 @sm:[--worklog-grid-columns:3] @lg:grid-cols-5 @lg:[--worklog-grid-columns:5]";
}

export function getFallbackGridColumnCount(_viewMode: WeekViewProps["viewMode"]): GridColumnCount {
  return 2;
}

export function readGridColumnCount(
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

export function getGridCascadeDelay(index: number, columns: GridColumnCount, totalItems: number) {
  const rowIndex = Math.floor(index / columns);
  const colIndex = index % columns;
  const maxRowIndex = Math.floor(Math.max(0, totalItems - 1) / columns);
  const maxColIndex = Math.min(columns - 1, Math.max(0, totalItems - 1));
  const maxDistance = Math.hypot(maxColIndex, maxRowIndex);
  const distance = Math.hypot(colIndex, rowIndex);
  const maxDelay = maxDistance === 0 ? 0 : Math.max(0.22, maxDistance * 0.065);

  return maxDistance === 0 ? 0.04 : 0.04 + (distance / maxDistance) * maxDelay;
}

export function parseDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function shiftDate(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function getCardAnimation(
  allowDecorativeAnimation: boolean,
  delay: number,
): Transition {
  return allowDecorativeAnimation
      ? {
          type: "tween" as const,
          duration: 0.4,
          ease: [...easeOut] as [number, number, number, number],
          delay,
        }
    : { duration: 0 };
}

export function resolveCardDate(day: DayOverview, startDate: string | undefined, index: number) {
  const date = startDate ? shiftDate(parseDateInputValue(startDate), index) : null;
  return {
    date,
    cardDate: date ?? parseDateInputValue(day.date),
  };
}
