use std::time::Duration;

use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindowBuilder};

use crate::{
    domain::models::{
        AuthLaunchPlan, GitLabConnectionInput, GitLabUserInfo, OAuthCallbackPayload,
        OAuthCallbackResolution, ProviderConnection,
    },
    error::AppError,
    services::auth,
    state::AppState,
};

#[tauri::command]
pub fn list_gitlab_connections(
    state: State<'_, AppState>,
) -> Result<Vec<ProviderConnection>, AppError> {
    auth::load_gitlab_connections(&state)
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
    let db_path = state.db_path.clone();
    let task = tokio::task::spawn_blocking(move || {
        let app_state = AppState::new(db_path);
        auth::validate_gitlab_token(&app_state, &host)
    });

    match tokio::time::timeout(Duration::from_secs(30), task).await {
        Ok(join_result) => join_result
            .map_err(|e| AppError::GitLabApi(format!("validation task failed: {e}")))?,
        Err(_) => Err(AppError::Timeout(
            "Token validation did not complete within 30 seconds".to_string(),
        )),
    }
}
