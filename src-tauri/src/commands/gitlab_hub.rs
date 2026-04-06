use std::time::{Duration, Instant};

use tauri::State;

use crate::{
    db,
    domain::models::{CreateGitLabIssueNoteInput, CreateGitLabTimelogInput},
    error::AppError,
    providers::gitlab::GitLabClient,
    services::shared,
    state::AppState,
    support::logging,
};

fn log_command_timing(state: &AppState, command: &str, started_at: Instant) {
    logging::info(format!(
        "[timely][boot] command:{command} finished in {}ms (boot {}ms)",
        started_at.elapsed().as_millis(),
        state.boot_elapsed_ms()
    ));
}

#[tauri::command]
pub async fn create_gitlab_timelog(
    state: State<'_, AppState>,
    input: CreateGitLabTimelogInput,
) -> Result<String, AppError> {
    let started_outer = Instant::now();
    let outcome = shared::run_blocking_with_timeout(
        &state,
        Duration::from_secs(120),
        "GitLab timelog create did not complete within 2 minutes",
        "gitlab_timelog",
        move |app_state| {
            let started_at = Instant::now();
            let connection = shared::open_connection(&app_state)?;
            let primary = shared::load_primary_gitlab_connection(&connection)?;
            let token = db::connection::load_gitlab_token(&connection, &primary.host)?.ok_or_else(
                || AppError::GitLabApi("No token found for primary connection.".to_string()),
            )?;
            let client = GitLabClient::new(&primary.host, &token)?;
            let id = client.create_issue_timelog(
                &input.issue_graphql_id,
                &input.time_spent,
                input.spent_at.as_deref(),
                input.summary.as_deref(),
            )?;
            log_command_timing(&app_state, "create_gitlab_timelog", started_at);
            Ok(id)
        },
    )
    .await;
    log_command_timing(&state, "create_gitlab_timelog_total", started_outer);
    outcome
}

#[tauri::command]
pub async fn create_gitlab_issue_note(
    state: State<'_, AppState>,
    input: CreateGitLabIssueNoteInput,
) -> Result<String, AppError> {
    let started_outer = Instant::now();
    let outcome = shared::run_blocking_with_timeout(
        &state,
        Duration::from_secs(120),
        "GitLab note create did not complete within 2 minutes",
        "gitlab_note",
        move |app_state| {
            let started_at = Instant::now();
            let connection = shared::open_connection(&app_state)?;
            let primary = shared::load_primary_gitlab_connection(&connection)?;
            let token = db::connection::load_gitlab_token(&connection, &primary.host)?.ok_or_else(
                || AppError::GitLabApi("No token found for primary connection.".to_string()),
            )?;
            let client = GitLabClient::new(&primary.host, &token)?;
            let id = client.create_issue_note(&input.issue_graphql_id, &input.body)?;
            log_command_timing(&app_state, "create_gitlab_issue_note", started_at);
            Ok(id)
        },
    )
    .await;
    log_command_timing(&state, "create_gitlab_issue_note_total", started_outer);
    outcome
}
