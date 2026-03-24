import { toDateInputValue } from "@/shared/utils/date";

import type { PeriodRangeState } from "@/features/worklog/utils/worklog-date-utils";
import type { BootstrapPayload, WorklogSnapshot } from "@/shared/types/dashboard";

/**
 * Creates a minimal fallback WorklogSnapshot for period mode when the real
 * snapshot fails due to missing GitLab connection.
 */
export function createFallbackPeriodSnapshot(
  periodRange: PeriodRangeState,
  payload: BootstrapPayload,
): WorklogSnapshot {
  const startDate = toDateInputValue(periodRange.from);
  const endDate = toDateInputValue(periodRange.to);

  return {
    mode: "range",
    range: {
      startDate,
      endDate,
      label: `${startDate} - ${endDate}`,
    },
    selectedDay: payload.today,
    days: [],
    month: payload.month,
    auditFlags: [],
  } satisfies WorklogSnapshot;
}
