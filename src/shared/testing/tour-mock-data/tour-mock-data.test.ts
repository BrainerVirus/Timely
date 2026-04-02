import { describe, expect, it } from "vitest";
import { tourPayload } from "@/shared/testing/tour-mock-data/tour-mock-data";

describe("tour-mock-data", () => {
  describe("tourPayload", () => {
    it("has required top-level fields", () => {
      expect(tourPayload.appName).toBe("Timely");
      expect(tourPayload.demoMode).toBe(true);
      expect(tourPayload.profile).toBeDefined();
      expect(tourPayload.schedule).toBeDefined();
      expect(tourPayload.today).toBeDefined();
      expect(Array.isArray(tourPayload.week)).toBe(true);
      expect(tourPayload.month).toBeDefined();
      expect(Array.isArray(tourPayload.auditFlags)).toBe(true);
      expect(Array.isArray(tourPayload.quests)).toBe(true);
    });

    it("profile has alias Alex Rivera", () => {
      expect(tourPayload.profile.alias).toBe("Alex Rivera");
      expect(tourPayload.profile.level).toBe(7);
    });

    it("has provider status", () => {
      expect(tourPayload.providerStatus).toHaveLength(1);
      expect(tourPayload.providerStatus[0].name).toBe("GitLab");
    });

    it("has audit flags for demo", () => {
      expect(tourPayload.auditFlags.length).toBeGreaterThan(0);
    });
  });
});
