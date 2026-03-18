import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GitLabAuthPanel } from "@/features/providers/gitlab-auth-panel";
import { I18nProvider } from "@/lib/i18n";

const { mockOpenExternalUrl } = vi.hoisted(() => ({
  mockOpenExternalUrl: vi.fn(),
}));

vi.mock("@/lib/tauri", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tauri")>("@/lib/tauri");
  return {
    ...actual,
    openExternalUrl: mockOpenExternalUrl,
  };
});

function renderWithI18n(node: React.ReactNode) {
  return render(<I18nProvider>{node}</I18nProvider>);
}

const defaultSaveConnection = async (input: {
  host: string;
  displayName?: string;
  clientId?: string;
  authMode: string;
  preferredScope: string;
}) => ({
  id: 1,
  provider: "GitLab",
  displayName: input.displayName ?? "My GitLab",
  host: input.host,
  clientId: input.clientId,
  hasToken: false,
  state: "live" as const,
  authMode: input.authMode,
  preferredScope: input.preferredScope,
  statusNote: "Saved",
  oauthReady: true,
  isPrimary: true,
});

const defaultSavePat = async (host: string, _token: string) => ({
  id: 1,
  provider: "GitLab",
  displayName: host,
  host,
  hasToken: true,
  state: "live" as const,
  authMode: "PAT",
  preferredScope: "read_api",
  statusNote: "Connected via Personal Access Token.",
  oauthReady: true,
  isPrimary: true,
});

const defaultBeginOAuth = async (input: { host: string; preferredScope: string }) => ({
  provider: "GitLab",
  sessionId: "session-1",
  authorizeUrl: `https://${input.host}/oauth/authorize`,
  redirectStrategy: "custom-scheme-first",
  message: "PKCE session prepared.",
  scope: input.preferredScope,
  state: "state-1",
  callbackScheme: "timely",
});

const defaultResolveCallback = async (sessionId: string) => ({
  provider: "GitLab",
  host: "gitlab.com",
  code: "abc123",
  state: "state-1",
  redirectUri: "timely://auth/gitlab",
  codeVerifier: "verifier",
  sessionId,
});

