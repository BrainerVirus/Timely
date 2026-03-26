import { normalizeDiagnosticsFeatureFilter } from "@/features/settings/hooks/use-settings-page-controller/use-settings-page-controller";

describe("normalizeDiagnosticsFeatureFilter", () => {
  it("returns undefined for the all filter", () => {
    expect(normalizeDiagnosticsFeatureFilter("all")).toBeUndefined();
  });

  it("returns the feature value for specific filters", () => {
    expect(normalizeDiagnosticsFeatureFilter("notifications")).toBe("notifications");
    expect(normalizeDiagnosticsFeatureFilter("sync")).toBe("sync");
  });
});
