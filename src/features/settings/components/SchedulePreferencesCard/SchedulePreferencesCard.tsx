import Clock from "lucide-react/dist/esm/icons/clock.js";
import Coffee from "lucide-react/dist/esm/icons/coffee.js";
import Globe from "lucide-react/dist/esm/icons/globe.js";
import { Card } from "@/shared/components/Card/Card";
import { Input } from "@/shared/components/Input/Input";
import { Label } from "@/shared/components/Label/Label";
import { TimeInput } from "@/shared/components/TimeInput/TimeInput";
import { getSegmentedControlClassName } from "@/shared/utils/control-styles";
import { ALL_WORKDAYS } from "@/features/settings/hooks/schedule-form/schedule-form";
import { ScheduleSaveButton } from "@/features/settings/components/ScheduleSaveButton/ScheduleSaveButton";

import type { SchedulePhase } from "@/features/settings/hooks/schedule-form/schedule-form";

function TimeField({
  id,
  label,
  value,
  icon: Icon,
  onChange,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  icon: typeof Clock;
  onChange: (value: string) => void;
}>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </Label>
      <TimeInput id={id} aria-label={label} value={value} onChange={onChange} />
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  icon: Icon,
  onChange,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  icon: typeof Coffee;
  onChange: (value: string) => void;
}>) {
  return (
    <div className="w-36 space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="whitespace-nowrap">{label}</span>
      </Label>
      <Input
        id={id}
        type="number"
        step="5"
        min="0"
        max="180"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function SchedulePreferencesCard({
  shiftStart,
  shiftEnd,
  lunchMinutes,
  workdays,
  timezone,
  netHours,
  schedulePhase,
  canSave,
  onShiftStartChange,
  onShiftEndChange,
  onLunchMinutesChange,
  onToggleWorkday,
  onSave,
}: Readonly<{
  shiftStart: string;
  shiftEnd: string;
  lunchMinutes: string;
  workdays: string[];
  timezone: string;
  netHours: string;
  schedulePhase: SchedulePhase;
  canSave: boolean;
  onShiftStartChange: (value: string) => void;
  onShiftEndChange: (value: string) => void;
  onLunchMinutesChange: (value: string) => void;
  onToggleWorkday: (day: string) => void;
  onSave: () => void;
}>) {
  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">Work schedule</h3>
          <p className="text-xs text-muted-foreground">
            Define your default shift, lunch break, and working days.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <TimeField
            id="shift-start"
            label="Shift start"
            value={shiftStart}
            icon={Clock}
            onChange={onShiftStartChange}
          />
          <TimeField
            id="shift-end"
            label="Shift end"
            value={shiftEnd}
            icon={Clock}
            onChange={onShiftEndChange}
          />
          <NumberField
            id="lunch-minutes"
            label="Lunch break (min)"
            value={lunchMinutes}
            icon={Coffee}
            onChange={onLunchMinutesChange}
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              Timezone
            </Label>
            <Input value={timezone} disabled />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Net hours/day</Label>
            <p className="flex h-9 items-center text-sm font-medium text-foreground">{netHours}h</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Workdays</Label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_WORKDAYS.map((day) => {
              const active = workdays.includes(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => onToggleWorkday(day)}
                  className={getSegmentedControlClassName(active, "min-w-14 text-xs")}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {canSave ? <ScheduleSaveButton phase={schedulePhase} onClick={onSave} /> : null}
      </div>
    </Card>
  );
}
