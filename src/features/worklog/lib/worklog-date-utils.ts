import { getWeekStartsOnIndex } from "@/shared/lib/utils";

export interface PeriodRangeState {
  from: Date;
  to: Date;
}

export function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseDateInputValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

export function shiftDate(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function startOfWeek(date: Date, weekStart: string | undefined, timezone: string): Date {
  const next = new Date(date);
  const day = next.getDay();
  const weekStartsOn = getWeekStartsOnIndex(weekStart, timezone);
  const diff = (day + 7 - weekStartsOn) % 7;
  next.setDate(next.getDate() - diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function isSameWeek(
  a: Date,
  b: Date,
  weekStart: string | undefined,
  timezone: string,
): boolean {
  return isSameDay(startOfWeek(a, weekStart, timezone), startOfWeek(b, weekStart, timezone));
}

export function differenceInDays(a: Date, b: Date): number {
  const aMidnight = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bMidnight = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((bMidnight - aMidnight) / 86_400_000);
}

export function shiftRange(range: PeriodRangeState, amount: number): PeriodRangeState {
  return {
    from: shiftDate(range.from, amount),
    to: shiftDate(range.to, amount),
  };
}

export function getMonthRange(date: Date): PeriodRangeState {
  return {
    from: new Date(date.getFullYear(), date.getMonth(), 1),
    to: new Date(date.getFullYear(), date.getMonth() + 1, 0),
  };
}

export function getCurrentMonthRange(): PeriodRangeState {
  return getMonthRange(new Date());
}

export function clampDateToRange(date: Date, range: PeriodRangeState): Date {
  if (date < range.from) return range.from;
  if (date > range.to) return range.to;
  return date;
}

export function isCurrentMonthRange(range: PeriodRangeState): boolean {
  return isMonthRangeForDate(range, new Date());
}

export function isMonthRangeForDate(range: PeriodRangeState, date: Date): boolean {
  const current = getMonthRange(date);
  return isSameDay(range.from, current.from) && isSameDay(range.to, current.to);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
