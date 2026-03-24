import { render, screen } from "@testing-library/react";
import { StatPanel } from "@/shared/components/StatPanel/StatPanel";

describe("StatPanel", () => {
  it("renders title, value, and note", () => {
    render(<StatPanel title="Hours" value="8h" note="Today" />);
    expect(screen.getByText("Hours")).toBeInTheDocument();
    expect(screen.getByText("8h")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
  });
});
