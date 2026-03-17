use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapPayload {
    pub app_name: String,
    pub phase: String,
    pub demo_mode: bool,
    pub profile: ProfileSnapshot,
    pub streak: StreakSnapshot,
    pub provider_status: Vec<ProviderStatus>,
    pub schedule: ScheduleSnapshot,
    pub today: DayOverview,
    pub week: Vec<DayOverview>,
    pub month: MonthSnapshot,
    pub audit_flags: Vec<AuditFlag>,
    pub quests: Vec<Quest>,
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
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleInput {
    pub shift_start: Option<String>,
    pub shift_end: Option<String>,
    pub lunch_minutes: Option<u32>,
    pub workdays: Vec<String>,
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

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppPreferences {
    pub theme_mode: String,
    pub language: String,
    pub holiday_country_mode: String,
    pub holiday_country_code: Option<String>,
    /// "hm" = 8h30min, "decimal" = 8.5h
    pub time_format: String,
    pub auto_sync_enabled: bool,
    /// Interval in minutes (15, 30, 60, 120, 240)
    pub auto_sync_interval_minutes: u32,
    pub onboarding_completed: bool,
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
