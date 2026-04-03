import { render, screen } from "@testing-library/react";
import { TimelyDayButton } from "@/shared/ui/Calendar/internal/TimelyDayButton/TimelyDayButton";

describe("TimelyDayButton", () => {
  it("uses the holiday label as the day button title", () => {
    render(
      <TimelyDayButton
        day={{ date: new Date(2026, 2, 12), displayMonth: new Date(2026, 2, 1) } as never}
        modifiers={{
          holiday: true,
          selected: false,
          today: false,
          range_start: false,
          range_end: false,
          range_middle: false,
          outside: false,
          disabled: false,
        }}
        holidayMap={new Map([["2026-03-12", "Holiday"]])}
      >
        12
      </TimelyDayButton>,
    );

    expect(screen.getByRole("button")).toHaveAttribute("title", "Holiday");
  });
});
