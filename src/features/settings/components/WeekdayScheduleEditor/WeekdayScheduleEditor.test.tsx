import { fireEvent, render, screen, within } from "@testing-library/react";
import { WeekdayScheduleEditor } from "@/features/settings/components/WeekdayScheduleEditor/WeekdayScheduleEditor";

import type { WeekdayScheduleFormRow } from "@/features/settings/hooks/schedule-form/schedule-form";
import type { ComponentProps } from "react";

vi.mock("@/core/services/I18nService/i18n", () => ({
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
          Tue: "Tuesday",
          Wed: "Wednesday",
          Thu: "Thursday",
          Fri: "Friday",
          Sat: "Saturday",
          Sun: "Sunday",
        }) as Record<string, string>
      )[code] ?? code,
  }),
}));

const orderedWorkdays = ["Mon", "Tue", "Sat"] as const;

const weekdaySchedules: WeekdayScheduleFormRow[] = [
  {
    day: "Mon",
    enabled: true,
    shiftStart: "08:30",
    shiftEnd: "18:15",
    lunchMinutes: "45",
  },
  {
    day: "Tue",
    enabled: true,
    shiftStart: "08:30",
    shiftEnd: "18:15",
    lunchMinutes: "45",
  },
  {
    day: "Sat",
    enabled: false,
    shiftStart: "09:00",
    shiftEnd: "17:00",
    lunchMinutes: "30",
  },
];

function renderEditor(props: Partial<ComponentProps<typeof WeekdayScheduleEditor>> = {}) {
  const onSetWeekdayEnabled = vi.fn();
  const onSetWeekdayField = vi.fn();
  const onCopyWeekdaySchedule = vi.fn();

  render(
    <WeekdayScheduleEditor
      weekdaySchedules={weekdaySchedules}
      orderedWorkdays={[...orderedWorkdays]}
      onSetWeekdayEnabled={onSetWeekdayEnabled}
      onSetWeekdayField={onSetWeekdayField}
      onCopyWeekdaySchedule={onCopyWeekdaySchedule}
      {...props}
    />,
  );

  return { onSetWeekdayEnabled, onSetWeekdayField, onCopyWeekdaySchedule };
}

describe("WeekdayScheduleEditor", () => {
  it("renders full weekday names and keeps day-off fields visible but disabled", () => {
    renderEditor();

    expect(screen.getByText("Monday")).toBeInTheDocument();
    expect(screen.getByText("Saturday")).toBeInTheDocument();
    expect(screen.getByText("--")).toBeInTheDocument();

    const saturdayShiftStart = screen.getByLabelText("Saturday Shift start");
    const saturdayShiftEnd = screen.getByLabelText("Saturday Shift end");

    for (const control of within(saturdayShiftStart).getAllByRole("button")) {
      expect(control).toBeDisabled();
    }

    for (const control of within(saturdayShiftEnd).getAllByRole("button")) {
      expect(control).toBeDisabled();
    }
  });

  it("calls the enable toggle and field change handlers for a weekday", () => {
    const { onSetWeekdayEnabled, onSetWeekdayField } = renderEditor();

    fireEvent.click(screen.getAllByRole("button", { name: "Day off" })[0]);
    fireEvent.change(screen.getAllByRole("spinbutton")[0], {
      target: { value: "30" },
    });

    expect(onSetWeekdayEnabled).toHaveBeenCalledWith("Mon", false);
    expect(onSetWeekdayField).toHaveBeenCalledWith("Mon", "lunchMinutes", "30");
  });

  it("copies one weekday schedule to selected target days", () => {
    const { onCopyWeekdaySchedule } = renderEditor();

    fireEvent.click(screen.getAllByRole("button", { name: "Copy to..." })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Tuesday" }));
    fireEvent.click(screen.getByRole("button", { name: "Saturday" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onCopyWeekdaySchedule).toHaveBeenCalledWith("Mon", ["Tue", "Sat"]);
  });
});
