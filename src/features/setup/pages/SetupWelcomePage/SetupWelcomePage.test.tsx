import { fireEvent, render, screen } from "@testing-library/react";
import { SetupWelcomePage } from "@/features/setup/pages/SetupWelcomePage/SetupWelcomePage";

vi.mock("@/core/services/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({ t: (key: string) => key })),
}));

vi.mock("@/shared/components/FoxMascot/FoxMascot", () => ({
  FoxMascot: () => <div data-testid="fox-mascot" />,
}));

describe("SetupWelcomePage", () => {
  it("renders title and button", () => {
    render(<SetupWelcomePage onNext={vi.fn()} />);
    expect(screen.getByText("setup.welcomeTitle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "common.getStarted" })).toBeInTheDocument();
  });

  it("calls onNext when button clicked", () => {
    const onNext = vi.fn();
    render(<SetupWelcomePage onNext={onNext} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
