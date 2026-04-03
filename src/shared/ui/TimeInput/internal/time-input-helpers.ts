import type {
  DayPeriodLabels,
  DisplayParts,
  DraftValue,
  ResolvedTimeCycle,
  TimeCycle,
  TimeParts,
} from "@/shared/ui/TimeInput/internal/time-input.types";

export function getResolvedTimeCycle(timeCycle: TimeCycle = "system") {
  return resolveTimeCycle(timeCycle);
}

export function resolveTimeCycle(timeCycle: TimeCycle): ResolvedTimeCycle {
  if (timeCycle !== "system") {
    return timeCycle;
  }

  const formatter = new Intl.DateTimeFormat(undefined, { hour: "numeric" });
  const { hour12, hourCycle } = formatter.resolvedOptions();

  if (typeof hour12 === "boolean") {
    return hour12 ? "12h" : "24h";
  }

  return hourCycle?.startsWith("h1") ? "12h" : "24h";
}

export function getDayPeriodLabels(): DayPeriodLabels {
  const formatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", hour12: true });
  const am = formatter
    .formatToParts(new Date(2026, 0, 1, 9))
    .find((part) => part.type === "dayPeriod")?.value;
  const pm = formatter
    .formatToParts(new Date(2026, 0, 1, 21))
    .find((part) => part.type === "dayPeriod")?.value;

  return {
    am: am ?? "AM",
    pm: pm ?? "PM",
  };
}

export function parseTimeValue(value: string): TimeParts {
  const [rawHours = "0", rawMinutes = "0"] = value.split(":");

  return {
    hours24: clamp(Number.parseInt(rawHours, 10) || 0, 0, 23),
    minutes: clamp(Number.parseInt(rawMinutes, 10) || 0, 0, 59),
  };
}

export function formatTimeValue({ hours24, minutes }: TimeParts) {
  return `${String(hours24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function getDisplayParts(
  timeParts: TimeParts,
  resolvedTimeCycle: ResolvedTimeCycle,
): DisplayParts {
  if (resolvedTimeCycle === "24h") {
    return {
      hour: String(timeParts.hours24).padStart(2, "0"),
      minute: String(timeParts.minutes).padStart(2, "0"),
      period: "AM",
    };
  }

  const period = timeParts.hours24 >= 12 ? "PM" : "AM";
  const hour12 = timeParts.hours24 % 12 || 12;

  return {
    hour: String(hour12).padStart(2, "0"),
    minute: String(timeParts.minutes).padStart(2, "0"),
    period,
  };
}

export function normalizeDigits(value: string) {
  return value.replaceAll(/\D/g, "").slice(0, 2);
}

export function shouldAutoAdvanceHour(value: string, resolvedTimeCycle: ResolvedTimeCycle) {
  if (!value) {
    return false;
  }

  if (value.length >= 2) {
    return true;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return false;
  }

  return resolvedTimeCycle === "12h" ? parsed > 1 : parsed > 2;
}

export function shouldAutoAdvanceMinute(value: string) {
  if (!value) {
    return false;
  }

  if (value.length >= 2) {
    return true;
  }

  const parsed = Number.parseInt(value, 10);
  return !Number.isNaN(parsed) && parsed > 5;
}

export function clampHour12(value: number) {
  if (value <= 0) {
    return 12;
  }

  return clamp(value, 1, 12);
}

export function to24Hour(hour12: number, period: "AM" | "PM") {
  if (period === "AM") {
    return hour12 === 12 ? 0 : hour12;
  }

  return hour12 === 12 ? 12 : hour12 + 12;
}

export function resolveTypedPeriod(value: string, labels: DayPeriodLabels): "AM" | "PM" | null {
  const normalizedValue = normalizeLabel(value);
  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue === "a") {
    return "AM";
  }

  if (normalizedValue === "p") {
    return "PM";
  }

  const am = normalizeLabel(labels.am);
  const pm = normalizeLabel(labels.pm);

  if (normalizedValue === am || normalizedValue === am[0]) {
    return "AM";
  }

  if (normalizedValue === pm || normalizedValue === pm[0]) {
    return "PM";
  }

  return null;
}

export function getCurrentDraft(draft: DraftValue | null, value: string) {
  return draft?.sourceValue === value ? draft.text : null;
}

export function toDraftValue(text: string, value: string): DraftValue | null {
  return text ? { sourceValue: value, text } : null;
}

function normalizeLabel(value: string) {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-z0-9]+/gi, "")
    .toLowerCase();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function wrap(value: number, min: number, max: number) {
  const range = max - min + 1;
  return ((((value - min) % range) + range) % range) + min;
}
