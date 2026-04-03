import { fireEvent, render, screen } from "@testing-library/react";
import { SetupSyncPage } from "@/features/setup/screens/SetupSyncPage/SetupSyncPage";
import { mockBootstrap } from "@/test/fixtures/mock-data";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({ t: (key: string) => key })),
}));

vi.mock("@/domains/gitlab-connection/ui/ProviderSyncCard/ProviderSyncCard", () => ({
  ProviderSyncCard: () => <div data-testid="provider-sync-card" />,
}));

describe("SetupSyncPage", () => {
  const defaultProps = {
    payload: mockBootstrap,
    syncState: { status: "idle" as const, log: [] as string[] },
    hasConnection: false,
    onBack: vi.fn(),
    onNext: vi.fn(),
    onStartSync: vi.fn(),
  };

  it("renders title when disconnected", () => {
    render(<SetupSyncPage {...defaultProps} />);
    expect(screen.getByText("setup.syncTitle")).toBeInTheDocument();
    expect(screen.getByText("setup.syncDescriptionDisconnected")).toBeInTheDocument();
  });

  it("renders ProviderSyncCard when has connection", () => {
    render(<SetupSyncPage {...defaultProps} hasConnection />);
    expect(screen.getByTestId("provider-sync-card")).toBeInTheDocument();
  });

  it("calls onNext when continue clicked", () => {
    render(<SetupSyncPage {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "setup.continueButton" }));
    expect(defaultProps.onNext).toHaveBeenCalledTimes(1);
  });
});
