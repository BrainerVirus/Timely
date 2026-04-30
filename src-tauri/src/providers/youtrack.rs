use reqwest::blocking::Client;
use serde::Deserialize;
use serde_json::{json, Value};
use std::error::Error;
use url::Url;
use urlencoding::encode;

use crate::{
    domain::models::{
        AssignedIssueRecord, IssueActivityItem, IssueActivityPage, IssueActor,
        IssueComposerCapabilities, IssueDetailsCapabilities, IssueDetailsSnapshot,
        IssueIterationDetails, IssueMetadataCapability, IssueMetadataField, IssueMetadataOption,
        IssueReference, IssueRelatedItem, IssueStatusOption, IssueTimeTrackingCapabilities,
        UpdateIssueMetadataInput,
    },
    error::AppError,
};

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

fn sanitize_url_for_error(url: &str) -> String {
    Url::parse(url)
        .map(|u| {
            let mut cleaned = u.clone();
            cleaned.set_query(Some(""));
            cleaned.to_string()
        })
        .unwrap_or_else(|_| url.to_string())
}

fn collect_reqwest_kind_labels(error: &reqwest::Error) -> String {
    let mut labels = Vec::new();
    if error.is_connect() {
        labels.push("connect");
    }
    if error.is_timeout() {
        labels.push("timeout");
    }
    if error.is_request() {
        labels.push("request");
    }
    if error.is_body() {
        labels.push("body");
    }
    if error.is_decode() {
        labels.push("decode");
    }
    if error.is_status() {
        labels.push("status");
    }
    if labels.is_empty() {
        labels.push("unknown");
    }
    labels.join(",")
}

fn collect_error_source_chain(error: &reqwest::Error) -> String {
    let mut chain = Vec::new();
    let mut current: Option<&(dyn Error + 'static)> = error.source();
    while let Some(e) = current {
        chain.push(e.to_string());
        current = e.source();
    }
    chain.join(" -> ")
}

/// Formats a reqwest error into a readable diagnostic string with:
/// - operation context
/// - sanitized URL (no token query params)
/// - reqwest kind flags (connect, timeout, etc.)
/// - full std::error::Error source chain
fn format_youtrack_request_error(
    operation: &str,
    url: &str,
    error: &reqwest::Error,
) -> String {
    let sanitized = sanitize_url_for_error(url);
    let kind_labels = collect_reqwest_kind_labels(error);
    let source_chain = collect_error_source_chain(error);

    let mut msg = format!(
        "YouTrack request failed: {operation} | URL: {sanitized} | kind={kind_labels}",
    );
    if !source_chain.is_empty() {
        msg.push_str(&format!(" | caused by: {source_chain}"));
    }
    msg
}

/// Execute a reqwest request with up to 3 retries on transient errors (timeout/connect).
/// Retries use exponential backoff: 2s, 4s, 8s. Progress is reported via on_progress.
fn execute_youtrack_request(
    operation: &str,
    url_str: &str,
    req: reqwest::blocking::RequestBuilder,
    mut on_progress: Option<&mut dyn FnMut(String)>,
) -> Result<reqwest::blocking::Response, AppError> {
    // #region agent log
    let log_ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let log_line = serde_json::json!({
        "id": format!("log_{}", log_ts),
        "timestamp": log_ts,
        "sessionId": "1704bf",
        "location": "youtrack.rs:execute_youtrack_request",
        "message": "about to send request",
        "data": { "operation": operation, "url": url_str },
        "runId": "run1",
        "hypothesisId": "H1"
    });
    if let Ok(log_dir) = std::env::var("HOME") {
        let log_path = format!("{}/.cursor/debug-1704bf.log", log_dir);
        if let Ok(mut file) = std::fs::OpenOptions::new().append(true).create(true).open(&log_path) {
            use std::io::Write;
            let _ = writeln!(file, "{}", log_line);
        }
    }
    // #endregion
    const MAX_RETRIES: usize = 3;
    let backoff_secs = [2u64, 4, 8];
    let mut attempt = 0usize;

    loop {
        let result = {
            let cloned_req = req.try_clone();
            match cloned_req {
                Some(cloned) => cloned.send(),
                None => {
                    let outcome = req.send();
                    match outcome {
                        Ok(resp) => return Ok(resp),
                        Err(error) => {
                            return Err(AppError::ProviderApi(format_youtrack_request_error(operation, url_str, &error)));
                        }
                    }
                }
            }
        };

        match result {
            Ok(resp) => {
                // #region agent log
                let log_ts2 = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_millis())
                    .unwrap_or(0);
                let log_line2 = serde_json::json!({
                    "id": format!("log_{}", log_ts2),
                    "timestamp": log_ts2,
                    "sessionId": "1704bf",
                    "location": "youtrack.rs:execute_youtrack_request",
                    "message": "request completed",
                    "data": { "operation": operation, "url": url_str, "success": true, "attempt": attempt + 1 },
                    "runId": "run1",
                    "hypothesisId": "H1"
                });
                if let Ok(log_dir) = std::env::var("HOME") {
                    let log_path = format!("{}/.cursor/debug-1704bf.log", log_dir);
                    if let Ok(mut file) = std::fs::OpenOptions::new().append(true).create(true).open(&log_path) {
                        use std::io::Write;
                        let _ = writeln!(file, "{}", log_line2);
                    }
                }
                // #endregion
                return Ok(resp);
            }
            Err(error) => {
                let is_retryable = error.is_timeout() || error.is_connect();
                if !is_retryable || attempt == MAX_RETRIES {
                    // #region agent log
                    let log_ts2 = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .map(|d| d.as_millis())
                        .unwrap_or(0);
                    let log_line2 = serde_json::json!({
                        "id": format!("log_{}", log_ts2),
                        "timestamp": log_ts2,
                        "sessionId": "1704bf",
                        "location": "youtrack.rs:execute_youtrack_request",
                        "message": "request failed",
                        "data": { "operation": operation, "url": url_str, "success": false, "attempt": attempt + 1, "kind": collect_reqwest_kind_labels(&error) },
                        "runId": "run1",
                        "hypothesisId": "H1"
                    });
                    if let Ok(log_dir) = std::env::var("HOME") {
                        let log_path = format!("{}/.cursor/debug-1704bf.log", log_dir);
                        if let Ok(mut file) = std::fs::OpenOptions::new().append(true).create(true).open(&log_path) {
                            use std::io::Write;
                            let _ = writeln!(file, "{}", log_line2);
                        }
                    }
                    // #endregion
                    return Err(AppError::ProviderApi(format_youtrack_request_error(operation, url_str, &error)));
                }

                let delay = backoff_secs[attempt.saturating_sub(1)];
                if let Some(ref mut cb) = on_progress {
                    cb(format!(
                        "YouTrack request timed out, retrying ({}/{}) in {}s...",
                        attempt + 1,
                        MAX_RETRIES + 1,
                        delay
                    ));
                }
                std::thread::sleep(std::time::Duration::from_secs(delay));
                attempt += 1;
            }
        }
    }
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
    project: Option<YouTrackProject>,
    tags: Option<Vec<YouTrackTag>>,
    comments: Option<Vec<YouTrackComment>>,
    custom_fields: Option<Vec<YouTrackCustomField>>,
    links: Option<Value>,
}

