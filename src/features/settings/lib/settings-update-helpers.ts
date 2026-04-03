/**
 * Pure helpers for the settings Updates section.
 */

export function parseUpdateDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatByteProgress(downloadedBytes: number, totalBytes?: number): string {
  const formatter = new Intl.NumberFormat(undefined, {
    style: "unit",
    unit: "megabyte",
    unitDisplay: "narrow",
    maximumFractionDigits: 1,
  });
  const downloadedLabel = formatter.format(downloadedBytes / 1024 / 1024);

  if (!totalBytes || totalBytes <= 0) {
    return downloadedLabel;
  }

  return `${downloadedLabel} / ${formatter.format(totalBytes / 1024 / 1024)}`;
}
