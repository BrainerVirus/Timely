import { fireEvent, render, screen } from "@testing-library/react";
import { HomePage } from "@/features/home/home-page";
import { tourPayload } from "@/features/onboarding/tour-mock-data";

describe("HomePage", () => {
  it("renders quick worklog links for day, week, and period", () => {
    const onOpenWorklog = vi.fn();

    render(
      <HomePage
        payload={tourPayload}
        needsSetup={false}
        onOpenSetup={() => {}}
        onOpenWorklog={onOpenWorklog}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Open today log/i }));
    fireEvent.click(screen.getByRole("button", { name: /Review this week/i }));
    fireEvent.click(screen.getByRole("button", { name: /Inspect date range/i }));

    expect(onOpenWorklog).toHaveBeenNthCalledWith(1, "day");
    expect(onOpenWorklog).toHaveBeenNthCalledWith(2, "week");
    expect(onOpenWorklog).toHaveBeenNthCalledWith(3, "period");
  });

  it("shows the fox hero labels and lower sections", () => {
    render(
      <HomePage
        payload={tourPayload}
        needsSetup={false}
        onOpenSetup={() => {}}
        onOpenWorklog={() => {}}
      />,
    );

    expect(screen.getByText(/Companion status/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Timely fox mascot/i })).toBeInTheDocument();
    expect(screen.getByText(/This week's progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Current streak/i)).toBeInTheDocument();
    expect(screen.getByText(/Logged 6h15min/i)).toBeInTheDocument();
    expect(screen.getByText(/6\.3h/i)).toBeInTheDocument();
    expect(screen.queryByText(/best-effort same-day uploads/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/4d/i)).toHaveLength(2);
  });

  it("keeps weekday ordering from payload for weekly progress and streak", () => {
    render(
      <HomePage
        payload={tourPayload}
        needsSetup={false}
        onOpenSetup={() => {}}
        onOpenWorklog={() => {}}
      />,
    );

    const weekdayChips = screen.getAllByText(/^[MTWTFSSLMXJVDS]$/i);

    expect(weekdayChips[0]).toHaveTextContent("S");
  });
});
