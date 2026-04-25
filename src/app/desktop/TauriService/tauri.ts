import { buildInfo } from "@/app/bootstrap/BuildInfo/build-info";

import type {
  ActivateQuestInput,
  AppPreferences,
  AppUpdateChannel,
  AppUpdateDownloadEvent,
  AppUpdateInfo,
  AssignedIssuesPage,
  AssignedIssuesQueryInput,
  AuthLaunchPlan,
  BootstrapPayload,
  ClaimQuestRewardInput,
  CreateIssueCommentInput,
  DeleteIssueInput,
  DeleteIssueCommentInput,
  IssueActivityPage,
  EquipRewardInput,
  GitLabConnectionInput,
  GitLabUserInfo,
  IssueDetailsSnapshot,
  LoadIssueActivityPageInput,
  LoadIssueDetailsInput,
  LoadIssueDetailsResponse,
  LogIssueTimeInput,
  NotificationDeliveryProfile,
  OAuthCallbackPayload,
  OAuthCallbackResolution,
  DiagnosticLogEntry,
  ProviderConnection,
  PlaySnapshot,
  PurchaseRewardInput,
  UnequipRewardInput,
  UpdateIssueCommentInput,
  UpdateIssueMetadataInput,
  HolidayCountryOption,
  HolidayYearData,
  ScheduleInput,
  SetupState,
  SyncResult,
  WorklogQueryInput,
  WorklogSnapshot,
} from "@/shared/types/dashboard";

/** True when running inside the Tauri webview (including tauri dev). */
function isTauri(): boolean {
  return globalThis.window !== undefined && "__TAURI_INTERNALS__" in globalThis;
}

function assertTauriRuntime(feature: string): void {
  if (!isTauri()) {
    throw new Error(`[timely] Tauri runtime required for ${feature}`);
  }
}

async function invokeTauri<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error(`[timely] Tauri runtime required for command: ${command}`);
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

export async function openExternalUrl(url: string): Promise<void> {
  if (!isTauri()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}

export async function loadBootstrapPayload(): Promise<BootstrapPayload> {
  return invokeTauri<BootstrapPayload>("bootstrap_dashboard");
}

export async function listGitLabConnections(): Promise<ProviderConnection[]> {
  return invokeTauri<ProviderConnection[]>("list_gitlab_connections");
}

export async function saveGitLabConnection(
  input: GitLabConnectionInput,
): Promise<ProviderConnection> {
  return invokeTauri<ProviderConnection>("save_gitlab_connection", { input });
}

export async function beginGitLabOAuth(input: GitLabConnectionInput): Promise<AuthLaunchPlan> {
  return invokeTauri<AuthLaunchPlan>("begin_gitlab_oauth", { input });
}

export async function resolveGitLabOAuthCallback(
  payload: OAuthCallbackPayload,
): Promise<OAuthCallbackResolution> {
  return invokeTauri<OAuthCallbackResolution>("resolve_gitlab_oauth_callback", {
    payload,
  });
}

export async function saveGitLabPat(host: string, token: string): Promise<ProviderConnection> {
  return invokeTauri<ProviderConnection>("save_gitlab_pat", { host, token });
}

export async function listenForGitLabOAuthCallback(
  onSuccess: (payload: OAuthCallbackResolution) => void,
  onError: (message: string) => void,
) {
  if (!isTauri()) {
    throw new Error("[timely] Tauri runtime required for GitLab OAuth callback events");
  }
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
  } catch (error) {
    const wrapped = new Error(
      getOptionalDesktopErrorMessage("GitLab OAuth callback events", error),
    );
    (wrapped as Error & { cause?: unknown }).cause = error;
    throw wrapped;
  }
}

export async function validateGitLabToken(host: string): Promise<GitLabUserInfo> {
  return invokeTauri<GitLabUserInfo>("validate_gitlab_token", { host });
}

export async function syncGitLab(): Promise<SyncResult> {
  return invokeTauri<SyncResult>("sync_gitlab");
}

function mergeIssueDetailsNotModified(
  base: IssueDetailsSnapshot,
  delta: Extract<LoadIssueDetailsResponse, { kind: "issueNotModified" }>,
): IssueDetailsSnapshot {
  return {
    ...base,
    activity: delta.activity,
    activityHasNextPage: delta.activityHasNextPage,
    activityNextPage: delta.activityNextPage ?? undefined,
    issueEtag: delta.issueEtag ?? base.issueEtag,
  };
}

async function invokeLoadIssueDetailsResponse(
  input: LoadIssueDetailsInput,
): Promise<LoadIssueDetailsResponse> {
  return invokeTauri<LoadIssueDetailsResponse>("load_issue_details", { input });
}

