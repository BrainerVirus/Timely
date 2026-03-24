import { render, screen } from "@testing-library/react";
import { SectionHeading } from "@/shared/components/SectionHeading/SectionHeading";

describe("SectionHeading", () => {
  it("renders title", () => {
    render(<SectionHeading title="Section Title" />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Section Title");
  });

  it("renders note when provided", () => {
    render(<SectionHeading title="Title" note="Optional note" />);
    expect(screen.getByText("Optional note")).toBeInTheDocument();
  });

  it("does not render note element when note is undefined", () => {
    const { container } = render(<SectionHeading title="Title" />);
    expect(container.querySelector("p")).toBeNull();
  });
});
