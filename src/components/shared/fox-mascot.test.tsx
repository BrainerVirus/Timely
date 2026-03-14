import { render, screen } from "@testing-library/react";
import { FoxMascot } from "@/components/shared/fox-mascot";

describe("FoxMascot", () => {
  it("renders expanded mood variants accessibly", () => {
    render(<FoxMascot mood="curious" size={96} />);

    expect(screen.getByRole("img", { name: /Timely fox mascot/i })).toHaveAttribute(
      "aria-label",
      "Timely fox mascot — curious",
    );
  });

  it("supports tired and drained variants without crashing", () => {
    const { rerender } = render(<FoxMascot mood="tired" size={96} />);
    expect(screen.getByRole("img")).toBeInTheDocument();

    rerender(<FoxMascot mood="drained" size={96} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });
});
