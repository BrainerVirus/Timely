function toDate(value?: string | Date | null) {
  if (!value) {
    return null;
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatIssueTimestamp(
  locale: string,
  value: string | Date | null | undefined,
  timezone: string,
) {
  const date = toDate(value);
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
}

export function formatIssueDay(
  locale: string,
  value: string | Date | null | undefined,
  timezone: string,
) {
  const date = toDate(value);
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: timezone,
  }).format(date);
}

export function formatIssueDateRange(
  locale: string,
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
  timezone: string,
) {
  const parts = [
    formatIssueDay(locale, start, timezone),
    formatIssueDay(locale, end, timezone),
  ].filter(Boolean);
  return parts.join(" - ");
}
