import {
  resolveSetupProgressStep,
  validateSetupScheduleSearch,
} from "@/app/routes/SetupRoutes/setup-schedule-search";

describe("validateSetupScheduleSearch", () => {
  it("defaults to prefs substep when missing or invalid", () => {
    expect(validateSetupScheduleSearch({})).toEqual({ substep: 0 });
    expect(validateSetupScheduleSearch({ substep: 0 })).toEqual({ substep: 0 });
    expect(validateSetupScheduleSearch({ substep: "0" })).toEqual({ substep: 0 });
    expect(validateSetupScheduleSearch({ substep: "x" })).toEqual({ substep: 0 });
  });

  it("accepts weekly substep as number or string", () => {
    expect(validateSetupScheduleSearch({ substep: 1 })).toEqual({ substep: 1 });
    expect(validateSetupScheduleSearch({ substep: "1" })).toEqual({ substep: 1 });
  });
});

describe("resolveSetupProgressStep", () => {
  it("maps setup routes to six-dot indices", () => {
    expect(resolveSetupProgressStep("welcome", 0)).toBe(0);
    expect(resolveSetupProgressStep("schedule", 0)).toBe(1);
    expect(resolveSetupProgressStep("schedule", 1)).toBe(2);
    expect(resolveSetupProgressStep("provider", 0)).toBe(3);
    expect(resolveSetupProgressStep("sync", 0)).toBe(4);
    expect(resolveSetupProgressStep("done", 0)).toBe(5);
  });
});
