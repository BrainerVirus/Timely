import { mockBootstrap } from "@/lib/mock-data";
import type {
  AuthLaunchPlan,
  BootstrapPayload,
  GitLabConnectionInput,
  GitLabUserInfo,
  OAuthCallbackPayload,
  OAuthCallbackResolution,
  ProviderConnection,
  ScheduleInput,
  SyncResult,
} from "@/types/dashboard";

export async function loadBootstrapPayload(): Promise<BootstrapPayload> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<BootstrapPayload>("bootstrap_dashboard");
  } catch {
    return mockBootstrap;
  }
}

export async function listGitLabConnections(): Promise<ProviderConnection[]> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<ProviderConnection[]>("list_gitlab_connections");
  } catch {
    return [
      {
        id: 1,
        provider: "GitLab",
        displayName: "GitLab personal cockpit",
        host: "gitlab.com",
        clientId: undefined,
        hasToken: false,
        state: "live",
        authMode: "OAuth PKCE + PAT fallback",
        preferredScope: "read_api",
        statusNote: "Demo connection stored locally.",
        oauthReady: true,
        isPrimary: true,
      },
    ];
  }
}

export async function saveGitLabConnection(
  input: GitLabConnectionInput,
): Promise<ProviderConnection> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<ProviderConnection>("save_gitlab_connection", {
      input,
    });
  } catch {
    return {
      id: 1,
      provider: "GitLab",
      displayName: input.displayName ?? "GitLab workspace",
      host: input.host,
      clientId: input.clientId,
      hasToken: false,
      state: "live",
      authMode: input.authMode,
      preferredScope: input.preferredScope,
      statusNote: "Stored locally in fallback mode.",
      oauthReady: true,
      isPrimary: true,
    };
  }
}

export async function beginGitLabOAuth(
  input: GitLabConnectionInput,
): Promise<AuthLaunchPlan> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<AuthLaunchPlan>("begin_gitlab_oauth", { input });
  } catch {
    return {
      provider: "GitLab",
      sessionId: "fallback-session",
      authorizeUrl: `https://${input.host}/oauth/authorize`,
      redirectStrategy: "custom-scheme-first",
      message: "Fallback mode: OAuth launch plan is generated in the frontend.",
      scope: input.preferredScope,
      state: "fallback-state",
      callbackScheme: "pulseboard",
    };
  }
}

export async function resolveGitLabOAuthCallback(
  payload: OAuthCallbackPayload,
): Promise<OAuthCallbackResolution> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<OAuthCallbackResolution>(
      "resolve_gitlab_oauth_callback",
      { payload },
    );
  } catch {
    return {
      provider: "GitLab",
      host: "gitlab.com",
      code: "fallback-code",
      state: "fallback-state",
      redirectUri: "pulseboard://auth/gitlab",
      codeVerifier: "fallback-verifier",
      sessionId: payload.sessionId,
    };
  }
}

export async function saveGitLabPat(
  host: string,
  token: string,
): Promise<ProviderConnection> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<ProviderConnection>("save_gitlab_pat", {
      host,
      token,
    });
  } catch {
    return {
      id: 1,
      provider: "GitLab",
      displayName: host,
      host,
      hasToken: true,
      state: "live",
      authMode: "PAT",
      preferredScope: "read_api",
      statusNote: "Connected via Personal Access Token.",
      oauthReady: true,
      isPrimary: true,
    };
  }
}

export async function listenForGitLabOAuthCallback(
  onSuccess: (payload: OAuthCallbackResolution) => void,
  onError: (message: string) => void,
) {
  try {
    const { listen } = await import("@tauri-apps/api/event");
    const unlistenSuccess = await listen<OAuthCallbackResolution>(
      "gitlab-oauth-callback",
      (event) => {
        onSuccess(event.payload);
      },
    );
    const unlistenError = await listen<string>(
      "gitlab-oauth-callback-error",
      (event) => {
        onError(event.payload);
      },
    );

    return () => {
      unlistenSuccess();
      unlistenError();
    };
  } catch {
    return () => {};
  }
}

export async function validateGitLabToken(
  host: string,
): Promise<GitLabUserInfo> {
  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<GitLabUserInfo>("validate_gitlab_token", { host });
}

export async function syncGitLab(): Promise<SyncResult> {
  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<SyncResult>("sync_gitlab");
}

export async function updateSchedule(
  input: ScheduleInput,
): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("update_schedule", { input });
}

export async function updateTrayIcon(hoursRemaining: number): Promise<void> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("update_tray_icon", { hoursRemaining });
  } catch {
    // silently ignore in dev/browser mode
  }
}
