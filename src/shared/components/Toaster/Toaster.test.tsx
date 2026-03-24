import { render } from "@testing-library/react";
import { Toaster } from "@/shared/components/Toaster/Toaster";

describe("Toaster", () => {
  it("renders without crashing", () => {
    const { container } = render(<Toaster />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
