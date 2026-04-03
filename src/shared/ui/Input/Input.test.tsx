import { render, screen } from "@testing-library/react";
import { Input } from "@/shared/ui/Input/Input";

describe("Input", () => {
  it("renders with value", () => {
    render(<Input value="test" readOnly />);
    expect(screen.getByRole("textbox")).toHaveValue("test");
  });

  it("supports placeholder", () => {
    render(<Input placeholder="Enter name" />);
    expect(screen.getByPlaceholderText("Enter name")).toBeInTheDocument();
  });

  it("is disabled when disabled", () => {
    render(<Input disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});
