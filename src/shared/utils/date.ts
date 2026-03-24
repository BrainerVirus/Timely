/**
 * Formats a Date as YYYY-MM-DD for use in date inputs and API params.
 */
export function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Returns a new Date shifted by the given number of days.
 */
export function shiftDate(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

/**
 * Formats a numeric delta with a sign prefix using the given formatter.
 */
export function formatSignedHours(
  formatHours: (value: number) => string,
  value: number,
): string {
  if (value > 0) return `+${formatHours(value)}`;
  if (value < 0) return `-${formatHours(Math.abs(value))}`;
  return formatHours(0);
}
