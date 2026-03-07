import { GitLabAuthPanel } from "@/features/providers/gitlab-auth-panel";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

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
  state: "live" as const,
  authMode: input.authMode,
  preferredScope: input.preferredScope,
  statusNote: "Saved",
  oauthReady: true,
  isPrimary: true,
});

const defaultBeginOAuth = async (input: {
  host: string;
  preferredScope: string;
}) => ({
  provider: "GitLab",
  sessionId: "session-1",
  authorizeUrl: `https://${input.host}/oauth/authorize`,
  redirectStrategy: "custom-scheme-first",
  message: "PKCE session prepared.",
  scope: input.preferredScope,
  state: "state-1",
  callbackScheme: "pulseboard",
});

const defaultResolveCallback = async (sessionId: string) => ({
  provider: "GitLab",
  host: "gitlab.com",
  code: "abc123",
  state: "state-1",
  redirectUri: "pulseboard://auth/gitlab",
  codeVerifier: "verifier",
  sessionId,
});

describe("GitLabAuthPanel", () => {
  it("shows setup form when no connections exist", () => {
    render(
      <GitLabAuthPanel
        connections={[]}
        onSaveConnection={defaultSaveConnection}
        onBeginOAuth={defaultBeginOAuth}
        onResolveCallback={defaultResolveCallback}
      />,
    );

    expect(screen.getByText("Connect GitLab")).toBeInTheDocument();
    expect(screen.getByLabelText("GitLab host")).toBeInTheDocument();
    expect(screen.getByLabelText("OAuth Application ID")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Connect with GitLab/i }),
    ).toBeInTheDocument();
  });

  it("starts OAuth flow when clicking connect button", async () => {
    const onBeginOAuth = vi.fn().mockResolvedValue({
      provider: "GitLab",
      sessionId: "session-2",
      authorizeUrl: "https://gitlab.com/oauth/authorize",
      redirectStrategy: "custom-scheme-first",
      message: "PKCE session prepared.",
      scope: "read_api",
      state: "state-2",
      callbackScheme: "pulseboard",
    });

    render(
      <GitLabAuthPanel
        connections={[]}
        onSaveConnection={defaultSaveConnection}
        onBeginOAuth={onBeginOAuth}
        onResolveCallback={defaultResolveCallback}
      />,
    );

    fireEvent.change(screen.getByLabelText("OAuth Application ID"), {
      target: { value: "gitlab-client" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Connect with GitLab/i }),
    );

    await waitFor(() => {
      expect(onBeginOAuth).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Waiting for GitLab authorization/i),
      ).toBeInTheDocument();
    });
  });

  it("shows connected state after deep-link callback", async () => {
    render(
      <GitLabAuthPanel
        connections={[]}
        onSaveConnection={defaultSaveConnection}
        onBeginOAuth={defaultBeginOAuth}
        onResolveCallback={defaultResolveCallback}
        onListenOAuthEvents={async (onSuccess) => {
          onSuccess({
            provider: "GitLab",
            host: "gitlab.com",
            code: "event-code",
            state: "state-3",
            redirectUri: "pulseboard://auth/gitlab",
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

  it("switches to PAT tab and shows token input", () => {
    render(
      <GitLabAuthPanel
        connections={[]}
        onSaveConnection={defaultSaveConnection}
        onBeginOAuth={defaultBeginOAuth}
        onResolveCallback={defaultResolveCallback}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Access Token/i }));

    expect(screen.getByLabelText("Personal Access Token")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Connect with Token/i }),
    ).toBeInTheDocument();
  });

  it("shows connected state for existing connection", () => {
    render(
      <GitLabAuthPanel
        connections={[
          {
            id: 1,
            provider: "GitLab",
            displayName: "My Workspace",
            host: "gitlab.example.com",
            clientId: "app-id",
            state: "live",
            authMode: "OAuth PKCE + PAT fallback",
            preferredScope: "read_api",
            statusNote: "Connected",
            oauthReady: true,
            isPrimary: true,
          },
        ]}
        onSaveConnection={defaultSaveConnection}
        onBeginOAuth={defaultBeginOAuth}
        onResolveCallback={defaultResolveCallback}
      />,
    );

    expect(screen.getByText(/Connected to gitlab.example.com/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Disconnect/i })).toBeInTheDocument();
  });
});
