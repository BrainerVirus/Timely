use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};

use crate::error::AppError;

pub struct GitLabClient {
    client: Client,
    base_url: String,
    token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitLabUser {
    pub id: i64,
    pub username: String,
    pub name: String,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitLabProject {
    pub id: i64,
    pub name: String,
    pub path_with_namespace: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitLabTimelog {
    pub id: i64,
    pub time_spent: i64,
    pub spent_at: Option<String>,
    pub created_at: String,
    pub issue: Option<GitLabTimelogIssue>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitLabTimelogIssue {
    pub iid: i64,
    pub title: String,
    pub state: String,
    pub web_url: Option<String>,
    pub labels: Option<Vec<String>>,
}

impl GitLabClient {
    pub fn new(host: &str, token: &str) -> Self {
        let base_url = if host.starts_with("http://") || host.starts_with("https://") {
            host.trim_end_matches('/').to_string()
        } else {
            format!("https://{}", host.trim_end_matches('/'))
        };

        Self {
            client: Client::new(),
            base_url,
            token: token.to_string(),
        }
    }

    pub fn fetch_user(&self) -> Result<GitLabUser, AppError> {
        let url = format!("{}/api/v4/user", self.base_url);
        let response = self
            .client
            .get(&url)
            .header("PRIVATE-TOKEN", &self.token)
            .send()?;

        if !response.status().is_success() {
            return Err(AppError::GitLabApi(format!(
                "GET /api/v4/user returned {}",
                response.status()
            )));
        }

        Ok(response.json()?)
    }

    pub fn fetch_projects(&self) -> Result<Vec<GitLabProject>, AppError> {
        let mut all_projects = Vec::new();
        let mut page = 1u32;

        loop {
            let url = format!(
                "{}/api/v4/projects?membership=true&simple=true&per_page=100&page={}",
                self.base_url, page
            );
            let response = self
                .client
                .get(&url)
                .header("PRIVATE-TOKEN", &self.token)
                .send()?;

            if !response.status().is_success() {
                return Err(AppError::GitLabApi(format!(
                    "GET /api/v4/projects returned {}",
                    response.status()
                )));
            }

            let next_page = response
                .headers()
                .get("x-next-page")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.parse::<u32>().ok());

            let projects: Vec<GitLabProject> = response.json()?;
            let is_empty = projects.is_empty();
            all_projects.extend(projects);

            match next_page {
                Some(np) if !is_empty => page = np,
                _ => break,
            }
        }

        Ok(all_projects)
    }

    pub fn fetch_timelogs(
        &self,
        project_id: i64,
        updated_after: Option<&str>,
    ) -> Result<Vec<GitLabTimelog>, AppError> {
        let mut all_timelogs = Vec::new();
        let mut page = 1u32;

        loop {
            let mut url = format!(
                "{}/api/v4/projects/{}/timelogs?per_page=100&page={}",
                self.base_url, project_id, page
            );
            if let Some(after) = updated_after {
                url.push_str(&format!("&updated_after={}", urlencoding::encode(after)));
            }

            let response = self
                .client
                .get(&url)
                .header("PRIVATE-TOKEN", &self.token)
                .send()?;

            if !response.status().is_success() {
                return Err(AppError::GitLabApi(format!(
                    "GET /api/v4/projects/{}/timelogs returned {}",
                    project_id,
                    response.status()
                )));
            }

            let next_page = response
                .headers()
                .get("x-next-page")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.parse::<u32>().ok());

            let timelogs: Vec<GitLabTimelog> = response.json()?;
            let is_empty = timelogs.is_empty();
            all_timelogs.extend(timelogs);

            match next_page {
                Some(np) if !is_empty => page = np,
                _ => break,
            }
        }

        Ok(all_timelogs)
    }
}
