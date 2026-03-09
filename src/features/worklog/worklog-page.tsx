import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle.js";
import CalendarIcon from "lucide-react/dist/esm/icons/calendar.js";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { EmptyState } from "@/components/shared/empty-state";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { StatPanel } from "@/components/shared/stat-panel";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonthView } from "@/features/dashboard/month-view";
import { WeekView } from "@/features/dashboard/week-view";
import { loadWorklogSnapshot } from "@/lib/tauri";
import { cn, formatHours } from "@/lib/utils";

import type { AuditFlag, BootstrapPayload, IssueBreakdown, WorklogSnapshot } from "@/types/dashboard";

export type WorklogMode = "day" | "week" | "month" | "range";

export function WorklogPage({
  payload,
  mode,
  onModeChange,
}: {
  payload: BootstrapPayload;
  mode: WorklogMode;
  onModeChange: (mode: WorklogMode) => void;
}) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [rangeEndDate, setRangeEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return d;
  });
  const [worklog, setWorklog] = useState<WorklogSnapshot | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    void loadWorklogSnapshot({
      mode,
      anchorDate: toDateInputValue(selectedDate),
      endDate: mode === "range" ? toDateInputValue(rangeEndDate) : undefined,
    }).then(setWorklog);
  }, [mode, selectedDate, rangeEndDate]);

  const currentSnapshot = worklog ?? {
    mode,
    range: {
      startDate: toDateInputValue(selectedDate),
      endDate: toDateInputValue(rangeEndDate),
      label: "Loading...",
    },
    selectedDay: payload.today,
    days: payload.week,
    month: payload.month,
    auditFlags: payload.auditFlags,
  };

  const isToday = isSameDay(selectedDate, new Date());

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={mode} onValueChange={(v) => onModeChange(v as WorklogMode)}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="range">Range</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          {/* Date nav */}
          <div className="inline-flex items-center gap-1 rounded-xl border-2 border-border bg-card p-1 shadow-[var(--shadow-clay)]">
            <button
              type="button"
              onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
              className="cursor-pointer rounded-lg border-2 border-transparent p-1.5 text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground active:translate-y-[1px]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(new Date())}
              className="cursor-pointer rounded-lg border-2 border-transparent px-2 py-1.5 text-xs font-bold text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground active:translate-y-[1px]"
            >
              {isToday ? "Today" : formatDateShort(selectedDate)}
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
              className="cursor-pointer rounded-lg border-2 border-transparent p-1.5 text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground active:translate-y-[1px]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Range date picker — Popover with Calendar instead of native <input type="date"> */}
          {mode === "range" && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-border bg-card px-3 py-1.5 text-sm text-foreground shadow-[var(--shadow-clay)] transition-all hover:bg-muted active:translate-y-[1px] active:shadow-none"
                >
                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{formatDateShort(selectedDate)}</span>
                  <span className="text-muted-foreground">to</span>
                  <span>{formatDateShort(rangeEndDate)}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: selectedDate, to: rangeEndDate }}
                  onSelect={(value: DateRange | undefined) => {
                    if (!value) return;
                    if (value.from) setSelectedDate(value.from);
                    if (value.to) setRangeEndDate(value.to);
                  }}
                  month={selectedDate}
                  onMonthChange={setSelectedDate}
                  numberOfMonths={2}
                   className="border-0 p-3"
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Calendar popover toggle (single/week/month modes) */}
          {mode !== "range" && (
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "cursor-pointer rounded-xl border-2 p-2 transition-all active:translate-y-[1px]",
                    calendarOpen
                      ? "border-primary/30 bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--color-border)]"
                      : "border-border text-muted-foreground shadow-[var(--shadow-clay)] hover:bg-muted hover:text-foreground",
                  )}
                >
                  <CalendarIcon className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(value: Date | undefined) => {
                    if (value) {
                      setSelectedDate(value);
                      setCalendarOpen(false);
                    }
                  }}
                  month={selectedDate}
                  onMonthChange={setSelectedDate}
                   className="border-0 p-3"
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Content — full width, no more sidebar stealing space */}
      <div>
        {mode === "day" && <DaySummaryPanel selectedDay={currentSnapshot.selectedDay} selectedDate={selectedDate} auditFlags={currentSnapshot.auditFlags} />}
        {mode === "week" && <WeekView week={currentSnapshot.days} />}
        {mode === "month" && <MonthView month={currentSnapshot.month} />}
        {mode === "range" && <RangeSummaryPanel snapshot={currentSnapshot} />}
      </div>
    </div>
  );
}

