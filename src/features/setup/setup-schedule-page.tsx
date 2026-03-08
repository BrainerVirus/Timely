import { SetupShell } from "@/features/setup/setup-shell";
import { SchedulePreferencesCard } from "@/features/preferences/schedule-preferences-card";

import type { ScheduleInput } from "@/types/dashboard";
import type { SchedulePhase } from "@/features/preferences/schedule-form";

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
}: {
  shiftStart: string;
  shiftEnd: string;
  lunchMinutes: string;
  workdays: string[];
  timezone: string;
  netHours: string;
  schedulePhase: SchedulePhase;
  onBack: () => void;
  onNext: () => void;
  onShiftStartChange: (value: string) => void;
  onShiftEndChange: (value: string) => void;
  onLunchMinutesChange: (value: string) => void;
  onToggleWorkday: (day: string) => void;
  onSave: (input: ScheduleInput) => Promise<void>;
}) {
  return (
    <SetupShell
      step="schedule"
      eyebrow="Schedule"
      title="Define your working rhythm"
      description="We need your working hours and default workdays so the app can compare logged time against realistic targets instead of guessing."
      onBack={onBack}
      onNext={onNext}
      nextLabel="Continue to sync"
    >
      <SchedulePreferencesCard
        shiftStart={shiftStart}
        shiftEnd={shiftEnd}
        lunchMinutes={lunchMinutes}
        workdays={workdays}
        timezone={timezone}
        netHours={netHours}
        schedulePhase={schedulePhase}
        canSave
        onShiftStartChange={onShiftStartChange}
        onShiftEndChange={onShiftEndChange}
        onLunchMinutesChange={onLunchMinutesChange}
        onToggleWorkday={onToggleWorkday}
        onSave={() =>
          void onSave({
            shiftStart,
            shiftEnd,
            lunchMinutes: Number.parseInt(lunchMinutes) || 0,
            workdays,
            timezone,
          })
        }
      />
    </SetupShell>
  );
}
