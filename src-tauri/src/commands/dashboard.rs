use std::time::Duration;

use tauri::{AppHandle, Emitter, State};

use crate::{
    domain::models::{BootstrapPayload, ScheduleInput, SyncResult},
    error::AppError,
    services::{dashboard, sync},
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
    let db_path = state.db_path.clone();
    let task = tokio::task::spawn_blocking(move || {
        let app_state = AppState::new(db_path);
        let mut progress_fn = |msg: String| {
            let _ = app.emit(SYNC_PROGRESS_EVENT, &msg);
        };
        sync::sync_gitlab(&app_state, &mut progress_fn)
    });

    match tokio::time::timeout(Duration::from_secs(300), task).await {
        Ok(join_result) => {
            join_result.map_err(|e| AppError::GitLabApi(format!("sync task failed: {e}")))?
        }
        Err(_) => Err(AppError::Timeout(
            "GitLab sync did not complete within 5 minutes".to_string(),
        )),
    }
}

#[tauri::command]
pub fn update_schedule(state: State<'_, AppState>, input: ScheduleInput) -> Result<(), AppError> {
    let connection = crate::db::open(&state.db_path)?;

    let connections = crate::db::connection::load_gitlab_connections(&connection)?;
    let primary = connections
        .into_iter()
        .find(|c| c.is_primary)
        .ok_or_else(|| AppError::GitLabApi("no primary connection found".to_string()))?;

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
    let connection = crate::db::open(&state.db_path)?;
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
