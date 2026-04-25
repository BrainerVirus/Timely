use reqwest::blocking::Client;
use serde::Deserialize;
use serde_json::json;

use crate::{
    domain::models::{
        AssignedIssueRecord, IssueActivityItem, IssueActivityPage, IssueActor,
        IssueComposerCapabilities, IssueDetailsCapabilities, IssueDetailsSnapshot,
        IssueMetadataCapability, IssueMetadataOption, IssueReference, IssueTimeTrackingCapabilities,
        IssueStatusOption, UpdateIssueMetadataInput,
    },
    error::AppError,
};

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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct YouTrackIssue {
    id: String,
    id_readable: String,
    summary: Option<String>,
    description: Option<String>,
    created: Option<i64>,
    updated: Option<i64>,
    resolved: Option<i64>,
    tags: Option<Vec<YouTrackTag>>,
    comments: Option<Vec<YouTrackComment>>,
    custom_fields: Option<Vec<YouTrackCustomField>>,
}

#[derive(Deserialize)]
struct YouTrackTag {
    name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct YouTrackComment {
    id: String,
    text: Option<String>,
    created: Option<i64>,
    updated: Option<i64>,
    author: Option<YouTrackAuthor>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct YouTrackAuthor {
    login: Option<String>,
    full_name: Option<String>,
    avatar_url: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct YouTrackCustomField {
    name: Option<String>,
    value: Option<YouTrackFieldValue>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct YouTrackFieldValue {
    name: Option<String>,
    text: Option<String>,
}

#[derive(Deserialize)]
struct YouTrackCreatedItem {
    id: Option<String>,
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

    pub fn load_issue_details(&self, reference: &IssueReference) -> Result<IssueDetailsSnapshot, AppError> {
        let issue = self.fetch_issue(&reference.issue_id)?;
        Ok(self.map_issue_details(reference, issue))
    }

    pub fn create_issue_comment(&self, issue_id: &str, body: &str) -> Result<String, AppError> {
        let url = format!("{}/api/issues/{issue_id}/comments?fields=id", self.base_url());
        let response = self
            .authorized(self.http.post(url))
            .json(&json!({ "text": body }))
            .send()?;
        if !response.status().is_success() {
            return Err(AppError::GitLabApi(format!(
                "YouTrack create comment failed with status {}",
                response.status()
            )));
        }
        let payload = response.json::<YouTrackCreatedItem>()?;
        Ok(payload.id.unwrap_or_else(|| "created".to_string()))
    }

    pub fn update_issue_comment(
        &self,
        issue_id: &str,
        comment_id: &str,
        body: &str,
    ) -> Result<(), AppError> {
        let url = format!(
            "{}/api/issues/{issue_id}/comments/{comment_id}?fields=id",
            self.base_url()
        );
        let response = self
            .authorized(self.http.post(url))
            .json(&json!({ "text": body }))
            .send()?;
        if !response.status().is_success() {
            return Err(AppError::GitLabApi(format!(
                "YouTrack update comment failed with status {}",
                response.status()
            )));
        }
        Ok(())
    }

    pub fn delete_issue_comment(&self, issue_id: &str, comment_id: &str) -> Result<(), AppError> {
        let url = format!("{}/api/issues/{issue_id}/comments/{comment_id}", self.base_url());
        let response = self.authorized(self.http.delete(url)).send()?;
        if !response.status().is_success() {
            return Err(AppError::GitLabApi(format!(
                "YouTrack delete comment failed with status {}",
                response.status()
            )));
        }
        Ok(())
    }

    pub fn load_issue_activity_page(
        &self,
        reference: &IssueReference,
        page: u32,
        per_page: u32,
    ) -> Result<IssueActivityPage, AppError> {
        let skip = page.saturating_sub(1) * per_page;
        let url = format!(
            "{}/api/issues/{}/comments?$top={}&$skip={}&fields=id,text,created,updated,author(login,fullName,avatarUrl)",
            self.base_url(),
            reference.issue_id,
            per_page,
            skip
        );
        let response = self.authorized(self.http.get(url)).send()?;
        if !response.status().is_success() {
            return Err(AppError::GitLabApi(format!(
                "YouTrack activity load failed with status {}",
                response.status()
            )));
        }
        let comments = response.json::<Vec<YouTrackComment>>()?;
        let items = comments
            .iter()
            .map(|comment| IssueActivityItem {
                id: comment.id.clone(),
                kind: "comment".to_string(),
                body: comment.text.clone().unwrap_or_default(),
                created_at: comment
                    .created
                    .map(to_iso)
                    .unwrap_or_else(|| "1970-01-01T00:00:00Z".to_string()),
                updated_at: comment.updated.map(to_iso),
                system: false,
                author: comment.author.as_ref().map(map_author),
            })
            .collect::<Vec<_>>();

        Ok(IssueActivityPage {
            has_next_page: comments.len() as u32 == per_page,
            next_page: if comments.len() as u32 == per_page {
                Some(page + 1)
            } else {
                None
            },
            items,
        })
    }

    pub fn log_issue_time(
        &self,
        issue_id: &str,
        time_spent: &str,
        summary: Option<&str>,
    ) -> Result<String, AppError> {
        let query = match summary {
            Some(text) if !text.trim().is_empty() => format!("work {time_spent} {text}"),
            _ => format!("work {time_spent}"),
        };
        let url = format!("{}/api/commands?fields=id", self.base_url());
        let response = self
            .authorized(self.http.post(url))
            .json(&json!({
                "query": query,
                "issues": [{ "idReadable": issue_id }],
            }))
            .send()?;
        if !response.status().is_success() {
            return Err(AppError::GitLabApi(format!(
                "YouTrack log time failed with status {}",
                response.status()
            )));
        }
        Ok("Time logged in YouTrack.".to_string())
    }

    pub fn update_issue_metadata(
        &self,
        input: &UpdateIssueMetadataInput,
    ) -> Result<IssueDetailsSnapshot, AppError> {
        let issue_id = &input.reference.issue_id;
        if let Some(description) = input.description.as_ref() {
            let url = format!("{}/api/issues/{issue_id}?fields=id,idReadable", self.base_url());
            let response = self
                .authorized(self.http.post(url))
                .json(&json!({ "description": description }))
                .send()?;
            if !response.status().is_success() {
                return Err(AppError::GitLabApi(format!(
                    "YouTrack description update failed with status {}",
                    response.status()
                )));
            }
        }

        if let Some(state) = input.state.as_ref() {
            self.run_command(issue_id, &format!("State {state}"))?;
        }

        self.load_issue_details(&input.reference)
    }

    pub fn fetch_open_assigned_issues(&self) -> Result<Vec<AssignedIssueRecord>, AppError> {
        let url = format!(
            "{}/api/issues?query=for:%20me%20%23Unresolved&$top=100&fields=id,idReadable,summary,updated,resolved,tags(name)",
            self.base_url()
        );
        let response = self.authorized(self.http.get(url)).send()?;
        if !response.status().is_success() {
            return Err(AppError::GitLabApi(format!(
                "YouTrack assigned issues failed with status {}",
                response.status()
            )));
        }
        let issues = response.json::<Vec<YouTrackIssue>>()?;
        Ok(issues
            .into_iter()
            .map(|issue| AssignedIssueRecord {
                issue_graphql_id: issue.id.clone(),
                provider_item_id: issue.id_readable.clone(),
                title: issue.summary.unwrap_or_else(|| issue.id_readable.clone()),
                state: resolve_state(issue.custom_fields.as_deref()),
                closed_at: issue.resolved.map(to_iso),
                updated_at: issue.updated.map(to_iso),
                web_url: Some(format!("{}/issue/{}", self.base_url(), issue.id_readable)),
                labels: issue
                    .tags
                    .unwrap_or_default()
                    .into_iter()
                    .map(|tag| tag.name)
                    .collect(),
                milestone_title: None,
                iteration_gitlab_id: None,
                iteration_group_id: None,
                iteration_cadence_id: None,
                iteration_cadence_title: None,
                iteration_title: None,
                iteration_start_date: None,
                iteration_due_date: None,
            })
            .collect())
    }

    fn fetch_issue(&self, issue_id: &str) -> Result<YouTrackIssue, AppError> {
        let url = format!(
            "{}/api/issues/{issue_id}?fields=id,idReadable,summary,description,created,updated,resolved,tags(name),comments(id,text,created,updated,author(login,fullName,avatarUrl)),customFields(name,value(name,text))",
            self.base_url()
        );
        let response = self.authorized(self.http.get(url)).send()?;
        if !response.status().is_success() {
            return Err(AppError::GitLabApi(format!(
                "YouTrack issue load failed with status {}",
                response.status()
            )));
        }
        Ok(response.json::<YouTrackIssue>()?)
    }

    fn map_issue_details(&self, reference: &IssueReference, issue: YouTrackIssue) -> IssueDetailsSnapshot {
        let issue_id_for_url = issue.id_readable.clone();
        let state = resolve_state(issue.custom_fields.as_deref());
        let labels = issue
            .tags
            .unwrap_or_default()
            .into_iter()
            .map(|tag| IssueMetadataOption {
                id: tag.name.clone(),
                label: tag.name,
                color: None,
                badge: None,
            })
            .collect::<Vec<_>>();
        let activity = issue
            .comments
            .unwrap_or_default()
            .into_iter()
            .map(|comment| IssueActivityItem {
                id: comment.id,
                kind: "comment".to_string(),
                body: comment.text.unwrap_or_default(),
                created_at: comment
                    .created
                    .map(to_iso)
                    .unwrap_or_else(|| "1970-01-01T00:00:00Z".to_string()),
                updated_at: comment.updated.map(to_iso),
                system: false,
                author: comment.author.as_ref().map(map_author),
            })
            .collect::<Vec<_>>();

        let status_options = vec![
            IssueStatusOption {
                id: "Open".to_string(),
                label: "Open".to_string(),
                color: None,
                icon: None,
            },
            IssueStatusOption {
                id: "In Progress".to_string(),
                label: "In Progress".to_string(),
                color: None,
                icon: None,
            },
            IssueStatusOption {
                id: "Done".to_string(),
                label: "Done".to_string(),
                color: None,
                icon: None,
            },
        ];

        IssueDetailsSnapshot {
            reference: reference.clone(),
            key: issue.id_readable.clone(),
            title: issue.summary.unwrap_or_else(|| issue.id_readable.clone()),
            state: state.clone(),
            author: None,
            created_at: issue.created.map(to_iso),
            updated_at: issue.updated.map(to_iso),
            web_url: Some(format!("{}/issue/{}", self.base_url(), issue_id_for_url)),
            total_time_spent: None,
            description: issue.description,
            status: Some(IssueStatusOption {
                id: state.clone(),
                label: state,
                color: None,
                icon: None,
            }),
            status_options: Some(status_options),
            labels,
            milestone_title: None,
            milestone: None,
            iteration: None,
            linked_items: Some(vec![]),
            child_items: Some(vec![]),
            activity,
            activity_has_next_page: Some(false),
            activity_next_page: None,
            viewer_username: None,
            issue_etag: None,
            capabilities: IssueDetailsCapabilities {
                status: IssueMetadataCapability {
                    enabled: true,
                    reason: None,
                    options: vec![],
                },
                labels: IssueMetadataCapability {
                    enabled: false,
                    reason: Some("Label updates are not available yet for YouTrack.".to_string()),
                    options: vec![],
                },
                iteration: disabled_capability("Iterations unavailable from YouTrack mapping."),
                milestone: disabled_capability("Milestones unavailable from YouTrack mapping."),
                composer: IssueComposerCapabilities {
                    enabled: true,
                    modes: vec!["write".to_string(), "preview".to_string()],
                    supports_quick_actions: false,
                },
                time_tracking: IssueTimeTrackingCapabilities {
                    enabled: true,
                    supports_quick_actions: false,
                },
            },
        }
    }

    fn run_command(&self, issue_id: &str, query: &str) -> Result<(), AppError> {
        let url = format!("{}/api/commands?fields=id", self.base_url());
        let response = self
            .authorized(self.http.post(url))
            .json(&json!({
                "query": query,
                "issues": [{ "idReadable": issue_id }],
            }))
            .send()?;
        if !response.status().is_success() {
            return Err(AppError::GitLabApi(format!(
                "YouTrack command '{}' failed with status {}",
                query,
                response.status()
            )));
        }
        Ok(())
    }

    fn base_url(&self) -> &str {
        &self.host
    }

    fn authorized(&self, req: reqwest::blocking::RequestBuilder) -> reqwest::blocking::RequestBuilder {
        req.header("Authorization", format!("Bearer {}", self.token))
            .header("Accept", "application/json")
            .header("Content-Type", "application/json")
    }
}

fn to_iso(timestamp_ms: i64) -> String {
    chrono::DateTime::from_timestamp_millis(timestamp_ms)
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_else(|| "1970-01-01T00:00:00Z".to_string())
}

fn map_author(author: &YouTrackAuthor) -> IssueActor {
    IssueActor {
        username: author.login.clone(),
        name: author
            .full_name
            .clone()
            .or_else(|| author.login.clone())
            .unwrap_or_else(|| "Unknown".to_string()),
        avatar_url: author.avatar_url.clone(),
    }
}

fn disabled_capability(reason: &str) -> IssueMetadataCapability {
    IssueMetadataCapability {
        enabled: false,
        reason: Some(reason.to_string()),
        options: vec![],
    }
}

fn resolve_state(fields: Option<&[YouTrackCustomField]>) -> String {
    let Some(fields) = fields else {
        return "Open".to_string();
    };
    fields
        .iter()
        .find(|field| field.name.as_deref() == Some("State"))
        .and_then(|field| field.value.as_ref())
        .and_then(|value| value.name.clone().or_else(|| value.text.clone()))
        .unwrap_or_else(|| "Open".to_string())
}
