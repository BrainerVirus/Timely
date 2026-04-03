import { fireEvent, render, screen } from "@testing-library/react";
import { CopyDaySchedulePopover } from "@/domains/schedule/ui/WeekdayScheduleEditor/internal/CopyDaySchedulePopover/CopyDaySchedulePopover";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: () => ({
    t: (key: string, values?: Record<string, string>) => {
      const translations: Record<string, string> = {
        "settings.copyToDays": "Copy to...",
        "settings.copyDayScheduleHint": "Pick which days should reuse this schedule.",
        "settings.copyDayScheduleEmpty": "Select at least one day.",
        "settings.copyDayScheduleApply": "Apply",
      };

      if (key === "settings.copyDayScheduleTitle") {
        return `Copy ${values?.day ?? ""} schedule`;
      }

      return translations[key] ?? key;
    },
    formatWeekdayFromCode: (code: string) =>
      (
        ({
          Mon: "Monday",
          Tue: "Tuesday",
          Sat: "Saturday",
        }) as Record<string, string>
      )[code] ?? code,
  }),
}));

describe("CopyDaySchedulePopover", () => {
  it("applies the selected target weekdays", () => {
    const onApply = vi.fn();

    render(
      <CopyDaySchedulePopover
        sourceDay="Mon"
        orderedWorkdays={["Mon", "Tue", "Sat"]}
        onApply={onApply}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy to..." }));
    fireEvent.click(screen.getByRole("button", { name: "Tuesday" }));
    fireEvent.click(screen.getByRole("button", { name: "Saturday" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith(["Tue", "Sat"]);
  });
});
