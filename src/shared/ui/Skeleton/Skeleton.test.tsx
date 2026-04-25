import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton, SkeletonText } from "./Skeleton";

describe("Skeleton", () => {
  it("renders a single pulsing block with merged classes", () => {
    const { container } = render(<Skeleton data-testid="block" className="h-4 w-24" />);
    const node = container.querySelector('[data-testid="block"]');
    expect(node).not.toBeNull();
    expect(node?.className).toContain("animate-pulse-soft");
    expect(node?.className).toContain("h-4");
    expect(node?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders the requested number of skeleton text lines", () => {
    const { container } = render(<SkeletonText lines={4} data-testid="skel-text" />);
    const wrapper = container.querySelector('[data-testid="skel-text"]');
    expect(wrapper?.children.length).toBe(4);
  });
});
