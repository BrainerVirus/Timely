import { fireEvent, render, screen } from "@testing-library/react";
import { SetupProviderPage } from "@/features/setup/pages/SetupProviderPage/SetupProviderPage";

vi.mock("@/core/services/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({ t: (key: string) => key })),
}));

vi.mock("@/features/settings/components/GitLabAuthPanel/GitLabAuthPanel", () => ({
  GitLabAuthPanel: () => <div data-testid="gitlab-auth-panel" />,
}));

describe("SetupProviderPage", () => {
  const defaultProps = {
    connections: [],
    onBack: vi.fn(),
    onNext: vi.fn(),
    onSaveConnection: vi.fn(),
    onSavePat: vi.fn(),
    onBeginOAuth: vi.fn(),
    onResolveCallback: vi.fn(),
  };

  it("renders title and GitLabAuthPanel", () => {
    render(<SetupProviderPage {...defaultProps} />);
    expect(screen.getByText("setup.providerTitle")).toBeInTheDocument();
    expect(screen.getByTestId("gitlab-auth-panel")).toBeInTheDocument();
  });

  it("calls onNext when continue clicked", () => {
    render(<SetupProviderPage {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "common.skipForNow" }));
    expect(defaultProps.onNext).toHaveBeenCalledTimes(1);
  });

  it("calls onBack when back clicked", () => {
    render(<SetupProviderPage {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "common.back" }));
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });
});
