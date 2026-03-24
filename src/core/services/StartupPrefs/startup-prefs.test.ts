import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getStartupFrameColor,
  normalizeStartupMotionPreference,
  normalizeStartupThemeMode,
  readStartupPrefs,
  resolveStartupMotion,
  resolveStartupTheme,
  writeStartupPrefs,
} from "@/core/services/StartupPrefs/startup-prefs";

describe("startup-prefs", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    });
    vi.stubGlobal("window", {});
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false })),
    );
  });

  describe("normalizeStartupThemeMode", () => {
    it("returns valid theme modes as-is", () => {
      expect(normalizeStartupThemeMode("system")).toBe("system");
      expect(normalizeStartupThemeMode("light")).toBe("light");
      expect(normalizeStartupThemeMode("dark")).toBe("dark");
    });

    it("falls back to system for invalid values", () => {
      expect(normalizeStartupThemeMode("invalid")).toBe("system");
      expect(normalizeStartupThemeMode(null)).toBe("system");
    });
  });

  describe("normalizeStartupMotionPreference", () => {
    it("returns valid preferences as-is", () => {
      expect(normalizeStartupMotionPreference("system")).toBe("system");
      expect(normalizeStartupMotionPreference("reduced")).toBe("reduced");
      expect(normalizeStartupMotionPreference("full")).toBe("full");
    });

    it("falls back to system for invalid values", () => {
      expect(normalizeStartupMotionPreference("invalid")).toBe("system");
    });
  });

  describe("resolveStartupTheme", () => {
    it("returns light/dark when explicitly set", () => {
      expect(resolveStartupTheme("light")).toBe("light");
      expect(resolveStartupTheme("dark")).toBe("dark");
    });

    it("uses matchMedia for system mode", () => {
      vi.stubGlobal(
        "matchMedia",
        vi.fn(() => ({ matches: true })),
      );
      expect(resolveStartupTheme("system")).toBe("dark");
    });
  });

  describe("resolveStartupMotion", () => {
    it("returns reduced when preference is reduced", () => {
      expect(resolveStartupMotion("reduced")).toBe("reduced");
    });

    it("returns full when preference is full", () => {
      expect(resolveStartupMotion("full")).toBe("full");
    });
  });

  describe("getStartupFrameColor", () => {
    it("returns light color for light theme", () => {
      const color = getStartupFrameColor("light");
      expect(color).toContain("oklch");
    });

    it("returns dark color for dark theme", () => {
      const color = getStartupFrameColor("dark");
      expect(color).toContain("oklch");
    });
  });

  describe("readStartupPrefs", () => {
    it("returns prefs with version and themeMode", () => {
      const prefs = readStartupPrefs();
      expect(prefs.version).toBe(1);
      expect(["system", "light", "dark"]).toContain(prefs.themeMode);
    });
  });

  describe("writeStartupPrefs", () => {
    it("persists and returns updated prefs", () => {
      const result = writeStartupPrefs({ themeMode: "dark" });
      expect(result.themeMode).toBe("dark");
    });
  });
});
