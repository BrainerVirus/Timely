import {
  buildScheduleCanvasBlock,
  buildScheduleTicks,
  getScheduleAxisBounds,
  groupWeekdaySchedules,
} from "@/features/settings/utils/schedule-visualization";
import { createWeekdayScheduleFormRows } from "@/features/settings/hooks/schedule-form/schedule-form";
import { mockBootstrap } from "@/test/fixtures/mock-data";

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
