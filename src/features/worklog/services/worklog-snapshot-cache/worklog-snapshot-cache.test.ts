import {
  getCachedWorklogSnapshotEntries,
  invalidateWorklogSnapshotCache,
  primeWorklogSnapshotCache,
} from "@/features/worklog/services/worklog-snapshot-cache/worklog-snapshot-cache";
import { mockBootstrap } from "@/test/fixtures/mock-data";

describe("worklog-snapshot-cache", () => {
  it("exposes an explicit API that invalidates cached snapshot entries", () => {
    primeWorklogSnapshotCache(mockBootstrap, 4);

    invalidateWorklogSnapshotCache();

    expect(getCachedWorklogSnapshotEntries()).toEqual({
      day: {
        snapshot: null,
        requestKey: null,
        status: "idle",
        errorMessage: null,
        syncVersion: null,
      },
      week: {
        snapshot: null,
        requestKey: null,
        status: "idle",
        errorMessage: null,
        syncVersion: null,
      },
      period: {
        snapshot: null,
        requestKey: null,
        status: "idle",
        errorMessage: null,
        syncVersion: null,
      },
    });
  });
});
