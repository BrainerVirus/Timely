import { useCallback } from "react";
import { useI18n } from "@/core/services/I18nService/i18n";
import { useAppStore } from "@/core/stores/AppStore/app-store";

/** Returns a stable formatter bound to the current time-format preference. */
export function useFormatHours() {
  const timeFormat = useAppStore((s) => s.timeFormat);
  const { formatHours } = useI18n();
  return useCallback((value: number) => formatHours(value, timeFormat), [formatHours, timeFormat]);
}
