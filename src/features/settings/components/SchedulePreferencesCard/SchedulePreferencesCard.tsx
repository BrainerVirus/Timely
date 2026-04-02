import Clock from "lucide-react/dist/esm/icons/clock.js";
import Globe from "lucide-react/dist/esm/icons/globe.js";
import { useI18n } from "@/core/services/I18nService/i18n";
import { ScheduleLunchField } from "@/features/settings/components/ScheduleEditorFields/ScheduleLunchField";
import { ScheduleNetHoursField } from "@/features/settings/components/ScheduleEditorFields/ScheduleNetHoursField";
import { ScheduleTimeField } from "@/features/settings/components/ScheduleEditorFields/ScheduleTimeField";
import { ScheduleSaveButton } from "@/features/settings/components/ScheduleSaveButton/ScheduleSaveButton";
import { ALL_WORKDAYS } from "@/features/settings/hooks/schedule-form/schedule-form";
import { Card } from "@/shared/components/Card/Card";
import { Input } from "@/shared/components/Input/Input";
import { Label } from "@/shared/components/Label/Label";
import { getSegmentedControlClassName } from "@/shared/utils/control-styles";

import type { SchedulePhase } from "@/features/settings/hooks/schedule-form/schedule-form";

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
  const { formatWeekdayFromCode, t } = useI18n();

  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">
            {t("settings.schedule")}
          </h3>
          <p className="text-xs text-muted-foreground">{t("setup.scheduleDescription")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <ScheduleTimeField
            id="shift-start"
            label={t("settings.shiftStart")}
            value={shiftStart}
            icon={Clock}
            onChange={onShiftStartChange}
          />
          <ScheduleTimeField
            id="shift-end"
            label={t("settings.shiftEnd")}
            value={shiftEnd}
            icon={Clock}
            onChange={onShiftEndChange}
          />
          <ScheduleLunchField
            id="lunch-minutes"
            label={t("settings.lunchBreak")}
            value={lunchMinutes}
            className="w-36"
            onChange={onLunchMinutesChange}
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              {t("settings.timezone")}
            </Label>
            <Input value={timezone} disabled />
          </div>
          <ScheduleNetHoursField
            label={t("settings.netHoursPerDay")}
            value={`${netHours}h`}
            valueClassName="h-9 border-transparent bg-transparent px-0"
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t("settings.workdays")}</Label>
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
                  {formatWeekdayFromCode(day as "Mon" | "Tue" | "Wed" | "Thu" | "Fri")}
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
