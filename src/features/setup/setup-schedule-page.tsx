import * as React from "react";
import Globe from "lucide-react/dist/esm/icons/globe.js";
import Search from "lucide-react/dist/esm/icons/search.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getEffectiveWeekStart,
  getOrderedWorkdays,
  WEEK_START_OPTIONS,
  type SchedulePhase,
  type WeekStartPreference,
} from "@/features/preferences/schedule-form";
import { cn, getSupportedTimezones, getWeekStartForTimezone } from "@/lib/utils";
import { SetupShell } from "./setup-shell";

import type { ScheduleInput } from "@/types/dashboard";

interface SetupSchedulePageProps {
  shiftStart: string;
  shiftEnd: string;
  lunchMinutes: string;
  workdays: string[];
  timezone: string;
  weekStart: WeekStartPreference;
  netHours: string;
  schedulePhase: SchedulePhase;
  onBack: () => void;
  onNext: () => void;
  onShiftStartChange: (v: string) => void;
  onShiftEndChange: (v: string) => void;
  onLunchMinutesChange: (v: string) => void;
  onTimezoneChange: (v: string) => void;
  onWeekStartChange: (value: WeekStartPreference) => void;
  onToggleWorkday: (day: string) => void;
  onSave: (input: ScheduleInput) => Promise<void>;
}

export function SetupSchedulePage({
  shiftStart,
  shiftEnd,
  lunchMinutes,
  workdays,
  timezone,
  weekStart,
  netHours,
  schedulePhase,
  onBack,
  onNext,
  onShiftStartChange,
  onShiftEndChange,
  onLunchMinutesChange,
  onTimezoneChange,
  onWeekStartChange,
  onToggleWorkday,
  onSave,
}: SetupSchedulePageProps) {
  const saving = schedulePhase === "saving";
  const [timezoneOpen, setTimezoneOpen] = React.useState(false);
  const [timezoneQuery, setTimezoneQuery] = React.useState("");
  const timezones = React.useMemo(() => getSupportedTimezones(timezone), [timezone]);
  const filteredTimezones = timezoneQuery
    ? timezones.filter((value: string) => value.toLowerCase().includes(timezoneQuery.toLowerCase()))
    : timezones;
  const orderedWorkdays = getOrderedWorkdays(weekStart, timezone);
  const resolvedWeekStart = getEffectiveWeekStart(weekStart, timezone);

  async function handleSaveAndContinue() {
    try {
      await onSave({
        shiftStart,
        shiftEnd,
        lunchMinutes: Number.parseInt(lunchMinutes) || 0,
        workdays,
        timezone,
        weekStart: resolvedWeekStart,
      });
      onNext();
    } catch {
      // onSave resets the form phase on failure; user sees the "Save & continue" button re-enabled
    }
  }

  return (
    <SetupShell step={1} totalSteps={5}>
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-display text-3xl font-bold">When do you work?</h1>
          <p className="text-muted-foreground">Define your shift hours and working days</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-36 space-y-1.5">
            <Label htmlFor="shift-start">Shift start</Label>
            <Input
              id="shift-start"
              type="time"
              value={shiftStart}
              onChange={(e) => onShiftStartChange(e.target.value)}
            />
          </div>
          <div className="w-36 space-y-1.5">
            <Label htmlFor="shift-end">Shift end</Label>
            <Input
              id="shift-end"
              type="time"
              value={shiftEnd}
              onChange={(e) => onShiftEndChange(e.target.value)}
            />
          </div>
          <div className="w-28 space-y-1.5">
            <Label htmlFor="lunch-break">Lunch break</Label>
            <Input
              id="lunch-break"
              type="number"
              min={0}
              step={5}
              value={lunchMinutes}
              onChange={(e) => onLunchMinutesChange(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Net hours/day</Label>
            <div className="flex h-10 items-center rounded-xl border-2 border-primary/20 bg-primary/5 px-4">
              <span className="font-display text-sm font-bold tabular-nums text-primary">{netHours}h</span>
            </div>
          </div>
        </div>

        <div className="w-fit max-w-full space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            Timezone
          </Label>
          <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-10 min-w-72 max-w-[30rem] items-center justify-between gap-3 rounded-xl border-2 border-border bg-muted px-3 py-2 text-left text-sm text-foreground shadow-[var(--shadow-clay-inset)] transition outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              >
                <span className="truncate">{timezone}</span>
                <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-3rem)] overflow-hidden border-border bg-card p-0 text-card-foreground shadow-[var(--shadow-clay)]"
            >
              <div className="border-b border-border/70 p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={timezoneQuery}
                    onChange={(event) => setTimezoneQuery(event.target.value)}
                    placeholder="Search timezone"
                    className="pl-9"
                  />
                </div>
              </div>
              <ScrollArea className="h-72">
                <div className="grid gap-1 bg-card p-2">
                  {filteredTimezones.map((option: string) => {
                    const active = option === timezone;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          onTimezoneChange(option);
                          setTimezoneOpen(false);
                          setTimezoneQuery("");
                        }}
                        className={cn(
                          "flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-all",
                          active
                            ? "bg-primary/12 text-foreground shadow-[var(--shadow-clay-inset)]"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <span className="truncate">{option}</span>
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                          {option.split("/")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>First day of week</Label>
          <div className="flex flex-wrap gap-1.5">
            {WEEK_START_OPTIONS.map((option) => {
              const active = weekStart === option;
              const autoLabel = getWeekStartForTimezone(timezone);
              const labelMap: Record<Exclude<WeekStartPreference, "auto">, string> = {
                sunday: "Sun",
                monday: "Mon",
                friday: "Fri",
                saturday: "Sat",
              };
              const label = option === "auto" ? `Auto (${labelMap[autoLabel]})` : labelMap[option];

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onWeekStartChange(option)}
                  className={cn(
                    "cursor-pointer rounded-xl border-2 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] transition-all",
                    active
                      ? "border-primary/30 bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--color-border)] active:translate-y-[1px] active:shadow-none"
                      : "border-border bg-muted text-muted-foreground shadow-[var(--shadow-clay-inset)] hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Working days</Label>
          <div className="flex flex-wrap gap-1.5">
            {orderedWorkdays.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => onToggleWorkday(day)}
                className={cn(
                  "cursor-pointer rounded-xl border-2 px-3 py-2 text-sm font-bold transition-all",
                  workdays.includes(day)
                    ? "border-primary/30 bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--color-border)] active:translate-y-[1px] active:shadow-none"
                    : "border-border bg-muted text-muted-foreground shadow-[var(--shadow-clay-inset)] hover:text-foreground",
                )}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Button onClick={() => void handleSaveAndContinue()} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save & continue"}
          </Button>
          <button type="button" onClick={onBack} className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground cursor-pointer transition-colors">
            Back
          </button>
        </div>
      </div>
    </SetupShell>
  );
}