const ISSUES_PER_PAGE = 10;

const issueToneBorder = {
  emerald: "border-l-emerald-500/70",
  amber: "border-l-amber-500/70",
  cyan: "border-l-cyan-500/70",
  rose: "border-l-rose-500/70",
  violet: "border-l-violet-500/70",
} as const;

function DaySummaryPanel({
  selectedDay,
  selectedDate,
  auditFlags,
}: {
  selectedDay: WorklogSnapshot["selectedDay"];
  selectedDate: Date;
  auditFlags: AuditFlag[];
}) {
  const [page, setPage] = useState(0);
  const [auditSheetOpen, setAuditSheetOpen] = useState(false);

  const issues = selectedDay.topIssues;
  const totalPages = Math.max(1, Math.ceil(issues.length / ISSUES_PER_PAGE));
  const paginatedIssues = issues.slice(page * ISSUES_PER_PAGE, (page + 1) * ISSUES_PER_PAGE);

  // Reset page when navigating dates
  useEffect(() => {
    setPage(0);
  }, [selectedDate]);

  return (
    <div className="space-y-5">
      {/* Date heading */}
      <h3 className="font-display text-lg font-semibold">
        {selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
      </h3>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border-2 border-border bg-card p-3 shadow-[var(--shadow-clay)]">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Logged</p>
          <p className="mt-1 font-display text-2xl font-semibold text-foreground">
            {selectedDay.loggedHours.toFixed(1)}h
          </p>
        </div>
        <div className="rounded-2xl border-2 border-border bg-card p-3 shadow-[var(--shadow-clay)]">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Target</p>
          <p className="mt-1 font-display text-2xl font-semibold text-foreground">
            {selectedDay.targetHours.toFixed(1)}h
          </p>
        </div>
      </div>

      {/* Issues section */}
      <div className="space-y-3">
        {/* Section header — title left, audit button right (fixed position, no layout shift) */}
        <div className="flex items-center justify-between">
          <h4 className="font-display text-sm font-semibold text-foreground">
            Issues
            {issues.length > 0 && (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                ({issues.length})
              </span>
            )}
          </h4>
          {auditFlags.length > 0 && (
            <Sheet open={auditSheetOpen} onOpenChange={setAuditSheetOpen}>
              <SheetTrigger asChild>
                <button type="button" className="cursor-pointer">
                  <Badge tone="high">{auditFlags.length} flags</Badge>
                </button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Audit Flags
                  </SheetTitle>
                  <SheetDescription>
                    {auditFlags.length} issue{auditFlags.length !== 1 ? "s" : ""} detected
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-2 px-4 pb-4">
                  {auditFlags.map((flag) => (
                    <div
                      key={flag.title}
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
          )}
        </div>

        {/* Issue cards */}
        {paginatedIssues.length > 0 ? (
          <>
            <div className="space-y-2">
              {paginatedIssues.map((issue) => (
                <IssueCard key={issue.key} issue={issue} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="cursor-pointer rounded-lg border-2 border-transparent p-1 text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground disabled:cursor-default disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="cursor-pointer rounded-lg border-2 border-transparent p-1 text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground disabled:cursor-default disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title="No issues logged for this day"
            description="Pick a different date or log some time."
            mood="idle"
            foxSize={80}
          />
        )}
      </div>
    </div>
  );
}

function IssueCard({ issue }: { issue: IssueBreakdown }) {
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
          {issue.hours.toFixed(1)}h
        </span>
      </div>
    </div>
  );
}

function RangeSummaryPanel({ snapshot }: { snapshot: WorklogSnapshot }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 @sm:grid-cols-3">
        <StatPanel title="Logged" value={formatHours(snapshot.month.loggedHours)} note="Across range" />
        <StatPanel title="Target" value={formatHours(snapshot.month.targetHours)} note="Expected" />
        <StatPanel title="Clean days" value={String(snapshot.month.cleanDays)} note={`${snapshot.month.overflowDays} overflow`} />
      </div>
      <WeekView week={snapshot.days} />
    </div>
  );
}

function shiftDate(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateShort(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
