import { render } from "@testing-library/react";
import { FoxAccessories } from "@/shared/ui/FoxMascot/internal/FoxAccessories/FoxAccessories";

describe("FoxAccessories", () => {
  it("renders the equipped accessory overlays", () => {
    const { container } = render(
      <svg>
        <FoxAccessories
          headwear="comet-cap"
          eyewear="frame-signal"
          neckwear="aurora-scarf"
          charm="desk-constellation"
        />
      </svg>,
    );

    expect(container.querySelectorAll("path").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("rect").length).toBeGreaterThan(0);
  });
});
