import Copy from "lucide-react/dist/esm/icons/copy.js";
import { useState } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import {
  getCompactActionButtonClassName,
  getNeutralSegmentedControlClassName,
} from "@/shared/lib/control-styles/control-styles";
import { Button } from "@/shared/ui/Button/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/Popover/Popover";

import type { WeekdayCode } from "@/domains/schedule/state/schedule-form/schedule-form";
import type { WeekdayScheduleDay } from "@/shared/types/dashboard";

interface CopyDaySchedulePopoverProps {
  sourceDay: WeekdayScheduleDay;
  orderedWorkdays: readonly WeekdayCode[];
  onApply: (targetDays: WeekdayScheduleDay[]) => void;
}

export function CopyDaySchedulePopover({
  sourceDay,
  orderedWorkdays,
  onApply,
}: Readonly<CopyDaySchedulePopoverProps>) {
  const { formatWeekdayFromCode, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [targetDays, setTargetDays] = useState<WeekdayScheduleDay[]>([]);

  const availableDays = orderedWorkdays.filter((day) => day !== sourceDay);

  function handleToggleDay(day: WeekdayScheduleDay) {
    setTargetDays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day],
    );
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      setTargetDays([]);
    }
  }

  function handleApply() {
    if (targetDays.length === 0) {
      return;
    }

    onApply(targetDays);
    setOpen(false);
    setTargetDays([]);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button type="button" className={getCompactActionButtonClassName("gap-2 px-3 h-10")}>
          <Copy className="h-3.5 w-3.5" />
          {t("settings.copyToDays")}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div className="space-y-1">
          <p className="font-display text-sm font-semibold text-foreground capitalize">
            {t("settings.copyDayScheduleTitle", {
              day: formatWeekdayFromCode(sourceDay, "long"),
            })}
          </p>
          <p className="text-xs text-muted-foreground">{t("settings.copyDayScheduleHint")}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {availableDays.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => handleToggleDay(day)}
              className={getNeutralSegmentedControlClassName(
                targetDays.includes(day),
                "px-3 text-xs font-bold",
              )}
            >
              {formatWeekdayFromCode(day, "long")}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {targetDays.length === 0 ? t("settings.copyDayScheduleEmpty") : null}
          </p>
          <Button size="sm" variant="soft" disabled={targetDays.length === 0} onClick={handleApply}>
            {t("settings.copyDayScheduleApply")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
