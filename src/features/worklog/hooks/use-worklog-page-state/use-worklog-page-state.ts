import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useI18n } from "@/core/services/I18nService/i18n";
import { getAppPreferencesCached } from "@/core/services/PreferencesCache/preferences-cache";
import { loadHolidayYear, loadWorklogSnapshot } from "@/core/services/TauriService/tauri";
import { getWeekStartsOnIndex, resolveHolidayCountryCode } from "@/shared/utils/utils";

import type {
  AppPreferences,
  BootstrapPayload,
  DayOverview,
  HolidayListItem,
  WorklogSnapshot,
} from "@/shared/types/dashboard";
import type { DateRange } from "react-day-picker";

export type WorklogMode = "day" | "week" | "period" | "month" | "range";

export interface PeriodRangeState {
  from: Date;
  to: Date;
}

interface DayModeState {
  selectedDate: Date;
  visibleMonth: Date;
  calendarOpen: boolean;
}

interface WeekModeState {
  selectedDate: Date;
  visibleMonth: Date;
  calendarOpen: boolean;
}

interface PeriodModeState {
  selectedDate: Date;
  committedRange: PeriodRangeState;
  draftRange: DateRange | undefined;
  calendarOpen: boolean;
  visibleMonth: Date;
}

interface WorklogUiState {
  day: DayModeState;
  week: WeekModeState;
  period: PeriodModeState;
}

type ResolvedWorklogMode = "day" | "week" | "period";

interface SnapshotRequestDescriptor {
  requestKey: string;
  params: {
    mode: "day" | "week" | "range";
    anchorDate: string;
    endDate?: string;
  };
}

interface WorklogSnapshotEntry {
  snapshot: WorklogSnapshot | null;
  requestKey: string | null;
  status: "idle" | "ready" | "error";
  errorMessage: string | null;
  syncVersion: number | null;
}

const worklogSnapshotCache: Record<ResolvedWorklogMode, WorklogSnapshotEntry> = {
  day: createInitialSnapshotEntry(),
  week: createInitialSnapshotEntry(),
  period: createInitialSnapshotEntry(),
};

const worklogSnapshotTokens: Record<ResolvedWorklogMode, number> = {
  day: 0,
  week: 0,
  period: 0,
};

function cloneSnapshotEntries(entries: Record<ResolvedWorklogMode, WorklogSnapshotEntry>) {
  return {
    day: { ...entries.day },
    week: { ...entries.week },
    period: { ...entries.period },
  };
}

function updateWorklogSnapshotCache(
  resolvedMode: ResolvedWorklogMode,
  entry: WorklogSnapshotEntry,
) {
  worklogSnapshotCache[resolvedMode] = entry;
}

function createSeededSnapshotEntries(
  payload: BootstrapPayload,
  syncVersion: number,
): Record<ResolvedWorklogMode, WorklogSnapshotEntry> {
  const todayRequest = buildSingleSnapshotRequest("day", parseDateInputValue(payload.today.date));
  const weekAnchorDate =
    payload.week.find((day) => day.isToday)?.date ?? payload.week[0]?.date ?? payload.today.date;
  const weekRequest = buildSingleSnapshotRequest("week", parseDateInputValue(weekAnchorDate));

  return {
    day: {
      snapshot: {
        mode: "day",
        range: {
          startDate: payload.today.date,
          endDate: payload.today.date,
          label: payload.today.dateLabel,
        },
        selectedDay: payload.today,
        days: [payload.today],
        month: payload.month,
        auditFlags: payload.auditFlags,
      },
      requestKey: todayRequest.requestKey,
      status: "ready",
      errorMessage: null,
      syncVersion,
    },
    week: {
      snapshot: {
        mode: "week",
        range: {
          startDate: payload.week[0]?.date ?? payload.today.date,
          endDate: payload.week[payload.week.length - 1]?.date ?? payload.today.date,
          label: "",
        },
        selectedDay: payload.week.find((day) => day.isToday) ?? payload.week[0] ?? payload.today,
        days: payload.week,
        month: buildWeekSnapshotMonth(payload.week, payload.month),
        auditFlags: payload.auditFlags,
      },
      requestKey: weekRequest.requestKey,
      status: "ready",
      errorMessage: null,
      syncVersion,
    },
    period: createInitialSnapshotEntry(),
  };
}

