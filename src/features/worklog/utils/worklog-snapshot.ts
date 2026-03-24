import { toDateInputValue } from "@/shared/utils/date";

import type { BootstrapPayload, WorklogSnapshot } from "@/shared/types/dashboard";
import type { PeriodRangeState } from "@/features/worklog/hooks/use-worklog-page-state/use-worklog-page-state";

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
