import { act, renderHook } from "@testing-library/react";
import { getInitialScheduleScrollTop } from "@/features/settings/components/ScheduleWorkspace/lib/schedule-workspace-helpers";
import { useScheduleWorkspaceController } from "@/features/settings/components/ScheduleWorkspace/lib/use-schedule-workspace-controller";
import { createWeekdayScheduleFormRows } from "@/features/settings/hooks/schedule-form/schedule-form";
import { groupWeekdaySchedules } from "@/features/settings/utils/schedule-visualization";
import { mockBootstrap } from "@/test/fixtures/mock-data";

import type { WeekdayCode, WeekdayScheduleFormRow } from "@/features/settings/hooks/schedule-form/schedule-form";

const orderedWorkdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function buildController(
  weekdaySchedules: WeekdayScheduleFormRow[],
  onCopyWeekdaySchedule = vi.fn(),
) {
  return renderHook(
    ({ rows }: { rows: WeekdayScheduleFormRow[] }) =>
      useScheduleWorkspaceController({
        weekdaySchedules: rows,
        orderedWorkdays: [...orderedWorkdays],
        scheduleByDay: new Map(rows.map((schedule) => [schedule.day, schedule] as const)),
        patternGroups: groupWeekdaySchedules(rows, [...orderedWorkdays]),
        axisStartMinutes: 0,
        onCopyWeekdaySchedule,
      }),
    {
      initialProps: { rows: weekdaySchedules },
    },
  );
}

describe("useScheduleWorkspaceController", () => {
  it("selects the first enabled day by default", () => {
    const weekdaySchedules = createWeekdayScheduleFormRows(mockBootstrap.schedule);
    const { result } = buildController(weekdaySchedules);

    expect(result.current.selectedDay).toBe("Mon");
    expect(result.current.selectedSchedule?.day).toBe("Mon");
    expect(result.current.selectedApplyDays).toEqual(["Tue", "Wed", "Thu", "Fri"]);
  });

  it("falls back to the next available day when the selected day disappears", () => {
    const initialRows = createWeekdayScheduleFormRows(mockBootstrap.schedule);
    const { result, rerender } = buildController(initialRows);

    act(() => {
      result.current.setSelectedDay("Wed");
    });

    rerender({ rows: initialRows.filter((row) => row.day !== "Wed") });

    expect(result.current.selectedDay).toBe("Mon");
    expect(result.current.selectedSchedule?.day).toBe("Mon");
  });

  it("resets selected apply days when the selected group changes", () => {
    const rows = createWeekdayScheduleFormRows(mockBootstrap.schedule).map((row) =>
      row.day === "Thu" ? { ...row, shiftEnd: "17:00" } : row,
    );
    const { result } = buildController(rows);

    expect(result.current.selectedApplyDays).toEqual(["Tue", "Wed"]);

    act(() => {
      result.current.setSelectedDay("Thu");
    });

    expect(result.current.selectedApplyDays).toEqual([]);
  });

  it("sanitizes the selected day when applying to the whole week", () => {
    const onCopyWeekdaySchedule = vi.fn();
    const weekdaySchedules = createWeekdayScheduleFormRows(mockBootstrap.schedule);
    const { result } = buildController(weekdaySchedules, onCopyWeekdaySchedule);

    act(() => {
      result.current.applyToDays([...orderedWorkdays] as WeekdayCode[]);
    });

    expect(onCopyWeekdaySchedule).toHaveBeenCalledWith("Mon", [
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
  });
});

describe("getInitialScheduleScrollTop", () => {
  it("uses the earliest enabled shift start", () => {
    const weekdaySchedules = createWeekdayScheduleFormRows(mockBootstrap.schedule).map((row) =>
      row.day === "Thu" ? { ...row, shiftStart: "07:30" } : row,
    );

    expect(getInitialScheduleScrollTop(weekdaySchedules, 0)).toBe(364);
  });
});
