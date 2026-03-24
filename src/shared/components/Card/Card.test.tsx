import { render, screen } from "@testing-library/react";
import { Card } from "@/shared/components/Card/Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("applies card classes", () => {
    const { container } = render(<Card>Content</Card>);
    const div = container.querySelector("div");
    expect(div?.className).toContain("rounded-2xl");
  });
});
