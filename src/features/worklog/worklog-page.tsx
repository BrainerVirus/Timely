import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle.js";
import CalendarIcon from "lucide-react/dist/esm/icons/calendar.js";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import Target from "lucide-react/dist/esm/icons/target.js";
import Timer from "lucide-react/dist/esm/icons/timer.js";
import { m } from "motion/react";
import { useEffect, useMemo, useReducer, useState } from "react";
import type { DateRange } from "react-day-picker";
import { EmptyState } from "@/components/shared/empty-state";
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
import { WeekView } from "@/features/dashboard/week-view";
import { useFormatHours } from "@/hooks/use-format-hours";
import { loadWorklogSnapshot } from "@/lib/tauri";
import { cn } from "@/lib/utils";

import type {
  AuditFlag,
  BootstrapPayload,
  DayOverview,
  IssueBreakdown,
  WorklogSnapshot,
} from "@/types/dashboard";

export type WorklogMode = "day" | "week" | "period" | "month" | "range";

interface PeriodRangeState {
  from: Date;
  to: Date;
}

interface WorklogUiState {
  selectedDate: Date;
  periodRange: PeriodRangeState;
  weekCalendarOpen: boolean;
  dayCalendarOpen: boolean;
  periodCalendarOpen: boolean;
}

type WorklogUiAction =
  | { type: "set_selected_date"; date: Date }
  | { type: "set_day_calendar_open"; open: boolean }
  | { type: "set_week_calendar_open"; open: boolean }
  | { type: "set_period_calendar_open"; open: boolean }
  | { type: "set_week_selected_date"; date: Date }
  | { type: "set_period_range"; range: PeriodRangeState }
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

export function WorklogPage({
  payload,
  mode,
  syncVersion = 0,
  detailDate = null,
  onModeChange,
  onOpenNestedDay,
  onCloseNestedDay,
}: WorklogPageProps) {
  const displayMode = normalizeMode(mode);
  const [uiState, dispatch] = useReducer(worklogUiReducer, undefined, createInitialWorklogUiState);
  const [worklog, setWorklog] = useState<WorklogSnapshot | null>(null);
  const { selectedDate, periodRange, weekCalendarOpen, dayCalendarOpen, periodCalendarOpen } = uiState;

  const isNestedDayView = displayMode !== "day" && detailDate != null;
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
    dispatch({ type: "set_selected_date", date });
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
    dispatch({ type: "set_period_range", range });
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

  const snapshotMode = displayMode === "period" ? "range" : displayMode;
  const periodRangeDays = Math.max(1, differenceInDays(periodRange.from, periodRange.to) + 1);

  useEffect(() => {
    void loadWorklogSnapshot({
      mode: snapshotMode,
      anchorDate:
        displayMode === "period" ? toDateInputValue(periodRange.from) : toDateInputValue(activeDate),
      endDate: displayMode === "period" ? toDateInputValue(periodRange.to) : undefined,
    }).then(setWorklog);
  }, [activeDate, displayMode, periodRange.from, periodRange.to, snapshotMode, syncVersion]);

  const currentSnapshot = worklog ?? buildFallbackSnapshot(payload, displayMode, activeDate, periodRange);
  const selectedDay = findMatchingDay(currentSnapshot.days, activeDate) ?? currentSnapshot.selectedDay;
  const currentWeekRange = formatDateRange(currentSnapshot.range.startDate, currentSnapshot.range.endDate);
  const periodLabel = formatDateRange(currentSnapshot.range.startDate, currentSnapshot.range.endDate);

  const isCurrentDay = isSameDay(activeDate, new Date());
  const isCurrentWeek = isSameWeek(activeDate, new Date());
  const isCurrentPeriod = isCurrentMonthRange(periodRange);

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Tabs value={displayMode} onValueChange={(value) => onModeChange(value as WorklogMode)}>
          <TabsList data-onboarding="worklog-tabs">
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="period">Period</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          {displayMode === "day" ? (
            <>
              <PagerControl
                label={isCurrentDay ? "Today" : formatDateShort(activeDate)}
                onPrevious={() => updateSelectedDate(shiftDate(activeDate, -1))}
                onCurrent={() => updateSelectedDate(new Date())}
                onNext={() => updateSelectedDate(shiftDate(activeDate, 1))}
              />
              <SingleDayPicker
                open={dayCalendarOpen}
                onOpenChange={(open) => dispatch({ type: "set_day_calendar_open", open })}
                selectedDate={activeDate}
                onSelectDate={updateSelectedDate}
                buttonLabel="Pick day"
              />
            </>
          ) : null}

          {displayMode === "week" ? (
            <>
              <PagerControl
                label={isCurrentWeek ? "This week" : currentWeekRange}
                onPrevious={() => updateWeekDate(shiftDate(activeDate, -7))}
                onCurrent={() => updateWeekDate(new Date())}
                onNext={() => updateWeekDate(shiftDate(activeDate, 7))}
              />
              <SingleDayPicker
                open={weekCalendarOpen}
                onOpenChange={(open) => dispatch({ type: "set_week_calendar_open", open })}
                selectedDate={activeDate}
                onSelectDate={updateWeekDate}
                buttonLabel="Pick week"
              />
            </>
          ) : null}

          {displayMode === "period" ? (
            <>
              <PagerControl
                label={isCurrentPeriod ? "This period" : periodLabel}
                onPrevious={() => shiftCurrentPeriod(-periodRangeDays)}
                onCurrent={resetCurrentPeriod}
                onNext={() => shiftCurrentPeriod(periodRangeDays)}
              />
              <PeriodPicker
                open={periodCalendarOpen}
                onOpenChange={(open) => dispatch({ type: "set_period_calendar_open", open })}
                range={periodRange}
                onSelectRange={updatePeriodRange}
              />
            </>
          ) : null}
        </div>
      </div>

      {displayMode === "day" ? (
        <DaySummaryPanel selectedDay={selectedDay} auditFlags={currentSnapshot.auditFlags} />
      ) : null}

      {displayMode === "week" ? (
        <WeekView
          week={currentSnapshot.days}
          title="Weekly breakdown"
          note={`${currentWeekRange}. Pick a day to open its full summary.`}
          dataOnboarding="week-card"
          startDate={currentSnapshot.range.startDate}
          viewMode="week"
          onSelectDay={(_, date) => {
            onOpenNestedDay(date);
          }}
        />
      ) : null}

      {displayMode === "period" ? (
        <MonthView
          month={currentSnapshot.month}
          days={currentSnapshot.days}
          title="Period summary"
          note={`Selected range: ${periodLabel}`}
          rangeStartDate={currentSnapshot.range.startDate}
          onSelectDay={(_, date) => {
            onOpenNestedDay(date);
          }}
        />
      ) : null}
    </div>
  );
}

