import type { DurationParts } from "@/domains/issues/types/duration";

const minutesPerHour = 60;
const hoursPerDay = 8;
const daysPerWeek = 5;
const minutesPerDay = hoursPerDay * minutesPerHour;
const minutesPerWeek = daysPerWeek * minutesPerDay;

const previewUnits = [
  ["weeks", "week"],
  ["days", "day"],
  ["hours", "hour"],
  ["minutes", "minute"],
] as const;

export function durationPartsToTotalMinutes(parts: Readonly<DurationParts>) {
  return (
    Math.max(0, Math.trunc(parts.weeks)) * minutesPerWeek +
    Math.max(0, Math.trunc(parts.days)) * minutesPerDay +
    Math.max(0, Math.trunc(parts.hours)) * minutesPerHour +
    Math.max(0, Math.trunc(parts.minutes))
  );
}

export function normalizeDurationParts(parts: Readonly<DurationParts>): DurationParts {
  let totalMinutes = durationPartsToTotalMinutes(parts);
  const weeks = Math.floor(totalMinutes / minutesPerWeek);
  totalMinutes -= weeks * minutesPerWeek;
  const days = Math.floor(totalMinutes / minutesPerDay);
  totalMinutes -= days * minutesPerDay;
  const hours = Math.floor(totalMinutes / minutesPerHour);
  const minutes = totalMinutes - hours * minutesPerHour;

  return { weeks, days, hours, minutes };
}

export function formatDurationPreview(parts: Readonly<DurationParts>, locale: string) {
  const normalized = normalizeDurationParts(parts);
  const formattedParts = previewUnits.flatMap(([key, unit]) => {
    const value = normalized[key];

    if (value <= 0) {
      return [];
    }

    return [
      new Intl.NumberFormat(locale, {
        style: "unit",
        unit,
        unitDisplay: "long",
      }).format(value),
    ];
  });

  return formattedParts.length > 0 ? formattedParts.join(" ") : "No time selected";
}

export function formatDurationForGitLab(parts: Readonly<DurationParts>) {
  return formatProviderDuration(parts);
}

export function formatDurationForYouTrackWorkItem(parts: Readonly<DurationParts>) {
  return formatProviderDuration(parts);
}

export function formatDurationForProvider(parts: Readonly<DurationParts>, provider: string) {
  if (provider === "youtrack") {
    return formatDurationForYouTrackWorkItem(parts);
  }

  return formatDurationForGitLab(parts);
}

function formatProviderDuration(parts: Readonly<DurationParts>) {
  const normalized = normalizeDurationParts(parts);
  const tokens = [
    [normalized.weeks, "w"],
    [normalized.days, "d"],
    [normalized.hours, "h"],
    [normalized.minutes, "m"],
  ] as const;
  const formatted = tokens.flatMap(([value, unit]) => (value > 0 ? [`${value}${unit}`] : []));

  return formatted.join(" ");
}
