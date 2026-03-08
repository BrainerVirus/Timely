use std::time::Duration;

use rusqlite::Connection;

use crate::{db, domain::models::ProviderConnection, error::AppError, state::AppState};

const PRIMARY_GITLAB_CONNECTION_ERROR: &str = "No primary GitLab connection found.";

pub fn open_connection(state: &AppState) -> Result<Connection, AppError> {
    db::open(&state.db_path)
}

pub fn load_primary_gitlab_connection(
    connection: &Connection,
) -> Result<ProviderConnection, AppError> {
    db::connection::load_gitlab_connections(connection)?
        .into_iter()
        .find(|connection| connection.is_primary)
        .ok_or_else(|| AppError::GitLabApi(PRIMARY_GITLAB_CONNECTION_ERROR.to_string()))
}

pub async fn run_blocking_with_timeout<T, F>(
    state: &AppState,
    timeout: Duration,
    timeout_message: &str,
    task_name: &str,
    operation: F,
) -> Result<T, AppError>
where
    T: Send + 'static,
    F: FnOnce(AppState) -> Result<T, AppError> + Send + 'static,
{
    let task_state = state.clone();
    let task = tokio::task::spawn_blocking(move || operation(task_state));

    match tokio::time::timeout(timeout, task).await {
        Ok(join_result) => join_result
            .map_err(|error| AppError::GitLabApi(format!("{task_name} task failed: {error}")))?,
        Err(_) => Err(AppError::Timeout(timeout_message.to_string())),
    }
}
