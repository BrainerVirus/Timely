import { render, screen } from "@testing-library/react";
import { FoxMascot } from "@/shared/ui/FoxMascot/FoxMascot";

describe("FoxMascot", () => {
  it("renders an accessible image when an aria label is provided", () => {
    render(<FoxMascot mood="curious" size={96} ariaLabel="Mascota de Timely curiosa" />);

    expect(screen.getByRole("img", { name: "Mascota de Timely curiosa" })).toHaveAttribute(
      "aria-label",
      "Mascota de Timely curiosa",
    );
  });

  it("stays decorative by default", () => {
    const { container } = render(<FoxMascot mood="curious" size={96} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("supports tired and drained variants without crashing", () => {
    const { rerender } = render(<FoxMascot mood="tired" size={96} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();

    rerender(<FoxMascot mood="drained" size={96} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders accessory overlays when equipped", () => {
    const { container } = render(
      <FoxMascot
        mood="curious"
        size={96}
        accessories={[
          { slot: "eyewear", variant: "frame-signal" },
          { slot: "charm", variant: "desk-constellation" },
        ]}
      />,
    );

    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("supports additional scarf and cap accessories", () => {
    const { container } = render(
      <FoxMascot
        mood="celebrating"
        size={96}
        accessories={[
          { slot: "neckwear", variant: "aurora-scarf" },
          { slot: "headwear", variant: "comet-cap" },
        ]}
      />,
    );

    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("supports arctic companion variant", () => {
    const { container } = render(<FoxMascot mood="idle" size={96} variant="arctic" />);

    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("supports kitsune companion variant", () => {
    const { container } = render(<FoxMascot mood="curious" size={96} variant="kitsune" />);

    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
