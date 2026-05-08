import { describe, expect, it } from "vitest";
import {
  durationPartsToTotalMinutes,
  formatDurationForGitLab,
  formatDurationForProvider,
  formatDurationForYouTrackWorkItem,
  formatDurationPreview,
  normalizeDurationParts,
} from "@/domains/issues/lib/duration";

describe("duration domain helpers", () => {
  it("converts provider-neutral duration parts to total minutes", () => {
    expect(durationPartsToTotalMinutes({ weeks: 1, days: 2, hours: 3, minutes: 45 })).toBe(3585);
  });

  it("normalizes overflowing and negative duration parts", () => {
    expect(normalizeDurationParts({ weeks: -1, days: 6, hours: 10, minutes: 125 })).toEqual({
      weeks: 1,
      days: 2,
      hours: 4,
      minutes: 5,
    });
  });

  it("formats a localized human preview without provider syntax", () => {
    expect(formatDurationPreview({ weeks: 0, days: 1, hours: 2, minutes: 30 }, "en-US")).toBe(
      "1 day 2 hours 30 minutes",
    );
    expect(formatDurationPreview({ weeks: 0, days: 0, hours: 0, minutes: 0 }, "en-US")).toBe(
      "No time selected",
    );
  });

  it("formats provider-specific durations only through provider helpers", () => {
    const parts = { weeks: 1, days: 2, hours: 3, minutes: 4 };

    expect(formatDurationForGitLab(parts)).toBe("1w 2d 3h 4m");
    expect(formatDurationForYouTrackWorkItem(parts)).toBe("1w 2d 3h 4m");
    expect(formatDurationForProvider(parts, "gitlab")).toBe("1w 2d 3h 4m");
    expect(formatDurationForProvider(parts, "youtrack")).toBe("1w 2d 3h 4m");
  });
});
