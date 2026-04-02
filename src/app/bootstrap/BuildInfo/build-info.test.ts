import { describe, expect, it } from "vitest";
import { buildInfo, isPrereleaseVersion } from "@/app/bootstrap/BuildInfo/build-info";

describe("build-info", () => {
  describe("isPrereleaseVersion", () => {
    it("returns true for prerelease versions", () => {
      expect(isPrereleaseVersion("1.0.0-beta.1")).toBe(true);
      expect(isPrereleaseVersion("0.1.0-beta.5")).toBe(true);
      expect(isPrereleaseVersion("2.0.0-alpha")).toBe(true);
    });

    it("returns false for stable versions", () => {
      expect(isPrereleaseVersion("1.0.0")).toBe(false);
      expect(isPrereleaseVersion("0.1.0")).toBe(false);
    });
  });

  describe("buildInfo", () => {
    it("exposes appVersion string", () => {
      expect(typeof buildInfo.appVersion).toBe("string");
      expect(buildInfo.appVersion.length).toBeGreaterThan(0);
    });

    it("exposes isPrerelease boolean", () => {
      expect(typeof buildInfo.isPrerelease).toBe("boolean");
    });

    it("exposes defaultUpdateChannel", () => {
      expect(["stable", "unstable"]).toContain(buildInfo.defaultUpdateChannel);
    });

    it("exposes logLevel", () => {
      expect(["off", "error", "info", "debug"]).toContain(buildInfo.logLevel);
    });
  });
});
