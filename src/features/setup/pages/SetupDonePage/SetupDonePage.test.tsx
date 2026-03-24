import { fireEvent, render, screen } from "@testing-library/react";
import { SetupDonePage } from "@/features/setup/pages/SetupDonePage/SetupDonePage";

vi.mock("@/core/services/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({ t: (key: string) => key })),
}));

vi.mock("@/shared/components/FoxMascot/FoxMascot", () => ({
  FoxMascot: () => <div data-testid="fox-mascot" />,
}));

describe("SetupDonePage", () => {
  it("renders title and button", () => {
    render(<SetupDonePage onOpenHome={vi.fn()} />);
    expect(screen.getByText("setup.doneTitle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "setup.openTimely" })).toBeInTheDocument();
  });

  it("calls onOpenHome when button clicked", () => {
    const onOpenHome = vi.fn();
    render(<SetupDonePage onOpenHome={onOpenHome} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onOpenHome).toHaveBeenCalledTimes(1);
  });

  it("shows finishing state when isFinishing", () => {
    render(<SetupDonePage onOpenHome={vi.fn()} isFinishing />);
    expect(screen.getByText("setup.finishing")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
