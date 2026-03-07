use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapPayload {
    pub app_name: String,
    pub phase: String,
    pub demo_mode: bool,
    pub profile: ProfileSnapshot,
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
    pub workdays: String,
    pub timezone: String,
    pub sync_window: String,
    pub mode: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DayOverview {
    pub short_label: String,
    pub date_label: String,
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
