use std::time::Duration;

use tauri::{AppHandle, Emitter, State};

use crate::{
    domain::models::{BootstrapPayload, ScheduleInput, SyncResult},
    error::AppError,
    services::{dashboard, shared, sync},
    state::AppState,
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
    let primary = shared::load_primary_gitlab_connection(&connection)?;

    crate::db::bootstrap::upsert_schedule(
        &connection,
        primary.id,
        input.shift_start.as_deref(),
        input.shift_end.as_deref(),
        input.lunch_minutes,
        &input.workdays,
        &input.timezone,
    )
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
         DELETE FROM oauth_sessions;
         DELETE FROM projects;
         DELETE FROM provider_accounts;",
    )?;
    Ok(())
}
