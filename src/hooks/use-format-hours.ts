import { useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { formatHours } from "@/lib/utils";

/** Returns a stable formatter bound to the current time-format preference. */
export function useFormatHours() {
  const timeFormat = useAppStore((s) => s.timeFormat);
  return useCallback((value: number) => formatHours(value, timeFormat), [timeFormat]);
}
