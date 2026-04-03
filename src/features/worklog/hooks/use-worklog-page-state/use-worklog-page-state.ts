import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { getAppPreferencesCached } from "@/app/bootstrap/PreferencesCache/preferences-cache";
import { useCalendarHolidays } from "@/features/worklog/hooks/use-calendar-holidays/use-calendar-holidays";
import { createBootstrapWeekSnapshot } from "@/features/worklog/lib/worklog-bootstrap-snapshot";
import {
  clampDateToRange,
  differenceInDays,
  isMonthRangeForDate,
  isSameDay,
  isSameWeek,
  parseDateInputValue,
  type PeriodRangeState,
} from "@/features/worklog/lib/worklog-date-utils";
import {
  buildPeriodSnapshotRequest,
  buildSingleSnapshotRequest,
  findMatchingDay,
  getCachedWorklogSnapshotEntries,
  getFallbackSnapshotEntry,
  loadSnapshotIntoCache,
  prefetchWorklogSnapshots,
  primeWorklogSnapshotCache,
  resetWorklogSnapshotCache,
  type SnapshotRequestDescriptor,
  type WorklogSnapshotEntry,
} from "@/features/worklog/services/worklog-snapshot-cache/worklog-snapshot-cache";
import {
  createInitialWorklogUiState,
  normalizeMode,
  worklogUiReducer,
  type ResolvedWorklogMode,
  type WorklogUiState,
} from "@/features/worklog/state/worklog-ui-state/worklog-ui-state";
import { getWeekStartsOnIndex, resolveHolidayCountryCode } from "@/shared/lib/utils";

import type { AppPreferences, BootstrapPayload, WorklogMode } from "@/shared/types/dashboard";
import type { DateRange } from "react-day-picker";

export type { PeriodRangeState };
export {
  prefetchWorklogSnapshots,
  resetWorklogSnapshotCache,
} from "@/features/worklog/services/worklog-snapshot-cache/worklog-snapshot-cache";

interface UseWorklogPageDataOptions {
  payload: BootstrapPayload;
  mode: WorklogMode;
  syncVersion: number;
  detailDate: Date | null;
  onCloseNestedDay: () => void;
}

