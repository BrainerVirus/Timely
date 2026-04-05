import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import {
  getCachedWorklogSnapshotEntries,
  loadSnapshotIntoCache,
  type SnapshotRequestDescriptor,
  type WorklogSnapshotEntry,
} from "@/features/worklog/services/worklog-snapshot-cache/worklog-snapshot-cache";

import type { ResolvedWorklogMode } from "@/features/worklog/state/worklog-ui-state/worklog-ui-state";

export function useWorklogSnapshotQueueEffects(
  snapshotEntries: Record<ResolvedWorklogMode, WorklogSnapshotEntry>,
  setSnapshotEntries: Dispatch<SetStateAction<Record<ResolvedWorklogMode, WorklogSnapshotEntry>>>,
  syncVersion: number,
  snapshotRequests: Record<ResolvedWorklogMode, SnapshotRequestDescriptor>,
) {
  const snapshotEntriesRef = useRef(snapshotEntries);

  useEffect(() => {
    snapshotEntriesRef.current = snapshotEntries;
  }, [snapshotEntries]);

  const queueSnapshotLoad = useCallback(
    (resolvedMode: ResolvedWorklogMode, request: SnapshotRequestDescriptor) => {
      const currentEntry = snapshotEntriesRef.current[resolvedMode];
      if (
        currentEntry.requestKey === request.requestKey &&
        currentEntry.syncVersion === syncVersion &&
        currentEntry.status === "ready"
      ) {
        return;
      }

      void loadSnapshotIntoCache(resolvedMode, request, syncVersion).finally(() => {
        setSnapshotEntries(getCachedWorklogSnapshotEntries());
      });
    },
    [setSnapshotEntries, syncVersion],
  );

  useEffect(() => {
    queueSnapshotLoad("day", snapshotRequests.day);
  }, [queueSnapshotLoad, snapshotRequests.day, syncVersion]);

  useEffect(() => {
    queueSnapshotLoad("week", snapshotRequests.week);
  }, [queueSnapshotLoad, snapshotRequests.week, syncVersion]);

  useEffect(() => {
    queueSnapshotLoad("period", snapshotRequests.period);
  }, [queueSnapshotLoad, snapshotRequests.period, syncVersion]);
}
