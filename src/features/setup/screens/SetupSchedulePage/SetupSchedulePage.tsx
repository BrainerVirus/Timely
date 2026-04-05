import { m } from "motion/react";
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
import { SchedulePreferencesFields } from "@/domains/schedule/ui/SchedulePreferencesFields/SchedulePreferencesFields";
import { ScheduleWorkspace } from "@/domains/schedule/ui/ScheduleWorkspace/ScheduleWorkspace";
import { Button } from "@/shared/ui/Button/Button";

import type { ScheduleInput, TimeFormat } from "@/shared/types/dashboard";

export type SetupScheduleSubStep = 0 | 1;

interface SetupSchedulePageProps {
  scheduleSubStep: SetupScheduleSubStep;
  weekdaySchedules: WeekdayScheduleFormRow[];
  timezone: string;
  weekStart: WeekStartPreference;
  orderedWorkdays: WeekdayCode[];
  timezoneOptions: Array<{ value: string; label: string; badge?: string }>;
  timeFormat: TimeFormat;
  schedulePhase: SchedulePhase;
  onBack: () => void;
  onNext: () => void;
  onAdvanceSubStep: () => void;
  onBackSubStep: () => void;
  onTimezoneChange: (v: string) => void;
  onWeekStartChange: (value: WeekStartPreference) => void;
  onTimeFormatChange: (format: TimeFormat) => void;
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
  scheduleSubStep,
  weekdaySchedules,
  timezone,
  weekStart,
  orderedWorkdays,
  timezoneOptions,
  timeFormat,
  schedulePhase,
  onBack,
  onNext,
  onAdvanceSubStep,
  onBackSubStep,
  onTimezoneChange,
  onWeekStartChange,
  onTimeFormatChange,
  onSetWeekdayEnabled,
  onSetWeekdayField,
  onCopyWeekdaySchedule,
  onSave,
}: Readonly<SetupSchedulePageProps>) {
  const { t } = useI18n();
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
      {scheduleSubStep === 0 ? (
        <>
          <div className="space-y-2 text-center">
            <h1 className="font-display text-3xl font-bold">
              {t("setup.scheduleStepPreferencesTitle")}
            </h1>
            <p className="text-muted-foreground">{t("setup.scheduleStepPreferencesDescription")}</p>
          </div>

          <div className="space-y-5 rounded-[1.75rem] border-2 border-border-subtle bg-panel p-5 shadow-clay">
            <SchedulePreferencesFields
              timezone={timezone}
              timezoneOptions={timezoneOptions}
              weekStart={weekStart}
              timeFormat={timeFormat}
              onSetTimezone={onTimezoneChange}
              onSetWeekStart={onWeekStartChange}
              onChangeTimeFormat={onTimeFormatChange}
              comboboxClassName="w-full min-w-0 sm:w-74"
              comboboxContentClassName="w-(--radix-popover-trigger-width) max-w-[min(100vw-2rem,18rem)]"
            />
          </div>

          <div className="flex flex-col items-center gap-3">
            <Button className="w-full max-w-72" onClick={onAdvanceSubStep}>
              {t("common.continue")}
            </Button>
            <button
              type="button"
              onClick={onBack}
              className="cursor-pointer text-sm text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
            >
              {t("common.back")}
            </button>
          </div>
        </>
      ) : null}

      {scheduleSubStep === 1 ? (
        <m.div
          key="setup-schedule-weekly"
          className="space-y-6"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          <div className="space-y-2 text-center">
            <h1 className="font-display text-3xl font-bold">
              {t("setup.scheduleStepWeeklyTitle")}
            </h1>
            <p className="text-muted-foreground">{t("setup.scheduleStepWeeklyDescription")}</p>
          </div>

          <ScheduleWorkspace
            weekdaySchedules={weekdaySchedules}
            orderedWorkdays={orderedWorkdays}
            onSetWeekdayEnabled={onSetWeekdayEnabled}
            onSetWeekdayField={onSetWeekdayField}
            onCopyWeekdaySchedule={onCopyWeekdaySchedule}
          />

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
              onClick={onBackSubStep}
              className="cursor-pointer text-sm text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
            >
              {t("common.back")}
            </button>
          </div>
        </m.div>
      ) : null}
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
