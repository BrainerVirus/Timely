import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DurationInput } from "@/domains/issues/ui/DurationInput/DurationInput";

const labels = {
  legend: "Logged duration",
  segmentLabels: {
    weeks: "Weeks",
    days: "Days",
    hours: "Hours",
    minutes: "Minutes",
  },
  segmentSuffixes: {
    weeks: "w",
    days: "d",
    hours: "h",
    minutes: "m",
  },
  quickActions: {
    add15Minutes: "Add 15 minutes",
    add30Minutes: "Add 30 minutes",
    add1Hour: "Add 1 hour",
    add2Hours: "Add 2 hours",
    add4Hours: "Add 4 hours",
  },
  clear: "clear",
  clearAriaLabel: "Clear duration",
  emptyPreview: "No time selected",
};

describe("DurationInput", () => {
  it("edits duration segments and announces a human preview", () => {
    const onChange = vi.fn();

    render(
      <DurationInput
        value={{ weeks: 0, days: 0, hours: 0, minutes: 0 }}
        locale="en-US"
        labels={labels}
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
        labels={labels}
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
        labels={labels}
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
        labels={labels}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add 30 minutes" }));
    expect(onChange).toHaveBeenLastCalledWith({ weeks: 0, days: 0, hours: 0, minutes: 30 });

    rerender(
      <DurationInput
        value={{ weeks: 0, days: 0, hours: 0, minutes: 30 }}
        locale="en-US"
        labels={labels}
        onChange={onChange}
      />,
    );

    expect(screen.getByText("30 minutes")).toBeInTheDocument();
    expect(screen.queryByText("30m")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear duration" }));
    expect(onChange).toHaveBeenLastCalledWith({ weeks: 0, days: 0, hours: 0, minutes: 0 });
  });

  it("uses caller-provided labels for localized empty and control text", () => {
    render(
      <DurationInput
        value={{ weeks: 0, days: 0, hours: 0, minutes: 0 }}
        locale="es"
        labels={{
          ...labels,
          legend: "Duración registrada",
          segmentLabels: { ...labels.segmentLabels, hours: "Horas" },
          quickActions: { ...labels.quickActions, add1Hour: "Agregar 1 hora" },
          clear: "borrar",
          clearAriaLabel: "Borrar duración",
          emptyPreview: "Sin tiempo seleccionado",
        }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Duración registrada")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Horas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar 1 hora" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Borrar duración" })).toHaveTextContent("borrar");
    expect(screen.getByText("Sin tiempo seleccionado")).toHaveAttribute("aria-live", "polite");
  });
});
