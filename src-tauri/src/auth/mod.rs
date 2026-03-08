use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use rand::{distributions::Alphanumeric, thread_rng, Rng};
use sha2::{Digest, Sha256};
use url::Url;

use crate::{
    domain::models::{
        AuthLaunchPlan, GitLabConnectionInput, OAuthCallbackResolution, OAuthSession,
    },
    error::AppError,
    support::{time::utc_timestamp, url::normalize_host},
};

pub const CALLBACK_SCHEME: &str = "timely";
pub const CALLBACK_HOST: &str = "auth";
pub const CALLBACK_PATH: &str = "/gitlab";

pub fn create_gitlab_oauth_session(
    input: &GitLabConnectionInput,
) -> Result<(OAuthSession, AuthLaunchPlan), AppError> {
    let host = normalize_host(&input.host);
    let client_id = input
        .client_id
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| {
            AppError::InvalidAuthConfiguration(
                "missing GitLab OAuth client ID. Save a valid client ID first.".to_string(),
            )
        })?;
    let state = random_token(32);
    let session_id = random_token(24);
    let code_verifier = random_token(96);
    let code_challenge = code_challenge(&code_verifier);
    let redirect_uri = format!("{CALLBACK_SCHEME}://{CALLBACK_HOST}{CALLBACK_PATH}");

    let authorize_url = format!(
        "https://{host}/oauth/authorize?client_id={client_id}&response_type=code&scope={scope}&redirect_uri={redirect}&state={state}&code_challenge={challenge}&code_challenge_method=S256",
        client_id = urlencoding::encode(client_id),
        scope = input.preferred_scope.replace(' ', "+"),
        redirect = urlencoding::encode(&redirect_uri),
        challenge = code_challenge,
    );

    let session = OAuthSession {
        session_id: session_id.clone(),
        provider: "GitLab".to_string(),
        host: host.clone(),
        state: state.clone(),
        code_verifier: code_verifier.clone(),
        code_challenge: code_challenge.clone(),
        scope: input.preferred_scope.clone(),
        redirect_uri: redirect_uri.clone(),
        created_at: utc_timestamp(),
    };

    let plan = AuthLaunchPlan {
        provider: "GitLab".to_string(),
        session_id,
        authorize_url,
        redirect_strategy: "custom-scheme-first".to_string(),
        message: "PKCE session prepared. Next step is opening this URL in the system browser and exchanging the returned code.".to_string(),
        scope: input.preferred_scope.clone(),
        state,
        callback_scheme: CALLBACK_SCHEME.to_string(),
    };

    Ok((session, plan))
}

pub fn resolve_gitlab_callback(
    session: &OAuthSession,
    callback_url: &str,
) -> Result<OAuthCallbackResolution, AppError> {
    let parsed = Url::parse(callback_url).map_err(|error| {
        AppError::InvalidAuthCallback(format!("could not parse callback url: {error}"))
    })?;

    if parsed.scheme() != CALLBACK_SCHEME {
        return Err(AppError::InvalidAuthCallback(
            "unexpected callback scheme".to_string(),
        ));
    }

    if parsed.host_str() != Some(CALLBACK_HOST) || parsed.path() != CALLBACK_PATH {
        return Err(AppError::InvalidAuthCallback(
            "unexpected callback target".to_string(),
        ));
    }

    let code = parsed
        .query_pairs()
        .find(|(key, _)| key == "code")
        .map(|(_, value)| value.to_string())
        .ok_or_else(|| AppError::InvalidAuthCallback("missing auth code".to_string()))?;

    let returned_state = parsed
        .query_pairs()
        .find(|(key, _)| key == "state")
        .map(|(_, value)| value.to_string())
        .ok_or_else(|| AppError::InvalidAuthCallback("missing state".to_string()))?;

    if returned_state != session.state {
        return Err(AppError::InvalidAuthCallback("state mismatch".to_string()));
    }

    Ok(OAuthCallbackResolution {
        provider: session.provider.clone(),
        host: session.host.clone(),
        code,
        state: returned_state,
        redirect_uri: session.redirect_uri.clone(),
        code_verifier: session.code_verifier.clone(),
        session_id: session.session_id.clone(),
    })
}

fn code_challenge(verifier: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    URL_SAFE_NO_PAD.encode(hasher.finalize())
}

fn random_token(length: usize) -> String {
    thread_rng()
        .sample_iter(&Alphanumeric)
        .take(length)
        .map(char::from)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::models::GitLabConnectionInput;

    #[test]
    fn builds_pkce_session_and_plan() {
        let (session, plan) = create_gitlab_oauth_session(&GitLabConnectionInput {
            host: "https://gitlab.example.com/".to_string(),
            auth_mode: "OAuth PKCE + PAT fallback".to_string(),
            preferred_scope: "read_api".to_string(),
            display_name: None,
            client_id: Some("gitlab-client".to_string()),
        })
        .unwrap();

        assert_eq!(session.host, "gitlab.example.com");
        assert!(plan.authorize_url.contains("code_challenge="));
        assert_eq!(plan.session_id, session.session_id);
    }

    #[test]
    fn resolves_valid_callback() {
        let (session, _) = create_gitlab_oauth_session(&GitLabConnectionInput {
            host: "gitlab.com".to_string(),
            auth_mode: "OAuth PKCE + PAT fallback".to_string(),
            preferred_scope: "read_api".to_string(),
            display_name: None,
            client_id: Some("gitlab-client".to_string()),
        })
        .unwrap();

        let callback = format!("timely://auth/gitlab?code=abc123&state={}", session.state);
        let resolution = resolve_gitlab_callback(&session, &callback).unwrap();

        assert_eq!(resolution.code, "abc123");
        assert_eq!(resolution.session_id, session.session_id);
    }

    #[test]
    fn rejects_invalid_state() {
        let (session, _) = create_gitlab_oauth_session(&GitLabConnectionInput {
            host: "gitlab.com".to_string(),
            auth_mode: "OAuth PKCE + PAT fallback".to_string(),
            preferred_scope: "read_api".to_string(),
            display_name: None,
            client_id: Some("gitlab-client".to_string()),
        })
        .unwrap();

        let callback = "timely://auth/gitlab?code=abc123&state=wrong";
        let error = resolve_gitlab_callback(&session, callback).unwrap_err();

        assert!(error.to_string().contains("state mismatch"));
    }

    #[test]
    fn rejects_missing_client_id() {
        let error = create_gitlab_oauth_session(&GitLabConnectionInput {
            host: "gitlab.com".to_string(),
            auth_mode: "OAuth PKCE + PAT fallback".to_string(),
            preferred_scope: "read_api".to_string(),
            display_name: None,
            client_id: None,
        })
        .unwrap_err();

        assert!(error.to_string().contains("missing GitLab OAuth client ID"));
    }
}