describe("GitLabAuthPanel", () => {
  beforeEach(() => {
    mockOpenExternalUrl.mockClear();
  });

  it("shows PAT setup form by default when no connections exist", () => {
    renderWithI18n(
      <GitLabAuthPanel
        connections={[]}
        onSaveConnection={defaultSaveConnection}
        onSavePat={defaultSavePat}
        onBeginOAuth={defaultBeginOAuth}
        onResolveCallback={defaultResolveCallback}
      />,
    );

    expect(screen.getByText("Connect GitLab")).toBeInTheDocument();
    expect(screen.getByLabelText("GitLab host")).toBeInTheDocument();
    expect(screen.getByLabelText("Personal Access Token")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Connect with Token/i })).toBeInTheDocument();
  });

  it("starts OAuth flow when clicking connect button on OAuth tab", async () => {
    const onBeginOAuth = vi.fn().mockResolvedValue({
      provider: "GitLab",
      sessionId: "session-2",
      authorizeUrl: "https://gitlab.com/oauth/authorize",
      redirectStrategy: "custom-scheme-first",
      message: "PKCE session prepared.",
      scope: "read_api",
      state: "state-2",
      callbackScheme: "timely",
    });

    renderWithI18n(
      <GitLabAuthPanel
        connections={[]}
        onSaveConnection={defaultSaveConnection}
        onSavePat={defaultSavePat}
        onBeginOAuth={onBeginOAuth}
        onResolveCallback={defaultResolveCallback}
      />,
    );

    // Switch to OAuth tab
    fireEvent.click(screen.getByRole("button", { name: /^OAuth$/i }));

    fireEvent.change(screen.getByLabelText("OAuth Application ID"), {
      target: { value: "gitlab-client" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Connect with GitLab/i }));

    await waitFor(() => {
      expect(onBeginOAuth).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText(/Waiting for GitLab authorization/i)).toBeInTheDocument();
    });
  });

  it("shows connected state after deep-link callback", async () => {
    renderWithI18n(
      <GitLabAuthPanel
        connections={[]}
        onSaveConnection={defaultSaveConnection}
        onSavePat={defaultSavePat}
        onBeginOAuth={defaultBeginOAuth}
        onResolveCallback={defaultResolveCallback}
        onListenOAuthEvents={async (onSuccess) => {
          onSuccess({
            provider: "GitLab",
            host: "gitlab.com",
            code: "event-code",
            state: "state-3",
            redirectUri: "timely://auth/gitlab",
            codeVerifier: "verifier",
            sessionId: "session-3",
          });
          return () => {};
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Connected to/i)).toBeInTheDocument();
    });
  });

  it("shows a controlled error when OAuth event listener setup fails", async () => {
    renderWithI18n(
      <GitLabAuthPanel
        connections={[]}
        onSaveConnection={defaultSaveConnection}
        onSavePat={defaultSavePat}
        onBeginOAuth={defaultBeginOAuth}
        onResolveCallback={defaultResolveCallback}
        onListenOAuthEvents={async () => {
          throw new Error("oauth events unavailable");
        }}
      />,
    );

    expect(await screen.findByText(/OAuth callback failed: oauth events unavailable/i)).toBeInTheDocument();
  });

  it("switches to OAuth tab and shows application ID input", () => {
    renderWithI18n(
      <GitLabAuthPanel
        connections={[]}
        onSaveConnection={defaultSaveConnection}
        onSavePat={defaultSavePat}
        onBeginOAuth={defaultBeginOAuth}
        onResolveCallback={defaultResolveCallback}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /OAuth/i }));

    expect(screen.getByLabelText("OAuth Application ID")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Connect with GitLab/i })).toBeInTheDocument();
  });

  it("shows connected state for existing connection", () => {
    renderWithI18n(
      <GitLabAuthPanel
        connections={[
          {
            id: 1,
            provider: "GitLab",
            displayName: "My Workspace",
            host: "gitlab.example.com",
            clientId: "app-id",
            hasToken: false,
            state: "live",
            authMode: "OAuth PKCE + PAT fallback",
            preferredScope: "read_api",
            statusNote: "Connected",
            oauthReady: true,
            isPrimary: true,
          },
        ]}
        onSaveConnection={defaultSaveConnection}
        onSavePat={defaultSavePat}
        onBeginOAuth={defaultBeginOAuth}
        onResolveCallback={defaultResolveCallback}
      />,
    );

    expect(screen.getByText(/Connected to gitlab.example.com/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Disconnect/i })).toBeInTheDocument();
  });

  it("opens the PAT helper link in the system browser", async () => {
    renderWithI18n(
      <GitLabAuthPanel
        connections={[]}
        onSaveConnection={defaultSaveConnection}
        onSavePat={defaultSavePat}
        onBeginOAuth={defaultBeginOAuth}
        onResolveCallback={defaultResolveCallback}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Create one on gitlab.com/i }));

    await waitFor(() => {
      expect(mockOpenExternalUrl).toHaveBeenCalledWith(
        "https://gitlab.com/-/user_settings/personal_access_tokens?name=Timely&scopes=read_api",
      );
    });
  });

  it("opens the OAuth helper link in the system browser", async () => {
    renderWithI18n(
      <GitLabAuthPanel
        connections={[]}
        onSaveConnection={defaultSaveConnection}
        onSavePat={defaultSavePat}
        onBeginOAuth={defaultBeginOAuth}
        onResolveCallback={defaultResolveCallback}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^OAuth$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Create an OAuth app/i }));

    await waitFor(() => {
      expect(mockOpenExternalUrl).toHaveBeenCalledWith(
        "https://gitlab.com/-/user_settings/applications",
      );
    });
  });
});
