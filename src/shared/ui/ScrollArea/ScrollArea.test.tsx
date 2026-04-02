import { render, screen } from "@testing-library/react";
import { ScrollArea } from "@/shared/ui/ScrollArea/ScrollArea";

describe("ScrollArea", () => {
  it("renders children", () => {
    render(<ScrollArea>Scroll content</ScrollArea>);
    expect(screen.getByText("Scroll content")).toBeInTheDocument();
  });
});
