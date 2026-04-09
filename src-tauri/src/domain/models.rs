use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapPayload {
    pub app_name: String,
    pub phase: String,
    pub demo_mode: bool,
    pub last_synced_at: Option<String>,
    pub profile: ProfileSnapshot,
    pub streak: StreakSnapshot,
    pub provider_status: Vec<ProviderStatus>,
    pub schedule: ScheduleSnapshot,
    pub today: DayOverview,
    pub week: Vec<DayOverview>,
    pub month: MonthSnapshot,
    pub audit_flags: Vec<AuditFlag>,
    pub quests: Vec<Quest>,
    pub assigned_issues: Vec<AssignedIssueSnapshot>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConnection {
    pub id: i64,
    pub provider: String,
    pub display_name: String,
    pub host: String,
    pub username: Option<String>,
    pub client_id: Option<String>,
    pub has_token: bool,
    pub state: String,
    pub auth_mode: String,
    pub preferred_scope: String,
    pub status_note: String,
    pub oauth_ready: bool,
    pub is_primary: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitLabConnectionInput {
    pub host: String,
    pub auth_mode: String,
    pub preferred_scope: String,
    pub display_name: Option<String>,
    pub client_id: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthLaunchPlan {
    pub provider: String,
    pub session_id: String,
    pub authorize_url: String,
    pub redirect_strategy: String,
    pub message: String,
    pub scope: String,
    pub state: String,
    pub callback_scheme: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OAuthSession {
    pub session_id: String,
    pub provider: String,
    pub host: String,
    pub state: String,
    pub code_verifier: String,
    pub code_challenge: String,
    pub scope: String,
    pub redirect_uri: String,
    pub created_at: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OAuthCallbackPayload {
    pub session_id: String,
    pub callback_url: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OAuthCallbackResolution {
    pub provider: String,
    pub host: String,
    pub code: String,
    pub state: String,
    pub redirect_uri: String,
    pub code_verifier: String,
    pub session_id: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationDeliveryProfile {
    pub platform: String,
    pub product_name: String,
    pub identifier: String,
    pub linux_desktop_entry: String,
    pub timeout_ms: u32,
    pub windows_app_id_active: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileSnapshot {
    pub alias: String,
    pub level: u8,
    pub xp: u16,
    pub streak_days: u8,
    pub companion: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreakSnapshot {
    pub current_days: u8,
    pub window: Vec<StreakDaySnapshot>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreakDaySnapshot {
    pub date: String,
    pub state: String,
    pub is_today: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderStatus {
    pub name: String,
    pub state: String,
    pub host: String,
    pub auth_mode: String,
    pub note: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleSnapshot {
    pub hours_per_day: f32,
    pub shift_start: Option<String>,
    pub shift_end: Option<String>,
    pub lunch_minutes: Option<u32>,
    pub workdays: String,
    pub timezone: String,
    pub week_start: Option<String>,
    pub weekday_schedules: Vec<WeekdaySchedule>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WeekdaySchedule {
    pub day: String,
    pub enabled: bool,
    pub shift_start: String,
    pub shift_end: String,
    pub lunch_minutes: u32,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DayOverview {
    pub date: String,
    pub short_label: String,
    pub date_label: String,
    pub is_today: bool,
    pub holiday_name: Option<String>,
    pub logged_hours: f32,
    pub target_hours: f32,
    pub focus_hours: f32,
    pub overflow_hours: f32,
    pub status: String,
    pub top_issues: Vec<IssueBreakdown>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueBreakdown {
    pub key: String,
    pub title: String,
    pub hours: f32,
    pub tone: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonthSnapshot {
    pub logged_hours: f32,
    pub target_hours: f32,
    pub consistency_score: u8,
    pub clean_days: u8,
    pub overflow_days: u8,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditFlag {
    pub title: String,
    pub severity: String,
    pub detail: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Quest {
    pub title: String,
    pub progress: u8,
    pub total: u8,
    pub reward: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitLabUserInfo {
    pub username: String,
    pub name: String,
    pub avatar_url: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncResult {
    pub projects_synced: u32,
    pub entries_synced: u32,
    pub issues_synced: u32,
    pub assigned_issues_synced: u32,
}

/// Row built from GitLab assigned-issues sync (local DB upsert).
#[derive(Clone, Debug)]
pub struct AssignedIssueRecord {
    pub issue_graphql_id: String,
    pub provider_item_id: String,
    pub title: String,
    pub state: String,
    pub closed_at: Option<String>,
    pub web_url: Option<String>,
    pub labels: Vec<String>,
    pub milestone_title: Option<String>,
    pub iteration_gitlab_id: Option<String>,
    pub iteration_group_id: Option<String>,
    pub iteration_cadence_id: Option<String>,
    pub iteration_cadence_title: Option<String>,
    pub iteration_title: Option<String>,
    /// GitLab iteration start (YYYY-MM-DD) when GraphQL exposes it.
    pub iteration_start_date: Option<String>,
    /// GitLab iteration due/end (YYYY-MM-DD) when GraphQL exposes it.
    pub iteration_due_date: Option<String>,
}

/// Assigned issues shown on Home / Issues board (from local cache after sync).
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssignedIssueSnapshot {
    pub provider: String,
    pub issue_id: String,
    pub provider_issue_ref: String,
    pub key: String,
    pub title: String,
    pub state: String,
    pub closed_at: Option<String>,
    pub web_url: Option<String>,
    pub labels: Vec<String>,
    pub milestone_title: Option<String>,
    pub iteration_gitlab_id: Option<String>,
    pub iteration_group_id: Option<String>,
    pub iteration_cadence_id: Option<String>,
    pub iteration_cadence_title: Option<String>,
    pub iteration_title: Option<String>,
    pub iteration_start_date: Option<String>,
    pub iteration_due_date: Option<String>,
    pub assigned_bucket: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CachedIterationRecord {
    pub iteration_gitlab_id: String,
    pub cadence_id: Option<String>,
    pub cadence_title: Option<String>,
    pub title: Option<String>,
    pub start_date: Option<String>,
    pub due_date: Option<String>,
    pub state: Option<String>,
    pub web_url: Option<String>,
    pub group_id: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueReference {
    pub provider: String,
    pub issue_id: String,
    pub provider_issue_ref: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueActor {
    pub name: String,
    pub username: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueMetadataOption {
    pub id: String,
    pub label: String,
    pub color: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueMetadataCapability {
    pub enabled: bool,
    pub reason: Option<String>,
    pub options: Vec<IssueMetadataOption>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueComposerCapabilities {
    pub enabled: bool,
    pub modes: Vec<String>,
    pub supports_quick_actions: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueTimeTrackingCapabilities {
    pub enabled: bool,
    pub supports_quick_actions: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueDetailsCapabilities {
    pub status: IssueMetadataCapability,
    pub labels: IssueMetadataCapability,
    pub iteration: IssueMetadataCapability,
    pub composer: IssueComposerCapabilities,
    pub time_tracking: IssueTimeTrackingCapabilities,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueActivityItem {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub body: String,
    pub created_at: String,
    pub updated_at: Option<String>,
    pub system: bool,
    pub author: Option<IssueActor>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueDetailsSnapshot {
    pub reference: IssueReference,
    pub key: String,
    pub title: String,
    pub state: String,
    pub web_url: Option<String>,
    pub description: Option<String>,
    pub labels: Vec<IssueMetadataOption>,
    pub milestone_title: Option<String>,
    pub iteration: Option<IssueMetadataOption>,
    pub activity: Vec<IssueActivityItem>,
    pub capabilities: IssueDetailsCapabilities,
}

#[allow(dead_code)]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssignedIssuesPeriodInput {
    pub start: String,
    pub end: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssignedIssuesQueryInput {
    pub cursor: Option<String>,
    pub page: usize,
    pub page_size: usize,
    pub status: String,
    pub year: Option<String>,
    pub iteration_id: Option<String>,
    pub search: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssignedIssueSuggestion {
    pub value: String,
    pub label: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssignedIssuesIterationOption {
    pub id: String,
    pub label: String,
    pub badge: Option<String>,
    pub search_text: String,
    pub year: Option<String>,
    pub start_date: Option<String>,
    pub due_date: Option<String>,
    pub is_current: bool,
    pub issue_count: u32,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssignedIssuesPage {
    pub items: Vec<AssignedIssueSnapshot>,
    pub has_next_page: bool,
    pub end_cursor: Option<String>,
    pub suggestions: Vec<AssignedIssueSuggestion>,
    pub years: Vec<String>,
    pub iteration_options: Vec<AssignedIssuesIterationOption>,
    pub catalog_state: String,
    pub catalog_message: Option<String>,
    pub page: usize,
    pub page_size: usize,
    pub total_items: usize,
    pub total_pages: usize,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogIssueTimeInput {
    pub reference: IssueReference,
    pub time_spent: String,
    pub spent_at: Option<String>,
    pub summary: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateIssueCommentInput {
    pub reference: IssueReference,
    pub body: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateIssueMetadataInput {
    pub reference: IssueReference,
    pub state: Option<String>,
    pub labels: Option<Vec<String>>,
    pub iteration_id: Option<Option<String>>,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleInput {
    pub weekday_schedules: Vec<WeekdaySchedule>,
    pub timezone: String,
    pub week_start: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetupState {
    pub current_step: String,
    pub is_complete: bool,
    pub completed_steps: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct NotificationThresholdToggles {
    #[serde(rename = "minutes45")]
    pub minutes_45: bool,
    #[serde(rename = "minutes30")]
    pub minutes_30: bool,
    #[serde(rename = "minutes15")]
    pub minutes_15: bool,
    #[serde(rename = "minutes5")]
    pub minutes_5: bool,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppPreferences {
    pub theme_mode: String,
    pub motion_preference: String,
    pub language: String,
    pub update_channel: String,
    pub last_installed_version: Option<String>,
    pub last_seen_release_highlights_version: Option<String>,
    pub holiday_country_mode: String,
    pub holiday_country_code: Option<String>,
    /// "hm" = 8h30min, "decimal" = 8.5h
    pub time_format: String,
    pub auto_sync_enabled: bool,
    /// Interval in minutes (15, 30, 60, 120, 240)
    pub auto_sync_interval_minutes: u32,
    pub tray_enabled: bool,
    pub close_to_tray: bool,
    pub onboarding_completed: bool,
    pub notifications_enabled: bool,
    pub notification_thresholds: NotificationThresholdToggles,
    #[serde(default)]
    pub notification_permission_requested: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticLogEntry {
    pub id: i64,
    pub timestamp: String,
    pub day_key: String,
    pub level: String,
    pub feature: String,
    pub source: String,
    pub event: String,
    pub platform: String,
    pub message: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpdateInfo {
    pub current_version: String,
    pub version: String,
    pub channel: String,
    pub date: Option<String>,
    pub body: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "event", content = "data")]
pub enum AppUpdateDownloadEvent {
    #[serde(rename_all = "camelCase")]
    Started {
        content_length: Option<u64>,
    },
    #[serde(rename_all = "camelCase")]
    Progress {
        chunk_length: usize,
    },
    Finished,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleRule {
    pub rule_type: String,
    pub rule_value: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GamificationQuestSummary {
    pub quest_key: String,
    pub title: String,
    pub description: String,
    pub reward_label: String,
    pub target_value: u32,
    pub progress_value: u32,
    pub cadence: String,
    pub category: String,
    pub is_active: bool,
    pub is_claimed: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivateQuestInput {
    pub quest_key: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaimQuestRewardInput {
    pub quest_key: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PurchaseRewardInput {
    pub reward_key: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EquipRewardInput {
    pub reward_key: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UnequipRewardInput {
    pub reward_key: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorklogQueryInput {
    pub mode: String,
    pub anchor_date: String,
    pub end_date: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorklogRangeMeta {
    pub start_date: String,
    pub end_date: String,
    pub label: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorklogSnapshot {
    pub mode: String,
    pub range: WorklogRangeMeta,
    pub selected_day: DayOverview,
    pub days: Vec<DayOverview>,
    pub month: MonthSnapshot,
    pub audit_flags: Vec<AuditFlag>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaySnapshot {
    pub profile: ProfileSnapshot,
    pub streak: StreakSnapshot,
    pub quests: Vec<GamificationQuestSummary>,
    pub tokens: u32,
    pub equipped_companion_mood: CompanionMood,
    pub store_catalog: Vec<RewardCatalogItem>,
    pub inventory: Vec<RewardInventoryItem>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CompanionMood {
    Calm,
    Curious,
    Focused,
    Happy,
    Excited,
    Cozy,
    Playful,
    Tired,
    Drained,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RewardInventoryItem {
    pub reward_key: String,
    pub reward_name: String,
    pub reward_type: String,
    pub accessory_slot: String,
    pub environment_scene_key: Option<String>,
    pub theme_tag: Option<String>,
    pub cost_tokens: u32,
    pub owned: bool,
    pub equipped: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RewardCatalogItem {
    pub reward_key: String,
    pub reward_name: String,
    pub reward_type: String,
    pub accessory_slot: String,
    pub companion_variant: Option<String>,
    pub environment_scene_key: Option<String>,
    pub theme_tag: Option<String>,
    pub cost_tokens: u32,
    pub owned: bool,
    pub equipped: bool,
    pub unlocked: bool,
    pub unlock_hint: Option<String>,
    pub unlock_hint_key: Option<String>,
    pub featured: bool,
    pub rarity: String,
    pub store_section: String,
}
