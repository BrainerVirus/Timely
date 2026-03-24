import * as tauriModule from "@/core/services/TauriService/tauri";
import {
  getCachedPlaySnapshot,
  getCachedPlaySnapshotError,
  primePlaySnapshot,
  prefetchPlaySnapshot,
  resetPlaySnapshotCache,
} from "@/features/play/services/play-snapshot-cache/play-snapshot-cache";

import type { PlaySnapshot } from "@/shared/types/dashboard";

const mockSnapshot: PlaySnapshot = {
  profile: { alias: "Pilot", level: 1, xp: 0, streakDays: 0, companion: "Aurora fox" },
  streak: { currentDays: 0, window: [] },
  quests: [],
  tokens: 0,
  equippedCompanionMood: "focused",
  storeCatalog: [],
  inventory: [],
};

vi.mock("@/core/services/TauriService/tauri", () => ({
  loadPlaySnapshot: vi.fn(),
}));

describe("play-snapshot-cache", () => {
  beforeEach(() => {
    resetPlaySnapshotCache();
    vi.mocked(tauriModule.loadPlaySnapshot).mockReset();
  });

  describe("getCachedPlaySnapshot", () => {
    it("returns null when cache is empty", () => {
      expect(getCachedPlaySnapshot()).toBeNull();
    });

    it("returns cached snapshot after prime", () => {
      primePlaySnapshot(mockSnapshot);
      expect(getCachedPlaySnapshot()).toEqual(mockSnapshot);
    });
  });

  describe("getCachedPlaySnapshotError", () => {
    it("returns null when no error", () => {
      expect(getCachedPlaySnapshotError()).toBeNull();
    });
  });

  describe("primePlaySnapshot", () => {
    it("stores snapshot and clears error", () => {
      primePlaySnapshot(mockSnapshot);
      expect(getCachedPlaySnapshot()).toEqual(mockSnapshot);
      expect(getCachedPlaySnapshotError()).toBeNull();
    });
  });

  describe("resetPlaySnapshotCache", () => {
    it("clears cache", () => {
      primePlaySnapshot(mockSnapshot);
      resetPlaySnapshotCache();
      expect(getCachedPlaySnapshot()).toBeNull();
    });
  });

  describe("prefetchPlaySnapshot", () => {
    it("returns cached snapshot without calling loadPlaySnapshot", async () => {
      primePlaySnapshot(mockSnapshot);
      const result = await prefetchPlaySnapshot();
      expect(result).toEqual(mockSnapshot);
      expect(tauriModule.loadPlaySnapshot).not.toHaveBeenCalled();
    });

    it("calls loadPlaySnapshot when cache is empty", async () => {
      vi.mocked(tauriModule.loadPlaySnapshot).mockResolvedValue(mockSnapshot);
      const result = await prefetchPlaySnapshot();
      expect(result).toEqual(mockSnapshot);
      expect(tauriModule.loadPlaySnapshot).toHaveBeenCalledTimes(1);
    });

    it("returns null on load error", async () => {
      vi.mocked(tauriModule.loadPlaySnapshot).mockRejectedValue(new Error("network error"));
      const result = await prefetchPlaySnapshot();
      expect(result).toBeNull();
      expect(getCachedPlaySnapshotError()).toBe("network error");
    });
  });
});
