import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle.js";
import CalendarIcon from "lucide-react/dist/esm/icons/calendar.js";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
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
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAuditFlags, setShowAuditFlags] = useState(false);

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
      <div className="flex items-center justify-between gap-4">
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

          {mode === "range" && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
              <input
                type="date"
                value={toDateInputValue(selectedDate)}
                onChange={(e) => setSelectedDate(parseDateInput(e.target.value))}
                className="bg-transparent outline-none"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={toDateInputValue(rangeEndDate)}
                onChange={(e) => setRangeEndDate(parseDateInput(e.target.value))}
                className="bg-transparent outline-none"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowCalendar((v) => !v)}
            className={cn(
              "cursor-pointer rounded-lg p-2 transition",
              showCalendar ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <CalendarIcon className="h-4 w-4" />
          </button>

          {currentSnapshot.auditFlags.length > 0 && (
            <button type="button" onClick={() => setShowAuditFlags((v) => !v)} className="cursor-pointer">
              <Badge tone="high">{currentSnapshot.auditFlags.length} flags</Badge>
            </button>
          )}
        </div>
      </div>

      {/* Audit flags dropdown */}
      {showAuditFlags && currentSnapshot.auditFlags.length > 0 && (
        <div className="space-y-2 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-semibold">Audit Flags</h3>
          </div>
          {currentSnapshot.auditFlags.map((flag) => (
            <div key={flag.title} className="flex items-center justify-between border-b border-border/50 py-2 last:border-0">
              <div>
                <p className="text-sm text-foreground">{flag.title}</p>
                <p className="text-xs text-muted-foreground">{flag.detail}</p>
              </div>
              <Badge tone={flag.severity}>{flag.severity}</Badge>
            </div>
          ))}
        </div>
      )}

      {/* Content + Calendar sidebar */}
      <div className="flex gap-4">
        <div className="flex-1">
          {mode === "day" && <DaySummaryPanel selectedDay={currentSnapshot.selectedDay} selectedDate={selectedDate} />}
          {mode === "week" && <WeekView week={currentSnapshot.days} />}
          {mode === "month" && <MonthView month={currentSnapshot.month} />}
          {mode === "range" && <RangeSummaryPanel snapshot={currentSnapshot} />}
        </div>
        {showCalendar && (
          <aside className="w-70 shrink-0">
            {mode === "range" ? (
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
                captionLayout="dropdown"
                className="border-0 bg-transparent p-0"
              />
            ) : (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(value: Date | undefined) => {
                  if (value) setSelectedDate(value);
                }}
                month={selectedDate}
                onMonthChange={setSelectedDate}
                captionLayout="dropdown"
                className="border-0 bg-transparent p-0"
              />
            )}
          </aside>
        )}
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
          <p className="py-4 text-sm text-muted-foreground">No issues logged for this day.</p>
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

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}
