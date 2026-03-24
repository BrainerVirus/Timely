import { render, screen } from "@testing-library/react";
import { FoxMascot } from "@/shared/components/FoxMascot/FoxMascot";

describe("FoxMascot", () => {
  it("renders expanded mood variants accessibly", () => {
    render(<FoxMascot mood="curious" size={96} />);

    expect(screen.getByRole("img", { name: /Timely fox mascot/i })).toHaveAttribute(
      "aria-label",
      "Timely fox mascot — aurora curious",
    );
  });

  it("supports tired and drained variants without crashing", () => {
    const { rerender } = render(<FoxMascot mood="tired" size={96} />);
    expect(screen.getByRole("img")).toBeInTheDocument();

    rerender(<FoxMascot mood="drained" size={96} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("renders accessory overlays when equipped", () => {
    render(
      <FoxMascot
        mood="curious"
        size={96}
        accessories={[
          { slot: "eyewear", variant: "frame-signal" },
          { slot: "charm", variant: "desk-constellation" },
        ]}
      />,
    );

    expect(screen.getByRole("img", { name: /curious/i })).toBeInTheDocument();
  });

  it("supports additional scarf and cap accessories", () => {
    render(
      <FoxMascot
        mood="celebrating"
        size={96}
        accessories={[
          { slot: "neckwear", variant: "aurora-scarf" },
          { slot: "headwear", variant: "comet-cap" },
        ]}
      />,
    );

    expect(screen.getByRole("img", { name: /celebrating/i })).toBeInTheDocument();
  });

  it("supports arctic companion variant", () => {
    render(<FoxMascot mood="idle" size={96} variant="arctic" />);

    expect(screen.getByRole("img", { name: /arctic idle/i })).toBeInTheDocument();
  });

  it("supports kitsune companion variant", () => {
    render(<FoxMascot mood="curious" size={96} variant="kitsune" />);

    expect(screen.getByRole("img", { name: /kitsune curious/i })).toBeInTheDocument();
  });
});
