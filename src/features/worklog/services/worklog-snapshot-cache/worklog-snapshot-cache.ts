import { loadWorklogSnapshot } from "@/app/desktop/TauriService/tauri";
import { createBootstrapWeekSnapshot } from "@/features/worklog/lib/worklog-bootstrap-snapshot";
import {
  getMonthRange,
  parseDateInputValue,
  toDateInputValue,
} from "@/features/worklog/lib/worklog-date-utils";

import type { PeriodRangeState } from "@/features/worklog/lib/worklog-date-utils";
import type { ResolvedWorklogMode } from "@/features/worklog/state/worklog-ui-state/worklog-ui-state";
import type { BootstrapPayload, DayOverview, WorklogSnapshot } from "@/shared/types/dashboard";

export interface SnapshotRequestDescriptor {
  requestKey: string;
  params: {
    mode: "day" | "week" | "range";
    anchorDate: string;
    endDate?: string;
  };
}

export interface WorklogSnapshotEntry {
  snapshot: WorklogSnapshot | null;
  requestKey: string | null;
  status: "idle" | "ready" | "error";
  errorMessage: string | null;
  syncVersion: number | null;
}

const worklogSnapshotCache: Record<ResolvedWorklogMode, WorklogSnapshotEntry> = {
  day: createInitialSnapshotEntry(),
  week: createInitialSnapshotEntry(),
  period: createInitialSnapshotEntry(),
};

const worklogSnapshotTokens: Record<ResolvedWorklogMode, number> = {
  day: 0,
  week: 0,
  period: 0,
};

export function cloneSnapshotEntries(entries: Record<ResolvedWorklogMode, WorklogSnapshotEntry>) {
  return {
    day: { ...entries.day },
    week: { ...entries.week },
    period: { ...entries.period },
  };
}

export function getCachedWorklogSnapshotEntries() {
  return cloneSnapshotEntries(worklogSnapshotCache);
}

export function prefetchWorklogSnapshots(payload: BootstrapPayload, syncVersion: number) {
  primeWorklogSnapshotCache(payload, syncVersion);

  const today = parseDateInputValue(payload.today.date);
  const currentPeriod = getMonthRange(today);

  void loadSnapshotIntoCache("day", buildSingleSnapshotRequest("day", today), syncVersion);
  void loadSnapshotIntoCache("week", buildSingleSnapshotRequest("week", today), syncVersion);
  void loadSnapshotIntoCache("period", buildPeriodSnapshotRequest(currentPeriod), syncVersion);
}

export function resetWorklogSnapshotCache() {
  updateWorklogSnapshotCache("day", createInitialSnapshotEntry());
  updateWorklogSnapshotCache("week", createInitialSnapshotEntry());
  updateWorklogSnapshotCache("period", createInitialSnapshotEntry());
  worklogSnapshotTokens.day = 0;
  worklogSnapshotTokens.week = 0;
  worklogSnapshotTokens.period = 0;
}

export function primeWorklogSnapshotCache(payload: BootstrapPayload, syncVersion: number) {
  const seededEntries = createSeededSnapshotEntries(payload, syncVersion);

  (Object.keys(seededEntries) as ResolvedWorklogMode[]).forEach((mode) => {
    const cachedEntry = worklogSnapshotCache[mode];
    const seededEntry = seededEntries[mode];

    if (seededEntry.snapshot === null) {
      return;
    }

    if (cachedEntry.snapshot === null || (cachedEntry.syncVersion ?? -1) < syncVersion) {
      updateWorklogSnapshotCache(mode, seededEntry);
    }
  });
}

export function loadSnapshotIntoCache(
  resolvedMode: ResolvedWorklogMode,
  request: SnapshotRequestDescriptor,
  syncVersion: number,
) {
  const cachedEntry = worklogSnapshotCache[resolvedMode];
  if (
    cachedEntry.requestKey === request.requestKey &&
    cachedEntry.syncVersion === syncVersion &&
    cachedEntry.status === "ready"
  ) {
    return Promise.resolve();
  }

  const token = worklogSnapshotTokens[resolvedMode] + 1;
  worklogSnapshotTokens[resolvedMode] = token;

  return loadWorklogSnapshot(request.params)
    .then((snapshot) => {
      if (worklogSnapshotTokens[resolvedMode] !== token) {
        return;
      }

      updateWorklogSnapshotCache(resolvedMode, {
        snapshot,
        requestKey: request.requestKey,
        status: "ready",
        errorMessage: null,
        syncVersion,
      });
    })
    .catch((error) => {
      if (worklogSnapshotTokens[resolvedMode] !== token) {
        return;
      }

      updateWorklogSnapshotCache(resolvedMode, {
        ...worklogSnapshotCache[resolvedMode],
        requestKey: request.requestKey,
        status: "error",
        errorMessage: getErrorMessage(error),
      });
    });
}

export function getFallbackSnapshotEntry(
  displayMode: ResolvedWorklogMode,
  activeSnapshotEntry: WorklogSnapshotEntry,
  snapshotEntries: Record<ResolvedWorklogMode, WorklogSnapshotEntry>,
): WorklogSnapshotEntry {
  if (activeSnapshotEntry.snapshot !== null || activeSnapshotEntry.status === "error") {
    return activeSnapshotEntry;
  }

  if (displayMode !== "day" && snapshotEntries.day.snapshot !== null) {
    return snapshotEntries.day;
  }

  return activeSnapshotEntry;
}

export function buildSingleSnapshotRequest(
  mode: Exclude<ResolvedWorklogMode, "period">,
  date: Date,
): SnapshotRequestDescriptor {
  const anchorDate = toDateInputValue(date);
  return {
    requestKey: `${mode}:${anchorDate}`,
    params: {
      mode,
      anchorDate,
    },
  };
}

export function buildPeriodSnapshotRequest(range: PeriodRangeState): SnapshotRequestDescriptor {
  const anchorDate = toDateInputValue(range.from);
  const endDate = toDateInputValue(range.to);

  return {
    requestKey: `period:${anchorDate}:${endDate}`,
    params: {
      mode: "range",
      anchorDate,
      endDate,
    },
  };
}

export function findMatchingDay(days: DayOverview[], date: Date) {
  return days.find((day) => day.date === toDateInputValue(date));
}

function createInitialSnapshotEntry(): WorklogSnapshotEntry {
  return {
    snapshot: null,
    requestKey: null,
    status: "idle",
    errorMessage: null,
    syncVersion: null,
  };
}

function updateWorklogSnapshotCache(
  resolvedMode: ResolvedWorklogMode,
  entry: WorklogSnapshotEntry,
) {
  worklogSnapshotCache[resolvedMode] = entry;
}

function createSeededSnapshotEntries(
  payload: BootstrapPayload,
  syncVersion: number,
): Record<ResolvedWorklogMode, WorklogSnapshotEntry> {
  const todayRequest = buildSingleSnapshotRequest("day", parseDateInputValue(payload.today.date));
  const weekAnchorDate =
    payload.week.find((day) => day.isToday)?.date ?? payload.week[0]?.date ?? payload.today.date;
  const weekRequest = buildSingleSnapshotRequest("week", parseDateInputValue(weekAnchorDate));

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
      requestKey: todayRequest.requestKey,
      status: "idle",
      errorMessage: null,
      syncVersion,
    },
    week: {
      snapshot: createBootstrapWeekSnapshot(payload),
      requestKey: weekRequest.requestKey,
      status: "idle",
      errorMessage: null,
      syncVersion,
    },
    period: createInitialSnapshotEntry(),
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return String(error);
}
