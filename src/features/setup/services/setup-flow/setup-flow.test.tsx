import { describe, expect, it } from "vitest";
import { getSetupStepPath, SETUP_STEPS } from "@/features/setup/services/setup-flow/setup-flow";

describe("setup-flow", () => {
  describe("SETUP_STEPS", () => {
    it("has expected steps in order", () => {
      expect(SETUP_STEPS).toEqual(["welcome", "schedule", "provider", "sync", "done"]);
    });
  });

  describe("getSetupStepPath", () => {
    it("returns path for each step", () => {
      expect(getSetupStepPath("welcome")).toBe("/setup/welcome");
      expect(getSetupStepPath("schedule")).toBe("/setup/schedule");
      expect(getSetupStepPath("provider")).toBe("/setup/provider");
      expect(getSetupStepPath("sync")).toBe("/setup/sync");
      expect(getSetupStepPath("done")).toBe("/setup/done");
    });
  });
});
