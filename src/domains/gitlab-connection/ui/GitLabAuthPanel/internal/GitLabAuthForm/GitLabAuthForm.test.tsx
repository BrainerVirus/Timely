import { fireEvent, render, screen } from "@testing-library/react";
import { GitLabAuthForm } from "@/domains/gitlab-connection/ui/GitLabAuthPanel/internal/GitLabAuthForm/GitLabAuthForm";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: () => ({
    t: (key: string, values?: Record<string, string>) => {
      const translations: Record<string, string> = {
        "providers.connectGitLab": "Connect GitLab",
        "providers.linkGitLab": "Link GitLab",
        "providers.accessToken": "Access Token",
        "providers.quick": "Quick",
        "common.oauth": "OAuth",
        "providers.gitLabHost": "GitLab host",
        "providers.personalAccessToken": "Personal Access Token",
        "providers.needToken": "Need a token?",
        "providers.withReadApiScope": "with read_api scope.",
        "providers.oauthAppId": "OAuth Application ID",
        "providers.createOAuthApp": "Create an OAuth app",
        "providers.oauthScopes": "Use read_api.",
        "providers.waitingForAuthorization": "Waiting for GitLab authorization",
        "providers.completeSignIn": "Finish signing in.",
        "providers.pasteCallbackManually": "Paste callback manually",
        "providers.connectWithToken": "Connect with Token",
        "providers.connectWithGitLab": "Connect with GitLab",
        "common.syncing": "Syncing...",
      };

      if (key === "providers.createOneOn") {
        return `Create one on ${values?.host ?? ""}`;
      }

      return translations[key] ?? key;
    },
  }),
}));

vi.mock("@/app/desktop/TauriService/tauri", () => ({
  openExternalUrl: vi.fn(),
}));

describe("GitLabAuthForm", () => {
  it("renders the PAT form by default", () => {
    render(
      <GitLabAuthForm
        tab="pat"
        host="gitlab.com"
        clientId=""
        pat=""
        busy={false}
        phase={{ status: "idle" }}
        onTabChange={vi.fn()}
        onHostChange={vi.fn()}
        onClientIdChange={vi.fn()}
        onPatChange={vi.fn()}
        onConnectPat={vi.fn()}
        onConnectOAuth={vi.fn()}
        onResolveManual={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("GitLab host")).toBeInTheDocument();
    expect(screen.getByLabelText("Personal Access Token")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Connect with Token/i })).toBeInTheDocument();
  });

  it("renders the manual callback state for OAuth", () => {
    const onResolveManual = vi.fn();

    render(
      <GitLabAuthForm
        tab="oauth"
        host="gitlab.com"
        clientId="client-id"
        pat=""
        busy={true}
        phase={{
          status: "awaitingCallback",
          launchPlan: {
            provider: "GitLab",
            sessionId: "session-1",
            authorizeUrl: "https://gitlab.com/oauth/authorize",
            redirectStrategy: "custom-scheme-first",
            message: "PKCE session prepared.",
            scope: "read_api",
            state: "state-1",
            callbackScheme: "timely",
          },
        }}
        onTabChange={vi.fn()}
        onHostChange={vi.fn()}
        onClientIdChange={vi.fn()}
        onPatChange={vi.fn()}
        onConnectPat={vi.fn()}
        onConnectOAuth={vi.fn()}
        onResolveManual={onResolveManual}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Paste callback manually" }));

    expect(screen.getByText("Waiting for GitLab authorization")).toBeInTheDocument();
    expect(onResolveManual).toHaveBeenCalledTimes(1);
  });
});
