import { render } from "@testing-library/react";
import { FoxTail } from "@/shared/ui/FoxMascot/internal/FoxTail/FoxTail";

describe("FoxTail", () => {
  it("renders the tail path with the provided fur color", () => {
    const { container } = render(
      <svg>
        <FoxTail mood="idle" fur="orange" animated={false} />
      </svg>,
    );

    expect(container.querySelector("path")).toHaveAttribute("stroke", "orange");
  });
});
