import { fireEvent, render, screen } from "@testing-library/react";
import { SetupProviderPage } from "@/features/setup/screens/SetupProviderPage/SetupProviderPage";

import type { ProviderConnection } from "@/shared/types/dashboard";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({ t: (key: string) => key })),
}));

vi.mock("@/domains/gitlab-connection/ui/GitLabAuthPanel/GitLabAuthPanel", () => ({
  GitLabAuthPanel: () => <div data-testid="gitlab-auth-panel" />,
}));

vi.mock("@/domains/gitlab-connection/ui/YouTrackAuthPanel/YouTrackAuthPanel", () => ({
  YouTrackAuthPanel: () => <div data-testid="youtrack-auth-panel" />,
}));

describe("SetupProviderPage", () => {
  const gitlabConnection: ProviderConnection = {
    id: 1,
    provider: "gitlab",
    displayName: "GitLab",
    host: "gitlab.com",
    hasToken: true,
    state: "live",
    authMode: "pat",
    preferredScope: "api",
    statusNote: "",
    oauthReady: false,
    isPrimary: true,
  };

  const defaultProps = {
    connections: [],
    onBack: vi.fn(),
    onNext: vi.fn(),
    onSaveConnection: vi.fn(),
    onSavePat: vi.fn(),
    onBeginOAuth: vi.fn(),
    onResolveCallback: vi.fn(),
  };

  it("renders title and both provider rows", () => {
    render(<SetupProviderPage {...defaultProps} />);
    expect(screen.getByText("setup.providerTitle")).toBeInTheDocument();
    expect(screen.getByText("GitLab")).toBeInTheDocument();
    expect(screen.getByText("YouTrack")).toBeInTheDocument();
  });

  it("expands GitLab auth panel when connect clicked", () => {
    render(<SetupProviderPage {...defaultProps} />);
    const connectButtons = screen.getAllByText("providers.connect");
    fireEvent.click(connectButtons[0]);
    expect(screen.getByTestId("gitlab-auth-panel")).toBeInTheDocument();
  });

  it("returns a connected GitLab row to connect state when disconnect clicked", () => {
    render(<SetupProviderPage {...defaultProps} connections={[gitlabConnection]} />);
    fireEvent.click(screen.getByRole("button", { name: "providers.disconnect" }));
    expect(screen.getAllByRole("button", { name: "providers.connect" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("providers.connectedToHost")).not.toBeInTheDocument();
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