function primeWorklogSnapshotCache(payload: BootstrapPayload, syncVersion: number) {
  const seededEntries = createSeededSnapshotEntries(payload, syncVersion);

  (Object.keys(seededEntries) as ResolvedWorklogMode[]).forEach((mode) => {
    const cachedEntry = worklogSnapshotCache[mode];
    const seededEntry = seededEntries[mode];

    if (seededEntry.snapshot === null) {
      return;
    }

    if (cachedEntry.snapshot === null || (cachedEntry.syncVersion ?? -1) < syncVersion) {
      updateWorklogSnapshotCache(mode, seededEntry);
    }
  });
}

export function prefetchWorklogSnapshots(payload: BootstrapPayload, syncVersion: number) {
  primeWorklogSnapshotCache(payload, syncVersion);

  const today = parseDateInputValue(payload.today.date);
  const currentPeriod = getCurrentMonthRange();

  void loadSnapshotIntoCache("day", buildSingleSnapshotRequest("day", today), syncVersion);
  void loadSnapshotIntoCache("week", buildSingleSnapshotRequest("week", today), syncVersion);
  void loadSnapshotIntoCache("period", buildPeriodSnapshotRequest(currentPeriod), syncVersion);
}

export function resetWorklogSnapshotCache() {
  updateWorklogSnapshotCache("day", createInitialSnapshotEntry());
  updateWorklogSnapshotCache("week", createInitialSnapshotEntry());
  updateWorklogSnapshotCache("period", createInitialSnapshotEntry());
  worklogSnapshotTokens.day = 0;
  worklogSnapshotTokens.week = 0;
  worklogSnapshotTokens.period = 0;
}

function loadSnapshotIntoCache(
  resolvedMode: ResolvedWorklogMode,
  request: SnapshotRequestDescriptor,
  syncVersion: number,
) {
  const cachedEntry = worklogSnapshotCache[resolvedMode];
  if (
    cachedEntry.requestKey === request.requestKey &&
    cachedEntry.syncVersion === syncVersion &&
    cachedEntry.status === "ready"
  ) {
    return Promise.resolve();
  }

  const token = worklogSnapshotTokens[resolvedMode] + 1;
  worklogSnapshotTokens[resolvedMode] = token;

  return loadWorklogSnapshot(request.params)
    .then((snapshot) => {
      if (worklogSnapshotTokens[resolvedMode] !== token) {
        return;
      }

      updateWorklogSnapshotCache(resolvedMode, {
        snapshot,
        requestKey: request.requestKey,
        status: "ready",
        errorMessage: null,
        syncVersion,
      });
    })
    .catch((error) => {
      if (worklogSnapshotTokens[resolvedMode] !== token) {
        return;
      }

      updateWorklogSnapshotCache(resolvedMode, {
        ...worklogSnapshotCache[resolvedMode],
        requestKey: request.requestKey,
        status: "error",
        errorMessage: getErrorMessage(error),
      });
    });
}

type WorklogUiAction =
  | { type: "set_day_selected_date"; date: Date }
  | { type: "set_day_visible_month"; month: Date }
  | { type: "set_day_calendar_open"; open: boolean }
  | { type: "set_week_selected_date"; date: Date }
  | { type: "set_week_visible_month"; month: Date }
  | { type: "set_week_calendar_open"; open: boolean }
  | { type: "set_period_calendar_open"; open: boolean }
  | { type: "set_period_visible_month"; month: Date }
  | { type: "set_period_draft_range"; range: DateRange | undefined }
  | { type: "commit_period_range"; range: PeriodRangeState }
  | { type: "shift_period"; days: number }
  | { type: "reset_current_period" }
  | { type: "reset_ui_state" };

