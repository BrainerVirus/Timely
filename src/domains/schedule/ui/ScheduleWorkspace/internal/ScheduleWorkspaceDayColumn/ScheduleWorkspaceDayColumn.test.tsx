import { fireEvent, render, screen } from "@testing-library/react";
import { ScheduleWorkspaceDayColumn } from "@/domains/schedule/ui/ScheduleWorkspace/internal/ScheduleWorkspaceDayColumn/ScheduleWorkspaceDayColumn";

describe("ScheduleWorkspaceDayColumn", () => {
  it("renders the shift block when the day has working hours", () => {
    render(
      <ScheduleWorkspaceDayColumn
        axisStartMinutes={480}
        axisEndMinutes={1080}
        day="Mon"
        dayOffLabel="Day off"
        index={0}
        lunchBreakLabel="Lunch"
        schedule={{
          day: "Mon",
          enabled: true,
          shiftStart: "09:00",
          shiftEnd: "18:00",
          lunchMinutes: "60",
        }}
        selected={false}
        setSelectedDay={vi.fn()}
        ticks={[{ minute: 480, topPx: 0, kind: "hour" }]}
        totalHeight={400}
      />,
    );

    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("18:00")).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
  });

  it("renders the day off placeholder and selection callback", () => {
    const setSelectedDay = vi.fn();

    render(
      <ScheduleWorkspaceDayColumn
        axisStartMinutes={480}
        axisEndMinutes={1080}
        day="Mon"
        dayOffLabel="Day off"
        index={0}
        lunchBreakLabel="Lunch"
        schedule={{
          day: "Mon",
          enabled: false,
          shiftStart: "09:00",
          shiftEnd: "18:00",
          lunchMinutes: "0",
        }}
        selected={false}
        setSelectedDay={setSelectedDay}
        ticks={[{ minute: 480, topPx: 0, kind: "hour" }]}
        totalHeight={400}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("Day off")).toBeInTheDocument();
    expect(setSelectedDay).toHaveBeenCalledWith("Mon");
  });
});
