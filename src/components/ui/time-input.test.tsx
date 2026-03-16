import { fireEvent, render, screen } from "@testing-library/react";
import { TimeInput, getResolvedTimeCycle } from "@/components/ui/time-input";

describe("TimeInput", () => {
  it("shows the AM/PM segment when the resolved time cycle is 12-hour", () => {
    render(<TimeInput value="08:30" onChange={vi.fn()} timeCycle="12h" aria-label="Shift start" />);

    expect(screen.getByRole("button", { name: "Hours" })).toHaveTextContent("08");
    expect(screen.getByRole("button", { name: "Minutes" })).toHaveTextContent("30");
    expect(screen.getByRole("button", { name: "AM or PM" })).toHaveTextContent("AM");
  });

  it("moves across segments with arrow keys", () => {
    render(<TimeInput value="08:30" onChange={vi.fn()} timeCycle="12h" aria-label="Shift start" />);

    const hour = screen.getByRole("button", { name: "Hours" });
    const minute = screen.getByRole("button", { name: "Minutes" });
    const period = screen.getByRole("button", { name: "AM or PM" });

    hour.focus();
    expect(document.activeElement).toBe(hour);

    fireEvent.keyDown(hour, { key: "ArrowRight" });
    expect(document.activeElement).toBe(minute);

    fireEvent.keyDown(minute, { key: "ArrowRight" });
    expect(document.activeElement).toBe(period);
  });

  it("auto-advances from hour to minute and minute to period", () => {
    render(<TimeInput value="08:30" onChange={vi.fn()} timeCycle="12h" aria-label="Shift start" />);

    const hour = screen.getByRole("button", { name: "Hours" });
    const minute = screen.getByRole("button", { name: "Minutes" });

    fireEvent.focus(hour);
    fireEvent.change(hour, { target: { value: "11" } });
    minute.focus();

    fireEvent.change(minute, { target: { value: "45" } });
    screen.getByRole("button", { name: "AM or PM" }).focus();

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "AM or PM" }));
  });

  it("toggles AM/PM with arrow keys", () => {
    const onChange = vi.fn();

    render(
      <TimeInput value="08:30" onChange={onChange} timeCycle="12h" aria-label="Shift start" />,
    );

    const period = screen.getByRole("button", { name: "AM or PM" });
    fireEvent.keyDown(period, { key: "ArrowUp" });

    expect(onChange).toHaveBeenCalledWith("20:30");
  });

  it("hides the period segment in 24-hour mode", () => {
    render(<TimeInput value="18:15" onChange={vi.fn()} timeCycle="24h" aria-label="Shift end" />);

    expect(screen.getByRole("button", { name: "Hours" })).toHaveTextContent("18");
    expect(screen.queryByRole("button", { name: "AM or PM" })).not.toBeInTheDocument();
  });
});

describe("getResolvedTimeCycle", () => {
  it("respects explicit values", () => {
    expect(getResolvedTimeCycle("12h")).toBe("12h");
    expect(getResolvedTimeCycle("24h")).toBe("24h");
  });
});
