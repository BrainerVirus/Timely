import { render, screen } from "@testing-library/react";
import { FoxMark } from "@/shared/components/FoxMark/FoxMark";

describe("FoxMark", () => {
  it("renders svg with default aria-label", () => {
    render(<FoxMark />);
    expect(screen.getByRole("img", { name: "Timely fox mark" })).toBeInTheDocument();
  });
});