#[derive(Deserialize)]
struct YouTrackTag {
    name: String,
}

#[derive(Deserialize)]
struct YouTrackProject {
    name: Option<String>,
    #[serde(rename = "shortName")]
    short_name: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
struct YouTrackAgile {
    name: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
struct YouTrackSprint {
    id: Option<String>,
    name: Option<String>,
    start: Option<i64>,
    finish: Option<i64>,
    agile: Option<YouTrackAgile>,
    archived: Option<bool>,
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

#[derive(Clone, Debug, Default)]
struct YouTrackIterationMeta {
    id: Option<String>,
    title: Option<String>,
    start_date: Option<String>,
    due_date: Option<String>,
    cadence_title: Option<String>,
}

#[derive(Clone, Debug, Default)]
struct YouTrackCommonMetadata {
    project_name: Option<String>,
    issue_type: Option<String>,
    priority: Option<String>,
    start_date: Option<String>,
    due_date: Option<String>,
    estimate: Option<String>,
    metadata_fields: Vec<IssueMetadataField>,
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
        let mut out = Vec::new();
        let mut skip = 0u32;
        for _ in 0..MAX_PAGES {
            let top = PAGE.to_string();
            let skip_value = skip.to_string();
            let mut url = Url::parse(&format!("{}/api/issues", self.base_url()))?;
            url.query_pairs_mut()
                .append_pair("query", query)
                .append_pair("$top", top.as_str())
                .append_pair("$skip", skip_value.as_str())
                .append_pair("fields", fields);
            let url_str = url.to_string();
            // #region agent log
            let log_ts = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis())
                .unwrap_or(0);
            let log_line = serde_json::json!({
                "id": format!("log_{}", log_ts),
                "timestamp": log_ts,
                "sessionId": "1704bf",
                "location": "youtrack.rs:fetch_issues_for_query_paged",
                "message": "constructed URL for fetch_issues_for_query_paged",
                "data": { "query": query, "url": url_str, "skip": skip },
                "runId": "run1",
                "hypothesisId": "H1"
            });
            if let Ok(log_dir) = std::env::var("HOME") {
                let log_path = format!("{}/.cursor/debug-1704bf.log", log_dir);
                if let Ok(mut file) = std::fs::OpenOptions::new().append(true).create(true).open(&log_path) {
                    use std::io::Write;
                    let _ = writeln!(file, "{}", log_line);
                }
            }
            // #endregion
            let response = execute_youtrack_request("fetch assigned issues paged", &url_str, self.authorized(self.http.get(url)), None)?;
            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().unwrap_or_default();
                return Err(AppError::ProviderApi(format!(
                    "YouTrack issues query failed with status {status}: {body}"
                )));
            }
            let body = response.text()?;
            let batch = match serde_json::from_str::<Vec<YouTrackIssue>>(&body) {
                Ok(batch) => batch,
                Err(error) => {
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
        let response = execute_youtrack_request("fetch user profile", &url, self
            .http
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.token))
            .header("Accept", "application/json"), None)?;

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
        let work_items = self
            .fetch_issue_work_items(&reference.issue_id)
            .unwrap_or_default();
        Ok(self.map_issue_details(reference, issue, work_items))
    }

