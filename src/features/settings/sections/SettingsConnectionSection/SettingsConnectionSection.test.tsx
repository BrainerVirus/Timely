import { fireEvent, render, screen } from "@testing-library/react";
import { SettingsConnectionSection } from "@/features/settings/sections/SettingsConnectionSection/SettingsConnectionSection";

import type { ProviderConnection } from "@/shared/types/dashboard";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({ t: (key: string) => key })),
}));

vi.mock("@/app/providers/MotionService/motion", () => ({
  useMotionSettings: vi.fn(() => ({ allowDecorativeAnimation: false })),
}));

vi.mock("@/domains/gitlab-connection/ui/GitLabAuthPanel/GitLabAuthPanel", () => ({
  GitLabAuthPanel: () => <div data-testid="gitlab-auth-panel" />,
}));

vi.mock("@/domains/gitlab-connection/ui/YouTrackAuthPanel/YouTrackAuthPanel", () => ({
  YouTrackAuthPanel: () => <div data-testid="youtrack-auth-panel" />,
}));

describe("SettingsConnectionSection", () => {
  const youtrackConnection: ProviderConnection = {
    id: 2,
    provider: "youtrack",
    displayName: "YouTrack",
    host: "youtrack.example.com",
    hasToken: true,
    state: "live",
    authMode: "pat",
    preferredScope: "api",
    statusNote: "",
    oauthReady: false,
    isPrimary: true,
  };

  const defaultProps = {
    connectionSummary: "Connected",
    isConnected: true,
    connections: [youtrackConnection],
    onSaveConnection: vi.fn(),
    onSavePat: vi.fn(),
    onBeginOAuth: vi.fn(),
    onResolveCallback: vi.fn(),
  };

  it("returns a connected YouTrack row to connect state when disconnect clicked", () => {
    render(<SettingsConnectionSection {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "settings.connection Connected" }));
    fireEvent.click(screen.getByRole("button", { name: "providers.disconnect" }));
    expect(screen.getAllByRole("button", { name: "providers.connect" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("providers.connectedToHost")).not.toBeInTheDocument();
  });
});
