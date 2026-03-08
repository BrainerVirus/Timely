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

import type { BootstrapPayload, WorklogSnapshot } from "@/types/dashboard";

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
  const [auditSheetOpen, setAuditSheetOpen] = useState(false);

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
          <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
              className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(new Date())}
              className="cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
              className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
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
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground transition hover:bg-muted"
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
                  className="border-0 bg-transparent p-3"
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
                    "cursor-pointer rounded-lg p-2 transition",
                    calendarOpen
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
                  className="border-0 bg-transparent p-3"
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Audit flags — Sheet overlay */}
          {currentSnapshot.auditFlags.length > 0 && (
            <Sheet open={auditSheetOpen} onOpenChange={setAuditSheetOpen}>
              <SheetTrigger asChild>
                <button type="button" className="cursor-pointer">
                  <Badge tone="high">{currentSnapshot.auditFlags.length} flags</Badge>
                </button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Audit Flags
                  </SheetTitle>
                  <SheetDescription>
                    {currentSnapshot.auditFlags.length} issue{currentSnapshot.auditFlags.length !== 1 ? "s" : ""} detected
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-2 px-4 pb-4">
                  {currentSnapshot.auditFlags.map((flag) => (
                    <div
                      key={flag.title}
                      className="flex items-center justify-between border-b border-border/50 py-3 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">{flag.title}</p>
                        <p className="text-xs text-muted-foreground">{flag.detail}</p>
                      </div>
                      <Badge tone={flag.severity} className="ml-3 shrink-0">
                        {flag.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {/* Content — full width, no more sidebar stealing space */}
      <div>
        {mode === "day" && <DaySummaryPanel selectedDay={currentSnapshot.selectedDay} selectedDate={selectedDate} />}
        {mode === "week" && <WeekView week={currentSnapshot.days} />}
        {mode === "month" && <MonthView month={currentSnapshot.month} />}
        {mode === "range" && <RangeSummaryPanel snapshot={currentSnapshot} />}
      </div>
    </div>
  );
}

function DaySummaryPanel({
  selectedDay,
  selectedDate,
}: {
  selectedDay: WorklogSnapshot["selectedDay"];
  selectedDate: Date;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-semibold">
          {selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </h3>
        <div className="mt-2 flex gap-4">
          <WorklogStat label="Logged" value={`${selectedDay.loggedHours.toFixed(1)}h`} />
          <WorklogStat label="Target" value={`${selectedDay.targetHours.toFixed(1)}h`} />
        </div>
      </div>
      <div className="space-y-1">
        {selectedDay.topIssues.length > 0 ? (
          selectedDay.topIssues.map((issue) => (
            <div key={issue.key} className="flex items-center justify-between gap-3 border-b border-border/50 py-2 last:border-0">
              <div className="min-w-0">
                <p className="font-mono text-xs text-muted-foreground">{issue.key}</p>
                <p className="truncate text-sm text-foreground">{issue.title}</p>
              </div>
              <span className="text-sm tabular-nums text-muted-foreground">{issue.hours.toFixed(1)}h</span>
            </div>
          ))
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

function RangeSummaryPanel({ snapshot }: { snapshot: WorklogSnapshot }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatPanel title="Logged" value={formatHours(snapshot.month.loggedHours)} note="Across range" />
        <StatPanel title="Target" value={formatHours(snapshot.month.targetHours)} note="Expected" />
        <StatPanel title="Clean days" value={String(snapshot.month.cleanDays)} note={`${snapshot.month.overflowDays} overflow`} />
      </div>
      <WeekView week={snapshot.days} />
    </div>
  );
}

function WorklogStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-semibold">{value}</p>
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
