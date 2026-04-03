import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { getAppPreferencesCached } from "@/app/bootstrap/PreferencesCache/preferences-cache";
import { useCalendarHolidays } from "@/features/worklog/hooks/use-calendar-holidays/use-calendar-holidays";
import { createWorklogDerivedState } from "@/features/worklog/hooks/use-worklog-page-state/internal/worklog-page-derived-state";
import { useWorklogPageActions } from "@/features/worklog/hooks/use-worklog-page-state/internal/use-worklog-page-actions";
import { createBootstrapWeekSnapshot } from "@/features/worklog/lib/worklog-bootstrap-snapshot";
import {
  differenceInDays,
  parseDateInputValue,
  type PeriodRangeState,
} from "@/features/worklog/lib/worklog-date-utils";
import {
  buildPeriodSnapshotRequest,
  buildSingleSnapshotRequest,
  getCachedWorklogSnapshotEntries,
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

  const {
    isNestedDayView,
    onDaySelectDate,
    onWeekSelectDate,
    onPeriodSelectRange,
    onShiftCurrentPeriod,
    onResetCurrentPeriod,
  } = useWorklogPageActions({
    detailDate,
    displayMode,
    onCloseNestedDay,
    referenceDate,
    dispatch,
  });

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
  const {
    activeDate,
    activeSnapshotEntry,
    currentSnapshot,
    currentSnapshotDays,
    currentWeekRange,
    hasAnySnapshot,
    isCurrentDay,
    isCurrentPeriod,
    isCurrentWeek,
    periodLabel,
    selectedDay,
  } = createWorklogDerivedState({
    detailDate,
    displayMode,
    formatDateRange,
    payload,
    periodRange,
    referenceDate,
    snapshotEntries,
    uiState,
    bootstrapWeekSnapshot,
  });
  const calendarHolidays = useCalendarHolidays({
    activeDate: activeDate ?? referenceDate,
    currentSnapshotDays,
    displayMode,
    holidayCountryCode,
    visibleMonth: uiState.period.visibleMonth,
  });

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
    isCurrentDay,
    isCurrentPeriod,
    isCurrentWeek,
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