interface HolidayYearsState {
  loadedYears: Record<number, HolidayListItem[]>;
  loadingYears: number[];
}

type HolidayYearsAction =
  | { type: "reset" }
  | { type: "start_loading"; years: number[] }
  | { type: "load_success"; year: number; holidays: HolidayListItem[] }
  | { type: "load_finished"; year: number };

const initialHolidayYearsState: HolidayYearsState = {
  loadedYears: {},
  loadingYears: [],
};

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
  const [uiState, dispatch] = useReducer(worklogUiReducer, undefined, createInitialWorklogUiState);
  const [snapshotEntries, setSnapshotEntries] = useState<
    Record<ResolvedWorklogMode, WorklogSnapshotEntry>
  >(() => {
    primeWorklogSnapshotCache(payload, syncVersion);
    return cloneSnapshotEntries(worklogSnapshotCache);
  });
  const [preferences, setPreferences] = useState<AppPreferences | null>(null);
  const periodRange = uiState.period.committedRange;
  const snapshotEntriesRef = useRef(snapshotEntries);
  const bootstrapWeekSnapshot = useMemo(() => createBootstrapWeekSnapshot(payload), [payload]);
  const previousDisplayModeRef = useRef(displayMode);

  useEffect(() => {
    snapshotEntriesRef.current = snapshotEntries;
  }, [snapshotEntries]);

  useEffect(() => {
    primeWorklogSnapshotCache(payload, syncVersion);
    setSnapshotEntries(cloneSnapshotEntries(worklogSnapshotCache));
  }, [payload, syncVersion]);

  useEffect(() => {
    if (previousDisplayModeRef.current === displayMode) {
      return;
    }

    previousDisplayModeRef.current = displayMode;
    dispatch({ type: "reset_ui_state" });
  }, [displayMode]);

  const isNestedDayView = displayMode !== "day" && detailDate != null;

  const getSelectedDateByMode = () => {
    if (displayMode === "week") {
      return uiState.week.selectedDate;
    }
    if (displayMode === "period") {
      return uiState.period.selectedDate;
    }
    return uiState.day.selectedDate;
  };

  const selectedDate = getSelectedDateByMode();
  const resolveDetailDate = () => {
    if (displayMode === "period") {
      return detailDate ? clampDateToRange(detailDate, periodRange) : selectedDate;
    }
    return detailDate;
  };
  const resolveSelectedDate = () => {
    if (displayMode === "period") {
      return clampDateToRange(selectedDate, periodRange);
    }
    return selectedDate;
  };
  const activeDate = isNestedDayView && detailDate ? resolveDetailDate() : resolveSelectedDate();

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
    dispatch({ type: "reset_current_period" });
  }, [closeNestedDayIfOpen]);

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
        setSnapshotEntries(cloneSnapshotEntries(worklogSnapshotCache));
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
    activeDate: activeDate ?? new Date(),
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
  const currentWeekRange = currentSnapshot
    ? formatDateRange(
        parseDateInputValue(currentSnapshot.range.startDate),
        parseDateInputValue(currentSnapshot.range.endDate),
      )
    : "";
  const periodLabel = currentSnapshot
    ? formatDateRange(
        parseDateInputValue(currentSnapshot.range.startDate),
        parseDateInputValue(currentSnapshot.range.endDate),
      )
    : "";

  return {
    activeDate: activeDate ?? new Date(),
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
    isCurrentDay: isSameDay(activeDate ?? new Date(), new Date()),
    isCurrentPeriod: isCurrentMonthRange(periodRange),
    isCurrentWeek: activeDate
      ? isSameWeek(activeDate, new Date(), payload.schedule.weekStart, payload.schedule.timezone)
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
    selectedDay,
    weekCalendarOpen: uiState.week.calendarOpen,
    weekVisibleMonth: uiState.week.visibleMonth,
  } as const;
}

