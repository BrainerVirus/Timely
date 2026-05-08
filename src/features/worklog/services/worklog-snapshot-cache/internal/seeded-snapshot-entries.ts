import { createBootstrapWeekSnapshot } from "@/features/worklog/lib/worklog-bootstrap-snapshot";

import type { WorklogSnapshotEntry } from "@/features/worklog/services/worklog-snapshot-cache/worklog-snapshot-cache";
import type { ResolvedWorklogMode } from "@/features/worklog/state/worklog-ui-state/worklog-ui-state";
import type { BootstrapPayload } from "@/shared/types/dashboard";

export function createSeededSnapshotEntries(
  payload: BootstrapPayload,
  syncVersion: number,
  createInitialSnapshotEntry: () => WorklogSnapshotEntry,
): Record<ResolvedWorklogMode, WorklogSnapshotEntry> {
  const weekAnchorDate =
    payload.week.find((day) => day.isToday)?.date ?? payload.week[0]?.date ?? payload.today.date;
  const weekRequestKey = `week:${weekAnchorDate}`;

  return {
    day: {
      snapshot: {
        mode: "day",
        range: {
          startDate: payload.today.date,
          endDate: payload.today.date,
          label: payload.today.dateLabel,
        },
        selectedDay: payload.today,
        days: [payload.today],
        month: payload.month,
        auditFlags: payload.auditFlags,
      },
      requestKey: `day:${payload.today.date}`,
      status: "idle",
      errorMessage: null,
      syncVersion,
    },
    week: {
      snapshot: createBootstrapWeekSnapshot(payload),
      requestKey: weekRequestKey,
      status: "idle",
      errorMessage: null,
      syncVersion,
    },
    period: createInitialSnapshotEntry(),
  };
}
