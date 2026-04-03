import { render, screen } from "@testing-library/react";
import { Badge } from "@/shared/ui/Badge/Badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>Live</Badge>);
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("applies tone variant", () => {
    const { container } = render(<Badge tone="live">Active</Badge>);
    expect(container.querySelector("span")?.className).toContain("primary");
  });
});
