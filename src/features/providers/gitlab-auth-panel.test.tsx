import { GitLabAuthPanel } from "@/features/providers/gitlab-auth-panel";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

describe("GitLabAuthPanel", () => {
  it("saves provider settings and updates the status message", async () => {
    render(
      <GitLabAuthPanel
        connections={[]}
        onSaveConnection={async (input) => ({
          id: 1,
          provider: "GitLab",
          displayName: input.displayName ?? "My GitLab",
          host: input.host,
          clientId: input.clientId,
          state: "live",
          authMode: input.authMode,
          preferredScope: input.preferredScope,
          statusNote: "Saved",
          oauthReady: true,
          isPrimary: true,
        })}
        onBeginOAuth={async (input) => ({
          provider: "GitLab",
          sessionId: "session-1",
          authorizeUrl: `https://${input.host}/oauth/authorize`,
          redirectStrategy: "custom-scheme-first",
          message: "OAuth is staged.",
          scope: input.preferredScope,
          state: "state-1",
          callbackScheme: "pulseboard",
        })}
        onResolveCallback={async (sessionId, callbackUrl) => ({
          provider: "GitLab",
          host: "gitlab.acme.local",
          code: callbackUrl.includes("code=") ? "abc123" : "",
          state: "state-1",
          redirectUri: "pulseboard://auth/gitlab",
          codeVerifier: "verifier",
          sessionId,
        })}
      />,
    );

    fireEvent.change(screen.getByLabelText("GitLab host"), {
      target: { value: "gitlab.acme.local" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save provider setup" }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Saved My GitLab on gitlab.acme.local/i),
      ).toBeInTheDocument();
    });
  });

  it("shows callback validation messaging after starting oauth", async () => {
    render(
      <GitLabAuthPanel
        connections={[]}
        onSaveConnection={async (input) => ({
          id: 1,
          provider: "GitLab",
          displayName: input.displayName ?? "My GitLab",
          host: input.host,
          clientId: input.clientId,
          state: "live",
          authMode: input.authMode,
          preferredScope: input.preferredScope,
          statusNote: "Saved",
          oauthReady: true,
          isPrimary: true,
        })}
        onBeginOAuth={async (input) => ({
          provider: "GitLab",
          sessionId: "session-2",
          authorizeUrl: `https://${input.host}/oauth/authorize`,
          redirectStrategy: "custom-scheme-first",
          message: "OAuth is staged.",
          scope: input.preferredScope,
          state: "state-2",
          callbackScheme: "pulseboard",
        })}
        onResolveCallback={async (sessionId) => ({
          provider: "GitLab",
          host: "gitlab.com",
          code: "abc123",
          state: "state-2",
          redirectUri: "pulseboard://auth/gitlab",
          codeVerifier: "verifier",
          sessionId,
        })}
      />,
    );

    fireEvent.change(screen.getByLabelText("GitLab OAuth client ID"), {
      target: { value: "gitlab-client" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Open auth window" }));
    await waitFor(() => {
      expect(screen.getByText(/dedicated auth window/i)).toBeInTheDocument();
    });

    fireEvent.change(
      screen.getByPlaceholderText(/pulseboard:\/\/auth\/gitlab/i),
      {
        target: { value: "pulseboard://auth/gitlab?code=abc123&state=state-2" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Validate callback" }));

    await waitFor(() => {
      expect(screen.getByText(/Received code abc123/i)).toBeInTheDocument();
    });
  });

  it("reacts to deep-link event notifications", async () => {
    render(
      <GitLabAuthPanel
        connections={[]}
        onSaveConnection={async (input) => ({
          id: 1,
          provider: "GitLab",
          displayName: input.displayName ?? "My GitLab",
          host: input.host,
          clientId: input.clientId,
          state: "live",
          authMode: input.authMode,
          preferredScope: input.preferredScope,
          statusNote: "Saved",
          oauthReady: true,
          isPrimary: true,
        })}
        onBeginOAuth={async (input) => ({
          provider: "GitLab",
          sessionId: "session-3",
          authorizeUrl: `https://${input.host}/oauth/authorize`,
          redirectStrategy: "custom-scheme-first",
          message: "OAuth is staged.",
          scope: input.preferredScope,
          state: "state-3",
          callbackScheme: "pulseboard",
        })}
        onResolveCallback={async (sessionId) => ({
          provider: "GitLab",
          host: "gitlab.com",
          code: "abc123",
          state: "state-3",
          redirectUri: "pulseboard://auth/gitlab",
          codeVerifier: "verifier",
          sessionId,
        })}
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
      expect(
        screen.getByText(/Deep link received for gitlab.com/i),
      ).toBeInTheDocument();
    });
  });
});
