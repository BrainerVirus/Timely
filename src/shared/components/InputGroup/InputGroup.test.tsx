import { render, screen } from "@testing-library/react";
import { InputGroup, InputGroupInput } from "@/shared/components/InputGroup/InputGroup";

describe("InputGroup", () => {
  it("renders input group with role group", () => {
    render(
      <InputGroup>
        <InputGroupInput aria-label="Test" />
      </InputGroup>,
    );
    expect(screen.getByRole("group")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Test" })).toBeInTheDocument();
  });
});
