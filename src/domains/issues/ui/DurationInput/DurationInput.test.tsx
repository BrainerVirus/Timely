import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DurationInput } from "@/domains/issues/ui/DurationInput/DurationInput";

describe("DurationInput", () => {
  it("edits duration segments and announces a human preview", () => {
    const onChange = vi.fn();

    render(
      <DurationInput
        value={{ weeks: 0, days: 0, hours: 0, minutes: 0 }}
        locale="en-US"
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByRole("spinbutton", { name: "Hours" }), {
      target: { value: "2" },
    });

    expect(onChange).toHaveBeenLastCalledWith({ weeks: 0, days: 0, hours: 2, minutes: 0 });
    expect(screen.getByText("No time selected")).toHaveAttribute("aria-live", "polite");
  });

  it("accepts exact typed minute values and normalizes them", () => {
    const onChange = vi.fn();

    render(
      <DurationInput
        value={{ weeks: 0, days: 0, hours: 0, minutes: 0 }}
        locale="en-US"
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByRole("spinbutton", { name: "Minutes" }), {
      target: { value: "75" },
    });

    expect(onChange).toHaveBeenLastCalledWith({ weeks: 0, days: 0, hours: 1, minutes: 15 });
  });

  it("increments minutes by five with arrow keys", () => {
    const onChange = vi.fn();

    render(
      <DurationInput
        value={{ weeks: 0, days: 0, hours: 0, minutes: 10 }}
        locale="en-US"
        onChange={onChange}
      />,
    );

    fireEvent.keyDown(screen.getByRole("spinbutton", { name: "Minutes" }), { key: "ArrowUp" });

    expect(onChange).toHaveBeenLastCalledWith({ weeks: 0, days: 0, hours: 0, minutes: 15 });
  });

  it("applies quick picks and clear without exposing provider syntax", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DurationInput
        value={{ weeks: 0, days: 0, hours: 0, minutes: 0 }}
        locale="en-US"
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add 30 minutes" }));
    expect(onChange).toHaveBeenLastCalledWith({ weeks: 0, days: 0, hours: 0, minutes: 30 });

    rerender(
      <DurationInput
        value={{ weeks: 0, days: 0, hours: 0, minutes: 30 }}
        locale="en-US"
        onChange={onChange}
      />,
    );

    expect(screen.getByText("30 minutes")).toBeInTheDocument();
    expect(screen.queryByText("30m")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear duration" }));
    expect(onChange).toHaveBeenLastCalledWith({ weeks: 0, days: 0, hours: 0, minutes: 0 });
  });
});