    pub fn create_issue_comment(&self, issue_id: &str, body: &str) -> Result<String, AppError> {
        let url = format!(
            "{}/api/issues/{issue_id}/comments?fields=id",
            self.base_url()
        );
        let url_str = url.clone();
        let response = execute_youtrack_request("create issue comment", &url_str, self
            .authorized(self.http.post(url))
            .json(&json!({ "text": body })), None)?;
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
        let url_str = update_url.clone();
        let response = execute_youtrack_request("update issue comment", &url_str, self
            .authorized(self.http.post(update_url))
            .json(&json!({ "text": body })), None)?;
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
        let url_str = url.clone();
        let response = execute_youtrack_request("delete issue comment", &url_str, self.authorized(self.http.delete(url)), None)?;
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
        let url_str = url.clone();
        let response = execute_youtrack_request("fetch issue activity", &url_str, self.authorized(self.http.get(url)), None)?;
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
        let url_str = url.clone();
        let response = execute_youtrack_request("log issue time", &url_str, self
            .authorized(self.http.post(url))
            .json(&json!({
                "query": query,
                "issues": [{ "idReadable": issue_id }],
            })), None)?;
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
            let url_str = url.clone();
            let response = execute_youtrack_request("update issue description", &url_str, self
                .authorized(self.http.post(url))
                .json(&json!({ "description": description })), None)?;
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
            let url_str = url.clone();
            let response = execute_youtrack_request("update issue labels", &url_str, self
                .authorized(self.http.post(url))
                .json(&json!({ "tags": tags })), None)?;
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
        let issues = self
            .fetch_issues_for_query_paged(open_assigned_issues_query(), assigned_issue_fields())?;
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
        let issues = self.fetch_issues_for_query_paged(&query, assigned_issue_fields())?;
        Ok(issues
            .into_iter()
            .map(|issue| self.to_assigned_issue_record(issue))
            .collect())
    }

    pub fn fetch_all_closed_assigned_issues(&self) -> Result<Vec<AssignedIssueRecord>, AppError> {
        let issues = self.fetch_issues_for_query_paged(
            all_closed_assigned_issues_query(),
            assigned_issue_fields(),
        )?;
        Ok(issues
            .into_iter()
            .map(|issue| self.to_assigned_issue_record(issue))
            .collect())
    }

    fn fetch_issue_sprints(&self, issue_id: &str) -> Result<Vec<YouTrackSprint>, AppError> {
        let encoded_issue_id = encode(issue_id);
        let mut url = Url::parse(&format!(
            "{}/api/issues/{encoded_issue_id}/sprints",
            self.base_url()
        ))?;
        url.query_pairs_mut()
            .append_pair("$top", "42")
            .append_pair("fields", "id,name,start,finish,agile(id,name),archived");
        let url_str = url.to_string();
        let response = execute_youtrack_request("fetch issue sprints", &url_str, self.authorized(self.http.get(url)), None)?;
        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().unwrap_or_default();
            return Err(AppError::ProviderApi(format!(
                "YouTrack issue sprints fetch failed for '{issue_id}' with status {status}: {body}"
            )));
        }

        Ok(response.json::<Vec<YouTrackSprint>>()?)
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
            let url_str = url.clone();
            let response = execute_youtrack_request("fetch issue work items", &url_str, self.authorized(self.http.get(url)), None)?;
            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().unwrap_or_default();
                return Err(AppError::ProviderApi(format!(
                    "YouTrack work items fetch failed with status {status}: {body}"
                )));
            }

            let body = response.text()?;

