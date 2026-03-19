import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle.js";
import CalendarIcon from "lucide-react/dist/esm/icons/calendar.js";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import Target from "lucide-react/dist/esm/icons/target.js";
import Timer from "lucide-react/dist/esm/icons/timer.js";
import { AnimatePresence, m } from "motion/react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { StaggerGroup } from "@/components/shared/page-transition";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonthView } from "@/features/dashboard/month-view";
import { RangeSummarySection } from "@/features/dashboard/range-summary-section";
import { WeekView } from "@/features/dashboard/week-view";
import { useFormatHours } from "@/hooks/use-format-hours";
import { easeOut, springGentle, staggerItem } from "@/lib/animations";
import {
  getCompactIconButtonClassName,
  getNeutralSegmentedControlClassName,
} from "@/lib/control-styles";
import { useI18n } from "@/lib/i18n";
import { loadAppPreferences, loadHolidayYear, loadWorklogSnapshot } from "@/lib/tauri";
import { cn, getWeekStartsOnIndex, resolveHolidayCountryCode } from "@/lib/utils";

import type {
  AppPreferences,
  AuditFlag,
  BootstrapPayload,
  DayOverview,
  HolidayListItem,
  IssueBreakdown,
  WorklogSnapshot,
} from "@/types/dashboard";
import type { DateRange } from "react-day-picker";

export type WorklogMode = "day" | "week" | "period" | "month" | "range";

