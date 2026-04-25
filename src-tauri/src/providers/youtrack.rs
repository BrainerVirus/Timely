use std::{fs::OpenOptions, io::Write};

use reqwest::blocking::Client;
use serde::Deserialize;
use serde_json::{json, Value};
use urlencoding::encode;

use crate::{
    domain::models::{
        AssignedIssueRecord, IssueActivityItem, IssueActivityPage, IssueActor,
        IssueComposerCapabilities, IssueDetailsCapabilities, IssueDetailsSnapshot,
        IssueMetadataCapability, IssueMetadataOption, IssueReference, IssueStatusOption,
        IssueTimeTrackingCapabilities, UpdateIssueMetadataInput,
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

#[derive(Clone, Debug)]
pub struct YouTrackWorkItem {
    pub id: String,
    pub spent_at: String,
    pub uploaded_at: Option<String>,
    pub duration_minutes: i64,
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
    value: Option<Value>,
}

#[derive(Deserialize)]
struct YouTrackCreatedItem {
    id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct YouTrackWorkItemJson {
    id: String,
    date: Option<i64>,
    created: Option<i64>,
    duration: Option<YouTrackDuration>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct YouTrackDuration {
    minutes: Option<i64>,
}

impl YouTrackClient {
    pub fn new(host: &str, token: &str) -> Result<Self, AppError> {
        if host.trim().is_empty() {
            return Err(AppError::ProviderApi(
                "YouTrack host is required".to_string(),
            ));
        }
        if token.trim().is_empty() {
            return Err(AppError::ProviderApi(
                "YouTrack token is required".to_string(),
            ));
        }
        let base_url = if host.starts_with("http://") || host.starts_with("https://") {
            host.trim_end_matches('/').to_string()
        } else {
            format!("https://{}", host.trim_end_matches('/'))
        };
        let http = Client::builder().build()?;
        Ok(Self {
            host: base_url,
            token: token.to_string(),
            http,
        })
    }

    fn fetch_issues_for_query_paged(
        &self,
        query: &str,
        fields: &str,
    ) -> Result<Vec<YouTrackIssue>, AppError> {
        const PAGE: u32 = 100;
        const MAX_PAGES: u32 = 100;
        let encoded_query = encode(query);
        let mut out = Vec::new();
        let mut skip = 0u32;
        for _ in 0..MAX_PAGES {
            let url = format!(
                "{}/api/issues?query={encoded_query}&$top={PAGE}&$skip={skip}&fields={fields}",
                self.base_url()
            );
            let response = self.authorized(self.http.get(url)).send()?;
            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().unwrap_or_default();
                return Err(AppError::ProviderApi(format!(
                    "YouTrack issues query failed with status {status}: {body}"
                )));
            }
            let status = response.status().as_u16();
            let content_type = response
                .headers()
                .get("content-type")
                .and_then(|value| value.to_str().ok())
                .unwrap_or("unknown")
                .to_string();
            let body = response.text()?;
            // #region agent log
            debug_log(
                "run1",
                "H1,H2,H3,H4",
                "src-tauri/src/providers/youtrack.rs:fetch_issues_for_query_paged",
                "YouTrack issues response before decode",
                json!({
                    "query": query,
                    "skip": skip,
                    "status": status,
                    "contentType": content_type,
                    "bodyBytes": body.len(),
                }),
            );
            // #endregion
            let batch = match serde_json::from_str::<Vec<YouTrackIssue>>(&body) {
                Ok(batch) => batch,
                Err(error) => {
                    // #region agent log
                    debug_log(
                        "run1",
                        "H1,H2,H3,H4",
                        "src-tauri/src/providers/youtrack.rs:fetch_issues_for_query_paged",
                        "YouTrack issues decode failed",
                        json!({
                            "query": query,
                            "skip": skip,
                            "error": error.to_string(),
                            "shape": summarize_issue_payload_shape(&body),
                        }),
                    );
                    // #endregion
                    return Err(AppError::ProviderApi(format!(
                        "YouTrack issues decode failed for query '{query}': {error}"
                    )));
                }
            };
            let batch_len = batch.len();
            out.extend(batch);
            if batch_len < PAGE as usize {
                break;
            }
            skip = skip.saturating_add(PAGE);
        }
        Ok(out)
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
            "{}/api/users/me?fields=login,fullName,avatarUrl",
            self.base_url()
        );
        let response = self
            .http
            .get(url)
            .header("Authorization", format!("Bearer {}", self.token))
            .header("Accept", "application/json")
            .send()?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().unwrap_or_default();
            return Err(AppError::ProviderApi(format!(
                "YouTrack token validation failed with status {status}: {body}"
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

    pub fn load_issue_details(
        &self,
        reference: &IssueReference,
    ) -> Result<IssueDetailsSnapshot, AppError> {
        let issue = self.fetch_issue(&reference.issue_id)?;
        Ok(self.map_issue_details(reference, issue))
    }

    pub fn create_issue_comment(&self, issue_id: &str, body: &str) -> Result<String, AppError> {
        let url = format!(
            "{}/api/issues/{issue_id}/comments?fields=id",
            self.base_url()
        );
        let response = self
            .authorized(self.http.post(url))
            .json(&json!({ "text": body }))
            .send()?;
        if !response.status().is_success() {
            return Err(AppError::ProviderApi(format!(
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
        let update_url = format!(
            "{}/api/issues/{issue_id}/comments/{comment_id}?fields=id",
            self.base_url()
        );
        let response = self
            .authorized(self.http.post(update_url.clone()))
            .json(&json!({ "text": body }))
            .send()?;
        if response.status().is_success() {
            return Ok(());
        }

        Err(AppError::ProviderApi(format!(
            "YouTrack update comment failed with status {}",
            response.status()
        )))
    }

    pub fn delete_issue_comment(&self, issue_id: &str, comment_id: &str) -> Result<(), AppError> {
        let url = format!(
            "{}/api/issues/{issue_id}/comments/{comment_id}",
            self.base_url()
        );
        let response = self.authorized(self.http.delete(url)).send()?;
        if response.status().is_success() || response.status().as_u16() == 404 {
            return Ok(());
        }
        Err(AppError::ProviderApi(format!(
            "YouTrack delete comment failed with status {}",
            response.status()
        )))
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
            let status = response.status();
            let body = response.text().unwrap_or_default();
            return Err(AppError::ProviderApi(format!(
                "YouTrack activity load failed with status {status}: {body}"
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
        let query = log_time_command(time_spent, summary);
        let url = format!("{}/api/commands?fields=id", self.base_url());
        let response = self
            .authorized(self.http.post(url))
            .json(&json!({
                "query": query,
                "issues": [{ "idReadable": issue_id }],
            }))
            .send()?;
        if !response.status().is_success() {
            return Err(AppError::ProviderApi(format!(
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
            let url = format!(
                "{}/api/issues/{issue_id}?fields=id,idReadable",
                self.base_url()
            );
            let response = self
                .authorized(self.http.post(url))
                .json(&json!({ "description": description }))
                .send()?;
            if !response.status().is_success() {
                return Err(AppError::ProviderApi(format!(
                    "YouTrack description update failed with status {}",
                    response.status()
                )));
            }
        }

        if let Some(labels) = input.labels.as_ref() {
            let tags: Vec<_> = labels.iter().map(|name| json!({ "name": name })).collect();
            let url = format!(
                "{}/api/issues/{issue_id}?fields=id,idReadable",
                self.base_url()
            );
            let response = self
                .authorized(self.http.post(url))
                .json(&json!({ "tags": tags }))
                .send()?;
            if !response.status().is_success() {
                return Err(AppError::ProviderApi(format!(
                    "YouTrack labels update failed with status {}",
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
        let issues = self.fetch_issues_for_query_paged(
            open_assigned_issues_query(),
            "id,idReadable,summary,updated,resolved,tags(name)",
        )?;
        Ok(issues
            .into_iter()
            .map(|issue| self.to_assigned_issue_record(issue))
            .collect())
    }

    pub fn fetch_recent_closed_assigned_issues(
        &self,
        cutoff_date: &str,
    ) -> Result<Vec<AssignedIssueRecord>, AppError> {
        let query = recent_closed_assigned_issues_query(cutoff_date);
        let issues = self.fetch_issues_for_query_paged(
            &query,
            "id,idReadable,summary,updated,resolved,tags(name),customFields(name,value(name,text))",
        )?;
        Ok(issues
            .into_iter()
            .map(|issue| self.to_assigned_issue_record(issue))
            .collect())
    }

    pub fn fetch_all_closed_assigned_issues(&self) -> Result<Vec<AssignedIssueRecord>, AppError> {
        let issues = self.fetch_issues_for_query_paged(
            all_closed_assigned_issues_query(),
            "id,idReadable,summary,updated,resolved,tags(name),customFields(name,value(name,text))",
        )?;
        Ok(issues
            .into_iter()
            .map(|issue| self.to_assigned_issue_record(issue))
            .collect())
    }

    pub fn fetch_issue_work_items(
        &self,
        issue_id: &str,
    ) -> Result<Vec<YouTrackWorkItem>, AppError> {
        const PAGE: u32 = 100;
        const MAX_PAGES: u32 = 50;
        let mut out = Vec::new();
        let mut skip = 0u32;
        for _ in 0..MAX_PAGES {
            let url = format!(
                "{}/api/issues/{issue_id}/timeTracking/workItems?$top={PAGE}&$skip={skip}&fields=id,date,created,duration(minutes)",
                self.base_url()
            );
            let response = self.authorized(self.http.get(url)).send()?;
            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().unwrap_or_default();
                return Err(AppError::ProviderApi(format!(
                    "YouTrack work items fetch failed with status {status}: {body}"
                )));
            }

            let status = response.status().as_u16();
            let content_type = response
                .headers()
                .get("content-type")
                .and_then(|value| value.to_str().ok())
                .unwrap_or("unknown")
                .to_string();
            let body = response.text()?;
            // #region agent log
            debug_log(
                "run1",
                "H5",
                "src-tauri/src/providers/youtrack.rs:fetch_issue_work_items",
                "YouTrack work items response before decode",
                json!({
                    "issueId": issue_id,
                    "skip": skip,
                    "status": status,
                    "contentType": content_type,
                    "bodyBytes": body.len(),
                }),
            );
            // #endregion

            let rows = match serde_json::from_str::<Vec<YouTrackWorkItemJson>>(&body) {
                Ok(rows) => rows,
                Err(error) => {
                    // #region agent log
                    debug_log(
                        "run1",
                        "H5",
                        "src-tauri/src/providers/youtrack.rs:fetch_issue_work_items",
                        "YouTrack work items decode failed",
                        json!({
                            "issueId": issue_id,
                            "skip": skip,
                            "error": error.to_string(),
                            "shape": summarize_work_items_payload_shape(&body),
                        }),
                    );
                    // #endregion
                    return Err(AppError::ProviderApi(format!(
                        "YouTrack work items decode failed for issue '{issue_id}': {error}"
                    )));
                }
            };
            let mapped: Vec<YouTrackWorkItem> = rows
                .into_iter()
                .filter_map(|row| {
                    let minutes = row.duration.and_then(|d| d.minutes).unwrap_or(0);
                    if minutes <= 0 {
                        return None;
                    }
                    let spent_at = row.date.map(to_iso_date).unwrap_or_else(|| {
                        chrono::Utc::now()
                            .date_naive()
                            .format("%Y-%m-%d")
                            .to_string()
                    });
                    Some(YouTrackWorkItem {
                        id: row.id,
                        spent_at,
                        uploaded_at: row.created.map(to_iso),
                        duration_minutes: minutes,
                    })
                })
                .collect();
            let batch_len = mapped.len();
            out.extend(mapped);
            if batch_len < PAGE as usize {
                break;
            }
            skip = skip.saturating_add(PAGE);
        }
        Ok(out)
    }

    fn fetch_issue(&self, issue_id: &str) -> Result<YouTrackIssue, AppError> {
        let url = format!(
            "{}/api/issues/{issue_id}?fields=id,idReadable,summary,description,created,updated,resolved,tags(name),comments(id,text,created,updated,author(login,fullName,avatarUrl)),customFields(name,value(name,text))",
            self.base_url()
        );
        let response = self.authorized(self.http.get(url)).send()?;
        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().unwrap_or_default();
            return Err(AppError::ProviderApi(format!(
                "YouTrack issue load failed with status {status}: {body}"
            )));
        }
        Ok(response.json::<YouTrackIssue>()?)
    }

    fn map_issue_details(
        &self,
        reference: &IssueReference,
        issue: YouTrackIssue,
    ) -> IssueDetailsSnapshot {
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

        let status_options = build_status_options(issue.custom_fields.as_deref());

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
            status_options: Some(status_options.clone()),
            labels: labels.clone(),
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
                    options: status_options
                        .iter()
                        .map(|status| IssueMetadataOption {
                            id: status.id.clone(),
                            label: status.label.clone(),
                            color: status.color.clone(),
                            badge: None,
                        })
                        .collect(),
                },
                labels: IssueMetadataCapability {
                    enabled: true,
                    reason: None,
                    options: labels,
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
            return Err(AppError::ProviderApi(format!(
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

    fn to_assigned_issue_record(&self, issue: YouTrackIssue) -> AssignedIssueRecord {
        AssignedIssueRecord {
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
        }
    }

    fn authorized(
        &self,
        req: reqwest::blocking::RequestBuilder,
    ) -> reqwest::blocking::RequestBuilder {
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

fn open_assigned_issues_query() -> &'static str {
    "for: me #Unresolved"
}

fn recent_closed_assigned_issues_query(cutoff_date: &str) -> String {
    format!("for: me #Resolved resolved date: {cutoff_date} .. Today")
}

fn all_closed_assigned_issues_query() -> &'static str {
    "for: me #Resolved sort by: {resolved date} desc"
}

fn log_time_command(time_spent: &str, summary: Option<&str>) -> String {
    match summary {
        Some(text) if !text.trim().is_empty() => format!("add work {time_spent} {}", text.trim()),
        _ => format!("add work {time_spent}"),
    }
}

fn summarize_issue_payload_shape(body: &str) -> Value {
    let Ok(value) = serde_json::from_str::<Value>(body) else {
        return json!({ "topLevel": "invalid-json" });
    };
    let Some(items) = value.as_array() else {
        return json!({ "topLevel": value_type(&value) });
    };
    let first = items.first();
    let issue_keys = first
        .and_then(|item| item.as_object())
        .map(|object| object.keys().cloned().collect::<Vec<_>>())
        .unwrap_or_default();
    let first_custom_field_shapes = first
        .and_then(|item| item.get("customFields"))
        .and_then(|fields| fields.as_array())
        .map(|fields| {
            fields
                .iter()
                .take(8)
                .map(|field| {
                    json!({
                        "fieldKeys": field
                            .as_object()
                            .map(|object| object.keys().cloned().collect::<Vec<_>>())
                            .unwrap_or_default(),
                        "valueType": field.get("value").map(value_type).unwrap_or("missing"),
                        "valueKeys": field
                            .get("value")
                            .and_then(|field_value| field_value.as_object())
                            .map(|object| object.keys().cloned().collect::<Vec<_>>())
                            .unwrap_or_default(),
                    })
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    json!({
        "topLevel": "array",
        "arrayLen": items.len(),
        "firstIssueKeys": issue_keys,
        "firstResolvedType": first.and_then(|item| item.get("resolved")).map(value_type).unwrap_or("missing"),
        "firstTagsType": first.and_then(|item| item.get("tags")).map(value_type).unwrap_or("missing"),
        "firstCustomFieldsType": first.and_then(|item| item.get("customFields")).map(value_type).unwrap_or("missing"),
        "firstCustomFieldShapes": first_custom_field_shapes,
    })
}

fn summarize_work_items_payload_shape(body: &str) -> Value {
    let Ok(value) = serde_json::from_str::<Value>(body) else {
        return json!({ "topLevel": "invalid-json" });
    };
    let Some(items) = value.as_array() else {
        return json!({ "topLevel": value_type(&value) });
    };
    let first = items.first();
    json!({
        "topLevel": "array",
        "arrayLen": items.len(),
        "firstItemKeys": first
            .and_then(|item| item.as_object())
            .map(|object| object.keys().cloned().collect::<Vec<_>>())
            .unwrap_or_default(),
        "firstDateType": first.and_then(|item| item.get("date")).map(value_type).unwrap_or("missing"),
        "firstCreatedType": first.and_then(|item| item.get("created")).map(value_type).unwrap_or("missing"),
        "firstDurationType": first.and_then(|item| item.get("duration")).map(value_type).unwrap_or("missing"),
        "firstDurationKeys": first
            .and_then(|item| item.get("duration"))
            .and_then(|duration| duration.as_object())
            .map(|object| object.keys().cloned().collect::<Vec<_>>())
            .unwrap_or_default(),
    })
}

fn value_type(value: &Value) -> &'static str {
    match value {
        Value::Null => "null",
        Value::Bool(_) => "bool",
        Value::Number(_) => "number",
        Value::String(_) => "string",
        Value::Array(_) => "array",
        Value::Object(_) => "object",
    }
}

fn debug_log(run_id: &str, hypothesis_id: &str, location: &str, message: &str, data: Value) {
    let payload = json!({
        "sessionId": "2eafcf",
        "runId": run_id,
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": chrono::Utc::now().timestamp_millis(),
    });
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open("/Users/cristhoferpincetti/Documents/projects/personal/gitlab-time-tracker/.cursor/debug-2eafcf.log")
    {
        let _ = writeln!(file, "{payload}");
    }
}

fn to_iso_date(timestamp_ms: i64) -> String {
    chrono::DateTime::from_timestamp_millis(timestamp_ms)
        .map(|dt| dt.date_naive().format("%Y-%m-%d").to_string())
        .unwrap_or_else(|| {
            chrono::Utc::now()
                .date_naive()
                .format("%Y-%m-%d")
                .to_string()
        })
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
        .and_then(extract_youtrack_field_value_label)
        .unwrap_or_else(|| "Open".to_string())
}

fn extract_youtrack_field_value_label(value: &Value) -> Option<String> {
    match value {
        Value::Object(object) => object
            .get("name")
            .or_else(|| object.get("text"))
            .and_then(|item| item.as_str())
            .map(ToOwned::to_owned),
        Value::Array(items) => items.iter().find_map(extract_youtrack_field_value_label),
        Value::String(text) => Some(text.clone()),
        _ => None,
    }
}

fn build_status_options(fields: Option<&[YouTrackCustomField]>) -> Vec<IssueStatusOption> {
    let current = resolve_state(fields);
    let mut base = vec![
        "Open".to_string(),
        "In Progress".to_string(),
        "Done".to_string(),
        "Fixed".to_string(),
    ];
    if !base.iter().any(|item| item.eq_ignore_ascii_case(&current)) {
        base.push(current);
    }
    base.into_iter()
        .map(|label| IssueStatusOption {
            id: label.clone(),
            label,
            color: None,
            icon: None,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn state_field(name: &str) -> YouTrackCustomField {
        YouTrackCustomField {
            name: Some("State".to_string()),
            value: Some(json!({ "name": name })),
        }
    }

    #[test]
    fn resolve_state_uses_state_custom_field() {
        let fields = vec![state_field("In Progress")];
        assert_eq!(resolve_state(Some(&fields)), "In Progress");
    }

    #[test]
    fn resolve_state_accepts_documented_custom_field_value_shapes() {
        let object_value = vec![YouTrackCustomField {
            name: Some("State".to_string()),
            value: Some(json!({ "name": "Fixed", "id": "69-7", "$type": "StateBundleElement" })),
        }];
        assert_eq!(resolve_state(Some(&object_value)), "Fixed");

        let array_value = vec![YouTrackCustomField {
            name: Some("State".to_string()),
            value: Some(json!([{ "name": "Done", "$type": "StateBundleElement" }])),
        }];
        assert_eq!(resolve_state(Some(&array_value)), "Done");

        let primitive_value = vec![YouTrackCustomField {
            name: Some("State".to_string()),
            value: Some(json!("Open")),
        }];
        assert_eq!(resolve_state(Some(&primitive_value)), "Open");

        let null_value = vec![YouTrackCustomField {
            name: Some("State".to_string()),
            value: Some(Value::Null),
        }];
        assert_eq!(resolve_state(Some(&null_value)), "Open");
    }

    #[test]
    fn build_status_options_includes_current_state() {
        let fields = vec![state_field("Blocked")];
        let options = build_status_options(Some(&fields));
        assert!(options.iter().any(|option| option.id == "Blocked"));
    }

    #[test]
    fn to_iso_date_formats_calendar_date() {
        // 2026-01-15T00:00:00Z in millis
        let date = to_iso_date(1_768_435_200_000);
        assert_eq!(date, "2026-01-15");
    }

    #[test]
    fn client_normalizes_host_with_scheme() {
        let client = YouTrackClient::new("https://company.youtrack.cloud/", "token").unwrap();
        assert_eq!(client.base_url(), "https://company.youtrack.cloud");
    }

    #[test]
    fn assigned_issue_queries_use_youtrack_search_syntax() {
        assert_eq!(open_assigned_issues_query(), "for: me #Unresolved");
        assert_eq!(
            recent_closed_assigned_issues_query("2026-02-25"),
            "for: me #Resolved resolved date: 2026-02-25 .. Today"
        );
        assert_eq!(
            all_closed_assigned_issues_query(),
            "for: me #Resolved sort by: {resolved date} desc"
        );
    }

    #[test]
    fn log_time_command_uses_official_add_work_syntax() {
        assert_eq!(log_time_command("1h", None), "add work 1h");
        assert_eq!(
            log_time_command("2h", Some("pairing on provider sync")),
            "add work 2h pairing on provider sync"
        );
        assert_eq!(log_time_command("30m", Some("   ")), "add work 30m");
    }
}
