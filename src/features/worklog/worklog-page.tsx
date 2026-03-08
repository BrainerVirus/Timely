import CalendarIcon from "lucide-react/dist/esm/icons/calendar.js";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days.js";
import CalendarRange from "lucide-react/dist/esm/icons/calendar-range.js";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import LayoutGrid from "lucide-react/dist/esm/icons/layout-grid.js";
import ListFilter from "lucide-react/dist/esm/icons/list-filter.js";
import SearchCheck from "lucide-react/dist/esm/icons/search-check.js";
import { m } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { StatPanel } from "@/components/shared/stat-panel";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AuditView } from "@/features/audit/audit-view";
import { MonthView } from "@/features/dashboard/month-view";
import { WeekView } from "@/features/dashboard/week-view";
import { cardContainerVariants } from "@/lib/animations";
import { loadWorklogSnapshot } from "@/lib/tauri";
import { cn, formatHours } from "@/lib/utils";

import type { BootstrapPayload, WorklogSnapshot } from "@/types/dashboard";

export type WorklogMode = "day" | "week" | "month" | "review" | "range";

const tabs: Array<{ key: WorklogMode; label: string; icon: typeof CalendarDays }> = [
  { key: "day", label: "Day", icon: CalendarDays },
  { key: "week", label: "Week", icon: CalendarRange },
  { key: "month", label: "Month", icon: CalendarDays },
  { key: "range", label: "Range", icon: CalendarRange },
  { key: "review", label: "Review", icon: SearchCheck },
];

