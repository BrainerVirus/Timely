import { render, screen } from "@testing-library/react";
import { StaggerGroup } from "@/shared/components/PageTransition/PageTransition";

describe("PageTransition", () => {
  it("StaggerGroup renders children", () => {
    render(<StaggerGroup>Group content</StaggerGroup>);
    expect(screen.getByText("Group content")).toBeInTheDocument();
  });
});
