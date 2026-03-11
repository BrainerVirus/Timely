import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { TIMEZONE_TO_PRIMARY_TERRITORY } from "@/lib/timezone-country-map";
import type { TimeFormat } from "@/types/dashboard";

export const WEEKDAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const WEEK_START_OPTIONS = ["auto", "sunday", "monday", "saturday", "friday"] as const;

export type WeekdayCode = (typeof WEEKDAY_ORDER)[number];
export type WeekStartPreference = (typeof WEEK_START_OPTIONS)[number];

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatHours(value: number, format: TimeFormat = "hm"): string {
  if (format === "decimal") {
    return `${value.toFixed(1)}h`;
  }
  const totalMinutes = Math.round(value * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h${m}min`;
}

export function getAutoTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function getSupportedTimezones(fallback: string): string[] {
  const maybeSupportedValuesOf = Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  };

  return maybeSupportedValuesOf.supportedValuesOf?.("timeZone") ?? [fallback];
}

export function normalizeWeekStart(value?: string | null): WeekStartPreference {
  if (value === "sunday" || value === "monday" || value === "saturday" || value === "auto") {
    return value;
  }

  return "auto";
}

export function getWeekStartForTimezone(timezone: string): Exclude<WeekStartPreference, "auto"> {
  const territory = TIMEZONE_TO_PRIMARY_TERRITORY[timezone];

  if (territory) {
    return getWeekStartForTerritory(territory);
  }

  const localeWeekInfo = getLocaleWeekInfoFromTerritory("001");

  if (localeWeekInfo === 0) return "sunday";
  if (localeWeekInfo === 6) return "saturday";
  if (localeWeekInfo === 5) return "friday";
  return "monday";
}

export function resolveWeekStart(
  weekStart: string | undefined,
  timezone: string,
): Exclude<WeekStartPreference, "auto"> {
  const normalized = normalizeWeekStart(weekStart);

  if (normalized === "auto") {
    return getWeekStartForTimezone(timezone);
  }

  return normalized;
}

export function getWeekStartsOnIndex(weekStart: string | undefined, timezone: string): 0 | 1 | 5 | 6 {
  const resolved = resolveWeekStart(weekStart, timezone);

  if (resolved === "sunday") return 0;
  if (resolved === "friday") return 5;
  if (resolved === "saturday") return 6;
  return 1;
}

export function getOrderedWorkdays(weekStart: string | undefined, timezone: string): WeekdayCode[] {
  const startsOn = getWeekStartsOnIndex(weekStart, timezone);
  return [...WEEKDAY_ORDER.slice(startsOn), ...WEEKDAY_ORDER.slice(0, startsOn)] as WeekdayCode[];
}

export function deriveInitialWeekStart(
  storedWeekStart: string | undefined,
  timezone: string,
): WeekStartPreference {
  const normalized = normalizeWeekStart(storedWeekStart);

  if (normalized === "auto") {
    return "auto";
  }

  return normalized === getWeekStartForTimezone(timezone) ? "auto" : normalized;
}

function getWeekStartForTerritory(territory: string): Exclude<WeekStartPreference, "auto"> {
  const firstDay = getLocaleWeekInfoFromTerritory(territory);

  if (firstDay === 0) return "sunday";
  if (firstDay === 6) return "saturday";
  if (firstDay === 5) return "friday";
  return "monday";
}

function getLocaleWeekInfoFromTerritory(territory: string): number {
  try {
    const locale = new Intl.Locale(`und-${territory}`);
    const firstDay = (locale as Intl.Locale & {
      getWeekInfo?: () => { firstDay?: number };
      weekInfo?: { firstDay?: number };
    }).getWeekInfo?.().firstDay ?? (locale as Intl.Locale & { weekInfo?: { firstDay?: number } }).weekInfo?.firstDay;

    if (typeof firstDay === "number") {
      return firstDay % 7;
    }
  } catch {
    // fall through to heuristic
  }

  return 1;
}