function useCalendarHolidays({
  activeDate,
  currentSnapshotDays,
  displayMode,
  holidayCountryCode,
  visibleMonth,
}: {
  activeDate: Date;
  currentSnapshotDays: DayOverview[];
  displayMode: "day" | "week" | "period";
  holidayCountryCode: string | undefined;
  visibleMonth: Date;
}) {
  const visibleHolidayYears = useMemo(() => {
    if (displayMode === "period") {
      const secondMonth = new Date(visibleMonth);
      secondMonth.setMonth(secondMonth.getMonth() + 1);
      return Array.from(new Set([visibleMonth.getFullYear(), secondMonth.getFullYear()]));
    }

    return [activeDate.getFullYear()];
  }, [activeDate, displayMode, visibleMonth]);

  const [holidayYearsState, dispatchHolidayYears] = useReducer(
    holidayYearsReducer,
    initialHolidayYearsState,
  );

  useEffect(() => {
    if (!holidayCountryCode) {
      dispatchHolidayYears({ type: "reset" });
      return;
    }

    const yearsToLoad = visibleHolidayYears.filter(
      (year) =>
        holidayYearsState.loadedYears[year] == null &&
        !holidayYearsState.loadingYears.includes(year),
    );

    if (yearsToLoad.length === 0) {
      return;
    }

    dispatchHolidayYears({ type: "start_loading", years: yearsToLoad });

    yearsToLoad.forEach((year) => {
      void loadHolidayYear(holidayCountryCode, year)
        .then((holidayYear) => {
          dispatchHolidayYears({
            type: "load_success",
            year,
            holidays: holidayYear.holidays,
          });
        })
        .catch(() => {
          // best effort; snapshot-backed holidays still render
        })
        .finally(() => {
          dispatchHolidayYears({ type: "load_finished", year });
        });
    });
  }, [
    holidayCountryCode,
    holidayYearsState.loadedYears,
    holidayYearsState.loadingYears,
    visibleHolidayYears,
  ]);

  return useMemo(() => {
    const holidayDaysFromSnapshot = currentSnapshotDays
      .filter((day) => Boolean(day.holidayName))
      .map((day) => ({
        date: new Date(`${day.date}T12:00:00`),
        label: day.holidayName ?? "",
      }));

    const holidayDaysFromYears = Object.values(holidayYearsState.loadedYears)
      .flat()
      .map((holiday) => ({
        date: new Date(`${holiday.date}T12:00:00`),
        label: holiday.name,
      }));

    const merged = new Map<string, { date: Date; label: string }>();
    for (const holiday of [...holidayDaysFromYears, ...holidayDaysFromSnapshot]) {
      merged.set(toDateInputValue(holiday.date), holiday);
    }

    return Array.from(merged.values());
  }, [currentSnapshotDays, holidayYearsState.loadedYears]);
}

function holidayYearsReducer(
  state: HolidayYearsState,
  action: HolidayYearsAction,
): HolidayYearsState {
  switch (action.type) {
    case "reset":
      return initialHolidayYearsState;
    case "start_loading":
      return {
        ...state,
        loadingYears: Array.from(new Set([...state.loadingYears, ...action.years])).sort(
          (a, b) => a - b,
        ),
      };
    case "load_success":
      return {
        ...state,
        loadedYears: {
          ...state.loadedYears,
          [action.year]: action.holidays,
        },
      };
    case "load_finished":
      return {
        ...state,
        loadingYears: state.loadingYears.filter((year) => year !== action.year),
      };
    default:
      return state;
  }
}

function createInitialWorklogUiState(): WorklogUiState {
  const today = new Date();

  return {
    day: createInitialDayModeState(today),
    week: createInitialWeekModeState(today),
    period: createInitialPeriodModeState(today),
  };
}

function createInitialDayModeState(today: Date): DayModeState {
  return {
    selectedDate: today,
    visibleMonth: today,
    calendarOpen: false,
  };
}

function createInitialWeekModeState(today: Date): WeekModeState {
  const weekStart = startOfWeek(today, undefined, "UTC");
  return {
    selectedDate: weekStart,
    visibleMonth: weekStart,
    calendarOpen: false,
  };
}

