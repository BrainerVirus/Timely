import { mockBootstrap } from "@/lib/mock-data";

import type {
  AppPreferences,
  AuthLaunchPlan,
  BootstrapPayload,
  GitLabConnectionInput,
  GitLabUserInfo,
  OAuthCallbackPayload,
  OAuthCallbackResolution,
  ProviderConnection,
  PlaySnapshot,
  HolidayCountryOption,
  HolidayPreviewItem,
  HolidayRegionOption,
  ScheduleInput,
  ScheduleRule,
  SetupState,
  SyncResult,
  WorklogQueryInput,
  WorklogSnapshot,
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

export async function beginGitLabOAuth(input: GitLabConnectionInput): Promise<AuthLaunchPlan> {
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

export async function saveGitLabPat(host: string, token: string): Promise<ProviderConnection> {
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
    const unlistenError = await listen<string>("gitlab-oauth-callback-error", (event) => {
      onError(event.payload);
    });

    return () => {
      unlistenSuccess();
      unlistenError();
    };
  } catch {
    return () => {};
  }
}

export async function validateGitLabToken(host: string): Promise<GitLabUserInfo> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<GitLabUserInfo>("validate_gitlab_token", { host });
}

export async function syncGitLab(): Promise<SyncResult> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<SyncResult>("sync_gitlab");
}

export async function listenSyncProgress(onLine: (line: string) => void): Promise<() => void> {
  if (!isTauri()) return () => {};
  try {
    const { listen } = await import("@tauri-apps/api/event");
    const unlisten = await listen<string>("sync-progress", (event) => {
      onLine(event.payload);
    });
    return unlisten;
  } catch {
    return () => {};
  }
}

export async function updateSchedule(input: ScheduleInput): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("update_schedule", { input });
}

export async function loadScheduleRules(): Promise<ScheduleRule[]> {
  if (!isTauri()) return [];
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<ScheduleRule[]>("load_schedule_rules");
}

export async function loadPlaySnapshot(): Promise<PlaySnapshot> {
  if (!isTauri()) {
    return {
      profile: mockBootstrap.profile,
      quests: [],
      tokens: 0,
      equippedCompanionMood: "calm",
      inventory: [],
    };
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<PlaySnapshot>("load_play_snapshot");
}

export async function loadHolidayCountries(): Promise<HolidayCountryOption[]> {
  if (!isTauri()) return [];
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<HolidayCountryOption[]>("load_holiday_countries");
}

export async function loadHolidayRegions(countryCode?: string): Promise<HolidayRegionOption[]> {
  if (!isTauri()) return [];
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<HolidayRegionOption[]>("load_holiday_regions", { countryCode });
}

export async function loadHolidayPreview(
  countryCode?: string,
  regionCode?: string,
): Promise<HolidayPreviewItem[]> {
  if (!isTauri()) return [];
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<HolidayPreviewItem[]>("load_holiday_preview", { countryCode, regionCode });
}

export async function loadSetupState(): Promise<SetupState> {
  if (!isTauri()) {
    return { currentStep: "welcome", isComplete: false, completedSteps: [] };
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<SetupState>("load_setup_state");
}

export async function saveSetupState(setupState: SetupState): Promise<SetupState> {
  if (!isTauri()) return setupState;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<SetupState>("save_setup_state", { setupState });
}

export async function loadAppPreferences(): Promise<AppPreferences> {
  if (!isTauri()) {
    return {
      themeMode: "system",
      language: "en",
      holidayCountryCode: undefined,
      holidayRegionCode: undefined,
    };
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<AppPreferences>("load_app_preferences");
}

export async function saveAppPreferences(preferencesInput: AppPreferences): Promise<AppPreferences> {
  if (!isTauri()) return preferencesInput;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<AppPreferences>("save_app_preferences", { preferencesInput });
}

export async function loadWorklogSnapshot(input: WorklogQueryInput): Promise<WorklogSnapshot> {
  if (!isTauri()) {
    return {
      mode: input.mode,
      range: {
        startDate: input.anchorDate,
        endDate: input.endDate ?? input.anchorDate,
        label: "Demo worklog",
      },
      selectedDay: mockBootstrap.today,
      days: mockBootstrap.week,
      month: mockBootstrap.month,
      auditFlags: mockBootstrap.auditFlags,
    };
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<WorklogSnapshot>("load_worklog_snapshot", { input });
}

export async function resetAllData(): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("reset_all_data");
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
