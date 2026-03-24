import { describe, expect, it } from "vitest";
import { mockBootstrap } from "@/test/fixtures/mock-data";

describe("mock-data", () => {
  describe("mockBootstrap", () => {
    it("has required top-level fields", () => {
      expect(mockBootstrap.appName).toBe("Timely");
      expect(mockBootstrap.phase).toBeDefined();
      expect(mockBootstrap.demoMode).toBe(true);
      expect(mockBootstrap.profile).toBeDefined();
      expect(mockBootstrap.schedule).toBeDefined();
      expect(mockBootstrap.today).toBeDefined();
      expect(Array.isArray(mockBootstrap.week)).toBe(true);
      expect(mockBootstrap.month).toBeDefined();
      expect(Array.isArray(mockBootstrap.auditFlags)).toBe(true);
      expect(Array.isArray(mockBootstrap.quests)).toBe(true);
    });

    it("profile has alias and level", () => {
      expect(mockBootstrap.profile.alias).toBe("Pilot");
      expect(mockBootstrap.profile.level).toBe(1);
    });

    it("schedule has hoursPerDay and workdays", () => {
      expect(mockBootstrap.schedule.hoursPerDay).toBe(8);
      expect(mockBootstrap.schedule.workdays).toContain("Mon");
    });

    it("today has date and status", () => {
      expect(typeof mockBootstrap.today.date).toBe("string");
      expect(mockBootstrap.today.status).toBe("empty");
    });
  });
});