function buildWeekSnapshotMonth(
  week: DayOverview[],
  fallback: BootstrapPayload["month"],
): BootstrapPayload["month"] {
  if (week.length === 0) {
    return fallback;
  }

  const loggedHours = week.reduce((total, day) => total + day.loggedHours, 0);
  const targetHours = week.reduce((total, day) => total + day.targetHours, 0);
  const cleanDays = week.filter((day) => matchesTarget(day)).length;
  const overflowDays = week.filter((day) => day.status === "over_target").length;
  const consistencyScore = targetHours > 0 ? Math.round((loggedHours / targetHours) * 100) : 0;

  return {
    loggedHours,
    targetHours,
    consistencyScore,
    cleanDays,
    overflowDays,
  };
}

function matchesTarget(day: DayOverview) {
  return day.status === "met_target" || day.status === "on_track";
}

function createInitialPeriodModeState(today: Date): PeriodModeState {
  const currentPeriod = getCurrentMonthRange();

  return {
    selectedDate: clampDateToRange(today, currentPeriod),
    committedRange: currentPeriod,
    draftRange: undefined,
    calendarOpen: false,
    visibleMonth: currentPeriod.from,
  };
}

function createBootstrapWeekSnapshot(payload: BootstrapPayload): WorklogSnapshot {
  if (payload.week.length === 0) {
    return {
      mode: "week",
      range: {
        startDate: payload.today.date,
        endDate: payload.today.date,
        label: payload.today.dateLabel,
      },
      selectedDay: payload.today,
      days: [],
      month: payload.month,
      auditFlags: payload.auditFlags,
    };
  }

  const startDate = payload.week[0]?.date ?? payload.today.date;
  const endDate = payload.week[payload.week.length - 1]?.date ?? payload.today.date;

  return {
    mode: "week",
    range: {
      startDate,
      endDate,
      label: "",
    },
    selectedDay: payload.week.find((day) => day.isToday) ?? payload.week[0] ?? payload.today,
    days: payload.week,
    month: buildWeekSnapshotMonth(payload.week, payload.month),
    auditFlags: payload.auditFlags,
  };
}

function worklogUiReducer(state: WorklogUiState, action: WorklogUiAction): WorklogUiState {
  switch (action.type) {
    case "set_day_selected_date":
      return {
        ...state,
        day: { ...state.day, selectedDate: action.date, visibleMonth: action.date },
      };
    case "set_day_visible_month":
      return { ...state, day: { ...state.day, visibleMonth: action.month } };
    case "set_day_calendar_open":
      return { ...state, day: { ...state.day, calendarOpen: action.open } };
    case "set_week_calendar_open":
      return { ...state, week: { ...state.week, calendarOpen: action.open } };
    case "set_period_calendar_open":
      return {
        ...state,
        period: {
          ...state.period,
          calendarOpen: action.open,
          draftRange: undefined,
          visibleMonth: action.open ? state.period.committedRange.from : state.period.visibleMonth,
        },
      };
    case "set_week_selected_date":
      return {
        ...state,
        week: { ...state.week, selectedDate: action.date, visibleMonth: action.date },
      };
    case "set_week_visible_month":
      return {
        ...state,
        week: { ...state.week, visibleMonth: action.month },
      };
    case "set_period_visible_month":
      return {
        ...state,
        period: { ...state.period, visibleMonth: action.month },
      };
    case "set_period_draft_range":
      return {
        ...state,
        period: { ...state.period, draftRange: action.range },
      };
    case "commit_period_range":
      return {
        ...state,
        period: {
          ...state.period,
          committedRange: action.range,
          selectedDate: clampDateToRange(state.period.selectedDate, action.range),
          draftRange: undefined,
          calendarOpen: false,
          visibleMonth: action.range.from,
        },
      };
    case "shift_period": {
      const nextRange = shiftRange(state.period.committedRange, action.days);
      return {
        ...state,
        period: {
          ...state.period,
          committedRange: nextRange,
          selectedDate: clampDateToRange(
            shiftDate(state.period.selectedDate, action.days),
            nextRange,
          ),
          draftRange: undefined,
          visibleMonth: nextRange.from,
        },
      };
    }
    case "reset_current_period": {
      const nextRange = getCurrentMonthRange();
      return {
        ...state,
        period: {
          ...state.period,
          committedRange: nextRange,
          selectedDate: clampDateToRange(new Date(), nextRange),
          draftRange: undefined,
          visibleMonth: nextRange.from,
        },
      };
    }
    case "reset_ui_state":
      return createInitialWorklogUiState();
    default:
      return state;
  }
}