export function useWorklogPageData({
  payload,
  mode,
  syncVersion,
  detailDate,
  onCloseNestedDay,
}: UseWorklogPageDataOptions) {
  const { formatDateRange } = useI18n();
  const displayMode = normalizeMode(mode);
  const referenceDate = useMemo(() => parseDateInputValue(payload.today.date), [payload.today.date]);
  const [uiState, dispatch] = useReducer(
    worklogUiReducer,
    referenceDate,
    createInitialWorklogUiState,
  );
  const [snapshotEntries, setSnapshotEntries] = useState<
    Record<ResolvedWorklogMode, WorklogSnapshotEntry>
  >(() => {
    primeWorklogSnapshotCache(payload, syncVersion);
    return getCachedWorklogSnapshotEntries();
  });
  const [preferences, setPreferences] = useState<AppPreferences | null>(null);
  const snapshotEntriesRef = useRef(snapshotEntries);
  const previousDisplayModeRef = useRef(displayMode);
  const periodRange = uiState.period.committedRange;
  const bootstrapWeekSnapshot = useMemo(() => createBootstrapWeekSnapshot(payload), [payload]);

  useEffect(() => {
    snapshotEntriesRef.current = snapshotEntries;
  }, [snapshotEntries]);

  useEffect(() => {
    primeWorklogSnapshotCache(payload, syncVersion);
    setSnapshotEntries(getCachedWorklogSnapshotEntries());
  }, [payload, syncVersion]);

  useEffect(() => {
    if (previousDisplayModeRef.current === displayMode) {
      return;
    }

    previousDisplayModeRef.current = displayMode;
    dispatch({ type: "reset_ui_state", date: referenceDate });
  }, [displayMode, referenceDate]);

  useEffect(() => {
    let cancelled = false;

    void getAppPreferencesCached()
      .then((value) => {
        if (!cancelled) {
          setPreferences(value);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreferences(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const isNestedDayView = displayMode !== "day" && detailDate != null;
  const selectedDate = getSelectedDateByMode(displayMode, uiState);
  const activeDate = resolveActiveDate(displayMode, detailDate, periodRange, selectedDate);
  const closeNestedDayIfOpen = useCallback(() => {
    if (isNestedDayView) {
      onCloseNestedDay();
    }
  }, [isNestedDayView, onCloseNestedDay]);

  const onDaySelectDate = useCallback(
    (date: Date) => {
      closeNestedDayIfOpen();
      dispatch({ type: "set_day_selected_date", date });
    },
    [closeNestedDayIfOpen],
  );
  const onWeekSelectDate = useCallback(
    (date: Date) => {
      closeNestedDayIfOpen();
      dispatch({ type: "set_week_selected_date", date });
    },
    [closeNestedDayIfOpen],
  );
  const onPeriodSelectRange = useCallback(
    (range: PeriodRangeState) => {
      closeNestedDayIfOpen();
      dispatch({ type: "commit_period_range", range });
    },
    [closeNestedDayIfOpen],
  );
  const onShiftCurrentPeriod = useCallback(
    (days: number) => {
      closeNestedDayIfOpen();
      dispatch({ type: "shift_period", days });
    },
    [closeNestedDayIfOpen],
  );
  const onResetCurrentPeriod = useCallback(() => {
    closeNestedDayIfOpen();
    dispatch({ type: "reset_current_period", date: referenceDate });
  }, [closeNestedDayIfOpen, referenceDate]);

  const periodRangeDays = Math.max(1, differenceInDays(periodRange.from, periodRange.to) + 1);
  const snapshotRequests = useMemo<Record<ResolvedWorklogMode, SnapshotRequestDescriptor>>(
    () => ({
      day: buildSingleSnapshotRequest("day", uiState.day.selectedDate),
      week: buildSingleSnapshotRequest("week", uiState.week.selectedDate),
      period: buildPeriodSnapshotRequest(periodRange),
    }),
    [periodRange, uiState.day.selectedDate, uiState.week.selectedDate],
  );

  const queueSnapshotLoad = useCallback(
    (resolvedMode: ResolvedWorklogMode, request: SnapshotRequestDescriptor) => {
      const currentEntry = snapshotEntriesRef.current[resolvedMode];
      if (
        currentEntry.requestKey === request.requestKey &&
        currentEntry.syncVersion === syncVersion &&
        currentEntry.status === "ready"
      ) {
        return;
      }

      void loadSnapshotIntoCache(resolvedMode, request, syncVersion).finally(() => {
        setSnapshotEntries(getCachedWorklogSnapshotEntries());
      });
    },
    [syncVersion],
  );

  useEffect(() => {
    queueSnapshotLoad("day", snapshotRequests.day);
  }, [queueSnapshotLoad, snapshotRequests.day, syncVersion]);
  useEffect(() => {
    queueSnapshotLoad("week", snapshotRequests.week);
  }, [queueSnapshotLoad, snapshotRequests.week, syncVersion]);
  useEffect(() => {
    queueSnapshotLoad("period", snapshotRequests.period);
  }, [queueSnapshotLoad, snapshotRequests.period, syncVersion]);

  const holidayCountryCode = preferences
    ? resolveHolidayCountryCode(
        preferences.holidayCountryMode,
        preferences.holidayCountryCode,
        payload.schedule.timezone,
      )
    : undefined;
  const currentSnapshotDays =
    displayMode === "week"
      ? (snapshotEntries.week.snapshot?.days ?? bootstrapWeekSnapshot.days)
      : (snapshotEntries[displayMode].snapshot?.days ?? []);
  const calendarHolidays = useCalendarHolidays({
    activeDate: activeDate ?? referenceDate,
    currentSnapshotDays,
    displayMode,
    holidayCountryCode,
    visibleMonth: uiState.period.visibleMonth,
  });

  const hasAnySnapshot = Object.values(snapshotEntries).some((entry) => entry.snapshot !== null);
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
  const currentWeekRange = formatSnapshotRange(currentSnapshot, formatDateRange);
  const periodLabel = formatSnapshotRange(currentSnapshot, formatDateRange);

  return {
    activeDate: activeDate ?? referenceDate,
    activeSnapshotEntry,
    calendarHolidays,
    calendarWeekStartsOn: getWeekStartsOnIndex(
      payload.schedule.weekStart,
      payload.schedule.timezone,
    ),
    currentSnapshot,
    currentWeekRange,
    dayCalendarOpen: uiState.day.calendarOpen,
    dayVisibleMonth: uiState.day.visibleMonth,
    displayMode,
    hasAnySnapshot,
    isCurrentDay: isSameDay(activeDate ?? referenceDate, referenceDate),
    isCurrentPeriod: isMonthRangeForDate(periodRange, referenceDate),
    isCurrentWeek: activeDate
      ? isSameWeek(
          activeDate,
          referenceDate,
          payload.schedule.weekStart,
          payload.schedule.timezone,
        )
      : false,
    isNestedDayView,
    onDayCalendarOpenChange: (open: boolean) => dispatch({ type: "set_day_calendar_open", open }),
    onDaySelectDate,
    onDayVisibleMonthChange: (month: Date) => dispatch({ type: "set_day_visible_month", month }),
    onPeriodCalendarOpenChange: (open: boolean) =>
      dispatch({ type: "set_period_calendar_open", open }),
    onPeriodDraftRangeChange: (range: DateRange | undefined) =>
      dispatch({ type: "set_period_draft_range", range }),
    onPeriodSelectRange,
    onPeriodVisibleMonthChange: (month: Date) =>
      dispatch({ type: "set_period_visible_month", month }),
    onResetCurrentPeriod,
    onShiftCurrentPeriod,
    onWeekCalendarOpenChange: (open: boolean) => dispatch({ type: "set_week_calendar_open", open }),
    onWeekSelectDate,
    onWeekVisibleMonthChange: (month: Date) => dispatch({ type: "set_week_visible_month", month }),
    periodCalendarOpen: uiState.period.calendarOpen,
    periodDraftRange: uiState.period.draftRange,
    periodLabel,
    periodRange,
    periodRangeDays,
    periodVisibleMonth: uiState.period.visibleMonth,
    referenceDate,
    selectedDay,
    weekCalendarOpen: uiState.week.calendarOpen,
    weekVisibleMonth: uiState.week.visibleMonth,
  } as const;
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
  formatDateRange: ReturnType<typeof useI18n>["formatDateRange"],
) {
  if (!snapshot) {
    return "";
  }

  return formatDateRange(
    parseDateInputValue(snapshot.range.startDate),
    parseDateInputValue(snapshot.range.endDate),
  );
}
