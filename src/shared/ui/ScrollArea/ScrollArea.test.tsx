import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { ScrollArea } from "@/shared/ui/ScrollArea/ScrollArea";

describe("ScrollArea", () => {
  it("renders children", () => {
    render(<ScrollArea>Scroll content</ScrollArea>);
    expect(screen.getByText("Scroll content")).toBeInTheDocument();
  });

  it("forwards viewportRef to the scroll viewport", () => {
    const viewportRef = createRef<HTMLDivElement>();
    render(
      <ScrollArea viewportRef={viewportRef} viewportProps={{ "data-testid": "viewport-node" }}>
        Inner
      </ScrollArea>,
    );

    expect(screen.getByTestId("viewport-node")).toBe(viewportRef.current);
    expect(viewportRef.current?.getAttribute("data-slot")).toBe("scroll-area-viewport");
  });

  it("renders horizontal and vertical scrollbars when scrollbars is both", () => {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);

    try {
      const { container } = render(
        <ScrollArea scrollbars="both" className="h-32 w-32" type="always">
          <div className="h-96 w-96">Overflowing</div>
        </ScrollArea>,
      );
      expect(container.querySelectorAll('[data-slot="scroll-area-scrollbar"]').length).toBe(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