export async function loadIssueDetails(
  provider: string,
  issueId: string,
  options?: {
    ifNoneMatch?: string | null;
    mergeWith?: IssueDetailsSnapshot | null;
  },
): Promise<IssueDetailsSnapshot> {
  const raw = await invokeLoadIssueDetailsResponse({
    provider,
    issueId,
    ifNoneMatch: options?.ifNoneMatch ?? undefined,
  });
  if (raw.kind === "full") {
    return raw.snapshot;
  }
  const base = options?.mergeWith;
  if (base) {
    return mergeIssueDetailsNotModified(base, raw);
  }
  const fallback = await invokeLoadIssueDetailsResponse({
    provider,
    issueId,
    ifNoneMatch: undefined,
  });
  if (fallback.kind === "full") {
    return fallback.snapshot;
  }
  throw new Error("Could not load issue details (unexpected 304 without validators).");
}

export async function updateIssueMetadata(
  input: UpdateIssueMetadataInput,
): Promise<IssueDetailsSnapshot> {
  return invokeTauri<IssueDetailsSnapshot>("update_issue_metadata", { input });
}

export async function createIssueComment(input: CreateIssueCommentInput): Promise<string> {
  return invokeTauri<string>("create_issue_comment", { input });
}

export async function updateIssueComment(input: UpdateIssueCommentInput): Promise<void> {
  await invokeTauri<void>("update_issue_comment", { input });
}

export async function deleteIssueComment(input: DeleteIssueCommentInput): Promise<void> {
  await invokeTauri<void>("delete_issue_comment", { input });
}

export async function deleteIssue(input: DeleteIssueInput): Promise<void> {
  await invokeTauri<void>("delete_issue", { input });
}

export async function loadIssueActivityPage(
  input: LoadIssueActivityPageInput,
): Promise<IssueActivityPage> {
  return invokeTauri<IssueActivityPage>("load_issue_activity_page", { input });
}

export async function logIssueTime(input: LogIssueTimeInput): Promise<string> {
  return invokeTauri<string>("log_issue_time", { input });
}

export async function listenSyncProgress(onLine: (line: string) => void): Promise<() => void> {
  if (!isTauri()) {
    throw new Error("[timely] Tauri runtime required for sync progress events");
  }
  try {
    const { listen } = await import("@tauri-apps/api/event");
    const unlisten = await listen<string>("sync-progress", (event) => {
      onLine(event.payload);
    });
    return unlisten;
  } catch (error) {
    const wrapped = new Error(getOptionalDesktopErrorMessage("sync progress events", error));
    (wrapped as Error & { cause?: unknown }).cause = error;
    throw wrapped;
  }
}

export async function updateSchedule(input: ScheduleInput): Promise<void> {
  await invokeTauri<void>("update_schedule", { input });
}

export async function loadPlaySnapshot(): Promise<PlaySnapshot> {
  return invokeTauri<PlaySnapshot>("load_play_snapshot");
}

export async function activateQuest(input: ActivateQuestInput): Promise<PlaySnapshot> {
  return invokeTauri<PlaySnapshot>("activate_quest", { input });
}

export async function claimQuestReward(input: ClaimQuestRewardInput): Promise<PlaySnapshot> {
  return invokeTauri<PlaySnapshot>("claim_quest_reward", { input });
}

export async function purchaseReward(input: PurchaseRewardInput): Promise<PlaySnapshot> {
  return invokeTauri<PlaySnapshot>("purchase_reward", { input });
}

export async function equipReward(input: EquipRewardInput): Promise<PlaySnapshot> {
  return invokeTauri<PlaySnapshot>("equip_reward", { input });
}

export async function unequipReward(input: UnequipRewardInput): Promise<PlaySnapshot> {
  return invokeTauri<PlaySnapshot>("unequip_reward", { input });
}

export async function loadHolidayCountries(): Promise<HolidayCountryOption[]> {
  return invokeTauri<HolidayCountryOption[]>("load_holiday_countries");
}

export async function loadHolidayYear(countryCode: string, year: number): Promise<HolidayYearData> {
  return invokeTauri<HolidayYearData>("load_holiday_year", { countryCode, year });
}

export async function loadSetupState(): Promise<SetupState> {
  return invokeTauri<SetupState>("load_setup_state");
}

export async function saveSetupState(setupState: SetupState): Promise<SetupState> {
  return invokeTauri<SetupState>("save_setup_state", { setupState });
}

export async function loadAppPreferences(): Promise<AppPreferences> {
  return invokeTauri<AppPreferences>("load_app_preferences");
}

export async function saveAppPreferences(
  preferencesInput: AppPreferences,
): Promise<AppPreferences> {
  return invokeTauri<AppPreferences>("save_app_preferences", { preferencesInput });
}

export async function getNotificationPermissionState(): Promise<string> {
  return invokeTauri<string>("notification_permission_state");
}

export async function requestNotificationPermission(): Promise<string> {
  return invokeTauri<string>("notification_request_permission");
}

export async function getNotificationPermissionCapability(): Promise<string> {
  return invokeTauri<string>("notification_permission_capability");
}

export async function getNotificationDeliveryProfile(): Promise<NotificationDeliveryProfile> {
  return invokeTauri<NotificationDeliveryProfile>("notification_delivery_profile");
}

export async function openSystemNotificationSettings(): Promise<void> {
  await invokeTauri<void>("open_system_notification_settings");
}

