import { useEffect, useReducer, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/app/providers/I18nService/i18n";
import {
  buildWeekdaySchedulesInput,
  createInitialScheduleFormState,
  getEffectiveWeekStart,
  getOrderedWorkdays,
  scheduleFormReducer,
} from "@/domains/schedule/state/schedule-form/schedule-form";
import { prefetchPlaySnapshot } from "@/features/play/services/play-snapshot-cache/play-snapshot-cache";
import { resolveNextAutoHolidayPreferences } from "@/features/settings/lib/settings-holiday-helpers";
import { getSupportedTimezones, getWeekStartsOnIndex } from "@/shared/lib/utils";

import type { AppPreferences, BootstrapPayload, ScheduleInput } from "@/shared/types/dashboard";

type TranslateFn = ReturnType<typeof useI18n>["t"];

interface UseSettingsScheduleControllerOptions {
  payload: BootstrapPayload;
  preferences: AppPreferences;
  formatTimezoneOffset: (timezone: string) => string;
  onRefreshBootstrap?: () => Promise<void>;
  onSavePreferences: (preferences: AppPreferences) => Promise<void>;
  onUpdateSchedule?: (input: ScheduleInput) => Promise<void>;
  t: TranslateFn;
}

export function useSettingsScheduleController({
  payload,
  preferences,
  formatTimezoneOffset,
  onRefreshBootstrap,
  onSavePreferences,
  onUpdateSchedule,
  t,
}: UseSettingsScheduleControllerOptions) {
  const [scheduleForm, dispatchScheduleForm] = useReducer(
    scheduleFormReducer,
    payload,
    createInitialScheduleFormState,
  );
  const { weekdaySchedules, timezone, weekStart, schedulePhase } = scheduleForm;
  const resolvedWeekStart = getEffectiveWeekStart(weekStart, timezone);
  const calendarWeekStartsOn = getWeekStartsOnIndex(weekStart, timezone);
  const orderedWorkdays = getOrderedWorkdays(weekStart, timezone);
  const [timezoneOptions] = useState(() =>
    getSupportedTimezones(timezone).map((tz) => {
      const city = tz.split("/").pop()?.replaceAll("_", " ") ?? tz;
      const offset = formatTimezoneOffset(tz);

      return {
        value: tz,
        label: `(${offset}) ${city}`,
        badge: tz.split("/")[0],
      };
    }),
  );

  useEffect(() => {
    if (schedulePhase !== "saved") {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "idle" });
    }, 1600);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [schedulePhase]);

  async function handleSaveSchedule() {
    if (!onUpdateSchedule) {
      return;
    }

    const nextAutoHolidayPreferences = resolveNextAutoHolidayPreferences(preferences, timezone);

    dispatchScheduleForm({ type: "setSchedulePhase", phase: "saving" });

    try {
      await onUpdateSchedule({
        weekdaySchedules: buildWeekdaySchedulesInput(weekdaySchedules),
        timezone,
        weekStart: resolvedWeekStart,
      });
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "saved" });

      if (onRefreshBootstrap) {
        await onRefreshBootstrap();
      }

      void prefetchPlaySnapshot().catch(() => {});

      toast.success(t("settings.scheduleSaveToastSuccessTitle"), {
        description: t("settings.scheduleSaveToastSuccessDescription"),
        duration: 6500,
      });
    } catch (error) {
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "idle" });
      const detail =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : t("settings.scheduleSaveToastErrorFallback");
      toast.error(t("settings.scheduleSaveToastErrorTitle"), {
        description: detail,
        duration: 8000,
      });
      return;
    }

    if (nextAutoHolidayPreferences) {
      void onSavePreferences(nextAutoHolidayPreferences).catch(() => {});
    }
  }

  return {
    weekdaySchedules,
    timezone,
    weekStart,
    schedulePhase,
    calendarWeekStartsOn,
    orderedWorkdays,
    timezoneOptions,
    handleSaveSchedule,
    dispatchScheduleForm,
  };
}
