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

    fireEvent.click(screen.getByRole("button", { name: /Open today/i }));
    fireEvent.click(screen.getByRole("button", { name: /Open this week/i }));
    fireEvent.click(screen.getByRole("button", { name: /Open this period/i }));

    expect(onOpenWorklog).toHaveBeenNthCalledWith(1, "day");
    expect(onOpenWorklog).toHaveBeenNthCalledWith(2, "week");
    expect(onOpenWorklog).toHaveBeenNthCalledWith(3, "period");
  });
});
