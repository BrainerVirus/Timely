import { useCallback } from "react";
import { useI18n } from "@/core/runtime/i18n";
import { useAppStore } from "@/core/stores/app-store";

/** Returns a stable formatter bound to the current time-format preference. */
export function useFormatHours() {
  const timeFormat = useAppStore((s) => s.timeFormat);
  const { formatHours } = useI18n();
  return useCallback((value: number) => formatHours(value, timeFormat), [formatHours, timeFormat]);
}
