import { deriveInitialScheduleTimezone } from "@/features/preferences/schedule-form";
import { mockBootstrap } from "@/lib/mock-data";

describe("deriveInitialScheduleTimezone", () => {
  it("prefers the detected timezone for a fresh workspace placeholder", () => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    expect(deriveInitialScheduleTimezone(mockBootstrap)).toBe(detectedTimezone);
  });

  it("keeps an explicitly configured UTC timezone", () => {
    expect(
      deriveInitialScheduleTimezone({
        ...mockBootstrap,
        schedule: {
          ...mockBootstrap.schedule,
          timezone: "UTC",
          shiftStart: "09:00",
          shiftEnd: "18:00",
          lunchMinutes: 60,
        },
      }),
    ).toBe("UTC");
  });

  it("falls back to the detected timezone when the stored timezone is blank", () => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    expect(
      deriveInitialScheduleTimezone({
        ...mockBootstrap,
        schedule: {
          ...mockBootstrap.schedule,
          timezone: "",
        },
      }),
    ).toBe(detectedTimezone);
  });
});
