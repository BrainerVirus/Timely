import { render, screen } from "@testing-library/react";
import { SummaryGrid } from "@/shared/ui/SummaryGrid/SummaryGrid";

const items = [
  { title: "Logged", value: "6h", note: "Today", icon: "timer" as const },
  { title: "Target", value: "8h", note: "Daily", icon: "target" as const },
];

describe("SummaryGrid", () => {
  it("renders all items", () => {
    render(<SummaryGrid items={items} dataKey="test" />);
    expect(screen.getByText("Logged")).toBeInTheDocument();
    expect(screen.getByText("6h")).toBeInTheDocument();
    expect(screen.getByText("Target")).toBeInTheDocument();
    expect(screen.getByText("8h")).toBeInTheDocument();
  });
});
