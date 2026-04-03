import { render } from "@testing-library/react";
import { FoxFace } from "@/shared/ui/FoxMascot/internal/FoxFace/FoxFace";

describe("FoxFace", () => {
  it("renders facial features for expressive moods", () => {
    const { container, rerender } = render(
      <svg>
        <FoxFace mood="curious" />
      </svg>,
    );

    expect(container.querySelectorAll("circle").length).toBeGreaterThan(0);

    rerender(
      <svg>
        <FoxFace mood="drained" />
      </svg>,
    );

    expect(container.querySelectorAll("line").length).toBeGreaterThan(0);
  });
});
