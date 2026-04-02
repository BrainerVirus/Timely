import { useCallback } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useAppStore } from "@/app/state/AppStore/app-store";

/** Returns a stable formatter bound to the current time-format preference. */
export function useFormatHours() {
  const timeFormat = useAppStore((s) => s.timeFormat);
  const { formatHours } = useI18n();
  return useCallback((value: number) => formatHours(value, timeFormat), [formatHours, timeFormat]);
}
