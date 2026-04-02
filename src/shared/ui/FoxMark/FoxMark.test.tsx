import { render, screen } from "@testing-library/react";
import { FoxMark } from "@/shared/ui/FoxMark/FoxMark";

describe("FoxMark", () => {
  it("stays decorative by default", () => {
    const { container } = render(<FoxMark />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders an accessible image when a title is provided", () => {
    render(<FoxMark title="Marca de zorro de Timely" />);
    expect(screen.getByRole("img", { name: "Marca de zorro de Timely" })).toBeInTheDocument();
  });
});
