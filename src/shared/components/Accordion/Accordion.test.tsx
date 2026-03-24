import { render, screen } from "@testing-library/react";
import { AccordionItem } from "@/shared/components/Accordion/Accordion";

vi.mock("@/core/services/MotionService/motion", () => ({
  useMotionSettings: vi.fn(() => ({ allowDecorativeAnimation: false })),
}));

describe("Accordion", () => {
  it("renders title", () => {
    render(<AccordionItem title="Section">Content</AccordionItem>);
    expect(screen.getByText("Section")).toBeInTheDocument();
  });

  it("renders children when defaultOpen", () => {
    render(
      <AccordionItem title="Open" defaultOpen>
        Inner content
      </AccordionItem>,
    );
    expect(screen.getByText("Inner content")).toBeInTheDocument();
  });
});
