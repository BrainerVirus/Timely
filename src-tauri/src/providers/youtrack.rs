use reqwest::blocking::Client;
use serde::Deserialize;

use crate::error::AppError;

#[derive(Clone, Debug)]
pub struct YouTrackClient {
    host: String,
    token: String,
    http: Client,
}

#[derive(Clone, Debug)]
pub struct YouTrackUser {
    pub username: String,
    pub name: String,
    pub avatar_url: Option<String>,
}

impl YouTrackClient {
    pub fn new(host: &str, token: &str) -> Result<Self, AppError> {
        if host.trim().is_empty() {
            return Err(AppError::GitLabApi("YouTrack host is required".to_string()));
        }
        if token.trim().is_empty() {
            return Err(AppError::GitLabApi("YouTrack token is required".to_string()));
        }
        let http = Client::builder().build()?;
        Ok(Self {
            host: host.trim().trim_end_matches('/').to_string(),
            token: token.to_string(),
            http,
        })
    }

    pub fn fetch_user(&self) -> Result<YouTrackUser, AppError> {
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct MeResponse {
            login: Option<String>,
            full_name: Option<String>,
            avatar_url: Option<String>,
        }

        let url = format!(
            "https://{}/api/users/me?fields=login,fullName,avatarUrl",
            self.host
        );
        let response = self
            .http
            .get(url)
            .header("Authorization", format!("Bearer {}", self.token))
            .header("Accept", "application/json")
            .send()?;

        if !response.status().is_success() {
            return Err(AppError::GitLabApi(format!(
                "YouTrack token validation failed with status {}",
                response.status()
            )));
        }

        let me = response.json::<MeResponse>()?;
        let username = me.login.unwrap_or_else(|| "youtrack-user".to_string());
        Ok(YouTrackUser {
            name: me.full_name.unwrap_or_else(|| username.clone()),
            username,
            avatar_url: me.avatar_url,
        })
    }
}
