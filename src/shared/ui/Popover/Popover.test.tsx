import { render, screen } from "@testing-library/react";
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/ui/Popover/Popover";

describe("Popover", () => {
  it("renders trigger and content", () => {
    render(
      <Popover>
        <PopoverTrigger asChild>
          <button type="button">Open</button>
        </PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>,
    );
    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
  });
});
