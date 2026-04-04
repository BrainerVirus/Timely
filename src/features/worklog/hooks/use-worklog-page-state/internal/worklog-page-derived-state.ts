import {
  clampDateToRange,
  isMonthRangeForDate,
  isSameDay,
  isSameWeek,
  parseDateInputValue,
  type PeriodRangeState,
} from "@/features/worklog/lib/worklog-date-utils";
import {
  findMatchingDay,
  getFallbackSnapshotEntry,
  type WorklogSnapshotEntry,
} from "@/features/worklog/services/worklog-snapshot-cache/worklog-snapshot-cache";

import type {
  ResolvedWorklogMode,
  WorklogUiState,
} from "@/features/worklog/state/worklog-ui-state/worklog-ui-state";
import type { BootstrapPayload } from "@/shared/types/dashboard";

interface CreateWorklogDerivedStateArgs {
  detailDate: Date | null;
  displayMode: ResolvedWorklogMode;
  formatDateRange: (from: Date, to: Date) => string;
  payload: BootstrapPayload;
  periodRange: PeriodRangeState;
  referenceDate: Date;
  snapshotEntries: Record<ResolvedWorklogMode, WorklogSnapshotEntry>;
  uiState: WorklogUiState;
  bootstrapWeekSnapshot: NonNullable<WorklogSnapshotEntry["snapshot"]>;
}

export function createWorklogDerivedState({
  detailDate,
  displayMode,
  formatDateRange,
  payload,
  periodRange,
  referenceDate,
  snapshotEntries,
  uiState,
  bootstrapWeekSnapshot,
}: CreateWorklogDerivedStateArgs) {
  const selectedDate = getSelectedDateByMode(displayMode, uiState);
  const activeDate = resolveActiveDate(displayMode, detailDate, periodRange, selectedDate);
  const activeSnapshotEntry = snapshotEntries[displayMode];
  const fallbackSnapshotEntry = getFallbackSnapshotEntry(
    displayMode,
    activeSnapshotEntry,
    snapshotEntries,
  );
  const currentSnapshot =
    displayMode === "week"
      ? (snapshotEntries.week.snapshot ?? bootstrapWeekSnapshot)
      : fallbackSnapshotEntry.snapshot;
  const selectedDay =
    currentSnapshot && activeDate
      ? (findMatchingDay(currentSnapshot.days, activeDate) ?? currentSnapshot.selectedDay)
      : null;

  return {
    activeDate,
    activeSnapshotEntry,
    currentSnapshot,
    currentSnapshotDays:
      displayMode === "week"
        ? (snapshotEntries.week.snapshot?.days ?? bootstrapWeekSnapshot.days)
        : (snapshotEntries[displayMode].snapshot?.days ?? []),
    currentWeekRange: formatSnapshotRange(currentSnapshot, formatDateRange),
    hasAnySnapshot: Object.values(snapshotEntries).some((entry) => entry.snapshot !== null),
    isCurrentDay: isSameDay(activeDate ?? referenceDate, referenceDate),
    isCurrentPeriod: isMonthRangeForDate(periodRange, referenceDate),
    isCurrentWeek: activeDate
      ? isSameWeek(activeDate, referenceDate, payload.schedule.weekStart, payload.schedule.timezone)
      : false,
    periodLabel: formatSnapshotRange(currentSnapshot, formatDateRange),
    selectedDay,
  };
}

function getSelectedDateByMode(displayMode: ResolvedWorklogMode, uiState: WorklogUiState) {
  if (displayMode === "week") {
    return uiState.week.selectedDate;
  }
  if (displayMode === "period") {
    return uiState.period.selectedDate;
  }
  return uiState.day.selectedDate;
}

function resolveActiveDate(
  displayMode: ResolvedWorklogMode,
  detailDate: Date | null,
  periodRange: PeriodRangeState,
  selectedDate: Date,
) {
  if (displayMode === "period") {
    const nextDate = detailDate ? clampDateToRange(detailDate, periodRange) : selectedDate;
    return clampDateToRange(nextDate, periodRange);
  }

  return detailDate ?? selectedDate;
}

function formatSnapshotRange(
  snapshot: WorklogSnapshotEntry["snapshot"],
  formatDateRange: (from: Date, to: Date) => string,
) {
  if (!snapshot) {
    return "";
  }

  return formatDateRange(
    parseDateInputValue(snapshot.range.startDate),
    parseDateInputValue(snapshot.range.endDate),
  );
}
