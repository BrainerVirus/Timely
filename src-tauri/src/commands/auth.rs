use std::time::{Duration, Instant};

use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindowBuilder};

use crate::{
    domain::models::{
        AuthLaunchPlan, GitLabConnectionInput, GitLabUserInfo, OAuthCallbackPayload,
        OAuthCallbackResolution, ProviderConnection,
    },
    error::AppError,
    services::{auth, shared},
    state::AppState,
    support::logging,
};

#[tauri::command]
pub fn list_gitlab_connections(
    state: State<'_, AppState>,
) -> Result<Vec<ProviderConnection>, AppError> {
    let started_at = Instant::now();
    let result = auth::load_gitlab_connections(&state);
    logging::info(format!(
        "[timely][boot] command:list_gitlab_connections finished in {}ms (boot {}ms)",
        started_at.elapsed().as_millis(),
        state.boot_elapsed_ms()
    ));
    result
}

#[tauri::command]
pub fn save_gitlab_connection(
    state: State<'_, AppState>,
    input: GitLabConnectionInput,
) -> Result<ProviderConnection, AppError> {
    auth::save_gitlab_connection(&state, input)
}

#[tauri::command]
pub fn save_gitlab_pat(
    state: State<'_, AppState>,
    host: String,
    token: String,
) -> Result<ProviderConnection, AppError> {
    auth::save_gitlab_pat(&state, &host, &token)
}

#[tauri::command]
pub fn begin_gitlab_oauth(
    app: AppHandle,
    state: State<'_, AppState>,
    input: GitLabConnectionInput,
) -> Result<AuthLaunchPlan, AppError> {
    let plan = auth::begin_gitlab_oauth(&state, input)?;

    if let Some(existing) = app.get_webview_window("gitlab-auth") {
        let _ = existing.close();
    }

    WebviewWindowBuilder::new(
        &app,
        "gitlab-auth",
        WebviewUrl::External(plan.authorize_url.parse()?),
    )
    .title("GitLab Sign In")
    .inner_size(980.0, 760.0)
    .center()
    .focused(true)
    .build()?;

    Ok(plan)
}

#[tauri::command]
pub fn resolve_gitlab_oauth_callback(
    state: State<'_, AppState>,
    payload: OAuthCallbackPayload,
) -> Result<OAuthCallbackResolution, AppError> {
    auth::resolve_gitlab_oauth_callback(&state, payload)
}

#[tauri::command]
pub async fn validate_gitlab_token(
    state: State<'_, AppState>,
    host: String,
) -> Result<GitLabUserInfo, AppError> {
    shared::run_blocking_with_timeout(
        &state,
        Duration::from_secs(30),
        "Token validation did not complete within 30 seconds",
        "validation",
        move |app_state| auth::validate_gitlab_token(&app_state, &host),
    )
    .await
}