export function WorklogPage({
  payload,
  mode,
  onModeChange,
}: {
  payload: BootstrapPayload;
  mode: WorklogMode;
  onModeChange: (mode: WorklogMode) => void;
}) {
  const [selectedDate, setSelectedDate] = useState(() => new Date(2026, 2, 8));
  const [rangeEndDate, setRangeEndDate] = useState(() => new Date(2026, 2, 14));
  const [worklog, setWorklog] = useState<WorklogSnapshot | null>(null);
  const [calendarDensity, setCalendarDensity] = useState<"compact" | "expanded">("compact");
  const calendarDays = useMemo(() => buildMonthDays(selectedDate), [selectedDate]);

  useEffect(() => {
    const normalizedMode = mode === "review" ? "range" : mode;
    void loadWorklogSnapshot({
      mode: normalizedMode,
      anchorDate: toDateInputValue(selectedDate),
      endDate: normalizedMode === "range" ? toDateInputValue(rangeEndDate) : undefined,
    }).then(setWorklog);
  }, [mode, selectedDate, rangeEndDate]);

  const currentSnapshot = worklog ?? {
    mode: mode === "review" ? "range" : mode,
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
    <m.div
      variants={cardContainerVariants}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      <Card className="overflow-hidden p-0">
        <div className="space-y-5 p-5 sm:p-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Worklog center
            </div>
            <h1 className="font-display text-3xl font-semibold text-foreground">Review your time from one place</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Day, week, month, and review now live together so this feels like one coherent workspace
              instead of empty isolated pages.
            </p>
          </div>

          <Tabs value={mode} onValueChange={(value) => onModeChange(value as WorklogMode)}>
            <TabsList>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.key} value={tab.key}>
                    <Icon className="mr-2 h-4 w-4" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <TabsContent value={mode} className="mt-0" />
          </Tabs>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
                <CalendarIcon className="h-4 w-4 text-primary/70" />
                {currentSnapshot.range.label}
              </div>
              <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-background p-1">
                <button
                  type="button"
                  onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
                  className="cursor-pointer rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(new Date())}
                  className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
                  className="cursor-pointer rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              {mode === "range" || mode === "review" ? (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
                  <input
                    type="date"
                    value={toDateInputValue(selectedDate)}
                    onChange={(event) => setSelectedDate(parseDateInput(event.target.value))}
                    className="bg-transparent outline-none"
                  />
                  <span className="text-muted-foreground">to</span>
                  <input
                    type="date"
                    value={toDateInputValue(rangeEndDate)}
                    onChange={(event) => setRangeEndDate(parseDateInput(event.target.value))}
                    className="bg-transparent outline-none"
                  />
                </div>
              ) : null}
            </div>

            <ToggleGroup
              type="single"
              value={calendarDensity}
              onValueChange={(value) => {
                if (value === "compact" || value === "expanded") {
                  setCalendarDensity(value);
                }
              }}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="compact">
                <LayoutGrid className="mr-1 h-3.5 w-3.5" />
                Compact
              </ToggleGroupItem>
              <ToggleGroupItem value="expanded">
                <ListFilter className="mr-1 h-3.5 w-3.5" />
                Expanded
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div>
          {mode === "day" ? (
            <DaySummaryPanel selectedDay={currentSnapshot.selectedDay} selectedDate={selectedDate} />
          ) : mode === "week" ? (
            <WeekView week={currentSnapshot.days} />
          ) : mode === "month" ? (
            <MonthView month={currentSnapshot.month} />
          ) : mode === "range" ? (
            <RangeSummaryPanel snapshot={currentSnapshot} />
          ) : (
            <AuditView flags={currentSnapshot.auditFlags} />
          )}
        </div>

        <aside className="space-y-4">
          <CalendarPanel
            mode={mode}
            selectedDate={selectedDate}
            rangeEndDate={rangeEndDate}
            snapshot={currentSnapshot}
            density={calendarDensity}
            calendarDays={calendarDays}
            onSelectDate={setSelectedDate}
            onSelectRangeEndDate={setRangeEndDate}
          />
          <ReviewHighlightsPanel snapshot={currentSnapshot} mode={mode} />
        </aside>
      </div>
    </m.div>
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
    <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">Selected day</h3>
            <p className="text-xs text-muted-foreground">
              This is the first step toward the future timeline and range explorer.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Date focus</p>
            <p className="mt-2 font-display text-2xl font-semibold text-foreground">
              {selectedDate.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <WorklogStat label="Logged" value={`${selectedDay.loggedHours.toFixed(1)}h`} />
            <WorklogStat label="Target" value={`${selectedDay.targetHours.toFixed(1)}h`} />
            <WorklogStat label="Focus" value={`${selectedDay.focusHours.toFixed(1)}h`} />
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-3">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">Top issues</h3>
            <p className="text-xs text-muted-foreground">Issue-level drilldown will stay attached to this worklog surface.</p>
          </div>
          <div className="space-y-2">
            {selectedDay.topIssues.length > 0 ? (
              selectedDay.topIssues.map((issue) => (
                <div key={issue.key} className="rounded-xl border border-border bg-muted/35 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{issue.key}</p>
                      <p className="truncate text-sm font-medium text-foreground">{issue.title}</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{issue.hours.toFixed(1)}h</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                No issues logged for the selected day yet.
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function RangeSummaryPanel({ snapshot }: { snapshot: WorklogSnapshot }) {
  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">Range summary</h3>
            <p className="text-xs text-muted-foreground">
              Real backend-driven range mode using dedicated worklog queries.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatPanel title="Logged" value={formatHours(snapshot.month.loggedHours)} note="Across selected range" />
            <StatPanel title="Target" value={formatHours(snapshot.month.targetHours)} note="Expected across selected range" />
            <StatPanel title="Clean days" value={String(snapshot.month.cleanDays)} note={`${snapshot.month.overflowDays} overflow days`} />
          </div>
        </div>
      </Card>

      <WeekView week={snapshot.days} />
    </div>
  );
}

function CalendarPanel({
  mode,
  selectedDate,
  rangeEndDate,
  snapshot,
  density,
  calendarDays,
  onSelectDate,
  onSelectRangeEndDate,
}: {
  mode: WorklogMode;
  selectedDate: Date;
  rangeEndDate: Date;
  snapshot: WorklogSnapshot;
  density: "compact" | "expanded";
  calendarDays: Array<{ key: string; label: number; isCurrentMonth: boolean; isToday: boolean; date: Date }>;
  onSelectDate: (date: Date) => void;
  onSelectRangeEndDate: (date: Date) => void;
}) {
  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">Calendar</h3>
          <p className="text-xs text-muted-foreground">
            Month selection is live now; range and year views are the next step.
          </p>
        </div>

        {mode === "range" || mode === "review" ? (
          <Calendar
            mode="range"
            selected={{ from: selectedDate, to: rangeEndDate }}
            onSelect={(value: DateRange | undefined) => {
              if (!value) return;
              if (value.from) onSelectDate(value.from);
              if (value.to) onSelectRangeEndDate(value.to);
            }}
            month={selectedDate}
            onMonthChange={onSelectDate}
            captionLayout="dropdown"
            className="border-0 bg-transparent p-0"
          />
        ) : (
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(value: Date | undefined) => {
              if (value) onSelectDate(value);
            }}
            month={selectedDate}
            onMonthChange={onSelectDate}
            captionLayout="dropdown"
            className="border-0 bg-transparent p-0"
          />
        )}

        {density === "expanded" ? (
          <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Range summary</p>
              <Badge tone="low">{snapshot.days.length} days</Badge>
            </div>
            <div className="grid gap-2">
              {snapshot.days.slice(0, 6).map((day) => (
                <div key={`${day.dateLabel}-${day.shortLabel}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/80 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{day.dateLabel}</p>
                    <p className="text-xs text-muted-foreground">{day.status.replaceAll("_", " ")}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{formatHours(day.loggedHours)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function ReviewHighlightsPanel({ snapshot, mode }: { snapshot: WorklogSnapshot; mode: WorklogMode }) {
  const totalLogged = snapshot.days.reduce((sum, day) => sum + day.loggedHours, 0);
  const totalTarget = snapshot.days.reduce((sum, day) => sum + day.targetHours, 0);
  const variance = totalLogged - totalTarget;

  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">Review insights</h3>
          <p className="text-xs text-muted-foreground">
            Review lives inside Worklog now, not as a disconnected top-level page.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <WorklogStat label="Week logged" value={formatHours(totalLogged)} />
          <WorklogStat label="Week target" value={formatHours(totalTarget)} />
          <WorklogStat label="Variance" value={`${variance >= 0 ? "+" : ""}${variance.toFixed(1)}h`} />
        </div>

        <div className="space-y-2">
          {snapshot.auditFlags.length > 0 ? (
            snapshot.auditFlags.map((flag) => (
              <div key={flag.title} className="rounded-xl border border-border bg-muted/25 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{flag.title}</p>
                  <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    {flag.severity}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{flag.detail}</p>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              {mode === "review"
                ? "No review warnings right now."
                : "Switch to Review to inspect issues like underfilled or overflow days."}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function isDateWithinRange(date: Date, start: Date, end: Date) {
  const time = date.getTime();
  const startTime = start.getTime();
  const endTime = end.getTime();
  return time >= Math.min(startTime, endTime) && time <= Math.max(startTime, endTime);
}

function WorklogStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/35 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function buildMonthDays(selectedDate: Date) {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 35 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      key: date.toISOString(),
      label: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isToday: isSameDate(date, new Date()),
      date,
    };
  });
}

function shiftDate(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function isSameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}
