use tauri::State;

use crate::{
    domain::models::{BootstrapPayload, ScheduleInput, SyncResult},
    error::AppError,
    services::{dashboard, sync},
    state::AppState,
};

#[tauri::command]
pub fn bootstrap_dashboard(state: State<'_, AppState>) -> Result<BootstrapPayload, AppError> {
    dashboard::build_bootstrap_payload(&state)
}

#[tauri::command]
pub async fn sync_gitlab(state: State<'_, AppState>) -> Result<SyncResult, AppError> {
    let db_path = state.db_path.clone();
    tokio::task::spawn_blocking(move || {
        let app_state = AppState::new(db_path);
        sync::sync_gitlab(&app_state)
    })
    .await
    .map_err(|e| AppError::GitLabApi(format!("sync task failed: {e}")))?
}

#[tauri::command]
pub fn update_schedule(
    state: State<'_, AppState>,
    input: ScheduleInput,
) -> Result<(), AppError> {
    let connection = crate::db::open(&state.db_path)?;

    // Find primary provider account
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
