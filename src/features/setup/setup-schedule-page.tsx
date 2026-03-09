import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ALL_WORKDAYS } from "@/features/preferences/schedule-form";
import { cn } from "@/lib/utils";
import { SetupShell } from "./setup-shell";

import type { SchedulePhase } from "@/features/preferences/schedule-form";
import type { ScheduleInput } from "@/types/dashboard";

interface SetupSchedulePageProps {
  shiftStart: string;
  shiftEnd: string;
  lunchMinutes: string;
  workdays: string[];
  timezone: string;
  netHours: string;
  schedulePhase: SchedulePhase;
  onBack: () => void;
  onNext: () => void;
  onShiftStartChange: (v: string) => void;
  onShiftEndChange: (v: string) => void;
  onLunchMinutesChange: (v: string) => void;
  onToggleWorkday: (day: string) => void;
  onSave: (input: ScheduleInput) => Promise<void>;
}

export function SetupSchedulePage({
  shiftStart,
  shiftEnd,
  lunchMinutes,
  workdays,
  timezone,
  netHours,
  schedulePhase,
  onBack,
  onNext,
  onShiftStartChange,
  onShiftEndChange,
  onLunchMinutesChange,
  onToggleWorkday,
  onSave,
}: SetupSchedulePageProps) {
  const saving = schedulePhase === "saving";

  async function handleSaveAndContinue() {
    try {
      await onSave({
        shiftStart,
        shiftEnd,
        lunchMinutes: Number.parseInt(lunchMinutes) || 0,
        workdays,
        timezone,
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

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="shift-start">Shift start</Label>
            <Input
              id="shift-start"
              type="time"
              value={shiftStart}
              onChange={(e) => onShiftStartChange(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shift-end">Shift end</Label>
            <Input
              id="shift-end"
              type="time"
              value={shiftEnd}
              onChange={(e) => onShiftEndChange(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lunch-break">Lunch (min)</Label>
            <Input
              id="lunch-break"
              type="number"
              min={0}
              step={5}
              value={lunchMinutes}
              onChange={(e) => onLunchMinutesChange(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Timezone</Label>
          <Input value={timezone} disabled />
        </div>

        <div className="flex items-center justify-between rounded-2xl border-2 border-border bg-muted/50 px-4 py-3 shadow-[var(--shadow-clay)]">
          <span className="text-sm text-muted-foreground">Net hours per day</span>
          <span className="font-display text-lg font-semibold text-foreground">{netHours}h</span>
        </div>

        <div className="space-y-2">
          <Label>Working days</Label>
          <div className="flex gap-1.5">
            {ALL_WORKDAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => onToggleWorkday(day)}
                className={cn(
                  "flex-1 cursor-pointer rounded-xl border-2 py-2 text-sm font-bold transition-all",
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
