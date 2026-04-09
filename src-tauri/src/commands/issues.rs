use std::time::{Duration, Instant};

use tauri::State;

use crate::{
    domain::models::{
        CreateIssueCommentInput, IssueDetailsSnapshot, LogIssueTimeInput, UpdateIssueMetadataInput,
    },
    error::AppError,
    services::{issues, shared},
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
pub async fn load_issue_details(
    state: State<'_, AppState>,
    provider: String,
    issue_id: String,
) -> Result<IssueDetailsSnapshot, AppError> {
    let started_outer = Instant::now();
    let provider_value = provider.clone();
    let issue_id_value = issue_id.clone();
    let outcome = shared::run_blocking_with_timeout(
        &state,
        Duration::from_secs(120),
        "Issue details did not load within 2 minutes",
        "issue_details",
        move |app_state| issues::load_issue_details(&app_state, &provider_value, &issue_id_value),
    )
    .await;
    log_command_timing(&state, "load_issue_details", started_outer);
    outcome
}

#[tauri::command]
pub async fn update_issue_metadata(
    state: State<'_, AppState>,
    input: UpdateIssueMetadataInput,
) -> Result<IssueDetailsSnapshot, AppError> {
    let started_outer = Instant::now();
    let outcome = shared::run_blocking_with_timeout(
        &state,
        Duration::from_secs(120),
        "Issue metadata update did not complete within 2 minutes",
        "issue_metadata",
        move |app_state| issues::update_issue_metadata(&app_state, &input),
    )
    .await;
    log_command_timing(&state, "update_issue_metadata", started_outer);
    outcome
}

#[tauri::command]
pub async fn create_issue_comment(
    state: State<'_, AppState>,
    input: CreateIssueCommentInput,
) -> Result<String, AppError> {
    let started_outer = Instant::now();
    let outcome = shared::run_blocking_with_timeout(
        &state,
        Duration::from_secs(120),
        "Issue comment create did not complete within 2 minutes",
        "issue_comment",
        move |app_state| issues::create_issue_comment(&app_state, &input),
    )
    .await;
    log_command_timing(&state, "create_issue_comment", started_outer);
    outcome
}

#[tauri::command]
pub async fn log_issue_time(
    state: State<'_, AppState>,
    input: LogIssueTimeInput,
) -> Result<String, AppError> {
    let started_outer = Instant::now();
    let outcome = shared::run_blocking_with_timeout(
        &state,
        Duration::from_secs(120),
        "Issue time log did not complete within 2 minutes",
        "issue_timelog",
        move |app_state| issues::log_issue_time(&app_state, &input),
    )
    .await;
    log_command_timing(&state, "log_issue_time", started_outer);
    outcome
}
