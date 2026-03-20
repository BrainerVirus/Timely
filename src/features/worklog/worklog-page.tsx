import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle.js";
import CalendarIcon from "lucide-react/dist/esm/icons/calendar.js";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import Target from "lucide-react/dist/esm/icons/target.js";
import Timer from "lucide-react/dist/esm/icons/timer.js";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
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
import { useMotionSettings } from "@/lib/motion";
import {
  type PeriodRangeState,
  useWorklogPageData,
  type WorklogMode,
} from "@/features/worklog/worklog-page-state";
import { cn } from "@/lib/utils";

import type {
  AuditFlag,
  BootstrapPayload,
  DayOverview,
  IssueBreakdown,
  WorklogSnapshot,
} from "@/types/dashboard";
import type { DateRange } from "react-day-picker";

export type { WorklogMode } from "@/features/worklog/worklog-page-state";

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
  const { formatDateRange, t } = useI18n();
  const {
    activeDate,
    activeSnapshotEntry,
    calendarHolidays,
    calendarWeekStartsOn,
    currentSnapshot,
    currentWeekRange,
    dayCalendarOpen,
    dayVisibleMonth,
    displayMode,
    hasAnySnapshot,
    isCurrentDay,
    isCurrentPeriod,
    isCurrentWeek,
    isNestedDayView,
    onDayCalendarOpenChange,
    onDaySelectDate,
    onDayVisibleMonthChange,
    onPeriodCalendarOpenChange,
    onPeriodDraftRangeChange,
    onPeriodSelectRange,
    onPeriodVisibleMonthChange,
    onResetCurrentPeriod,
    onShiftCurrentPeriod,
    onWeekCalendarOpenChange,
    onWeekSelectDate,
    onWeekVisibleMonthChange,
    periodCalendarOpen,
    periodDraftRange,
    periodLabel,
    periodRange,
    periodRangeDays,
    periodVisibleMonth,
    selectedDay,
    weekCalendarOpen,
    weekVisibleMonth,
  } = useWorklogPageData({
    payload,
    mode,
    syncVersion,
    detailDate,
    onCloseNestedDay,
  });
  const isBusy = false;
  const normalizedError = useMemo(() => {
    const rawMessage = activeSnapshotEntry.errorMessage;
    if (!rawMessage) {
      return null;
    }

    if (/No primary GitLab connection found\.?/i.test(rawMessage)) {
      return t("worklog.gitlabConnectionRequired");
    }

    return rawMessage;
  }, [activeSnapshotEntry.errorMessage, t]);
  const isConnectionRequiredError = normalizedError === t("worklog.gitlabConnectionRequired");
  const fallbackPeriodSnapshot =
    displayMode === "period" &&
    activeSnapshotEntry.status === "error" &&
    activeSnapshotEntry.snapshot === null &&
    isConnectionRequiredError
      ? createFallbackPeriodSnapshot(periodRange, payload)
      : null;
  const effectiveSnapshot = currentSnapshot ?? fallbackPeriodSnapshot;
  const effectiveSelectedDay = selectedDay ?? fallbackPeriodSnapshot?.selectedDay ?? null;
  const effectivePeriodLabel =
    periodLabel || formatDateRange(periodRange.from, periodRange.to);

  const lastShownErrorRef = useRef<string | null>(null);
  const hasSkippedInitialErrorRef = useRef<Record<"day" | "week" | "period", boolean>>({
    day: false,
    week: false,
    period: false,
  });

  useEffect(() => {
    if (activeSnapshotEntry.status !== "error" || !normalizedError) {
      lastShownErrorRef.current = null;
      return;
    }

    const toastKey = `${activeSnapshotEntry.requestKey ?? "none"}:${normalizedError}`;

    if (
      (displayMode === "week" || displayMode === "period") &&
      hasSkippedInitialErrorRef.current[displayMode] === false
    ) {
      hasSkippedInitialErrorRef.current[displayMode] = true;
      return;
    }

    if (lastShownErrorRef.current === toastKey) {
      return;
    }

    lastShownErrorRef.current = toastKey;
    toast.error(t("worklog.failedToLoadTitle"), {
      description: normalizedError,
      duration: 7000,
    });
  }, [activeSnapshotEntry.requestKey, activeSnapshotEntry.status, displayMode, normalizedError, t]);

  if (
    activeSnapshotEntry.status === "error" &&
    activeSnapshotEntry.snapshot === null &&
    !isConnectionRequiredError
  ) {
    return (
      <WorklogStatusState
        title={t("worklog.failedToLoadTitle")}
        description={normalizedError ?? t("common.loading")}
        mood="tired"
        centered
        variant="plain"
      />
    );
  }

  if (!hasAnySnapshot && activeSnapshotEntry.status === "idle") {
    return <WorklogStatusState title={t("app.loadingWorklog")} description={t("common.loading")} />;
  }

  if (effectiveSnapshot === null) {
    return <WorklogStatusState title={t("app.loadingWorklog")} description={t("common.loading")} />;
  }
  if (effectiveSelectedDay === null) {
    return <WorklogStatusState title={t("app.loadingWorklog")} description={t("common.loading")} />;
  }
  if (isNestedDayView) {
    return (
      <NestedDayView
        parentMode={displayMode === "period" ? "period" : "week"}
        onBack={onCloseNestedDay}
        selectedDay={effectiveSelectedDay}
        auditFlags={effectiveSnapshot.auditFlags}
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
          dayCalendarOpen={dayCalendarOpen}
          dayVisibleMonth={dayVisibleMonth}
          displayMode={displayMode}
          isCurrentDay={isCurrentDay}
          isCurrentPeriod={isCurrentPeriod}
          isCurrentWeek={isCurrentWeek}
          onDayCalendarOpenChange={onDayCalendarOpenChange}
          onDaySelectDate={onDaySelectDate}
          onDayVisibleMonthChange={onDayVisibleMonthChange}
          onModeChange={onModeChange}
          periodCalendarOpen={periodCalendarOpen}
          onPeriodCalendarOpenChange={onPeriodCalendarOpenChange}
          onPeriodDraftRangeChange={onPeriodDraftRangeChange}
          onPeriodSelectRange={onPeriodSelectRange}
          onPeriodVisibleMonthChange={onPeriodVisibleMonthChange}
          onResetCurrentPeriod={onResetCurrentPeriod}
          onShiftCurrentPeriod={onShiftCurrentPeriod}
          onWeekCalendarOpenChange={onWeekCalendarOpenChange}
          onWeekSelectDate={onWeekSelectDate}
          onWeekVisibleMonthChange={onWeekVisibleMonthChange}
          periodDraftRange={periodDraftRange}
          periodLabel={effectivePeriodLabel}
          periodRange={periodRange}
          periodRangeDays={periodRangeDays}
          periodVisibleMonth={periodVisibleMonth}
          weekCalendarOpen={weekCalendarOpen}
          weekVisibleMonth={weekVisibleMonth}
        />
      </m.div>

      <m.div variants={staggerItem}>
        <WorklogContent
          currentSnapshot={effectiveSnapshot}
          currentWeekRange={currentWeekRange}
          displayMode={displayMode}
          onOpenNestedDay={onOpenNestedDay}
          periodLabel={effectivePeriodLabel}
          selectedDay={effectiveSelectedDay}
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
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
  const [page, setPage] = useState(0);
  const [auditSheetOpen, setAuditSheetOpen] = useState(false);
  const issueSetKey = issues.map((issue) => issue.key).join("|");
  const totalPages = Math.max(1, Math.ceil(issues.length / ISSUES_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedIssues = issues.slice(
    safePage * ISSUES_PER_PAGE,
    (safePage + 1) * ISSUES_PER_PAGE,
  );
  const shouldEnter = allowDecorativeAnimation && windowVisibility === "visible";

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

      {allowDecorativeAnimation && paginatedIssues.length > 0 ? (
        <AnimatePresence mode="wait">
          <m.div
            key={`${dataKey}:${safePage}:${issueSetKey}`}
            initial={shouldEnter ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={shouldEnter ? { duration: 0.26, ease: [...easeOut] } : { duration: 0 }}
            className="space-y-2"
          >
            {paginatedIssues.map((issue, i) => (
              <m.div
                key={`${issue.key}-${issue.title}`}
                initial={shouldEnter ? { opacity: 0, y: 16 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  shouldEnter ? { ...springGentle, delay: 0.08 + i * 0.04 } : { duration: 0 }
                }
              >
                <IssueCard issue={issue} />
              </m.div>
            ))}
          </m.div>
        </AnimatePresence>
      ) : paginatedIssues.length > 0 ? (
        <div key={`${dataKey}:${safePage}:${issueSetKey}`} className="space-y-2">
          {paginatedIssues.map((issue) => (
            <div key={`${issue.key}-${issue.title}`}>
              <IssueCard issue={issue} />
            </div>
          ))}
        </div>
      ) : allowDecorativeAnimation ? (
        <m.div
          key={`${dataKey}:empty`}
          initial={shouldEnter ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldEnter ? { duration: 0.26, ease: [...easeOut] } : { duration: 0 }}
        >
          <EmptyState
            title={t("worklog.noIssues")}
            description={t("worklog.pickDifferentDate")}
            mood="idle"
            foxSize={80}
            variant="plain"
            animationStyle="together"
            disableInnerAnimation
          />
        </m.div>
      ) : (
        <EmptyState
          title={t("worklog.noIssues")}
          description={t("worklog.pickDifferentDate")}
          mood="idle"
          foxSize={80}
          variant="plain"
          animationStyle="together"
        />
      )}

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
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
  const shouldEnter = allowDecorativeAnimation && windowVisibility === "visible";

  return (
    <m.div
      key={dataKey}
      initial={shouldEnter ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldEnter ? { duration: 0.26, ease: [...easeOut] } : { duration: 0 }}
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {items.map((item, index) => (
        <m.div
          key={`${dataKey}:${item.title}`}
          initial={shouldEnter ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={
            shouldEnter ? { ...springGentle, delay: 0.08 + index * 0.04 } : { duration: 0 }
          }
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

function WorklogStatusState({
  title,
  description,
  mood = "idle",
  centered = false,
  variant = "card",
}: {
  title: string;
  description: string;
  mood?: React.ComponentProps<typeof EmptyState>["mood"];
  centered?: boolean;
  variant?: React.ComponentProps<typeof EmptyState>["variant"];
}) {
  if (centered) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyState title={title} description={description} mood={mood} variant={variant} />
      </div>
    );
  }

  return <EmptyState title={title} description={description} mood={mood} variant={variant} />;
}

function createFallbackPeriodSnapshot(periodRange: PeriodRangeState, payload: BootstrapPayload) {
  const startDate = toDateInputValue(periodRange.from);
  const endDate = toDateInputValue(periodRange.to);

  return {
    mode: "range",
    range: {
      startDate,
      endDate,
      label: `${startDate} - ${endDate}`,
    },
    selectedDay: payload.today,
    days: [],
    month: payload.month,
    auditFlags: [],
  } satisfies WorklogSnapshot;
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function calendarTriggerClassName(open: boolean) {
  return getCompactIconButtonClassName(open);
}

function formatSignedHours(formatHours: (value: number) => string, value: number) {
  if (value > 0) return `+${formatHours(value)}`;
  if (value < 0) return `-${formatHours(Math.abs(value))}`;
  return formatHours(0);
}
function shiftDate(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}