            let rows = match serde_json::from_str::<Vec<YouTrackWorkItemJson>>(&body) {
                Ok(rows) => rows,
                Err(error) => {
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
            "{}/api/issues/{issue_id}?fields=id,idReadable,summary,description,created,updated,resolved,project(name,shortName),tags(name),comments(id,text,created,updated,author(login,fullName,avatarUrl)),customFields(id,name,value(id,name,text,login,fullName,start,finish,minutes,presentation)),links(direction,linkType(name,directed,aggregation),issues(id,idReadable,summary,customFields(name,value(name,text))))",
            self.base_url()
        );
        let url_str = url.clone();
        let response = execute_youtrack_request("fetch issue details", &url_str, self.authorized(self.http.get(url)), None)?;
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
        work_items: Vec<YouTrackWorkItem>,
    ) -> IssueDetailsSnapshot {
        let issue_id_for_url = issue.id_readable.clone();
        let state = resolve_state(issue.custom_fields.as_deref());
        let iteration = extract_iteration_meta(issue.custom_fields.as_deref());
        let milestone = extract_milestone_meta(issue.custom_fields.as_deref());
        let common_metadata = extract_common_metadata(issue.custom_fields.as_deref());
        let project_name = issue
            .project
            .as_ref()
            .and_then(|project| project.name.clone().or_else(|| project.short_name.clone()))
            .or(common_metadata.project_name.clone());
        let (linked_items, child_items, parent_item) = extract_related_items(issue.links.as_ref());
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
        let total_minutes = work_items
            .iter()
            .map(|work_item| work_item.duration_minutes)
            .sum::<i64>();
        let total_time_spent = format_total_time_spent(total_minutes);
        let iteration_id = iteration.id.clone().or_else(|| {
            iteration
                .title
                .clone()
                .map(|title| format!("yt-iter:{title}"))
        });
        let iteration_option =
            iteration
                .title
                .clone()
                .zip(iteration_id.clone())
                .map(|(label, id)| IssueMetadataOption {
                    id,
                    label,
                    color: None,
                    badge: None,
                });
        let milestone_option = milestone.clone().map(|label| IssueMetadataOption {
            id: format!("yt-ms:{label}"),
            label,
            color: None,
            badge: None,
        });

        IssueDetailsSnapshot {
            reference: reference.clone(),
            key: issue.id_readable.clone(),
            title: issue.summary.unwrap_or_else(|| issue.id_readable.clone()),
            state: state.clone(),
            author: None,
            created_at: issue.created.map(to_iso),
            updated_at: issue.updated.map(to_iso),
            web_url: Some(format!("{}/issue/{}", self.base_url(), issue_id_for_url)),
            total_time_spent,
            description: issue.description,
            status: Some(IssueStatusOption {
                id: state.clone(),
                label: state,
                color: None,
                icon: None,
            }),
            status_options: Some(status_options.clone()),
            project_name,
            issue_type: common_metadata.issue_type,
            priority: common_metadata.priority,
            start_date: common_metadata.start_date,
            due_date: common_metadata.due_date,
            estimate: common_metadata.estimate,
            weight: None,
            participants: None,
            labels: labels.clone(),
            milestone_title: milestone.clone(),
            milestone: milestone_option.clone(),
            iteration: iteration.title.clone().map(|label| IssueIterationDetails {
                id: iteration_id.unwrap_or_else(|| format!("yt-iter:{label}")),
                label,
                start_date: iteration.start_date.clone(),
                due_date: iteration.due_date.clone(),
                web_url: None,
            }),
            parent_item,
            linked_items: Some(linked_items),
            child_items: Some(child_items),
            metadata_fields: (!common_metadata.metadata_fields.is_empty())
                .then_some(common_metadata.metadata_fields),
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
                iteration: IssueMetadataCapability {
                    enabled: false,
                    reason: Some(
                        "Iteration editing is not available for YouTrack in this version."
                            .to_string(),
                    ),
                    options: iteration_option.into_iter().collect(),
                },
                milestone: IssueMetadataCapability {
                    enabled: false,
                    reason: Some(
                        "Milestone editing is not available for YouTrack in this version."
                            .to_string(),
                    ),
                    options: milestone_option.into_iter().collect(),
                },
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
        let url_str = url.clone();
        let response = execute_youtrack_request("run command", &url_str, self
            .authorized(self.http.post(url))
            .json(&json!({
                "query": query,
                "issues": [{ "idReadable": issue_id }],
            })), None)?;
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
        let iteration = self.enrich_assigned_iteration_meta(
            &issue.id_readable,
            extract_iteration_meta(issue.custom_fields.as_deref()),
        );
        let state = resolve_state(issue.custom_fields.as_deref());
        let common_metadata = extract_common_metadata(issue.custom_fields.as_deref());
        AssignedIssueRecord {
            issue_graphql_id: issue.id.clone(),
            provider_item_id: issue.id_readable.clone(),
            title: issue.summary.unwrap_or_else(|| issue.id_readable.clone()),
            state: state.clone(),
            status_label: Some(state.clone()),
            workflow_status: normalize_workflow_status(&state, issue.resolved.is_some()),
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
            iteration_gitlab_id: iteration.id,
            iteration_group_id: None,
            iteration_cadence_id: None,
            iteration_cadence_title: iteration.cadence_title,
            iteration_title: iteration.title,
            iteration_start_date: iteration.start_date,
            iteration_due_date: iteration.due_date,
            start_date: common_metadata.start_date,
            due_date: common_metadata.due_date,
        }
    }

    fn enrich_assigned_iteration_meta(
        &self,
        issue_id: &str,
        iteration: YouTrackIterationMeta,
    ) -> YouTrackIterationMeta {
        if iteration_has_dates(&iteration) || (iteration.id.is_none() && iteration.title.is_none())
        {
            return iteration;
        }

        enrich_iteration_meta_with_sprints(iteration, self.fetch_issue_sprints(issue_id))
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

fn assigned_issue_fields() -> &'static str {
    "id,idReadable,summary,updated,resolved,tags(name),customFields(id,name,value(id,name,text,login,fullName,start,finish,minutes,presentation))"
}

fn log_time_command(time_spent: &str, summary: Option<&str>) -> String {
    match summary {
        Some(text) if !text.trim().is_empty() => format!("add work {time_spent} {}", text.trim()),
        _ => format!("add work {time_spent}"),
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

fn normalize_workflow_status(status: &str, is_resolved: bool) -> String {
    if is_resolved {
        return "done".to_string();
    }

    let normalized = status.trim().to_ascii_lowercase().replace(['_', '-'], " ");
    if normalized.contains("block") || normalized.contains("stuck") {
        return "blocked".to_string();
    }
    if matches!(
        normalized.as_str(),
        "done" | "fixed" | "resolved" | "complete" | "completed"
    ) {
        return "done".to_string();
    }
    if matches!(
        normalized.as_str(),
        "in progress" | "in review" | "review" | "wip" | "doing"
    ) {
        return "doing".to_string();
    }
    if matches!(
        normalized.as_str(),
        "open" | "submitted" | "to do" | "todo" | "backlog" | "ready"
    ) {
        return "todo".to_string();
    }
    if normalized.is_empty() {
        return "todo".to_string();
    }
    "other".to_string()
}

fn extract_iteration_meta(fields: Option<&[YouTrackCustomField]>) -> YouTrackIterationMeta {
    let Some(fields) = fields else {
        return YouTrackIterationMeta::default();
    };

    let Some(raw) = fields
        .iter()
        .find(|field| {
            field
                .name
                .as_deref()
                .map(|name| {
                    let lower = name.to_ascii_lowercase();
                    lower.contains("sprint") || lower.contains("iteration")
                })
                .unwrap_or(false)
        })
        .and_then(|field| field.value.as_ref())
    else {
        return YouTrackIterationMeta::default();
    };

    let raw = match raw {
        Value::Array(items) => items.first().unwrap_or(raw),
        _ => raw,
    };

    if let Value::Object(object) = raw {
        let id = object
            .get("id")
            .and_then(|value| value.as_str())
            .map(format_youtrack_sprint_id);
        let title = object
            .get("name")
            .or_else(|| object.get("text"))
            .and_then(|value| value.as_str())
            .map(ToOwned::to_owned);

        let start_date = object
            .get("start")
            .or_else(|| object.get("startDate"))
            .and_then(|value| value.as_i64())
            .map(to_iso_date);
        let due_date = object
            .get("finish")
            .or_else(|| object.get("dueDate"))
            .and_then(|value| value.as_i64())
            .map(to_iso_date);

        return YouTrackIterationMeta {
            id,
            title,
            start_date,
            due_date,
            cadence_title: None,
        };
    }

    YouTrackIterationMeta::default()
}

fn iteration_has_dates(iteration: &YouTrackIterationMeta) -> bool {
    iteration.start_date.is_some() && iteration.due_date.is_some()
}

fn enrich_iteration_meta_with_sprints(
    iteration: YouTrackIterationMeta,
    sprints: Result<Vec<YouTrackSprint>, AppError>,
) -> YouTrackIterationMeta {
    let Ok(sprints) = sprints else {
        return iteration;
    };
    let Some(sprint) = pick_youtrack_sprint(&sprints) else {
        return iteration;
    };
    let sprint_meta = iteration_meta_from_sprint(sprint);

    YouTrackIterationMeta {
        id: sprint_meta.id.or(iteration.id),
        title: sprint_meta.title.or(iteration.title),
        start_date: sprint_meta.start_date.or(iteration.start_date),
        due_date: sprint_meta.due_date.or(iteration.due_date),
        cadence_title: sprint_meta.cadence_title.or(iteration.cadence_title),
    }
}

fn pick_youtrack_sprint(sprints: &[YouTrackSprint]) -> Option<&YouTrackSprint> {
    sprints
        .iter()
        .find(|sprint| {
            sprint.archived != Some(true) && sprint.start.is_some() && sprint.finish.is_some()
        })
        .or_else(|| {
            sprints
                .iter()
                .find(|sprint| sprint.start.is_some() && sprint.finish.is_some())
        })
}

fn iteration_meta_from_sprint(sprint: &YouTrackSprint) -> YouTrackIterationMeta {
    YouTrackIterationMeta {
        id: sprint.id.as_deref().map(format_youtrack_sprint_id),
        title: sprint.name.clone(),
        start_date: sprint.start.map(to_iso_date),
        due_date: sprint.finish.map(to_iso_date),
        cadence_title: sprint.agile.as_ref().and_then(|agile| agile.name.clone()),
    }
}

fn format_youtrack_sprint_id(id: &str) -> String {
    format!("youtrack:sprint:{id}")
}

fn extract_common_metadata(fields: Option<&[YouTrackCustomField]>) -> YouTrackCommonMetadata {
    let Some(fields) = fields else {
        return YouTrackCommonMetadata::default();
    };
    let mut metadata = YouTrackCommonMetadata::default();

    for field in fields {
        let Some(name) = field.name.as_deref() else {
            continue;
        };
        let lower = name.to_ascii_lowercase();
        let value = field.value.as_ref().and_then(format_youtrack_field_value);

        if lower == "project" {
            metadata.project_name = value;
            continue;
        }
        if lower == "type" {
            metadata.issue_type = value;
            continue;
        }
        if lower == "priority" {
            metadata.priority = value;
            continue;
        }
        if lower == "estimation" || lower == "estimate" {
            metadata.estimate = value;
            continue;
        }
        if lower == "start date" || lower == "start" {
            metadata.start_date = field.value.as_ref().and_then(extract_youtrack_date_value);
            continue;
        }
        if lower == "due date" || lower == "due" {
            metadata.due_date = field.value.as_ref().and_then(extract_youtrack_date_value);
            continue;
        }

        if is_known_youtrack_field(&lower) {
            continue;
        }

        if let Some(value) = value.filter(|value| !value.trim().is_empty()) {
            metadata.metadata_fields.push(IssueMetadataField {
                id: name.to_string(),
                label: name.to_string(),
                value,
            });
        }
    }

    metadata
}

fn is_known_youtrack_field(lower: &str) -> bool {
    lower == "state"
        || lower.contains("sprint")
        || lower.contains("iteration")
        || lower.contains("milestone")
        || lower.contains("fix version")
        || lower == "assignee"
}

fn extract_milestone_meta(fields: Option<&[YouTrackCustomField]>) -> Option<String> {
    let fields = fields?;
    fields
        .iter()
        .find(|field| {
            field
                .name
                .as_deref()
                .map(|name| {
                    let lower = name.to_ascii_lowercase();
                    lower.contains("milestone") || lower.contains("fix version")
                })
                .unwrap_or(false)
        })
        .and_then(|field| field.value.as_ref())
        .and_then(extract_youtrack_field_value_label)
}

fn format_youtrack_field_value(value: &Value) -> Option<String> {
    match value {
        Value::Null => None,
        Value::String(text) => Some(text.clone()),
        Value::Number(number) => Some(number.to_string()),
        Value::Bool(value) => Some(value.to_string()),
        Value::Array(items) => {
            let values = items
                .iter()
                .filter_map(format_youtrack_field_value)
                .filter(|value| !value.trim().is_empty())
                .collect::<Vec<_>>();
            (!values.is_empty()).then(|| values.join(", "))
        }
        Value::Object(object) => object
            .get("presentation")
            .or_else(|| object.get("name"))
            .or_else(|| object.get("fullName"))
            .or_else(|| object.get("login"))
            .or_else(|| object.get("text"))
            .and_then(|value| value.as_str())
            .map(str::to_string)
            .or_else(|| {
                object
                    .get("minutes")
                    .and_then(|value| value.as_i64())
                    .map(format_minutes)
            }),
    }
}

fn extract_youtrack_date_value(value: &Value) -> Option<String> {
    match value {
        Value::Number(number) => number.as_i64().map(to_iso_date),
        Value::Object(object) => object
            .get("start")
            .or_else(|| object.get("startDate"))
            .or_else(|| object.get("finish"))
            .or_else(|| object.get("dueDate"))
            .and_then(|value| value.as_i64())
            .map(to_iso_date),
        _ => None,
    }
}

fn format_minutes(minutes: i64) -> String {
    if minutes <= 0 {
        return "0m".to_string();
    }
    let hours = minutes / 60;
    let remainder = minutes % 60;
    if hours > 0 && remainder > 0 {
        return format!("{hours}h {remainder}m");
    }
    if hours > 0 {
        return format!("{hours}h");
    }
    format!("{remainder}m")
}

fn format_total_time_spent(total_minutes: i64) -> Option<String> {
    if total_minutes <= 0 {
        return None;
    }

    let hours = total_minutes / 60;
    let minutes = total_minutes % 60;
    if hours > 0 && minutes > 0 {
        return Some(format!("{hours}h {minutes}m"));
    }
    if hours > 0 {
        return Some(format!("{hours}h"));
    }
    Some(format!("{minutes}m"))
}

fn extract_related_items(
    links: Option<&Value>,
) -> (
    Vec<IssueRelatedItem>,
    Vec<IssueRelatedItem>,
    Option<IssueRelatedItem>,
) {
    let mut linked_items = Vec::new();
    let mut child_items = Vec::new();
    let mut parent_item = None;
    let Some(Value::Array(groups)) = links else {
        return (linked_items, child_items, parent_item);
    };

    for group in groups {
        let direction = group
            .get("direction")
            .and_then(|value| value.as_str())
            .unwrap_or_default();
        let link_type = group
            .get("linkType")
            .and_then(|item| item.get("name"))
            .and_then(|value| value.as_str())
            .unwrap_or("Related");
        let (relation_label, relation_group) = normalize_youtrack_relation(link_type, direction);

        let Some(Value::Array(issues)) = group.get("issues") else {
            continue;
        };
        for issue in issues {
            let Some(issue_id) = issue.get("idReadable").and_then(|value| value.as_str()) else {
                continue;
            };
            let title = issue
                .get("summary")
                .and_then(|value| value.as_str())
                .unwrap_or(issue_id)
                .to_string();
            let state = issue
                .get("customFields")
                .and_then(|value| value.as_array())
                .map(|fields| {
                    let mapped = fields
                        .iter()
                        .map(|field| YouTrackCustomField {
                            name: field
                                .get("name")
                                .and_then(|value| value.as_str())
                                .map(ToOwned::to_owned),
                            value: field.get("value").cloned(),
                        })
                        .collect::<Vec<_>>();
                    resolve_state(Some(&mapped))
                })
                .unwrap_or_else(|| "Open".to_string());

            let related = IssueRelatedItem {
                reference: IssueReference {
                    provider: "youtrack".to_string(),
                    issue_id: issue_id.to_string(),
                    provider_issue_ref: issue_id.to_string(),
                },
                key: issue_id.to_string(),
                title,
                relation_label: relation_label.clone(),
                state,
                web_url: None,
                labels: vec![],
            };

            if relation_group == "parent" && parent_item.is_none() {
                parent_item = Some(related);
            } else if relation_group == "child" {
                child_items.push(related);
            } else {
                linked_items.push(related);
            }
        }
    }

    (linked_items, child_items, parent_item)
}

fn normalize_youtrack_relation(link_type: &str, direction: &str) -> (String, &'static str) {
    let link = link_type.to_ascii_lowercase();
    let direction = direction.to_ascii_lowercase();
    if link.contains("subtask") || direction.contains("subtask") || direction.contains("child") {
        if direction.contains("parent") || direction.contains("of") {
            return ("Parent".to_string(), "parent");
        }
        return ("Child".to_string(), "child");
    }
    if link.contains("depend") {
        if direction.contains("inward")
            || direction.contains("required")
            || direction.contains("depend")
        {
            return ("Blocked by".to_string(), "linked");
        }
        return ("Blocks".to_string(), "linked");
    }
    if link.contains("duplicate") {
        return ("Duplicate".to_string(), "linked");
    }
    if link.contains("relate") {
        return ("Related".to_string(), "linked");
    }
    (link_type.to_string(), "linked")
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
    fn assigned_issue_fields_use_safe_youtrack_custom_field_shape() {
        let fields = assigned_issue_fields();

        assert!(fields.contains("customFields(id,name,value("));
        assert!(fields.contains("start"));
        assert!(fields.contains("finish"));
        assert!(!fields.contains("startDate"));
        assert!(!fields.contains("dueDate"));
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

    #[test]
    fn sprint_fallback_adds_dates_when_custom_field_has_only_identity() {
        let base = YouTrackIterationMeta {
            id: Some("youtrack:sprint:73-2".to_string()),
            title: Some("OPS Sprint 12".to_string()),
            start_date: None,
            due_date: None,
            cadence_title: None,
        };
        let sprints = vec![
            YouTrackSprint {
                id: Some("73-1".to_string()),
                name: Some("Archived sprint".to_string()),
                start: Some(1_774_569_600_000),
                finish: Some(1_775_779_200_000),
                agile: Some(YouTrackAgile {
                    name: Some("OPS Board".to_string()),
                }),
                archived: Some(true),
            },
            YouTrackSprint {
                id: Some("73-2".to_string()),
                name: Some("OPS Sprint 12".to_string()),
                start: Some(1_775_779_200_000),
                finish: Some(1_776_988_800_000),
                agile: Some(YouTrackAgile {
                    name: Some("Delivery Board".to_string()),
                }),
                archived: Some(false),
            },
        ];

        let enriched = enrich_iteration_meta_with_sprints(base, Ok(sprints));

        assert_eq!(enriched.id.as_deref(), Some("youtrack:sprint:73-2"));
        assert_eq!(enriched.title.as_deref(), Some("OPS Sprint 12"));
        assert_eq!(enriched.start_date.as_deref(), Some("2026-04-10"));
        assert_eq!(enriched.due_date.as_deref(), Some("2026-04-24"));
        assert_eq!(enriched.cadence_title.as_deref(), Some("Delivery Board"));
    }

    #[test]
    fn sprint_fallback_error_keeps_base_iteration_metadata() {
        let base = YouTrackIterationMeta {
            id: Some("youtrack:sprint:73-2".to_string()),
            title: Some("OPS Sprint 12".to_string()),
            start_date: None,
            due_date: None,
            cadence_title: None,
        };

        let enriched = enrich_iteration_meta_with_sprints(
            base,
            Err(AppError::ProviderApi("sprints unavailable".to_string())),
        );

        assert_eq!(enriched.id.as_deref(), Some("youtrack:sprint:73-2"));
        assert_eq!(enriched.title.as_deref(), Some("OPS Sprint 12"));
        assert_eq!(enriched.start_date, None);
        assert_eq!(enriched.due_date, None);
    }

    #[test]
    fn sprint_fallback_without_dated_sprints_keeps_base_iteration_metadata() {
        let base = YouTrackIterationMeta {
            id: Some("youtrack:sprint:73-2".to_string()),
            title: Some("OPS Sprint 12".to_string()),
            start_date: None,
            due_date: None,
            cadence_title: None,
        };
        let sprints = vec![YouTrackSprint {
            id: Some("73-9".to_string()),
            name: Some("Undated board sprint".to_string()),
            start: None,
            finish: None,
            agile: Some(YouTrackAgile {
                name: Some("Delivery Board".to_string()),
            }),
            archived: Some(false),
        }];

        let enriched = enrich_iteration_meta_with_sprints(base, Ok(sprints));

        assert_eq!(enriched.id.as_deref(), Some("youtrack:sprint:73-2"));
        assert_eq!(enriched.title.as_deref(), Some("OPS Sprint 12"));
        assert_eq!(enriched.start_date, None);
        assert_eq!(enriched.due_date, None);
        assert_eq!(enriched.cadence_title, None);
    }

    #[test]
    fn assigned_record_maps_sprint_iteration_dates_from_custom_fields() {
        let client = YouTrackClient::new("https://company.youtrack.cloud/", "token").unwrap();
        let record = client.to_assigned_issue_record(YouTrackIssue {
            id: "2-17".to_string(),
            id_readable: "OPS-17".to_string(),
            summary: Some("Sprint-linked issue".to_string()),
            description: None,
            created: None,
            updated: Some(1_776_297_600_000), // 2026-04-10T00:00:00Z
            resolved: None,
            project: None,
            tags: Some(vec![]),
            comments: Some(vec![]),
            custom_fields: Some(vec![
                YouTrackCustomField {
                    name: Some("State".to_string()),
                    value: Some(json!({ "name": "In Progress" })),
                },
                YouTrackCustomField {
                    name: Some("Sprint".to_string()),
                    value: Some(json!({
                        "id": "73-2",
                        "name": "OPS Sprint 12",
                        "start": 1_775_779_200_000i64,
                        "finish": 1_776_988_800_000i64
                    })),
                },
            ]),
            links: None,
        });

        assert_eq!(
            record.iteration_gitlab_id.as_deref(),
            Some("youtrack:sprint:73-2")
        );
        assert_eq!(record.iteration_title.as_deref(), Some("OPS Sprint 12"));
        assert_eq!(record.iteration_start_date.as_deref(), Some("2026-04-10"));
        assert_eq!(record.iteration_due_date.as_deref(), Some("2026-04-24"));
        assert_eq!(record.workflow_status, "doing");
    }

    #[test]
    fn issue_details_map_youtrack_metadata_and_related_items() {
        let client = YouTrackClient::new("https://company.youtrack.cloud/", "token").unwrap();
        let reference = IssueReference {
            provider: "youtrack".to_string(),
            issue_id: "OPS-17".to_string(),
            provider_issue_ref: "OPS-17".to_string(),
        };
        let details = client.map_issue_details(
            &reference,
            YouTrackIssue {
                id: "2-17".to_string(),
                id_readable: "OPS-17".to_string(),
                summary: Some("Issue with metadata".to_string()),
                description: None,
                created: None,
                updated: None,
                resolved: None,
                project: None,
                tags: Some(vec![]),
                comments: Some(vec![]),
                custom_fields: Some(vec![
                    YouTrackCustomField {
                        name: Some("State".to_string()),
                        value: Some(json!({ "name": "In Progress" })),
                    },
                    YouTrackCustomField {
                        name: Some("Milestone".to_string()),
                        value: Some(json!({ "name": "Q2 Roadmap" })),
                    },
                    YouTrackCustomField {
                        name: Some("Sprint".to_string()),
                        value: Some(json!({
                            "id": "73-2",
                            "name": "OPS Sprint 12",
                            "start": 1_776_297_600_000i64,
                            "finish": 1_777_507_200_000i64
                        })),
                    },
                ]),
                links: Some(json!([
                    {
                        "direction": "subtask of",
                        "issues": [
                            {
                                "idReadable": "OPS-3",
                                "summary": "Child issue",
                                "customFields": [{ "name": "State", "value": { "name": "Open" } }]
                            }
                        ]
                    },
                    {
                        "direction": "relates to",
                        "issues": [
                            {
                                "idReadable": "OPS-20",
                                "summary": "Linked issue",
                                "customFields": [{ "name": "State", "value": { "name": "Done" } }]
                            }
                        ]
                    }
                ])),
            },
            vec![
                YouTrackWorkItem {
                    id: "wi-1".to_string(),
                    spent_at: "2026-04-10".to_string(),
                    uploaded_at: None,
                    duration_minutes: 90,
                },
                YouTrackWorkItem {
                    id: "wi-2".to_string(),
                    spent_at: "2026-04-11".to_string(),
                    uploaded_at: None,
                    duration_minutes: 30,
                },
            ],
        );

        assert_eq!(details.milestone_title.as_deref(), Some("Q2 Roadmap"));
        assert_eq!(
            details.iteration.as_ref().map(|item| item.label.as_str()),
            Some("OPS Sprint 12")
        );
        assert_eq!(details.total_time_spent.as_deref(), Some("2h"));
        assert_eq!(
            details.parent_item.as_ref().map(|item| item.key.as_str()),
            Some("OPS-3")
        );
        assert_eq!(
            details.child_items.as_ref().map(|items| items.len()),
            Some(0)
        );
        assert_eq!(
            details.linked_items.as_ref().map(|items| items.len()),
            Some(1)
        );
    }

    #[test]
    fn issue_details_preserve_unknown_youtrack_custom_fields() {
        let client = YouTrackClient::new("https://company.youtrack.cloud/", "token").unwrap();
        let reference = IssueReference {
            provider: "youtrack".to_string(),
            issue_id: "OPS-42".to_string(),
            provider_issue_ref: "OPS-42".to_string(),
        };
        let details = client.map_issue_details(
            &reference,
            YouTrackIssue {
                id: "2-42".to_string(),
                id_readable: "OPS-42".to_string(),
                summary: Some("Custom metadata issue".to_string()),
                description: None,
                created: None,
                updated: None,
                resolved: None,
                project: None,
                tags: Some(vec![]),
                comments: Some(vec![]),
                custom_fields: Some(vec![
                    YouTrackCustomField {
                        name: Some("State".to_string()),
                        value: Some(json!({ "name": "Open" })),
                    },
                    YouTrackCustomField {
                        name: Some("nw-sx-categories".to_string()),
                        value: Some(json!([{ "name": "Platform" }, { "name": "Billing" }])),
                    },
                    YouTrackCustomField {
                        name: Some("mw-sx-version".to_string()),
                        value: Some(json!({ "name": "2026.4" })),
                    },
                ]),
                links: None,
            },
            vec![],
        );

        let fields = details.metadata_fields.expect("metadata fields");
        assert_eq!(fields[0].label, "nw-sx-categories");
        assert_eq!(fields[0].value, "Platform, Billing");
        assert_eq!(fields[1].label, "mw-sx-version");
        assert_eq!(fields[1].value, "2026.4");
    }

    #[test]
    fn format_youtrack_request_error_includes_operation_context() {
        // Use localhost port 9 (nothing listening) to guarantee connection error
        let client = YouTrackClient::new("http://localhost:9", "token").unwrap();
        let url = "http://127.0.0.1:9/api/issues";
        let err = client.http.get(url).send().unwrap_err();
        let error_msg = format_youtrack_request_error("fetch assigned issues", url, &err);
        assert!(error_msg.contains("fetch assigned issues"));
        assert!(error_msg.contains("127.0.0.1:9/api/issues"));
    }

    #[test]
    fn format_youtrack_request_error_sanitizes_url() {
        let client = YouTrackClient::new("http://localhost:9", "token").unwrap();
        let url_with_token = "http://127.0.0.1:9/api/issues?token=secret123&fields=id";
        let err = client.http.get(url_with_token).send().unwrap_err();
        let error_msg = format_youtrack_request_error("fetch assigned issues", url_with_token, &err);
        assert!(!error_msg.contains("secret123"));
        assert!(error_msg.contains("127.0.0.1:9/api/issues"));
    }

    #[test]
    fn collect_reqwest_kind_labels_reports_non_empty_labels() {
        let fake_client = YouTrackClient::new("http://127.0.0.1:65535", "token").unwrap();
        let result = fake_client.http.get("https://example.invalid/").send();
        let err = result.unwrap_err();
        let labels = collect_reqwest_kind_labels(&err);
        // Should produce at least one kind label
        assert!(!labels.is_empty());
    }

    #[test]
    fn collect_error_source_chain_does_not_panic() {
        let fake_client = YouTrackClient::new("http://127.0.0.1:65535", "token").unwrap();
        let result = fake_client.http.get("https://example.invalid/").send();
        let err = result.unwrap_err();
        // Should not panic - just run the function
        let chain = collect_error_source_chain(&err);
        // Chain may be empty or contain error strings
        drop(chain);
    }

    #[test]
    fn execute_youtrack_request_wraps_send_error_with_operation_context() {
        let client = YouTrackClient::new("http://127.0.0.1:65535", "token").unwrap();
        let result = execute_youtrack_request(
            "test operation",
            "http://127.0.0.1:65535/api/test",
            client.authorized(client.http.get("http://127.0.0.1:65535/api/test")),
            None,
        );
        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();
        assert!(err_msg.contains("test operation"));
        assert!(err_msg.contains("kind="));
    }
}
