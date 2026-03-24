import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearStartupAppSnapshot,
  createDefaultStartupAppSnapshot,
  createDefaultStartupPayload,
  readStartupAppSnapshot,
  writeStartupAppSnapshot,
} from "@/core/services/StartupAppState/startup-app-state";

describe("startup-app-state", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });
    vi.stubGlobal("window", {});
  });

  describe("createDefaultStartupPayload", () => {
    it("returns payload with appName and profile", () => {
      const payload = createDefaultStartupPayload();
      expect(payload.appName).toBe("Timely");
      expect(payload.profile?.alias).toBe("Pilot");
    });

    it("returns empty today dateLabel", () => {
      const payload = createDefaultStartupPayload();
      expect(payload.today.dateLabel).toBe("Today");
    });
  });

  describe("createDefaultStartupAppSnapshot", () => {
    it("returns snapshot with version 1", () => {
      const snapshot = createDefaultStartupAppSnapshot();
      expect(snapshot.version).toBe(1);
    });

    it("returns incomplete setupState", () => {
      const snapshot = createDefaultStartupAppSnapshot();
      expect(snapshot.setupState.isComplete).toBe(false);
      expect(snapshot.setupState.currentStep).toBe("welcome");
    });
  });

  describe("readStartupAppSnapshot", () => {
    it("returns default snapshot when no stored data", () => {
      const result = readStartupAppSnapshot();
      expect(result.hasCachedSnapshot).toBe(false);
      expect(result.snapshot.version).toBe(1);
    });

    it("returns cached snapshot when valid data stored", () => {
      const snapshot = createDefaultStartupAppSnapshot();
      writeStartupAppSnapshot(snapshot);
      const result = readStartupAppSnapshot();
      expect(result.hasCachedSnapshot).toBe(true);
      expect(result.snapshot.version).toBe(1);
    });
  });

  describe("clearStartupAppSnapshot", () => {
    it("removes stored snapshot", () => {
      writeStartupAppSnapshot(createDefaultStartupAppSnapshot());
      clearStartupAppSnapshot();
      const result = readStartupAppSnapshot();
      expect(result.hasCachedSnapshot).toBe(false);
    });
  });
});