export async function sendTestNotification(input: { title: string; body: string }): Promise<void> {
  await invokeTauri<void>("notification_send_test", {
    title: input.title,
    body: input.body,
  });
}

export async function listDiagnostics(
  input: { feature?: string; limit?: number } = {},
): Promise<DiagnosticLogEntry[]> {
  return invokeTauri<DiagnosticLogEntry[]>("diagnostics_list", {
    feature: input.feature,
    limit: input.limit ?? 200,
  });
}

export async function clearDiagnostics(feature?: string): Promise<void> {
  await invokeTauri<void>("diagnostics_clear", { feature });
}

export async function exportDiagnostics(
  input: { feature?: string; limit?: number } = {},
): Promise<string> {
  return invokeTauri<string>("diagnostics_export", {
    feature: input.feature,
    limit: input.limit ?? 500,
  });
}

export async function listNotificationDiagnostics(limit = 200): Promise<DiagnosticLogEntry[]> {
  return listDiagnostics({ feature: "notifications", limit });
}

export async function clearNotificationDiagnostics(): Promise<void> {
  await clearDiagnostics("notifications");
}

export async function exportNotificationDiagnostics(limit = 500): Promise<string> {
  return exportDiagnostics({ feature: "notifications", limit });
}

export async function listenAppPreferencesChanged(
  onMessage: (preferences: AppPreferences) => void,
): Promise<() => void> {
  if (!isTauri()) {
    return () => {};
  }

  return listenDesktopEvent<AppPreferences>("app-preferences-updated", onMessage);
}

export async function loadWorklogSnapshot(input: WorklogQueryInput): Promise<WorklogSnapshot> {
  return invokeTauri<WorklogSnapshot>("load_worklog_snapshot", { input });
}

export async function loadAssignedIssuesPage(
  input: AssignedIssuesQueryInput,
): Promise<AssignedIssuesPage> {
  return invokeTauri<AssignedIssuesPage>("load_assigned_issues_page", { input });
}

export async function resetAllData(): Promise<void> {
  await invokeTauri<void>("reset_all_data");
}

export async function updateTrayIcon(logged: number, target: number): Promise<void> {
  if (!isTauri()) return;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("update_tray_icon", { logged, target });
  } catch {
    // Tray icon update is non-critical.
  }
}

export async function checkForAppUpdateChannel(
  channel: AppUpdateChannel,
): Promise<AppUpdateInfo | null> {
  assertTauriRuntime(`update checks for the ${channel} channel`);
  return invokeTauri<AppUpdateInfo | null>("check_for_app_update", { channel });
}

export async function downloadAndInstallAppUpdate(
  channel: AppUpdateChannel,
  onEvent?: (event: AppUpdateDownloadEvent) => void,
): Promise<void> {
  assertTauriRuntime(`update installation for the ${channel} channel`);

  const { Channel } = await import("@tauri-apps/api/core");
  const eventChannel = new Channel<AppUpdateDownloadEvent>();
  eventChannel.onmessage = (event) => {
    onEvent?.(event);
  };

  await invokeTauri<void>("install_app_update", {
    channel,
    onEvent: eventChannel,
  });
}

export async function restartApp(): Promise<void> {
  assertTauriRuntime("app restart after installing an update");
  await invokeTauri<void>("restart_app");
}

export async function logFrontendBootTiming(message: string, elapsedMs: number): Promise<void> {
  if (buildInfo.logLevel === "off" || buildInfo.logLevel === "error") {
    return;
  }
  if (!isTauri()) return;
  await invokeTauri<void>("log_boot_timing", { message, elapsedMs });
}

export async function quitApp(): Promise<void> {
  if (!isTauri()) return;
  await invokeTauri<void>("quit_app");
}

export async function openSettingsWindow(): Promise<void> {
  if (!isTauri()) return;
  await invokeTauri<void>("open_settings");
}

export async function openAboutWindow(): Promise<void> {
  if (!isTauri()) return;
  await invokeTauri<void>("open_about");
}

export async function prewarmTrayWindow(): Promise<void> {
  if (!isTauri()) return;
  await invokeTauri<void>("prewarm_tray_window");
}

export async function listenDesktopEvent<T>(
  event: string,
  onMessage: (payload: T) => void,
): Promise<() => void> {
  if (!isTauri()) {
    throw new Error(`[timely] Tauri runtime required for desktop event: ${event}`);
  }
  try {
    const { listen } = await import("@tauri-apps/api/event");
    const unlisten = await listen<T>(event, (message) => {
      onMessage(message.payload);
    });
    return unlisten;
  } catch (error) {
    const wrapped = new Error(getOptionalDesktopErrorMessage(`desktop event: ${event}`, error));
    (wrapped as Error & { cause?: unknown }).cause = error;
    throw wrapped;
  }
}

function getOptionalDesktopErrorMessage(feature: string, error: unknown): string {
  const message =
    error instanceof Error && error.message.trim().length > 0 ? error.message : String(error);
  return `[timely] Failed to attach ${feature}: ${message}`;
}
