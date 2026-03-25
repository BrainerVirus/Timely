use std::time::{Duration, Instant};

use tauri::{AppHandle, Emitter, State};

use crate::{
    domain::models::{
        ActivateQuestInput, AppPreferences, BootstrapPayload, ClaimQuestRewardInput,
        EquipRewardInput, PlaySnapshot, PurchaseRewardInput, ScheduleInput, ScheduleRule,
        SetupState, SyncResult, UnequipRewardInput, WorklogQueryInput, WorklogSnapshot,
    },
    error::AppError,
    services::{dashboard, play, preferences, reminders, shared, sync, worklog},
    state::AppState,
    support::{holidays, logging},
};

pub const SYNC_PROGRESS_EVENT: &str = "sync-progress";
pub const APP_PREFERENCES_UPDATED_EVENT: &str = "app-preferences-updated";

fn log_command_timing(state: &AppState, command: &str, started_at: Instant) {
    logging::info(format!(
        "[timely][boot] command:{command} finished in {}ms (boot {}ms)",
        started_at.elapsed().as_millis(),
        state.boot_elapsed_ms()
    ));
}

#[tauri::command]
pub fn bootstrap_dashboard(state: State<'_, AppState>) -> Result<BootstrapPayload, AppError> {
    let started_at = Instant::now();
    let result = dashboard::build_bootstrap_payload(&state);
    log_command_timing(&state, "bootstrap_dashboard", started_at);
    result
}

#[tauri::command]
pub async fn sync_gitlab(
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<SyncResult, AppError> {
    let app_for_progress = app.clone();
    let outcome = shared::run_blocking_with_timeout(
        &state,
        Duration::from_secs(300),
        "GitLab sync did not complete within 5 minutes",
        "sync",
        move |app_state| {
            let mut progress_fn = |msg: String| {
                let _ = app_for_progress.emit(SYNC_PROGRESS_EVENT, &msg);
            };
            sync::sync_gitlab(&app_state, &mut progress_fn)
        },
    )
    .await;
    if outcome.is_ok() {
        reminders::kick_reminder_scheduler(&app);
    }
    outcome
}

#[tauri::command]
pub fn update_schedule(
    state: State<'_, AppState>,
    app: AppHandle,
    input: ScheduleInput,
) -> Result<(), AppError> {
    let connection = shared::open_connection(&state)?;
    let provider_id = shared::load_primary_gitlab_connection(&connection)
        .map(|p| p.id)
        .ok();

    crate::db::bootstrap::upsert_schedule(
        &connection,
        provider_id,
        input.shift_start.as_deref(),
        input.shift_end.as_deref(),
        input.lunch_minutes,
        &input.workdays,
        &input.timezone,
        input.week_start.as_deref(),
    )?;
    reminders::kick_reminder_scheduler(&app);
    Ok(())
}

#[tauri::command]
pub fn load_setup_state(state: State<'_, AppState>) -> Result<SetupState, AppError> {
    let started_at = Instant::now();
    let connection = shared::open_connection(&state)?;
    let result = preferences::load_setup_state(&connection);
    log_command_timing(&state, "load_setup_state", started_at);
    result
}

#[tauri::command]
pub async fn save_setup_state(
    state: State<'_, AppState>,
    setup_state: SetupState,
) -> Result<SetupState, AppError> {
    shared::run_blocking_with_timeout(
        &state,
        Duration::from_secs(10),
        "Setup progress did not save within 10 seconds",
        "save_setup_state",
        move |app_state| {
            let connection = shared::open_connection(&app_state)?;
            preferences::save_setup_state(&connection, &setup_state)
        },
    )
    .await
}

#[tauri::command]
pub fn load_app_preferences(state: State<'_, AppState>) -> Result<AppPreferences, AppError> {
    let started_at = Instant::now();
    let connection = shared::open_connection(&state)?;
    let result = preferences::load_app_preferences(&connection);
    log_command_timing(&state, "load_app_preferences", started_at);
    result
}

#[tauri::command]
pub fn load_worklog_snapshot(
    state: State<'_, AppState>,
    input: WorklogQueryInput,
) -> Result<WorklogSnapshot, AppError> {
    let started_at = Instant::now();
    let result = worklog::load_worklog_snapshot(&state, input);
    log_command_timing(&state, "load_worklog_snapshot", started_at);
    result
}

#[tauri::command]
pub fn save_app_preferences(
    state: State<'_, AppState>,
    app: AppHandle,
    preferences_input: AppPreferences,
) -> Result<AppPreferences, AppError> {
    let connection = shared::open_connection(&state)?;
    let persisted = preferences::save_app_preferences(&connection, &preferences_input)?;
    let _ = app.emit(APP_PREFERENCES_UPDATED_EVENT, &persisted);
    let _ = crate::tray::apply_saved_tray_preferences(&app);
    reminders::kick_reminder_scheduler(&app);
    Ok(persisted)
}

#[tauri::command]
pub fn notification_permission_state(app: AppHandle) -> Result<String, AppError> {
    Ok(reminders::notification_permission_label(&app))
}

#[tauri::command]
pub fn notification_request_permission(app: AppHandle) -> Result<String, AppError> {
    reminders::notification_request_permission(&app)
}

#[tauri::command]
pub fn notification_send_test(app: AppHandle, title: String, body: String) -> Result<(), AppError> {
    reminders::send_test_notification(&app, title, body)
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
pub fn activate_quest(
    state: State<'_, AppState>,
    input: ActivateQuestInput,
) -> Result<PlaySnapshot, AppError> {
    play::activate_quest(&state, input)
}

#[tauri::command]
pub fn claim_quest_reward(
    state: State<'_, AppState>,
    input: ClaimQuestRewardInput,
) -> Result<PlaySnapshot, AppError> {
    play::claim_quest_reward(&state, input)
}

#[tauri::command]
pub fn purchase_reward(
    state: State<'_, AppState>,
    input: PurchaseRewardInput,
) -> Result<PlaySnapshot, AppError> {
    play::purchase_reward(&state, input)
}

#[tauri::command]
pub fn equip_reward(
    state: State<'_, AppState>,
    input: EquipRewardInput,
) -> Result<PlaySnapshot, AppError> {
    play::equip_reward(&state, input)
}

#[tauri::command]
pub fn unequip_reward(
    state: State<'_, AppState>,
    input: UnequipRewardInput,
) -> Result<PlaySnapshot, AppError> {
    play::unequip_reward(&state, input)
}

#[tauri::command]
pub fn load_holiday_countries() -> Vec<holidays::HolidayCountryOption> {
    holidays::holiday_countries()
}

#[tauri::command]
pub fn load_holiday_year(country_code: String, year: i32) -> holidays::HolidayYearData {
    holidays::holiday_year(&country_code, year)
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
