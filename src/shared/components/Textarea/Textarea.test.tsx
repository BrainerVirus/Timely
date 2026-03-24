import { render, screen } from "@testing-library/react";
import { Textarea } from "@/shared/components/Textarea/Textarea";

describe("Textarea", () => {
  it("renders textarea", () => {
    render(<Textarea placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });
});
