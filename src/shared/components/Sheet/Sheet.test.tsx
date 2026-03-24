import { render, screen } from "@testing-library/react";
import { Sheet, SheetContent, SheetTrigger } from "@/shared/components/Sheet/Sheet";

describe("Sheet", () => {
  it("renders trigger", () => {
    render(
      <Sheet>
        <SheetTrigger asChild>
          <button type="button">Open</button>
        </SheetTrigger>
        <SheetContent>Sheet content</SheetContent>
      </Sheet>,
    );
    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
  });
});
