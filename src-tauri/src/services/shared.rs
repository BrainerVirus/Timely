use std::time::Duration;

use rusqlite::Connection;

use crate::{db, domain::models::ProviderConnection, error::AppError, state::AppState};

pub fn open_connection(state: &AppState) -> Result<Connection, AppError> {
    db::open(&state.db_path)
}

pub fn load_primary_gitlab_connection(
    connection: &Connection,
) -> Result<ProviderConnection, AppError> {
    load_primary_connection(connection, "gitlab")
}

pub fn load_primary_connection(
    connection: &Connection,
    provider: &str,
) -> Result<ProviderConnection, AppError> {
    db::connection::load_provider_connections(connection)?
        .into_iter()
        .find(|connection| {
            connection.is_primary && connection.provider.eq_ignore_ascii_case(provider)
        })
        .ok_or_else(|| {
            AppError::ProviderApi(format!(
                "No primary connection found for provider \"{provider}\"."
            ))
        })
}

pub fn load_active_provider_connections(
    connection: &Connection,
) -> Result<Vec<ProviderConnection>, AppError> {
    Ok(db::connection::load_provider_connections(connection)?
        .into_iter()
        .filter(|provider| provider.has_token || provider.client_id.is_some())
        .collect())
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
            .map_err(|error| AppError::ProviderApi(format!("{task_name} task failed: {error}")))?,
        Err(_) => Err(AppError::Timeout(timeout_message.to_string())),
    }
}
