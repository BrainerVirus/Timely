import { fireEvent, render, screen } from "@testing-library/react";
import { PagerControl } from "@/shared/components/PagerControl/PagerControl";

describe("PagerControl", () => {
  const defaults = {
    label: "March 15",
    onPrevious: vi.fn(),
    onCurrent: vi.fn(),
    onNext: vi.fn(),
  };

  it("renders label", () => {
    render(<PagerControl {...defaults} />);
    expect(screen.getByRole("button", { name: "March 15" })).toBeInTheDocument();
  });

  it("calls onPrevious when previous is clicked", () => {
    render(<PagerControl {...defaults} />);
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(defaults.onPrevious).toHaveBeenCalledTimes(1);
  });

  it("calls onNext when next is clicked", () => {
    render(<PagerControl {...defaults} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(defaults.onNext).toHaveBeenCalledTimes(1);
  });

  it("uses scopeLabel for aria when provided", () => {
    render(<PagerControl {...defaults} scopeLabel="Day" />);
    expect(screen.getByRole("button", { name: "Previous Day" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next Day" })).toBeInTheDocument();
  });

  it("disables all buttons when disabled", () => {
    render(<PagerControl {...defaults} disabled />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "March 15" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});