function DaySummaryPanel({
  selectedDay,
  auditFlags,
  title = "Day summary",
}: {
  selectedDay: DayOverview;
  auditFlags: AuditFlag[];
  title?: string;
}) {
  const summaryItems = useDaySummaryItems(selectedDay, auditFlags.length);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SectionHeading title={title} />
        <SummaryGrid items={summaryItems} />
      </div>

      <IssuesSection title="Issues" issues={selectedDay.topIssues} auditFlags={auditFlags} />
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
  return (
    <div className="space-y-6">
      <div>
        <Button type="button" variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ChevronLeft className="h-4 w-4" />
          Back to {parentMode}
        </Button>
      </div>
      <DaySummaryPanel selectedDay={selectedDay} auditFlags={auditFlags} />
    </div>
  );
}

function IssuesSection({
  title,
  issues,
  auditFlags,
}: {
  title: string;
  issues: IssueBreakdown[];
  auditFlags?: AuditFlag[];
}) {
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
    <div className="space-y-4" key={issueSetKey}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>

        {auditFlags ? (
          auditFlags.length > 0 ? (
            <Sheet open={auditSheetOpen} onOpenChange={setAuditSheetOpen}>
              <SheetTrigger asChild>
                <button type="button" className="cursor-pointer">
                  <Badge tone="high">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {auditFlags.length} {auditFlags.length === 1 ? "flag" : "flags"}
                  </Badge>
                </button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Audit Flags
                  </SheetTitle>
                  <SheetDescription>
                    Review the items that may need attention for this selected slice.
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-2 px-4 pb-4">
                  {auditFlags.map((flag) => (
                    <div
                      key={`${flag.title}-${flag.detail}`}
                      className="rounded-xl border-2 border-border bg-muted/40 p-3 shadow-[var(--shadow-clay-inset)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{flag.title}</p>
                        <Badge tone={flag.severity} className="shrink-0">
                          {flag.severity}
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
              No flags
            </span>
          )
        ) : null}
      </div>

      {paginatedIssues.length > 0 ? (
        <div className="space-y-2">
          {paginatedIssues.map((issue, i) => (
            <m.div
              key={`${issue.key}-${issue.title}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.15, delay: 0.08 + i * 0.05 }}
            >
              <IssueCard issue={issue} />
            </m.div>
          ))}
        </div>
      ) : (
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.15, delay: 0.12 }}
        >
          <EmptyState
            title="No issues logged for this day"
            description="Pick a different date or log some time."
            mood="idle"
            foxSize={80}
            variant="plain"
          />
        </m.div>
      )}

      {issues.length > 0 ? (
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((current) => current - 1)}
            className="cursor-pointer rounded-lg border-2 border-transparent p-1 text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground disabled:cursor-default disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs tabular-nums text-muted-foreground">
            {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((current) => current + 1)}
            className="cursor-pointer rounded-lg border-2 border-transparent p-1 text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground disabled:cursor-default disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
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
    <div className="inline-flex items-center gap-1 rounded-xl border-2 border-border bg-card p-1 shadow-[var(--shadow-clay)]">
      <button
        type="button"
        onClick={onPrevious}
        className="cursor-pointer rounded-lg border-2 border-transparent p-1.5 text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground active:translate-y-[1px]"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onCurrent}
        className="cursor-pointer rounded-lg border-2 border-transparent px-2 py-1.5 text-xs font-bold text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground active:translate-y-[1px]"
      >
        {label}
      </button>
      <button
        type="button"
        onClick={onNext}
        className="cursor-pointer rounded-lg border-2 border-transparent p-1.5 text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground active:translate-y-[1px]"
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
  onSelectDate,
  buttonLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  buttonLabel: string;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={buttonLabel} className={calendarTriggerClassName(open)}>
          <CalendarIcon className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(value: Date | undefined) => {
            if (!value) return;
            onSelectDate(value);
            onOpenChange(false);
          }}
          month={selectedDate}
          onMonthChange={onSelectDate}
          className="border-0 p-3"
        />
      </PopoverContent>
    </Popover>
  );
}

function PeriodPicker({
  open,
  onOpenChange,
  range,
  onSelectRange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  range: PeriodRangeState;
  onSelectRange: (range: PeriodRangeState) => void;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Pick period"
          className={calendarTriggerClassName(open)}
        >
          <CalendarIcon className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          selected={{ from: range.from, to: range.to }}
          onSelect={(value: DateRange | undefined) => {
            if (!value?.from || !value.to) return;
            onSelectRange({ from: value.from, to: value.to });
            onOpenChange(false);
          }}
          month={range.from}
          numberOfMonths={2}
          className="border-0 p-3"
        />
      </PopoverContent>
    </Popover>
  );
}

function SummaryGrid({
  items,
}: {
  items: Array<{ title: string; value: string; note: string; icon: "timer" | "target" | "sparkles" }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => (
        <m.div
          key={item.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.35, bounce: 0.12, delay: index * 0.05 }}
          className="rounded-2xl border-2 border-border bg-card p-4 shadow-[var(--shadow-clay)]"
        >
          <div className="flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase">
            <MetricIcon icon={item.icon} />
            <span>{item.title}</span>
          </div>
          <p className="mt-3 font-display text-3xl font-semibold text-foreground">{item.value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
        </m.div>
      ))}
    </div>
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
        "rounded-xl border-2 border-l-4 border-border bg-card p-3 shadow-[var(--shadow-clay)] transition-all hover:bg-muted",
        issueToneBorder[issue.tone],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-foreground">{issue.title}</p>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{issue.key}</p>
        </div>
        <span className="shrink-0 rounded-lg border-2 border-border bg-muted px-2 py-0.5 text-sm font-semibold tabular-nums text-foreground">
          {fh(issue.hours)}
        </span>
      </div>
    </div>
  );
}

function useDaySummaryItems(selectedDay: DayOverview, auditFlagCount = 0) {
  const fh = useFormatHours();
  const delta = selectedDay.loggedHours - selectedDay.targetHours;

  return useMemo(
    () => [
      {
        title: "Logged",
        value: fh(selectedDay.loggedHours),
        note: "Tracked for the selected day",
        icon: "timer" as const,
      },
      {
        title: "Target",
        value: fh(selectedDay.targetHours),
        note: "Planned load",
        icon: "target" as const,
      },
      {
        title: "Delta",
        value: formatSignedHours(fh, delta),
        note: delta >= 0 ? "At or above target" : "Still remaining",
        icon: "sparkles" as const,
      },
      {
        title: "Issues",
        value: String(selectedDay.topIssues.length),
        note:
          auditFlagCount > 0
            ? `${auditFlagCount} audit ${auditFlagCount === 1 ? "flag" : "flags"}`
            : "No audit flags",
        icon: "sparkles" as const,
      },
    ],
    [auditFlagCount, delta, fh, selectedDay.loggedHours, selectedDay.targetHours, selectedDay.topIssues.length],
  );
}

function buildFallbackSnapshot(
  payload: BootstrapPayload,
  displayMode: "day" | "week" | "period",
  activeDate: Date,
  periodRange: PeriodRangeState,
): WorklogSnapshot {
  if (displayMode === "day") {
    return {
      mode: "day",
      range: {
        startDate: toDateInputValue(activeDate),
        endDate: toDateInputValue(activeDate),
        label: formatFullDate(activeDate),
      },
      selectedDay: payload.today,
      days: payload.week,
      month: payload.month,
      auditFlags: payload.auditFlags,
    };
  }

  if (displayMode === "week") {
    const weekStart = startOfWeek(activeDate);
    const weekEnd = shiftDate(weekStart, 6);
    return {
      mode: "week",
      range: {
        startDate: toDateInputValue(weekStart),
        endDate: toDateInputValue(weekEnd),
        label: `Week of ${formatDateShort(weekStart)}`,
      },
      selectedDay: findMatchingDay(payload.week, activeDate) ?? payload.today,
      days: payload.week,
      month: payload.month,
      auditFlags: payload.auditFlags,
    };
  }

  return {
    mode: "range",
    range: {
      startDate: toDateInputValue(periodRange.from),
      endDate: toDateInputValue(periodRange.to),
      label: formatDateRange(toDateInputValue(periodRange.from), toDateInputValue(periodRange.to)),
    },
    selectedDay: findMatchingDay(payload.week, activeDate) ?? payload.today,
    days: payload.week,
    month: payload.month,
    auditFlags: payload.auditFlags,
  };
}

function createInitialWorklogUiState(): WorklogUiState {
  return {
    selectedDate: new Date(),
    periodRange: getCurrentMonthRange(),
    weekCalendarOpen: false,
    dayCalendarOpen: false,
    periodCalendarOpen: false,
  };
}

function worklogUiReducer(state: WorklogUiState, action: WorklogUiAction): WorklogUiState {
  switch (action.type) {
    case "set_selected_date":
      return { ...state, selectedDate: action.date };
    case "set_day_calendar_open":
      return { ...state, dayCalendarOpen: action.open };
    case "set_week_calendar_open":
      return { ...state, weekCalendarOpen: action.open };
    case "set_period_calendar_open":
      return { ...state, periodCalendarOpen: action.open };
    case "set_week_selected_date":
      return {
        ...state,
        selectedDate: action.date,
      };
    case "set_period_range":
      return {
        ...state,
        periodRange: action.range,
        selectedDate: clampDateToRange(state.selectedDate, action.range),
      };
    case "shift_period": {
      const nextRange = shiftRange(state.periodRange, action.days);
      return {
        ...state,
        periodRange: nextRange,
        selectedDate: clampDateToRange(shiftDate(state.selectedDate, action.days), nextRange),
      };
    }
    case "reset_current_period": {
      const nextRange = getCurrentMonthRange();
      return {
        ...state,
        periodRange: nextRange,
        selectedDate: clampDateToRange(new Date(), nextRange),
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

function calendarTriggerClassName(open: boolean) {
  return cn(
    "cursor-pointer rounded-xl border-2 p-2 transition-all active:translate-y-[1px]",
    open
      ? "border-primary/30 bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--color-border)]"
      : "border-border text-muted-foreground shadow-[var(--shadow-clay)] hover:bg-muted hover:text-foreground",
  );
}

function findMatchingDay(days: DayOverview[], date: Date) {
  return days.find((day) => day.date === toDateInputValue(date));
}

function formatSignedHours(formatHours: (value: number) => string, value: number) {
  if (value > 0) return `+${formatHours(value)}`;
  if (value < 0) return `-${formatHours(Math.abs(value))}`;
  return formatHours(0);
}

function formatFullDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatDateShort(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDateRange(startDate: string, endDate: string) {
  const start = parseDateInputValue(startDate);
  const end = parseDateInputValue(endDate);
  return `${formatDateShort(start)} - ${formatDateShort(end)}`;
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

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isSameWeek(a: Date, b: Date) {
  return isSameDay(startOfWeek(a), startOfWeek(b));
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
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
