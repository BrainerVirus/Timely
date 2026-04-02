import { render, screen } from "@testing-library/react";
import { Textarea } from "@/shared/ui/Textarea/Textarea";

describe("Textarea", () => {
  it("renders textarea", () => {
    render(<Textarea placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });
});