function normalizeMode(mode: WorklogMode): "day" | "week" | "period" {
  if (mode === "week") return "week";
  if (mode === "period" || mode === "month" || mode === "range") return "period";
  return "day";
}

function getFallbackSnapshotEntry(
  displayMode: ResolvedWorklogMode,
  activeSnapshotEntry: WorklogSnapshotEntry,
  snapshotEntries: Record<ResolvedWorklogMode, WorklogSnapshotEntry>,
): WorklogSnapshotEntry {
  if (activeSnapshotEntry.snapshot !== null) {
    return activeSnapshotEntry;
  }

  if (activeSnapshotEntry.status === "error") {
    return activeSnapshotEntry;
  }

  // Fallback to day snapshot if displayMode snapshot is empty
  if (displayMode !== "day" && snapshotEntries.day.snapshot !== null) {
    return snapshotEntries.day;
  }

  return activeSnapshotEntry;
}

function createInitialSnapshotEntry(): WorklogSnapshotEntry {
  return {
    snapshot: null,
    requestKey: null,
    status: "idle",
    errorMessage: null,
    syncVersion: null,
  };
}

function buildSingleSnapshotRequest(
  mode: Exclude<ResolvedWorklogMode, "period">,
  date: Date,
): SnapshotRequestDescriptor {
  const anchorDate = toDateInputValue(date);
  return {
    requestKey: `${mode}:${anchorDate}`,
    params: {
      mode,
      anchorDate,
    },
  };
}

function buildPeriodSnapshotRequest(range: PeriodRangeState): SnapshotRequestDescriptor {
  const anchorDate = toDateInputValue(range.from);
  const endDate = toDateInputValue(range.to);

  return {
    requestKey: `period:${anchorDate}:${endDate}`,
    params: {
      mode: "range",
      anchorDate,
      endDate,
    },
  };
}

function findMatchingDay(days: DayOverview[], date: Date) {
  return days.find((day) => day.date === toDateInputValue(date));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return String(error);
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function shiftDate(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date, weekStart: string | undefined, timezone: string) {
  const next = new Date(date);
  const day = next.getDay();
  const weekStartsOn = getWeekStartsOnIndex(weekStart, timezone);
  const diff = (day + 7 - weekStartsOn) % 7;
  next.setDate(next.getDate() - diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isSameWeek(a: Date, b: Date, weekStart: string | undefined, timezone: string) {
  return isSameDay(startOfWeek(a, weekStart, timezone), startOfWeek(b, weekStart, timezone));
}

function shiftRange(range: PeriodRangeState, amount: number): PeriodRangeState {
  return {
    from: shiftDate(range.from, amount),
    to: shiftDate(range.to, amount),
  };
}

function getCurrentMonthRange(): PeriodRangeState {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
  };
}

function differenceInDays(a: Date, b: Date) {
  const aMidnight = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bMidnight = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((bMidnight - aMidnight) / 86_400_000);
}

function clampDateToRange(date: Date, range: PeriodRangeState) {
  if (date < range.from) return range.from;
  if (date > range.to) return range.to;
  return date;
}

function isCurrentMonthRange(range: PeriodRangeState) {
  const current = getCurrentMonthRange();
  return isSameDay(range.from, current.from) && isSameDay(range.to, current.to);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