interface PeriodRangeState {
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
  | { type: "reset_current_period" };

interface WorklogPageProps {
  payload: BootstrapPayload;
  mode: WorklogMode;
  syncVersion?: number;
  detailDate?: Date | null;
  onModeChange: (mode: WorklogMode) => void;
  onOpenNestedDay: (date: Date) => void;
  onCloseNestedDay: () => void;
}

const ISSUES_PER_PAGE = 10;

const issueToneBorder = {
  emerald: "border-l-success",
  amber: "border-l-warning",
  cyan: "border-l-primary",
  rose: "border-l-destructive",
  violet: "border-l-secondary",
} as const;

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

export function WorklogPage({
  payload,
  mode,
  syncVersion = 0,
  detailDate = null,
  onModeChange,
  onOpenNestedDay,
  onCloseNestedDay,
}: WorklogPageProps) {
  const { formatDateRange, t } = useI18n();
  const displayMode = normalizeMode(mode);
  const [uiState, dispatch] = useReducer(worklogUiReducer, undefined, createInitialWorklogUiState);
  const [snapshotEntries, setSnapshotEntries] = useState<
    Record<ResolvedWorklogMode, WorklogSnapshotEntry>
  >(createInitialSnapshotEntries);
  const [preferences, setPreferences] = useState<AppPreferences | null>(null);
  const periodRange = uiState.period.committedRange;
  const snapshotEntriesRef = useRef(snapshotEntries);
  const snapshotTokensRef = useRef<Record<ResolvedWorklogMode, number>>({
    day: 0,
    week: 0,
    period: 0,
  });

  useEffect(() => {
    snapshotEntriesRef.current = snapshotEntries;
  }, [snapshotEntries]);

  const isNestedDayView = displayMode !== "day" && detailDate != null;
  const selectedDate =
    displayMode === "week"
      ? uiState.week.selectedDate
      : displayMode === "period"
        ? uiState.period.selectedDate
        : uiState.day.selectedDate;
  const activeDate =
    isNestedDayView && detailDate
      ? displayMode === "period"
        ? clampDateToRange(detailDate, periodRange)
        : detailDate
      : displayMode === "period"
        ? clampDateToRange(selectedDate, periodRange)
        : selectedDate;

  const updateSelectedDate = (date: Date) => {
    if (isNestedDayView) {
      onCloseNestedDay();
    }
    dispatch({ type: "set_day_selected_date", date });
  };

  const updateWeekDate = (date: Date) => {
    if (isNestedDayView) {
      onCloseNestedDay();
    }
    dispatch({ type: "set_week_selected_date", date });
  };

  const updatePeriodRange = (range: PeriodRangeState) => {
    if (isNestedDayView) {
      onCloseNestedDay();
    }
    dispatch({ type: "commit_period_range", range });
  };

  const shiftCurrentPeriod = (days: number) => {
    if (isNestedDayView) {
      onCloseNestedDay();
    }
    dispatch({ type: "shift_period", days });
  };

  const resetCurrentPeriod = () => {
    if (isNestedDayView) {
      onCloseNestedDay();
    }
    dispatch({ type: "reset_current_period" });
  };

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

      const token = snapshotTokensRef.current[resolvedMode] + 1;
      snapshotTokensRef.current[resolvedMode] = token;

      void loadWorklogSnapshot(request.params)
        .then((snapshot) => {
          if (snapshotTokensRef.current[resolvedMode] !== token) {
            return;
          }

          setSnapshotEntries((previous) => ({
            ...previous,
            [resolvedMode]: {
              snapshot,
              requestKey: request.requestKey,
              status: "ready",
              errorMessage: null,
              syncVersion,
            },
          }));
        })
        .catch((error) => {
          if (snapshotTokensRef.current[resolvedMode] !== token) {
            return;
          }

          setSnapshotEntries((previous) => ({
            ...previous,
            [resolvedMode]: {
              ...previous[resolvedMode],
              requestKey: request.requestKey,
              status: "error",
              errorMessage: getErrorMessage(error),
            },
          }));
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

    void loadAppPreferences()
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
  const calendarHolidays = useCalendarHolidays({
    activeDate,
    currentSnapshotDays: snapshotEntries[displayMode].snapshot?.days ?? [],
    displayMode,
    holidayCountryCode,
    visibleMonth: uiState.period.visibleMonth,
  });

  const hasAnySnapshot = Object.values(snapshotEntries).some((entry) => entry.snapshot !== null);
  const activeSnapshotEntry = snapshotEntries[displayMode];
  const isBusy = false;

  if (activeSnapshotEntry.status === "error" && activeSnapshotEntry.snapshot === null) {
    return (
      <WorklogStatusState
        title={t("worklog.failedToLoadTitle")}
        description={activeSnapshotEntry.errorMessage ?? t("common.loading")}
        mood="tired"
      />
    );
  }

  if (!hasAnySnapshot && activeSnapshotEntry.status === "idle") {
    return <WorklogStatusState title={t("app.loadingWorklog")} description={t("common.loading")} />;
  }

  const fallbackSnapshotEntry =
    activeSnapshotEntry.snapshot !== null
      ? activeSnapshotEntry
      : snapshotEntries.day.snapshot !== null
        ? snapshotEntries.day
        : snapshotEntries.week.snapshot !== null
          ? snapshotEntries.week
          : snapshotEntries.period;

  const currentSnapshot = fallbackSnapshotEntry.snapshot;
  if (currentSnapshot === null) {
    return <WorklogStatusState title={t("app.loadingWorklog")} description={t("common.loading")} />;
  }
  const selectedDay =
    findMatchingDay(currentSnapshot.days, activeDate) ?? currentSnapshot.selectedDay;
  const currentWeekRange = formatDateRange(
    parseDateInputValue(currentSnapshot.range.startDate),
    parseDateInputValue(currentSnapshot.range.endDate),
  );
  const periodLabel = formatDateRange(
    parseDateInputValue(currentSnapshot.range.startDate),
    parseDateInputValue(currentSnapshot.range.endDate),
  );

  const isCurrentDay = isSameDay(activeDate, new Date());
  const isCurrentWeek = isSameWeek(
    activeDate,
    new Date(),
    payload.schedule.weekStart,
    payload.schedule.timezone,
  );
  const isCurrentPeriod = isCurrentMonthRange(periodRange);
  const calendarWeekStartsOn = getWeekStartsOnIndex(
    payload.schedule.weekStart,
    payload.schedule.timezone,
  );
  if (isNestedDayView) {
    return (
      <NestedDayView
        parentMode={displayMode === "period" ? "period" : "week"}
        onBack={onCloseNestedDay}
        selectedDay={selectedDay}
        auditFlags={currentSnapshot.auditFlags}
      />
    );
  }

  return (
    <StaggerGroup className="space-y-6" aria-busy={isBusy}>
      <m.div variants={staggerItem}>
        <WorklogToolbar
          activeDate={activeDate}
          calendarHolidays={calendarHolidays}
          calendarWeekStartsOn={calendarWeekStartsOn}
          currentWeekRange={currentWeekRange}
          dayCalendarOpen={uiState.day.calendarOpen}
          dayVisibleMonth={uiState.day.visibleMonth}
          displayMode={displayMode}
          isCurrentDay={isCurrentDay}
          isCurrentPeriod={isCurrentPeriod}
          isCurrentWeek={isCurrentWeek}
          onDayCalendarOpenChange={(open) => dispatch({ type: "set_day_calendar_open", open })}
          onDaySelectDate={updateSelectedDate}
          onDayVisibleMonthChange={(month) => dispatch({ type: "set_day_visible_month", month })}
          onModeChange={onModeChange}
          periodCalendarOpen={uiState.period.calendarOpen}
          onPeriodCalendarOpenChange={(open) =>
            dispatch({ type: "set_period_calendar_open", open })
          }
          onPeriodDraftRangeChange={(range: DateRange | undefined) =>
            dispatch({ type: "set_period_draft_range", range })
          }
          onPeriodSelectRange={updatePeriodRange}
          onPeriodVisibleMonthChange={(month: Date) =>
            dispatch({ type: "set_period_visible_month", month })
          }
          onResetCurrentPeriod={resetCurrentPeriod}
          onShiftCurrentPeriod={shiftCurrentPeriod}
          onWeekCalendarOpenChange={(open) => dispatch({ type: "set_week_calendar_open", open })}
          onWeekSelectDate={updateWeekDate}
          onWeekVisibleMonthChange={(month) => dispatch({ type: "set_week_visible_month", month })}
          periodDraftRange={uiState.period.draftRange}
          periodLabel={periodLabel}
          periodRange={periodRange}
          periodRangeDays={periodRangeDays}
          periodVisibleMonth={uiState.period.visibleMonth}
          weekCalendarOpen={uiState.week.calendarOpen}
          weekVisibleMonth={uiState.week.visibleMonth}
        />
      </m.div>

      {activeSnapshotEntry.status === "error" && activeSnapshotEntry.errorMessage ? (
        <m.div variants={staggerItem}>
          <InlineWorklogNotice tone="error" message={activeSnapshotEntry.errorMessage} />
        </m.div>
      ) : null}

      <m.div variants={staggerItem}>
        <WorklogContent
          currentSnapshot={currentSnapshot}
          currentWeekRange={currentWeekRange}
          displayMode={displayMode}
          onOpenNestedDay={onOpenNestedDay}
          periodLabel={periodLabel}
          selectedDay={selectedDay}
        />
      </m.div>
    </StaggerGroup>
  );
}

function WorklogToolbar({
  activeDate,
  calendarHolidays,
  calendarWeekStartsOn,
  currentWeekRange,
  dayCalendarOpen,
  dayVisibleMonth,
  displayMode,
  isCurrentDay,
  isCurrentPeriod,
  isCurrentWeek,
  onDayCalendarOpenChange,
  onDaySelectDate,
  onDayVisibleMonthChange,
  onModeChange,
  periodCalendarOpen,
  onPeriodCalendarOpenChange,
  onPeriodDraftRangeChange,
  onPeriodSelectRange,
  onPeriodVisibleMonthChange,
  onResetCurrentPeriod,
  onShiftCurrentPeriod,
  onWeekCalendarOpenChange,
  onWeekSelectDate,
  onWeekVisibleMonthChange,
  periodDraftRange,
  periodLabel,
  periodRange,
  periodRangeDays,
  periodVisibleMonth,
  weekCalendarOpen,
  weekVisibleMonth,
}: {
  activeDate: Date;
  calendarHolidays: Array<{ date: Date; label: string }>;
  calendarWeekStartsOn: 0 | 1 | 5 | 6;
  currentWeekRange: string;
  dayCalendarOpen: boolean;
  dayVisibleMonth: Date;
  displayMode: "day" | "week" | "period";
  isCurrentDay: boolean;
  isCurrentPeriod: boolean;
  isCurrentWeek: boolean;
  onDayCalendarOpenChange: (open: boolean) => void;
  onDaySelectDate: (date: Date) => void;
  onDayVisibleMonthChange: (month: Date) => void;
  onModeChange: (mode: WorklogMode) => void;
  periodCalendarOpen: boolean;
  onPeriodCalendarOpenChange: (open: boolean) => void;
  onPeriodDraftRangeChange: (range: DateRange | undefined) => void;
  onPeriodSelectRange: (range: PeriodRangeState) => void;
  onPeriodVisibleMonthChange: (month: Date) => void;
  onResetCurrentPeriod: () => void;
  onShiftCurrentPeriod: (days: number) => void;
  onWeekCalendarOpenChange: (open: boolean) => void;
  onWeekSelectDate: (date: Date) => void;
  onWeekVisibleMonthChange: (month: Date) => void;
  periodDraftRange: DateRange | undefined;
  periodLabel: string;
  periodRange: PeriodRangeState;
  periodRangeDays: number;
  periodVisibleMonth: Date;
  weekCalendarOpen: boolean;
  weekVisibleMonth: Date;
}) {
  const { formatDateShort, t } = useI18n();

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <Tabs value={displayMode} onValueChange={(value) => onModeChange(value as WorklogMode)}>
        <TabsList data-onboarding="worklog-tabs">
          <TabsTrigger value="day">{t("common.day")}</TabsTrigger>
          <TabsTrigger value="week">{t("common.week")}</TabsTrigger>
          <TabsTrigger value="period">{t("common.period")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2">
        {displayMode === "day" ? (
          <>
            <PagerControl
              label={isCurrentDay ? t("common.today") : formatDateShort(activeDate)}
              onPrevious={() => onDaySelectDate(shiftDate(activeDate, -1))}
              onCurrent={() => onDaySelectDate(new Date())}
              onNext={() => onDaySelectDate(shiftDate(activeDate, 1))}
            />
            <SingleDayPicker
              open={dayCalendarOpen}
              onOpenChange={onDayCalendarOpenChange}
              selectedDate={activeDate}
              visibleMonth={dayVisibleMonth}
              onSelectDate={onDaySelectDate}
              onVisibleMonthChange={onDayVisibleMonthChange}
              buttonLabel={t("common.pickDay")}
              holidays={calendarHolidays}
              weekStartsOn={calendarWeekStartsOn}
            />
          </>
        ) : null}

        {displayMode === "week" ? (
          <>
            <PagerControl
              label={isCurrentWeek ? t("common.thisWeek") : currentWeekRange}
              onPrevious={() => onWeekSelectDate(shiftDate(activeDate, -7))}
              onCurrent={() => onWeekSelectDate(new Date())}
              onNext={() => onWeekSelectDate(shiftDate(activeDate, 7))}
            />
            <SingleDayPicker
              open={weekCalendarOpen}
              onOpenChange={onWeekCalendarOpenChange}
              selectedDate={activeDate}
              visibleMonth={weekVisibleMonth}
              onSelectDate={onWeekSelectDate}
              onVisibleMonthChange={onWeekVisibleMonthChange}
              buttonLabel={t("common.pickWeek")}
              holidays={calendarHolidays}
              weekStartsOn={calendarWeekStartsOn}
            />
          </>
        ) : null}

        {displayMode === "period" ? (
          <>
            <PagerControl
              label={isCurrentPeriod ? t("common.thisPeriod") : periodLabel}
              onPrevious={() => onShiftCurrentPeriod(-periodRangeDays)}
              onCurrent={onResetCurrentPeriod}
              onNext={() => onShiftCurrentPeriod(periodRangeDays)}
            />
            <PeriodPicker
              open={periodCalendarOpen}
              onOpenChange={onPeriodCalendarOpenChange}
              range={periodRange}
              draftRange={periodDraftRange}
              visibleMonth={periodVisibleMonth}
              onDraftRangeChange={onPeriodDraftRangeChange}
              onVisibleMonthChange={onPeriodVisibleMonthChange}
              onSelectRange={onPeriodSelectRange}
              holidays={calendarHolidays}
              weekStartsOn={calendarWeekStartsOn}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function WorklogContent({
  currentSnapshot,
  currentWeekRange,
  displayMode,
  onOpenNestedDay,
  periodLabel,
  selectedDay,
}: {
  currentSnapshot: WorklogSnapshot;
  currentWeekRange: string;
  displayMode: "day" | "week" | "period";
  onOpenNestedDay: (date: Date) => void;
  periodLabel: string;
  selectedDay: DayOverview;
}) {
  const { t } = useI18n();

  if (displayMode === "day") {
    return <DaySummaryPanel selectedDay={selectedDay} auditFlags={currentSnapshot.auditFlags} />;
  }

  if (displayMode === "week") {
    return (
      <div className="space-y-6">
        <RangeSummarySection
          summary={currentSnapshot.month}
          title={t("worklog.weekSummary")}
          note={t("worklog.selectedRange", { range: currentWeekRange })}
          dataKey={`week-summary:${currentSnapshot.range.startDate}:${currentSnapshot.range.endDate}`}
        />
        <WeekView
          week={currentSnapshot.days}
          title={t("worklog.weeklyBreakdown")}
          note={t("dashboard.pickDayToOpen")}
          dataOnboarding="week-card"
          startDate={currentSnapshot.range.startDate}
          viewMode="week"
          onSelectDay={(_, date) => {
            onOpenNestedDay(date);
          }}
        />
      </div>
    );
  }

  return (
    <MonthView
      month={currentSnapshot.month}
      days={currentSnapshot.days}
      title={t("worklog.periodSummary")}
      note={t("worklog.selectedRange", { range: periodLabel })}
      rangeStartDate={currentSnapshot.range.startDate}
      onSelectDay={(_, date) => {
        onOpenNestedDay(date);
      }}
    />
  );
}

function DaySummaryPanel({
  selectedDay,
  auditFlags,
  title,
}: {
  selectedDay: DayOverview;
  auditFlags: AuditFlag[];
  title?: string;
}) {
  const { t } = useI18n();
  const summaryItems = useDaySummaryItems(selectedDay, auditFlags.length);
  const resolvedTitle = title ?? t("worklog.daySummary");

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SectionHeading title={resolvedTitle} />
        <SummaryGrid items={summaryItems} dataKey={selectedDay.date} />
      </div>

      <IssuesSection
        title={t("common.issues")}
        issues={selectedDay.topIssues}
        auditFlags={auditFlags}
        dataKey={selectedDay.date}
      />
    </div>
  );
}

function NestedDayView({
  parentMode,
  onBack,
  selectedDay,
  auditFlags,
}: {
  parentMode: "week" | "period";
  onBack: () => void;
  selectedDay: DayOverview;
  auditFlags: AuditFlag[];
}) {
  const { t } = useI18n();

  return (
    <StaggerGroup className="space-y-6">
      <m.div variants={staggerItem}>
        <Button type="button" variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ChevronLeft className="h-4 w-4" />
          {t("worklog.backTo", {
            parent: parentMode === "period" ? t("common.period") : t("common.week"),
          })}
        </Button>
      </m.div>
      <m.div variants={staggerItem}>
        <DaySummaryPanel selectedDay={selectedDay} auditFlags={auditFlags} />
      </m.div>
    </StaggerGroup>
  );
}

function IssuesSection({
  title,
  issues,
  auditFlags,
  dataKey,
}: {
  title: string;
  issues: IssueBreakdown[];
  auditFlags?: AuditFlag[];
  dataKey: string;
}) {
  const issueSetKey = issues.map((issue) => issue.key).join("|");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
      </div>

      <IssuesContent
        key={issueSetKey}
        issues={issues}
        auditFlags={auditFlags}
        dataKey={dataKey}
      />
    </div>
  );
}

function IssuesContent({
  issues,
  auditFlags,
  dataKey,
}: {
  issues: IssueBreakdown[];
  auditFlags?: AuditFlag[];
  dataKey: string;
}) {
  const { formatAuditSeverity, t } = useI18n();
  const [page, setPage] = useState(0);
  const [auditSheetOpen, setAuditSheetOpen] = useState(false);
  const issueSetKey = issues.map((issue) => issue.key).join("|");
  const totalPages = Math.max(1, Math.ceil(issues.length / ISSUES_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedIssues = issues.slice(
    safePage * ISSUES_PER_PAGE,
    (safePage + 1) * ISSUES_PER_PAGE,
  );

  return (
    <>
      <div className="flex flex-wrap items-start justify-end gap-3">
        {auditFlags ? (
          auditFlags.length > 0 ? (
            <Sheet open={auditSheetOpen} onOpenChange={setAuditSheetOpen}>
              <SheetTrigger asChild>
                <button type="button" className="cursor-pointer">
                  <Badge tone="high">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {t("worklog.auditFlagCount", { count: auditFlags.length })}
                  </Badge>
                </button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    {t("worklog.auditFlags")}
                  </SheetTitle>
                  <SheetDescription>{t("worklog.auditFlagsDescription")}</SheetDescription>
                </SheetHeader>
                <div className="space-y-2 px-4 pb-4">
                  {auditFlags.map((flag) => (
                    <div
                      key={`${flag.title}-${flag.detail}`}
                      className="rounded-xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] p-3 shadow-[var(--shadow-clay-inset)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{flag.title}</p>
                        <Badge tone={flag.severity} className="shrink-0">
                          {formatAuditSeverity(flag.severity)}
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {flag.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              {t("common.noFlags")}
            </span>
          )
        ) : null}
      </div>

      <AnimatePresence mode="wait">
        {paginatedIssues.length > 0 ? (
          <m.div
            key={`${dataKey}:${safePage}:${issueSetKey}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.26, ease: [...easeOut] }}
            className="space-y-2"
          >
            {paginatedIssues.map((issue, i) => (
              <m.div
                key={`${issue.key}-${issue.title}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springGentle, delay: 0.08 + i * 0.04 }}
              >
                <IssueCard issue={issue} />
              </m.div>
            ))}
          </m.div>
        ) : (
          <m.div
            key={`${dataKey}:empty`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ ...springGentle, delay: 0.12 }}
          >
            <EmptyState
              title={t("worklog.noIssues")}
              description={t("worklog.pickDifferentDate")}
              mood="idle"
              foxSize={80}
              variant="plain"
            />
          </m.div>
        )}
      </AnimatePresence>

      {issues.length > 0 ? (
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((current) => current - 1)}
            className="cursor-pointer rounded-lg border-2 border-transparent p-1 text-muted-foreground transition-all hover:border-[color:var(--color-border-subtle)] hover:bg-[color:var(--color-field-hover)] hover:text-foreground disabled:cursor-default disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((current) => current + 1)}
            className="cursor-pointer rounded-lg border-2 border-transparent p-1 text-muted-foreground transition-all hover:border-[color:var(--color-border-subtle)] hover:bg-[color:var(--color-field-hover)] hover:text-foreground disabled:cursor-default disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </>
  );
}

function PagerControl({
  label,
  onPrevious,
  onCurrent,
  onNext,
}: {
  label: string;
  onPrevious: () => void;
  onCurrent: () => void;
  onNext: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-tray)] p-1 shadow-[var(--shadow-clay)]">
      <button
        type="button"
        onClick={onPrevious}
        className={getCompactIconButtonClassName(
          false,
          "rounded-lg border-transparent bg-transparent shadow-none hover:border-[color:var(--color-border-subtle)] hover:bg-[color:var(--color-field-hover)]",
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onCurrent}
        className={getNeutralSegmentedControlClassName(
          false,
          "rounded-lg border-transparent bg-transparent px-2 hover:bg-[color:var(--color-field-hover)]",
        )}
      >
        {label}
      </button>
      <button
        type="button"
        onClick={onNext}
        className={getCompactIconButtonClassName(
          false,
          "rounded-lg border-transparent bg-transparent shadow-none hover:border-[color:var(--color-border-subtle)] hover:bg-[color:var(--color-field-hover)]",
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function SingleDayPicker({
  open,
  onOpenChange,
  selectedDate,
  visibleMonth,
  onSelectDate,
  onVisibleMonthChange,
  buttonLabel,
  holidays,
  weekStartsOn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  visibleMonth: Date;
  onSelectDate: (date: Date) => void;
  onVisibleMonthChange: (month: Date) => void;
  buttonLabel: string;
  holidays: Array<{ date: Date; label: string }>;
  weekStartsOn: 0 | 1 | 5 | 6;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={buttonLabel} className={calendarTriggerClassName(open)}>
          <CalendarIcon className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[19.5rem] p-0" align="end">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(value: Date | undefined) => {
            if (!value) return;
            onSelectDate(value);
            onOpenChange(false);
          }}
          month={visibleMonth}
          onMonthChange={onVisibleMonthChange}
          weekStartsOn={weekStartsOn}
          className="border-0 p-3"
          holidays={holidays}
        />
      </PopoverContent>
    </Popover>
  );
}

function PeriodPicker({
  open,
  onOpenChange,
  range,
  draftRange,
  visibleMonth,
  onDraftRangeChange,
  onVisibleMonthChange,
  onSelectRange,
  holidays,
  weekStartsOn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  range: PeriodRangeState;
  draftRange: DateRange | undefined;
  visibleMonth: Date;
  onDraftRangeChange: (range: DateRange | undefined) => void;
  onVisibleMonthChange: (month: Date) => void;
  onSelectRange: (range: PeriodRangeState) => void;
  holidays: Array<{ date: Date; label: string }>;
  weekStartsOn: 0 | 1 | 5 | 6;
}) {
  const { t } = useI18n();
  const selectedRange = draftRange ?? { from: range.from, to: range.to };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("common.pickPeriod")}
          className={calendarTriggerClassName(open)}
        >
          <CalendarIcon className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[39.5rem] p-0" align="end">
        <Calendar
          mode="range"
          selected={selectedRange}
          resetOnSelect
          onSelect={(nextRange: DateRange | undefined) => {
            if (!nextRange?.from) {
              onDraftRangeChange(undefined);
              return;
            }

            if (!nextRange.to) {
              onDraftRangeChange({ from: nextRange.from, to: undefined });
              return;
            }

            const normalizedRange =
              nextRange.from <= nextRange.to
                ? { from: nextRange.from, to: nextRange.to }
                : { from: nextRange.to, to: nextRange.from };
            onDraftRangeChange(normalizedRange);
            onSelectRange(normalizedRange);
          }}
          month={visibleMonth}
          onMonthChange={onVisibleMonthChange}
          weekStartsOn={weekStartsOn}
          numberOfMonths={2}
          className="border-0 p-3"
          holidays={holidays}
        />
      </PopoverContent>
    </Popover>
  );
}

function SummaryGrid({
  items,
  dataKey,
}: {
  items: Array<{
    title: string;
    value: string;
    note: string;
    icon: "timer" | "target" | "sparkles";
  }>;
  dataKey: string;
}) {
  return (
    <m.div
      key={dataKey}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [...easeOut] }}
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {items.map((item, index) => (
        <m.div
          key={`${dataKey}:${item.title}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springGentle, delay: 0.08 + index * 0.04 }}
          className="rounded-2xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-4 shadow-[var(--shadow-card)]"
        >
          <div className="flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase">
            <MetricIcon icon={item.icon} />
            <span>{item.title}</span>
          </div>
          <p className="mt-3 font-display text-3xl font-semibold text-foreground">{item.value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
        </m.div>
      ))}
    </m.div>
  );
}

function MetricIcon({ icon }: { icon: "timer" | "target" | "sparkles" }) {
  if (icon === "target") {
    return <Target className="h-3.5 w-3.5" />;
  }
  if (icon === "sparkles") {
    return <Sparkles className="h-3.5 w-3.5" />;
  }
  return <Timer className="h-3.5 w-3.5" />;
}

function IssueCard({ issue }: { issue: IssueBreakdown }) {
  const fh = useFormatHours();

  return (
    <div
      className={cn(
        "rounded-xl border-2 border-l-4 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-3 shadow-[var(--shadow-card)] transition-all hover:bg-[color:var(--color-panel)]",
        issueToneBorder[issue.tone],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug font-medium text-foreground">{issue.title}</p>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{issue.key}</p>
        </div>
        <span className="shrink-0 rounded-lg border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] px-2 py-0.5 text-sm font-semibold text-foreground tabular-nums shadow-[var(--shadow-clay-inset)]">
          {fh(issue.hours)}
        </span>
      </div>
    </div>
  );
}

function useDaySummaryItems(selectedDay: DayOverview, auditFlagCount = 0) {
  const fh = useFormatHours();
  const { t } = useI18n();
  const delta = selectedDay.loggedHours - selectedDay.targetHours;

  return useMemo(
    () => [
      {
        title: t("worklog.logged"),
        value: fh(selectedDay.loggedHours),
        note: t("worklog.loggedNote"),
        icon: "timer" as const,
      },
      {
        title: t("worklog.target"),
        value: fh(selectedDay.targetHours),
        note: t("worklog.targetNote"),
        icon: "target" as const,
      },
      {
        title: t("worklog.delta"),
        value: formatSignedHours(fh, delta),
        note: delta >= 0 ? t("worklog.deltaPositive") : t("worklog.deltaNegative"),
        icon: "sparkles" as const,
      },
      {
        title: t("worklog.issuesCount"),
        value: String(selectedDay.topIssues.length),
        note:
          auditFlagCount > 0
            ? t("worklog.auditFlagCount", { count: auditFlagCount })
            : t("worklog.noAuditFlags"),
        icon: "sparkles" as const,
      },
    ],
    [
      auditFlagCount,
      delta,
      fh,
      selectedDay.loggedHours,
      selectedDay.targetHours,
      selectedDay.topIssues.length,
      t,
    ],
  );
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
        loadingYears: Array.from(new Set([...state.loadingYears, ...action.years])).sort(),
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

function WorklogStatusState({
  title,
  description,
  mood = "idle",
}: {
  title: string;
  description: string;
  mood?: React.ComponentProps<typeof EmptyState>["mood"];
}) {
  return <EmptyState title={title} description={description} mood={mood} />;
}

function InlineWorklogNotice({ tone, message }: { tone: "loading" | "error"; message: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2 text-sm",
        tone === "error"
          ? "border-destructive/35 bg-destructive/8 text-destructive"
          : "border-border/70 bg-[color:var(--color-panel-elevated)] text-muted-foreground",
      )}
    >
      {message}
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return String(error);
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
  return {
    selectedDate: today,
    visibleMonth: today,
    calendarOpen: false,
  };
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
    default:
      return state;
  }
}

function normalizeMode(mode: WorklogMode): "day" | "week" | "period" {
  if (mode === "week") return "week";
  if (mode === "period" || mode === "month" || mode === "range") return "period";
  return "day";
}

function createInitialSnapshotEntries(): Record<ResolvedWorklogMode, WorklogSnapshotEntry> {
  return {
    day: createInitialSnapshotEntry(),
    week: createInitialSnapshotEntry(),
    period: createInitialSnapshotEntry(),
  };
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

function calendarTriggerClassName(open: boolean) {
  return getCompactIconButtonClassName(open);
}

function findMatchingDay(days: DayOverview[], date: Date) {
  return days.find((day) => day.date === toDateInputValue(date));
}

function formatSignedHours(formatHours: (value: number) => string, value: number) {
  if (value > 0) return `+${formatHours(value)}`;
  if (value < 0) return `-${formatHours(Math.abs(value))}`;
  return formatHours(0);
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
