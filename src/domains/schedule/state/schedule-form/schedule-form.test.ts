import {
  buildScheduleTicks,
  buildScheduleCanvasBlock,
  buildWeekdaySchedulesInput,
  createWeekdayScheduleFormRows,
  deriveInitialScheduleTimezone,
  getScheduleAxisBounds,
  groupWeekdaySchedules,
  scheduleFormReducer,
} from "@/domains/schedule/state/schedule-form/schedule-form";
import { mockBootstrap } from "@/test/fixtures/mock-data";

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

describe("createWeekdayScheduleFormRows", () => {
  it("falls back to legacy workdays when per-day schedules are missing", () => {
    const rows = createWeekdayScheduleFormRows({
      weekdaySchedules: [],
      shiftStart: "08:30",
      shiftEnd: "18:15",
      lunchMinutes: 45,
      workdays: "Mon - Tue - Fri",
    });

    expect(rows.find((row) => row.day === "Mon")).toMatchObject({
      enabled: true,
      shiftStart: "08:30",
      shiftEnd: "18:15",
      lunchMinutes: "45",
    });
    expect(rows.find((row) => row.day === "Wed")).toMatchObject({ enabled: false });
    expect(rows.find((row) => row.day === "Fri")).toMatchObject({ enabled: true });
  });
});

describe("buildWeekdaySchedulesInput", () => {
  it("returns all weekdays and converts lunch minutes back to numbers", () => {
    const input = buildWeekdaySchedulesInput([
      {
        day: "Mon",
        enabled: true,
        shiftStart: "08:30",
        shiftEnd: "18:15",
        lunchMinutes: "45",
      },
      {
        day: "Fri",
        enabled: true,
        shiftStart: "08:30",
        shiftEnd: "17:15",
        lunchMinutes: "45",
      },
    ]);

    expect(input).toHaveLength(7);
    expect(input.find((row) => row.day === "Mon")).toMatchObject({
      lunchMinutes: 45,
      shiftStart: "08:30",
      shiftEnd: "18:15",
    });
    expect(input.find((row) => row.day === "Fri")).toMatchObject({
      lunchMinutes: 45,
      shiftEnd: "17:15",
    });
    expect(input.find((row) => row.day === "Sun")).toMatchObject({
      enabled: false,
      shiftStart: "09:00",
      shiftEnd: "18:00",
      lunchMinutes: 0,
    });
  });
});

describe("scheduleFormReducer", () => {
  it("copies one weekday schedule to other days and enables them", () => {
    const initialState = {
      weekdaySchedules: createWeekdayScheduleFormRows(mockBootstrap.schedule),
      timezone: "America/Santiago",
      weekStart: "monday" as const,
      schedulePhase: "idle" as const,
    };

    const nextState = scheduleFormReducer(initialState, {
      type: "copyWeekdaySchedule",
      sourceDay: "Mon",
      targetDays: ["Thu", "Fri"],
    });

    expect(nextState.weekdaySchedules.find((row) => row.day === "Thu")).toMatchObject({
      enabled: true,
      shiftStart: "09:00",
      shiftEnd: "18:00",
      lunchMinutes: "60",
    });
    expect(nextState.weekdaySchedules.find((row) => row.day === "Fri")).toMatchObject({
      enabled: true,
      shiftStart: "09:00",
      shiftEnd: "18:00",
      lunchMinutes: "60",
    });
    expect(nextState.schedulePhase).toBe("idle");
  });
});

describe("groupWeekdaySchedules", () => {
  it("groups adjacent weekdays with matching schedules", () => {
    const groups = groupWeekdaySchedules(createWeekdayScheduleFormRows(mockBootstrap.schedule), [
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.days).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri"]);
    expect(groups[1]?.days).toEqual(["Sat", "Sun"]);
  });
});

describe("schedule canvas helpers", () => {
  it("derives stable axis bounds from enabled schedules", () => {
    const rows = createWeekdayScheduleFormRows(mockBootstrap.schedule);

    expect(getScheduleAxisBounds(rows)).toEqual({
      axisStartMinutes: 0,
      axisEndMinutes: 1440,
    });
  });

  it("builds a canvas block with a lunch cutout", () => {
    const block = buildScheduleCanvasBlock(
      {
        enabled: true,
        shiftStart: "09:00",
        shiftEnd: "18:00",
        lunchMinutes: "60",
      },
      360,
      1200,
    );

    expect(block).toMatchObject({
      workTopPercent: 21.428571428571427,
      workHeightPercent: 64.28571428571429,
      lunchHeightPercent: 7.142857142857142,
    });
  });

  it("builds deterministic hour and half-hour ticks", () => {
    expect(buildScheduleTicks(0, 120, 56)).toEqual([
      { minute: 0, topPx: 0, kind: "hour" },
      { minute: 30, topPx: 28, kind: "halfHour" },
      { minute: 60, topPx: 56, kind: "hour" },
      { minute: 90, topPx: 84, kind: "halfHour" },
      { minute: 120, topPx: 112, kind: "hour" },
    ]);
  });
});
