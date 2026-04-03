import { fireEvent, render, screen, within } from "@testing-library/react";
import { WeekdayScheduleRow } from "@/domains/schedule/ui/WeekdayScheduleEditor/internal/WeekdayScheduleRow/WeekdayScheduleRow";

import type { WeekdayScheduleFormRow } from "@/domains/schedule/state/schedule-form/schedule-form";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: () => ({
    t: (key: string, values?: Record<string, string>) => {
      const translations: Record<string, string> = {
        "settings.workingDay": "Workday",
        "settings.dayOff": "Day off",
        "settings.shiftStart": "Shift start",
        "settings.shiftEnd": "Shift end",
        "settings.lunchBreak": "Lunch break",
        "settings.netHoursPerDay": "Net hours/day",
        "settings.copyToDays": "Copy to...",
        "settings.copyDayScheduleHint": "Pick which days should reuse this schedule.",
        "settings.copyDayScheduleEmpty": "Select at least one day.",
        "settings.copyDayScheduleApply": "Apply",
      };

      if (key === "settings.copyDayScheduleTitle") {
        return `Copy ${values?.day ?? ""} schedule`;
      }

      if (key === "settings.hoursPerDaySummary") {
        return `${values?.hours ?? "--"}h/day`;
      }

      return translations[key] ?? key;
    },
    formatWeekdayFromCode: (code: string) =>
      (
        ({
          Mon: "Monday",
          Sat: "Saturday",
          Tue: "Tuesday",
        }) as Record<string, string>
      )[code] ?? code,
  }),
}));

const weekdaySchedule: WeekdayScheduleFormRow = {
  day: "Sat",
  enabled: false,
  shiftStart: "09:00",
  shiftEnd: "17:00",
  lunchMinutes: "30",
};

describe("WeekdayScheduleRow", () => {
  it("keeps disabled day fields visible and not interactive", () => {
    render(
      <WeekdayScheduleRow
        schedule={weekdaySchedule}
        orderedWorkdays={["Mon", "Sat"]}
        layout="inline"
        onSetWeekdayEnabled={vi.fn()}
        onSetWeekdayField={vi.fn()}
        onCopyWeekdaySchedule={vi.fn()}
      />,
    );

    expect(screen.getByText("Saturday")).toBeInTheDocument();
    expect(screen.getByText("--")).toBeInTheDocument();

    const shiftStartField = screen.getByLabelText("Saturday Shift start");
    for (const control of within(shiftStartField).getAllByRole("button")) {
      expect(control).toBeDisabled();
    }
  });

  it("forwards toggle and lunch updates", () => {
    const onSetWeekdayEnabled = vi.fn();
    const onSetWeekdayField = vi.fn();

    render(
      <WeekdayScheduleRow
        schedule={{ ...weekdaySchedule, day: "Mon", enabled: true }}
        orderedWorkdays={["Mon", "Sat"]}
        layout="inline"
        onSetWeekdayEnabled={onSetWeekdayEnabled}
        onSetWeekdayField={onSetWeekdayField}
        onCopyWeekdaySchedule={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Day off" }));
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "45" } });

    expect(onSetWeekdayEnabled).toHaveBeenCalledWith("Mon", false);
    expect(onSetWeekdayField).toHaveBeenCalledWith("Mon", "lunchMinutes", "45");
  });
});
