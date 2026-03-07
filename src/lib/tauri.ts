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

/** True when running inside the Tauri webview (including tauri dev). */
function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function loadBootstrapPayload(): Promise<BootstrapPayload> {
  if (!isTauri()) return mockBootstrap;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<BootstrapPayload>("bootstrap_dashboard");
}

export async function listGitLabConnections(): Promise<ProviderConnection[]> {
  if (!isTauri()) return [];
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<ProviderConnection[]>("list_gitlab_connections");
}

export async function saveGitLabConnection(
  input: GitLabConnectionInput,
): Promise<ProviderConnection> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<ProviderConnection>("save_gitlab_connection", { input });
}

export async function beginGitLabOAuth(
  input: GitLabConnectionInput,
): Promise<AuthLaunchPlan> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<AuthLaunchPlan>("begin_gitlab_oauth", { input });
}

export async function resolveGitLabOAuthCallback(
  payload: OAuthCallbackPayload,
): Promise<OAuthCallbackResolution> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<OAuthCallbackResolution>("resolve_gitlab_oauth_callback", {
    payload,
  });
}

export async function saveGitLabPat(
  host: string,
  token: string,
): Promise<ProviderConnection> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<ProviderConnection>("save_gitlab_pat", { host, token });
}

export async function listenForGitLabOAuthCallback(
  onSuccess: (payload: OAuthCallbackResolution) => void,
  onError: (message: string) => void,
) {
  if (!isTauri()) return () => {};
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
  return invoke<GitLabUserInfo>("validate_gitlab_token", { host });
}

export async function syncGitLab(): Promise<SyncResult> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<SyncResult>("sync_gitlab");
}

export async function updateSchedule(input: ScheduleInput): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("update_schedule", { input });
}

export async function updateTrayIcon(hoursRemaining: number): Promise<void> {
  if (!isTauri()) return;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("update_tray_icon", { hoursRemaining });
  } catch {
    // Tray icon update is non-critical
  }
}
