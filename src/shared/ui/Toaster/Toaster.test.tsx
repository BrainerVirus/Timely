import { render } from "@testing-library/react";
import { Toaster } from "@/shared/ui/Toaster/Toaster";

describe("Toaster", () => {
  it("renders without crashing", () => {
    const { container } = render(<Toaster />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
