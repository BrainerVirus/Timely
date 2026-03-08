use crate::{
    auth, db,
    domain::models::{
        AuthLaunchPlan, GitLabConnectionInput, GitLabUserInfo, OAuthCallbackPayload,
        OAuthCallbackResolution, ProviderConnection,
    },
    error::AppError,
    providers::gitlab::GitLabClient,
    services::shared,
    state::AppState,
};

pub fn save_gitlab_connection(
    state: &AppState,
    input: GitLabConnectionInput,
) -> Result<ProviderConnection, AppError> {
    let connection = shared::open_connection(state)?;
    db::connection::upsert_gitlab_connection(
        &connection,
        &input.host,
        input.display_name.as_deref(),
        input.client_id.as_deref(),
        &input.auth_mode,
        &input.preferred_scope,
    )
}

pub fn load_gitlab_connections(state: &AppState) -> Result<Vec<ProviderConnection>, AppError> {
    let connection = shared::open_connection(state)?;
    db::connection::load_gitlab_connections(&connection)
}

pub fn save_gitlab_pat(
    state: &AppState,
    host: &str,
    token: &str,
) -> Result<ProviderConnection, AppError> {
    let connection = shared::open_connection(state)?;
    db::connection::save_gitlab_pat(&connection, host, token)
}

pub fn begin_gitlab_oauth(
    state: &AppState,
    input: GitLabConnectionInput,
) -> Result<AuthLaunchPlan, AppError> {
    let connection = shared::open_connection(state)?;
    let (session, plan) = auth::create_gitlab_oauth_session(&input)?;
    db::oauth::store_session(&connection, &session)?;
    Ok(plan)
}

pub fn resolve_gitlab_oauth_callback(
    state: &AppState,
    payload: OAuthCallbackPayload,
) -> Result<OAuthCallbackResolution, AppError> {
    let connection = shared::open_connection(state)?;
    let session = db::oauth::load_session(&connection, &payload.session_id)?
        .ok_or_else(|| AppError::InvalidAuthCallback("unknown oauth session".to_string()))?;

    let resolution = auth::resolve_gitlab_callback(&session, &payload.callback_url)?;
    db::oauth::delete_session(&connection, &payload.session_id)?;
    Ok(resolution)
}

pub fn resolve_gitlab_oauth_callback_url(
    state: &AppState,
    callback_url: &str,
) -> Result<OAuthCallbackResolution, AppError> {
    let connection = shared::open_connection(state)?;
    let parsed = url::Url::parse(callback_url).map_err(|error| {
        AppError::InvalidAuthCallback(format!("could not parse callback url: {error}"))
    })?;

    let state_value = parsed
        .query_pairs()
        .find(|(key, _)| key == "state")
        .map(|(_, value)| value.to_string())
        .ok_or_else(|| AppError::InvalidAuthCallback("missing state".to_string()))?;

    let session = db::oauth::load_session_by_state(&connection, &state_value)?
        .ok_or_else(|| AppError::InvalidAuthCallback("unknown oauth state".to_string()))?;
    let resolution = auth::resolve_gitlab_callback(&session, callback_url)?;
    db::oauth::delete_session(&connection, &session.session_id)?;
    Ok(resolution)
}

pub fn validate_gitlab_token(state: &AppState, host: &str) -> Result<GitLabUserInfo, AppError> {
    let connection = shared::open_connection(state)?;
    let token = db::connection::load_gitlab_token(&connection, host)?
        .ok_or_else(|| AppError::GitLabApi("no token found for this host".to_string()))?;

    let client = GitLabClient::new(host, &token)?;
    let user = client.fetch_user()?;

    db::connection::update_username(&connection, host, &user.username)?;

    Ok(GitLabUserInfo {
        username: user.username,
        name: user.name,
        avatar_url: user.avatar_url,
    })
}

#[cfg(test)]
mod tests {
    use std::{env, path::PathBuf};

    use rusqlite::Connection;

    use crate::{db, domain::models::GitLabConnectionInput, state::AppState};

    use super::*;

    fn make_state() -> AppState {
        let mut path = env::temp_dir();
        path.push(format!(
            "timely-auth-test-{}-{}.sqlite3",
            std::process::id(),
            rand::random::<u64>()
        ));
        let _ = std::fs::remove_file(&path);

        let connection = Connection::open(&path).unwrap();
        db::migrate(&connection).unwrap();
        drop(connection);

        AppState::new(PathBuf::from(path))
    }

    #[test]
    fn begins_and_resolves_oauth_session() {
        let state = make_state();
        let input = GitLabConnectionInput {
            host: "gitlab.com".to_string(),
            auth_mode: "OAuth PKCE + PAT fallback".to_string(),
            preferred_scope: "read_api".to_string(),
            display_name: Some("GitLab".to_string()),
            client_id: Some("gitlab-client".to_string()),
        };

        let plan = begin_gitlab_oauth(&state, input).unwrap();
        let callback = OAuthCallbackPayload {
            session_id: plan.session_id.clone(),
            callback_url: format!("timely://auth/gitlab?code=live-code&state={}", plan.state),
        };

        let resolution = resolve_gitlab_oauth_callback(&state, callback).unwrap();
        assert_eq!(resolution.code, "live-code");

        let _ = std::fs::remove_file(&state.db_path);
    }

    #[test]
    fn resolves_callback_url_by_state_lookup() {
        let state = make_state();
        let input = GitLabConnectionInput {
            host: "gitlab.com".to_string(),
            auth_mode: "OAuth PKCE + PAT fallback".to_string(),
            preferred_scope: "read_api".to_string(),
            display_name: Some("GitLab".to_string()),
            client_id: Some("gitlab-client".to_string()),
        };

        let plan = begin_gitlab_oauth(&state, input).unwrap();
        let resolution = resolve_gitlab_oauth_callback_url(
            &state,
            &format!("timely://auth/gitlab?code=auto-code&state={}", plan.state),
        )
        .unwrap();

        assert_eq!(resolution.code, "auto-code");

        let _ = std::fs::remove_file(&state.db_path);
    }
}
