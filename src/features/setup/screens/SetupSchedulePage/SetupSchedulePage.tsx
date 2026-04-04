import * as React from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import {
  buildWeekdaySchedulesInput,
  getEffectiveWeekStart,
  type SchedulePhase,
  type WeekStartPreference,
  type WeekdayCode,
  type WeekdayScheduleFormRow,
} from "@/domains/schedule/state/schedule-form/schedule-form";
import { ScheduleWorkspace } from "@/domains/schedule/ui/ScheduleWorkspace/ScheduleWorkspace";
import { getNeutralSegmentedControlClassName } from "@/shared/lib/control-styles/control-styles";
import { getSupportedTimezones } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/Button/Button";
import { Label } from "@/shared/ui/Label/Label";
import { SearchCombobox } from "@/shared/ui/SearchCombobox/SearchCombobox";

import type { ScheduleInput } from "@/shared/types/dashboard";

interface SetupSchedulePageProps {
  weekdaySchedules: WeekdayScheduleFormRow[];
  timezone: string;
  weekStart: WeekStartPreference;
  orderedWorkdays: WeekdayCode[];
  schedulePhase: SchedulePhase;
  onBack: () => void;
  onNext: () => void;
  onTimezoneChange: (v: string) => void;
  onWeekStartChange: (value: WeekStartPreference) => void;
  onSetWeekdayEnabled: (day: WeekdayCode, enabled: boolean) => void;
  onSetWeekdayField: (
    day: WeekdayCode,
    field: "shiftStart" | "shiftEnd" | "lunchMinutes",
    value: string,
  ) => void;
  onCopyWeekdaySchedule: (sourceDay: WeekdayCode, targetDays: WeekdayCode[]) => void;
  onSave: (input: ScheduleInput) => Promise<void>;
}

export function SetupSchedulePage({
  weekdaySchedules,
  timezone,
  weekStart,
  orderedWorkdays,
  schedulePhase,
  onBack,
  onNext,
  onTimezoneChange,
  onWeekStartChange,
  onSetWeekdayEnabled,
  onSetWeekdayField,
  onCopyWeekdaySchedule,
  onSave,
}: Readonly<SetupSchedulePageProps>) {
  const { t, formatWeekdayFromCode } = useI18n();
  const timezoneOptions = React.useMemo(
    () =>
      getSupportedTimezones(timezone).map((option) => ({
        value: option,
        label: option,
        badge: option.split("/")[0],
      })),
    [timezone],
  );
  const resolvedWeekStart = getEffectiveWeekStart(weekStart, timezone);

  async function handleSaveAndContinue() {
    const didSave = await persistScheduleStep({
      weekdaySchedules,
      timezone,
      resolvedWeekStart,
      onSave,
    });

    if (didSave) {
      onNext();
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl font-bold">{t("setup.scheduleTitle")}</h1>
        <p className="text-muted-foreground">{t("setup.scheduleDescription")}</p>
      </div>

      <ScheduleWorkspace
        weekdaySchedules={weekdaySchedules}
        orderedWorkdays={orderedWorkdays}
        onSetWeekdayEnabled={onSetWeekdayEnabled}
        onSetWeekdayField={onSetWeekdayField}
        onCopyWeekdaySchedule={onCopyWeekdaySchedule}
      />

      <div className="space-y-5 rounded-[1.75rem] border-2 border-border-subtle bg-panel p-5 shadow-clay">
        <div className="space-y-1.5">
          <Label>{t("settings.timezone")}</Label>
          <SearchCombobox
            value={timezone}
            options={timezoneOptions}
            searchPlaceholder={t("common.searchTimezone")}
            noResultsLabel={t("common.noResults")}
            onChange={onTimezoneChange}
            className="w-74 min-w-0"
            contentClassName="w-(--radix-popover-trigger-width)"
          />
        </div>

        <div className="space-y-2">
          <Label>{t("settings.firstDayOfWeek")}</Label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { value: "auto", label: t("common.auto") },
              { value: "monday", label: formatWeekdayFromCode("Mon") },
              { value: "sunday", label: formatWeekdayFromCode("Sun") },
              { value: "friday", label: formatWeekdayFromCode("Fri") },
              { value: "saturday", label: formatWeekdayFromCode("Sat") },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onWeekStartChange(option.value as WeekStartPreference)}
                className={getNeutralSegmentedControlClassName(
                  weekStart === option.value,
                  "px-3 text-xs font-bold",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Button
          className="w-full max-w-72"
          onClick={() => void handleSaveAndContinue()}
          disabled={schedulePhase === "saving"}
        >
          {t("common.saveAndContinue")}
        </Button>
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer text-sm text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
        >
          {t("common.back")}
        </button>
      </div>
    </div>
  );
}

async function persistScheduleStep({
  weekdaySchedules,
  timezone,
  resolvedWeekStart,
  onSave,
}: {
  weekdaySchedules: WeekdayScheduleFormRow[];
  timezone: string;
  resolvedWeekStart: Exclude<WeekStartPreference, "auto">;
  onSave: (input: ScheduleInput) => Promise<void>;
}) {
  const input: ScheduleInput = {
    weekdaySchedules: buildWeekdaySchedulesInput(weekdaySchedules),
    timezone,
    weekStart: resolvedWeekStart,
  };

  try {
    await onSave(input);
    return true;
  } catch {
    return false;
  }
}
