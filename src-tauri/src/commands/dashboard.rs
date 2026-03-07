use tauri::State;

use crate::{
    domain::models::BootstrapPayload, error::AppError, services::dashboard, state::AppState,
};

#[tauri::command]
pub fn bootstrap_dashboard(state: State<'_, AppState>) -> Result<BootstrapPayload, AppError> {
    dashboard::build_bootstrap_payload(&state)
}
