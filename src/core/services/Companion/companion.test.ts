import { describe, expect, it } from "vitest";
import { getFoxMoodForCompanionMood, normalizeCompanionMood } from "@/core/services/Companion/companion";

describe("companion helpers", () => {
  it("normalizes known moods", () => {
    expect(normalizeCompanionMood("playful")).toBe("playful");
    expect(normalizeCompanionMood("DRAINED")).toBe("drained");
  });

  it("falls back to calm for unknown moods", () => {
    expect(normalizeCompanionMood("alert")).toBe("calm");
    expect(normalizeCompanionMood(undefined)).toBe("calm");
  });

  it("maps derived moods to supported fox animation moods", () => {
    expect(getFoxMoodForCompanionMood("focused")).toBe("working");
    expect(getFoxMoodForCompanionMood("cozy")).toBe("idle");
    expect(getFoxMoodForCompanionMood("playful")).toBe("celebrating");
  });
});
