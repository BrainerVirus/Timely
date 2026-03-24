import { render, screen } from "@testing-library/react";
import { Label } from "@/shared/components/Label/Label";

describe("Label", () => {
  it("renders label text", () => {
    render(<Label>Email</Label>);
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("associates with input via htmlFor", () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" aria-label="Email" />
      </>,
    );
    const input = document.getElementById("email");
    expect(input).toBeInTheDocument();
  });
});
