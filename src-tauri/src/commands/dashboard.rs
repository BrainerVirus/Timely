use std::time::Duration;

use tauri::{AppHandle, Emitter, State};

use crate::{
    domain::models::{
        AppPreferences, BootstrapPayload, PlaySnapshot, ScheduleInput, ScheduleRule, SetupState,
        SyncResult, WorklogQueryInput, WorklogSnapshot,
    },
    error::AppError,
    services::{dashboard, play, preferences, shared, sync, worklog},
    state::AppState,
    support::holidays,
};

pub const SYNC_PROGRESS_EVENT: &str = "sync-progress";

#[tauri::command]
pub fn bootstrap_dashboard(state: State<'_, AppState>) -> Result<BootstrapPayload, AppError> {
    dashboard::build_bootstrap_payload(&state)
}

#[tauri::command]
pub async fn sync_gitlab(
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<SyncResult, AppError> {
    shared::run_blocking_with_timeout(
        &state,
        Duration::from_secs(300),
        "GitLab sync did not complete within 5 minutes",
        "sync",
        move |app_state| {
            let mut progress_fn = |msg: String| {
                let _ = app.emit(SYNC_PROGRESS_EVENT, &msg);
            };
            sync::sync_gitlab(&app_state, &mut progress_fn)
        },
    )
    .await
}

#[tauri::command]
pub fn update_schedule(state: State<'_, AppState>, input: ScheduleInput) -> Result<(), AppError> {
    let connection = shared::open_connection(&state)?;
    let provider_id = shared::load_primary_gitlab_connection(&connection)
        .map(|p| p.id)
        .unwrap_or(0);

    crate::db::bootstrap::upsert_schedule(
        &connection,
        provider_id,
        input.shift_start.as_deref(),
        input.shift_end.as_deref(),
        input.lunch_minutes,
        &input.workdays,
        &input.timezone,
    )
}

#[tauri::command]
pub fn load_setup_state(state: State<'_, AppState>) -> Result<SetupState, AppError> {
    let connection = shared::open_connection(&state)?;
    preferences::load_setup_state(&connection)
}

#[tauri::command]
pub fn save_setup_state(
    state: State<'_, AppState>,
    setup_state: SetupState,
) -> Result<SetupState, AppError> {
    let connection = shared::open_connection(&state)?;
    preferences::save_setup_state(&connection, &setup_state)
}

#[tauri::command]
pub fn load_app_preferences(state: State<'_, AppState>) -> Result<AppPreferences, AppError> {
    let connection = shared::open_connection(&state)?;
    preferences::load_app_preferences(&connection)
}

#[tauri::command]
pub fn load_worklog_snapshot(
    state: State<'_, AppState>,
    input: WorklogQueryInput,
) -> Result<WorklogSnapshot, AppError> {
    worklog::load_worklog_snapshot(&state, input)
}

#[tauri::command]
pub fn save_app_preferences(
    state: State<'_, AppState>,
    preferences_input: AppPreferences,
) -> Result<AppPreferences, AppError> {
    let connection = shared::open_connection(&state)?;
    preferences::save_app_preferences(&connection, &preferences_input)
}

#[tauri::command]
pub fn load_schedule_rules(state: State<'_, AppState>) -> Result<Vec<ScheduleRule>, AppError> {
    let connection = shared::open_connection(&state)?;
    preferences::load_schedule_rules(&connection)
}

#[tauri::command]
pub fn load_play_snapshot(state: State<'_, AppState>) -> Result<PlaySnapshot, AppError> {
    play::load_play_snapshot(&state)
}

#[tauri::command]
pub fn load_holiday_countries() -> Vec<holidays::HolidayCountryOption> {
    holidays::holiday_countries()
}

#[tauri::command]
pub fn load_holiday_regions(country_code: Option<String>) -> Vec<holidays::HolidayRegionOption> {
    holidays::holiday_regions(country_code.as_deref())
}

#[tauri::command]
pub fn load_holiday_preview(
    country_code: Option<String>,
    region_code: Option<String>,
) -> Vec<holidays::HolidayPreviewItem> {
    holidays::holiday_preview(country_code.as_deref(), region_code.as_deref())
}

#[tauri::command]
pub fn reset_all_data(state: State<'_, AppState>) -> Result<(), AppError> {
    let connection = shared::open_connection(&state)?;
    connection.execute_batch(
        "DELETE FROM time_entries;
         DELETE FROM work_items;
         DELETE FROM daily_buckets;
         DELETE FROM sync_cursors;
         DELETE FROM gamification_profiles;
         DELETE FROM schedule_profiles;
         DELETE FROM app_preferences;
         DELETE FROM setup_state;
         DELETE FROM app_profile;
         DELETE FROM oauth_sessions;
         DELETE FROM projects;
         DELETE FROM provider_accounts;",
    )?;
    Ok(())
}
