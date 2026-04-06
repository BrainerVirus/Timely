use chrono::NaiveDate;
use std::time::Duration;

use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

use crate::domain::models::{
    AssignedIssueRecord, AssignedIssueSnapshot, AssignedIssueSuggestion, AssignedIssuesPage,
    AssignedIssuesPeriodInput, AssignedIssuesQueryInput,
};
use crate::error::AppError;

const MAX_PAGES: u32 = 100;

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

#[derive(Debug, Clone, Deserialize)]
struct GraphQLResponse<T> {
    data: Option<T>,
    errors: Option<Vec<GraphQLError>>,
}

#[derive(Debug, Clone, Deserialize)]
struct GraphQLError {
    message: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TimelogsData {
    current_user: Option<CurrentUserTimelogs>,
}

#[derive(Debug, Clone, Deserialize)]
struct CurrentUserTimelogs {
    timelogs: TimelogConnection,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TimelogConnection {
    nodes: Vec<GraphQLTimelog>,
    page_info: PageInfo,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PageInfo {
    has_next_page: bool,
    end_cursor: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GraphQLTimelog {
    id: String,
    time_spent: i64,
    spent_at: Option<String>,
    note: Option<GraphQLTimelogNote>,
    issue: Option<GraphQLTimelogIssue>,
    merge_request: Option<GraphQLTimelogMr>,
    project: Option<GraphQLTimelogProject>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GraphQLTimelogNote {
    created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GraphQLTimelogIssue {
    iid: String,
    title: String,
    state: String,
    web_url: Option<String>,
    labels: Option<GraphQLLabels>,
}

#[derive(Debug, Clone, Deserialize)]
struct GraphQLLabels {
    nodes: Vec<GraphQLLabel>,
}

#[derive(Debug, Clone, Deserialize)]
struct GraphQLLabel {
    title: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GraphQLTimelogMr {
    iid: String,
    title: String,
    state: String,
    web_url: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GraphQLTimelogProject {
    full_path: String,
    name: String,
}

#[derive(Debug, Clone)]
pub struct FlatTimelog {
    pub id: String,
    pub time_spent: i64,
    pub spent_at: String,
    pub uploaded_at: Option<String>,
    pub project_path: Option<String>,
    pub project_name: Option<String>,
    pub item_key: Option<String>,
    pub item_title: Option<String>,
    pub item_state: Option<String>,
    pub item_web_url: Option<String>,
    pub item_labels: Option<Vec<String>>,
}

impl GitLabClient {
    pub fn new(host: &str, token: &str) -> Result<Self, AppError> {
        let base_url = if host.starts_with("http://") || host.starts_with("https://") {
            host.trim_end_matches('/').to_string()
        } else {
            format!("https://{}", host.trim_end_matches('/'))
        };

        let client = Client::builder()
            .connect_timeout(Duration::from_secs(30))
            .timeout(Duration::from_secs(60))
            .build()?;

        Ok(Self {
            client,
            base_url,
            token: token.to_string(),
        })
    }

    pub fn fetch_user(&self) -> Result<GitLabUser, AppError> {
        let response = self
            .client
            .get(format!("{}/api/v4/user", self.base_url))
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

    pub fn fetch_user_timelogs(
        &self,
        start_date: &str,
        end_date: &str,
        on_progress: &mut dyn FnMut(String),
    ) -> Result<Vec<FlatTimelog>, AppError> {
        let mut all_timelogs = Vec::new();
        let mut cursor: Option<String> = None;

        for page in 1..=MAX_PAGES {
            on_progress(format!("Fetching timelogs page {}...", page));

            let body = self.fetch_timelog_page(start_date, end_date, cursor.as_deref())?;
            let connection = extract_timelog_connection(body)?;
            let count = connection.nodes.len();

            all_timelogs.extend(connection.nodes.into_iter().map(flatten_timelog));

            on_progress(format!(
                "Page {}: {} entries (total: {})",
                page,
                count,
                all_timelogs.len()
            ));

            if connection.page_info.has_next_page {
                cursor = connection.page_info.end_cursor;
            } else {
                on_progress(format!("Done. {} timelogs fetched.", all_timelogs.len()));
                return Ok(all_timelogs);
            }
        }

        on_progress("Reached max page limit, stopping.".to_string());
        on_progress(format!("Done. {} timelogs fetched.", all_timelogs.len()));
        Ok(all_timelogs)
    }

    fn fetch_timelog_page(
        &self,
        start_date: &str,
        end_date: &str,
        cursor: Option<&str>,
    ) -> Result<GraphQLResponse<TimelogsData>, AppError> {
        let response = self
            .client
            .post(format!("{}/api/graphql", self.base_url))
            .header("Authorization", format!("Bearer {}", self.token))
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "query": build_timelog_query(start_date, end_date, cursor),
            }))
            .send()?;

        if !response.status().is_success() {
            return Err(AppError::GitLabApi(format!(
                "POST /api/graphql returned {}",
                response.status()
            )));
        }

        response.json().map_err(|error| {
            AppError::GitLabApi(format!("Failed to parse GraphQL response: {}", error))
        })
    }

    fn post_graphql_value(&self, body: &JsonValue) -> Result<JsonValue, AppError> {
        let response = self
            .client
            .post(format!("{}/api/graphql", self.base_url))
            .header("Authorization", format!("Bearer {}", self.token))
            .header("Content-Type", "application/json")
            .json(body)
            .send()?;

        if !response.status().is_success() {
            return Err(AppError::GitLabApi(format!(
                "POST /api/graphql returned {}",
                response.status()
            )));
        }

        let value: JsonValue = response.json().map_err(|error| {
            AppError::GitLabApi(format!("Failed to parse GraphQL response: {}", error))
        })?;

        if let Some(errors) = value.get("errors").and_then(|e| e.as_array()) {
            if !errors.is_empty() {
                let messages = errors
                    .iter()
                    .filter_map(|e| e.get("message").and_then(|m| m.as_str()))
                    .collect::<Vec<_>>()
                    .join("; ");
                return Err(AppError::GitLabApi(format!("GraphQL errors: {}", messages)));
            }
        }

        Ok(value)
    }

    /// Open issues assigned to the current user (paginated). Uses GraphQL first, then REST if
    /// GraphQL fails or returns no rows — GitLab often serializes `iid` as a JSON number in
    /// GraphQL, and some instances expose assigned issues more reliably via REST.
    pub fn fetch_assigned_open_issues(
        &self,
        on_progress: &mut dyn FnMut(String),
    ) -> Result<Vec<AssignedIssueRecord>, AppError> {
        match self.fetch_assigned_open_issues_graphql(on_progress) {
            Ok(rows) if !rows.is_empty() => Ok(rows),
            Ok(_) => {
                on_progress(
                    "GraphQL returned no assigned issues; loading via REST API…".to_string(),
                );
                self.fetch_assigned_open_issues_rest(on_progress)
            }
            Err(error) => {
                on_progress(format!(
                    "Assigned issues GraphQL failed ({error}); loading via REST API…"
                ));
                self.fetch_assigned_open_issues_rest(on_progress)
            }
        }
    }

    pub fn query_current_assigned_issues(
        &self,
        input: &AssignedIssuesQueryInput,
    ) -> Result<AssignedIssuesPage, AppError> {
        let page_size = input.page_size.clamp(1, 100);
        let cursor = decode_assigned_issues_cursor(input.cursor.as_deref())?;

        if matches!(cursor.source, AssignedIssuesCursorSource::Rest) {
            return self.query_current_assigned_issues_rest(input, page_size, cursor);
        }

        match self.query_current_assigned_issues_graphql(input, page_size, cursor) {
            Ok(page) if !page.items.is_empty() || page.has_next_page => Ok(page),
            Ok(_) => self.query_current_assigned_issues_rest(
                input,
                page_size,
                AssignedIssuesOpaqueCursor::rest(1),
            ),
            Err(_) => self.query_current_assigned_issues_rest(
                input,
                page_size,
                AssignedIssuesOpaqueCursor::rest(1),
            ),
        }
    }

    fn query_current_assigned_issues_graphql(
        &self,
        input: &AssignedIssuesQueryInput,
        page_size: usize,
        mut cursor: AssignedIssuesOpaqueCursor,
    ) -> Result<AssignedIssuesPage, AppError> {
        let user = self.fetch_user()?;
        let mut items = Vec::new();
        let mut suggestions = Vec::new();

        for _ in 0..MAX_PAGES {
            let body = assigned_issues_request_body(
                page_size,
                cursor.provider_cursor.as_deref(),
                &user.username,
                status_query_arg(input.status.as_str()),
                input.search.as_deref(),
                true,
            );
            let v = match self.post_graphql_value(&body) {
                Ok(v) => v,
                Err(error) => {
                    if error.to_string().contains("iteration") {
                        let fallback = assigned_issues_request_body(
                            page_size,
                            cursor.provider_cursor.as_deref(),
                            &user.username,
                            status_query_arg(input.status.as_str()),
                            input.search.as_deref(),
                            false,
                        );
                        self.post_graphql_value(&fallback)?
                    } else {
                        return Err(error);
                    }
                }
            };
            let rows = parse_assigned_issues_page(&v)?;
            collect_assigned_issue_suggestions(&mut suggestions, &rows, input.search.as_deref());

            let filtered = rows
                .into_iter()
                .filter(|row| matches_assigned_issue_query(row, input))
                .collect::<Vec<_>>();
            let remaining = page_size.saturating_sub(items.len());
            let available = filtered.len().saturating_sub(cursor.skip);
            let take_count = available.min(remaining);

            items.extend(
                filtered
                    .iter()
                    .skip(cursor.skip)
                    .take(take_count)
                    .map(snapshot_from_assigned_issue_record),
            );

            if take_count < available {
                let next_cursor = AssignedIssuesOpaqueCursor::graphql(
                    cursor.provider_cursor.clone(),
                    cursor.skip + take_count,
                );
                return Ok(AssignedIssuesPage {
                    items,
                    has_next_page: true,
                    end_cursor: Some(encode_assigned_issues_cursor(&next_cursor)?),
                    suggestions,
                });
            }

            let page_info = v
                .pointer("/data/issues/pageInfo")
                .ok_or_else(|| AppError::GitLabApi("Missing issues pageInfo".to_string()))?;
            let has_next = page_info
                .get("hasNextPage")
                .and_then(|value| value.as_bool())
                .unwrap_or(false);
            let next_provider_cursor = page_info
                .get("endCursor")
                .and_then(|value| value.as_str())
                .map(str::to_string);

            if !has_next || next_provider_cursor.is_none() {
                return Ok(AssignedIssuesPage {
                    items,
                    has_next_page: false,
                    end_cursor: None,
                    suggestions,
                });
            }

            cursor = AssignedIssuesOpaqueCursor::graphql(next_provider_cursor.clone(), 0);
            if items.len() == page_size {
                return Ok(AssignedIssuesPage {
                    items,
                    has_next_page: true,
                    end_cursor: Some(encode_assigned_issues_cursor(&cursor)?),
                    suggestions,
                });
            }
        }

        Ok(AssignedIssuesPage {
            items,
            has_next_page: false,
            end_cursor: None,
            suggestions,
        })
    }

    fn query_current_assigned_issues_rest(
        &self,
        input: &AssignedIssuesQueryInput,
        page_size: usize,
        mut cursor: AssignedIssuesOpaqueCursor,
    ) -> Result<AssignedIssuesPage, AppError> {
        let user = self.fetch_user()?;
        let mut items = Vec::new();
        let mut suggestions = Vec::new();

        for _ in 0..MAX_PAGES {
            let page = cursor.rest_page.max(1);
            let mut url = format!(
                "{}/api/v4/issues?assignee_id={}&scope=all&per_page={}&page={}",
                self.base_url, user.id, page_size, page
            );
            url.push_str(&format!(
                "&state={}",
                match input.status.as_str() {
                    "opened" => "opened",
                    "closed" => "closed",
                    _ => "all",
                }
            ));
            if let Some(search) = normalized_search(input.search.as_deref()) {
                url.push_str("&search=");
                url.push_str(&urlencoding::encode(search));
            }

            let response = self
                .client
                .get(&url)
                .header("PRIVATE-TOKEN", &self.token)
                .send()?;

            if !response.status().is_success() {
                return Err(AppError::GitLabApi(format!(
                    "GET /api/v4/issues returned {}",
                    response.status()
                )));
            }

            let next_page = response
                .headers()
                .get("x-next-page")
                .and_then(|value| value.to_str().ok())
                .and_then(|value| value.parse::<u32>().ok());
            let rows: Vec<JsonValue> = response.json().map_err(|error| {
                AppError::GitLabApi(format!("Failed to parse issues JSON: {}", error))
            })?;

            let mut parsed = Vec::new();
            for row in &rows {
                if let Some(record) = parse_rest_issue_row(row)? {
                    parsed.push(record);
                }
            }
            collect_assigned_issue_suggestions(&mut suggestions, &parsed, input.search.as_deref());

            let filtered = parsed
                .into_iter()
                .filter(|row| matches_assigned_issue_query(row, input))
                .collect::<Vec<_>>();
            let remaining = page_size.saturating_sub(items.len());
            let available = filtered.len().saturating_sub(cursor.skip);
            let take_count = available.min(remaining);

            items.extend(
                filtered
                    .iter()
                    .skip(cursor.skip)
                    .take(take_count)
                    .map(snapshot_from_assigned_issue_record),
            );

            if take_count < available {
                let next_cursor = AssignedIssuesOpaqueCursor::rest_with_skip(page, cursor.skip + take_count);
                return Ok(AssignedIssuesPage {
                    items,
                    has_next_page: true,
                    end_cursor: Some(encode_assigned_issues_cursor(&next_cursor)?),
                    suggestions,
                });
            }

            if next_page.is_none() {
                return Ok(AssignedIssuesPage {
                    items,
                    has_next_page: false,
                    end_cursor: None,
                    suggestions,
                });
            }

            cursor = AssignedIssuesOpaqueCursor::rest(next_page.unwrap_or(page + 1));
            if items.len() == page_size {
                return Ok(AssignedIssuesPage {
                    items,
                    has_next_page: true,
                    end_cursor: Some(encode_assigned_issues_cursor(&cursor)?),
                    suggestions,
                });
            }
        }

        Ok(AssignedIssuesPage {
            items,
            has_next_page: false,
            end_cursor: None,
            suggestions,
        })
    }

    fn fetch_assigned_open_issues_graphql(
        &self,
        on_progress: &mut dyn FnMut(String),
    ) -> Result<Vec<AssignedIssueRecord>, AppError> {
        let user = self.fetch_user()?;

        let mut all = Vec::new();
        let mut cursor: Option<String> = None;

        for page in 1..=MAX_PAGES {
            on_progress(format!("Fetching assigned issues page {}...", page));
            let body = assigned_issues_request_body(
                100,
                cursor.as_deref(),
                &user.username,
                Some("opened"),
                None,
                true,
            );
            let v = match self.post_graphql_value(&body) {
                Ok(v) => v,
                Err(err) => {
                    let msg = err.to_string();
                    if msg.contains("iteration") {
                        let fallback = assigned_issues_request_body(
                            100,
                            cursor.as_deref(),
                            &user.username,
                            Some("opened"),
                            None,
                            false,
                        );
                        self.post_graphql_value(&fallback)?
                    } else {
                        return Err(err);
                    }
                }
            };
            let page_issues = parse_assigned_issues_page(&v)?;
            let count = page_issues.len();
            all.extend(page_issues);

            on_progress(format!(
                "Assigned issues page {}: {} (total {})",
                page,
                count,
                all.len()
            ));

            let page_info = v
                .pointer("/data/issues/pageInfo")
                .ok_or_else(|| AppError::GitLabApi("Missing issues pageInfo".to_string()))?;

            let has_next = page_info
                .get("hasNextPage")
                .and_then(|x| x.as_bool())
                .unwrap_or(false);
            if !has_next {
                break;
            }
            cursor = page_info
                .get("endCursor")
                .and_then(|x| x.as_str())
                .map(str::to_string);
            if cursor.is_none() {
                break;
            }
        }

        Ok(all)
    }

    /// `GET /api/v4/issues?assignee_id=…&state=opened&scope=all` (same auth style as GraphQL).
    fn fetch_assigned_open_issues_rest(
        &self,
        on_progress: &mut dyn FnMut(String),
    ) -> Result<Vec<AssignedIssueRecord>, AppError> {
        let user = self.fetch_user()?;
        let mut all = Vec::new();

        for page in 1..=MAX_PAGES {
            on_progress(format!(
                "Fetching assigned issues via REST (page {})…",
                page
            ));
            let url = format!(
                "{}/api/v4/issues?assignee_id={}&state=opened&scope=all&per_page=100&page={}",
                self.base_url, user.id, page
            );

            let response = self
                .client
                .get(&url)
                .header("PRIVATE-TOKEN", &self.token)
                .send()?;

            if !response.status().is_success() {
                return Err(AppError::GitLabApi(format!(
                    "GET /api/v4/issues returned {}",
                    response.status()
                )));
            }

            let items: Vec<JsonValue> = response.json().map_err(|error| {
                AppError::GitLabApi(format!("Failed to parse issues JSON: {}", error))
            })?;

            if items.is_empty() {
                break;
            }

            let count = items.len();
            for item in items {
                if let Some(record) = parse_rest_issue_row(&item)? {
                    all.push(record);
                }
            }

            on_progress(format!(
                "REST assigned issues page {}: {} (total {})",
                page,
                count,
                all.len()
            ));

            if count < 100 {
                break;
            }
        }

        Ok(all)
    }

    /// Create a timelog on an issue (`timelogCreate`). Requires `api` scope with write access.
    pub fn create_issue_timelog(
        &self,
        issue_graphql_id: &str,
        time_spent: &str,
        spent_at: Option<&str>,
        summary: Option<&str>,
    ) -> Result<String, AppError> {
        let mut input = serde_json::json!({
            "issuableId": issue_graphql_id,
            "timeSpent": time_spent,
        });
        if let Some(d) = spent_at {
            input
                .as_object_mut()
                .expect("object")
                .insert("spentAt".to_string(), JsonValue::String(d.to_string()));
        }
        if let Some(s) = summary {
            input
                .as_object_mut()
                .expect("object")
                .insert("summary".to_string(), JsonValue::String(s.to_string()));
        }

        let body = serde_json::json!({
            "query": r#"mutation TimelyTimelogCreate($input: TimelogCreateInput!) {
                timelogCreate(input: $input) {
                    timelog { id }
                    errors
                }
            }"#,
            "variables": { "input": input }
        });

        let v = self.post_graphql_value(&body)?;
        let errors = v
            .pointer("/data/timelogCreate/errors")
            .and_then(|e| e.as_array())
            .cloned()
            .unwrap_or_default();
        if !errors.is_empty() {
            let msg = errors
                .iter()
                .filter_map(|e| {
                    e.as_str().map(str::to_string).or_else(|| {
                        e.get("message")
                            .and_then(|m| m.as_str())
                            .map(str::to_string)
                    })
                })
                .collect::<Vec<_>>()
                .join("; ");
            return Err(AppError::GitLabApi(format!(
                "timelogCreate failed: {}",
                if msg.is_empty() { "unknown" } else { &msg }
            )));
        }

        let id = v
            .pointer("/data/timelogCreate/timelog/id")
            .and_then(|x| x.as_str())
            .ok_or_else(|| {
                AppError::GitLabApi("timelogCreate returned no timelog id".to_string())
            })?;
        Ok(id.to_string())
    }

    /// Add a markdown note (comment) on an issue. Requires `api` scope with write access.
    pub fn create_issue_note(
        &self,
        issue_graphql_id: &str,
        body_md: &str,
    ) -> Result<String, AppError> {
        let body = serde_json::json!({
            "query": r#"mutation TimelyCreateNote($input: CreateNoteInput!) {
                createNote(input: $input) {
                    note { id }
                    errors
                }
            }"#,
            "variables": {
                "input": {
                    "noteableId": issue_graphql_id,
                    "body": body_md
                }
            }
        });

        let v = self.post_graphql_value(&body)?;
        let errors = v
            .pointer("/data/createNote/errors")
            .and_then(|e| e.as_array())
            .cloned()
            .unwrap_or_default();
        if !errors.is_empty() {
            let msg = errors
                .iter()
                .filter_map(|e| {
                    e.as_str().map(str::to_string).or_else(|| {
                        e.get("message")
                            .and_then(|m| m.as_str())
                            .map(str::to_string)
                    })
                })
                .collect::<Vec<_>>()
                .join("; ");
            return Err(AppError::GitLabApi(format!(
                "createNote failed: {}",
                if msg.is_empty() { "unknown" } else { &msg }
            )));
        }

        let id = v
            .pointer("/data/createNote/note/id")
            .and_then(|x| x.as_str())
            .ok_or_else(|| AppError::GitLabApi("createNote returned no note id".to_string()))?;
        Ok(id.to_string())
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
struct AssignedIssuesOpaqueCursor {
    source: AssignedIssuesCursorSource,
    provider_cursor: Option<String>,
    rest_page: u32,
    skip: usize,
}

impl AssignedIssuesOpaqueCursor {
    fn graphql(provider_cursor: Option<String>, skip: usize) -> Self {
        Self {
            source: AssignedIssuesCursorSource::Graphql,
            provider_cursor,
            rest_page: 1,
            skip,
        }
    }

    fn rest(rest_page: u32) -> Self {
        Self {
            source: AssignedIssuesCursorSource::Rest,
            provider_cursor: None,
            rest_page,
            skip: 0,
        }
    }

    fn rest_with_skip(rest_page: u32, skip: usize) -> Self {
        Self {
            source: AssignedIssuesCursorSource::Rest,
            provider_cursor: None,
            rest_page,
            skip,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
enum AssignedIssuesCursorSource {
    Graphql,
    Rest,
}

fn decode_assigned_issues_cursor(
    cursor: Option<&str>,
) -> Result<AssignedIssuesOpaqueCursor, AppError> {
    match cursor {
        None | Some("") => Ok(AssignedIssuesOpaqueCursor::graphql(None, 0)),
        Some(raw) => serde_json::from_str(raw).map_err(|error| {
            AppError::GitLabApi(format!("Invalid assigned issues cursor: {error}"))
        }),
    }
}

fn encode_assigned_issues_cursor(cursor: &AssignedIssuesOpaqueCursor) -> Result<String, AppError> {
    serde_json::to_string(cursor)
        .map_err(|error| AppError::GitLabApi(format!("Failed to encode cursor: {error}")))
}

fn assigned_issues_request_body(
    page_size: usize,
    cursor: Option<&str>,
    assignee_username: &str,
    state: Option<&str>,
    search: Option<&str>,
    include_iteration: bool,
) -> JsonValue {
    let after_clause = cursor
        .map(|value| format!(", after: {}", serde_json::to_string(value).unwrap_or_default()))
        .unwrap_or_default();
    let state_clause = state
        .map(|value| format!(", state: {value}"))
        .unwrap_or_default();
    let search_clause = normalized_search(search)
        .map(|value| format!(", search: {}", serde_json::to_string(value).unwrap_or_default()))
        .unwrap_or_default();
    let iteration_fields = if include_iteration {
        "iteration { title startDate dueDate }"
    } else {
        ""
    };
    let query = format!(
        r#"query {{
  issues(first: {page_size}, assigneeUsername: {assignee_username}{state_clause}{search_clause}{after_clause}) {{
    nodes {{
      id
      iid
      title
      state
      webUrl
      reference(full: true)
      labels(first: 20) {{ nodes {{ title }} }}
      milestone {{ title }}
      {iteration_fields}
    }}
    pageInfo {{
      hasNextPage
      endCursor
    }}
  }}
}}"#,
        assignee_username = serde_json::to_string(assignee_username).unwrap_or_default(),
    );

    serde_json::json!({ "query": query })
}

fn status_query_arg(status: &str) -> Option<&'static str> {
    match status {
        "opened" => Some("opened"),
        "closed" => Some("closed"),
        _ => None,
    }
}

/// GraphQL scalars like `iid` may be serialized as JSON strings or numbers depending on instance.
fn json_scalar_to_string(value: Option<&JsonValue>) -> Option<String> {
    let v = value?;
    if let Some(s) = v.as_str() {
        return Some(s.to_string());
    }
    if let Some(n) = v.as_i64() {
        return Some(n.to_string());
    }
    if let Some(n) = v.as_u64() {
        return Some(n.to_string());
    }
    None
}

fn parse_assigned_issues_page(v: &JsonValue) -> Result<Vec<AssignedIssueRecord>, AppError> {
    let nodes = v
        .pointer("/data/issues/nodes")
        .and_then(|n| n.as_array())
        .ok_or_else(|| AppError::GitLabApi("Missing issues nodes".to_string()))?;

    let mut out = Vec::new();
    for node in nodes {
        let id = node
            .get("id")
            .and_then(|x| x.as_str())
            .ok_or_else(|| AppError::GitLabApi("Issue missing id".to_string()))?;
        let title = node
            .get("title")
            .and_then(|x| x.as_str())
            .unwrap_or("Untitled")
            .to_string();
        let state = node
            .get("state")
            .and_then(|x| x.as_str())
            .unwrap_or("opened")
            .to_string();
        let web_url = node
            .get("webUrl")
            .and_then(|x| x.as_str())
            .map(str::to_string);
        let labels = node
            .pointer("/labels/nodes")
            .and_then(|n| n.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|l| l.get("title").and_then(|t| t.as_str()).map(str::to_string))
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        let milestone_title = node
            .pointer("/milestone/title")
            .and_then(|x| x.as_str())
            .map(str::to_string);
        let iteration_title = node
            .pointer("/iteration/title")
            .and_then(|x| x.as_str())
            .map(str::to_string);
        let iteration_start_date = node
            .pointer("/iteration/startDate")
            .and_then(|x| x.as_str())
            .map(str::to_string);
        let iteration_due_date = node
            .pointer("/iteration/dueDate")
            .and_then(|x| x.as_str())
            .map(str::to_string);

        let provider_item_id = node
            .get("reference")
            .and_then(|x| x.as_str())
            .map(str::to_string)
            .or_else(|| {
                let url = web_url.as_deref()?;
                provider_item_id_from_issue_web_url(url)
            })
            .ok_or_else(|| {
                AppError::GitLabApi(
                    "Issue missing reference(full: true) / webUrl for provider key".to_string(),
                )
            })?;

        out.push(AssignedIssueRecord {
            issue_graphql_id: id.to_string(),
            provider_item_id,
            title,
            state,
            web_url,
            labels,
            milestone_title,
            iteration_title,
            iteration_start_date,
            iteration_due_date,
        });
    }

    Ok(out)
}

fn parse_rest_issue_row(item: &JsonValue) -> Result<Option<AssignedIssueRecord>, AppError> {
    let state = item
        .get("state")
        .and_then(|x| x.as_str())
        .unwrap_or("")
        .to_string();

    let id = item
        .get("id")
        .and_then(|x| x.as_i64())
        .or_else(|| item.get("id").and_then(|x| x.as_u64()).map(|n| n as i64))
        .ok_or_else(|| AppError::GitLabApi("REST issue missing id".to_string()))?;

    json_scalar_to_string(item.get("iid"))
        .ok_or_else(|| AppError::GitLabApi("REST issue missing iid".to_string()))?;

    let title = item
        .get("title")
        .and_then(|x| x.as_str())
        .unwrap_or("Untitled")
        .to_string();

    let web_url = item
        .get("web_url")
        .and_then(|x| x.as_str())
        .map(str::to_string);

    let provider_item_id = item
        .pointer("/references/full")
        .and_then(|x| x.as_str())
        .map(str::to_string)
        .or_else(|| {
            item.pointer("/references/relative")
                .and_then(|x| x.as_str())
                .map(str::to_string)
        })
        .or_else(|| {
            let url = web_url.as_deref()?;
            provider_item_id_from_issue_web_url(url)
        })
        .ok_or_else(|| {
            AppError::GitLabApi(
                "REST issue missing references.full / web_url for provider key".to_string(),
            )
        })?;

    let labels = item
        .get("labels")
        .and_then(|l| l.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|x| {
                    if let Some(s) = x.as_str() {
                        Some(s.to_string())
                    } else {
                        x.get("title")
                            .or_else(|| x.get("name"))
                            .and_then(|n| n.as_str())
                            .map(str::to_string)
                    }
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let milestone_title = item
        .pointer("/milestone/title")
        .and_then(|x| x.as_str())
        .map(str::to_string);

    let issue_graphql_id = format!("gid://gitlab/Issue/{id}");

    Ok(Some(AssignedIssueRecord {
        issue_graphql_id,
        provider_item_id,
        title,
        state,
        web_url,
        labels,
        milestone_title,
        iteration_title: None,
        iteration_start_date: None,
        iteration_due_date: None,
    }))
}

fn normalized_search(search: Option<&str>) -> Option<&str> {
    search.map(str::trim).filter(|value| !value.is_empty())
}

fn snapshot_from_assigned_issue_record(record: &AssignedIssueRecord) -> AssignedIssueSnapshot {
    AssignedIssueSnapshot {
        key: record.provider_item_id.clone(),
        title: record.title.clone(),
        state: record.state.clone(),
        web_url: record.web_url.clone(),
        labels: record.labels.clone(),
        milestone_title: record.milestone_title.clone(),
        iteration_title: record.iteration_title.clone(),
        iteration_start_date: record.iteration_start_date.clone(),
        iteration_due_date: record.iteration_due_date.clone(),
        issue_graphql_id: record.issue_graphql_id.clone(),
    }
}

fn collect_assigned_issue_suggestions(
    suggestions: &mut Vec<AssignedIssueSuggestion>,
    rows: &[AssignedIssueRecord],
    search: Option<&str>,
) {
    let Some(query) = normalized_search(search).map(str::to_lowercase) else {
        return;
    };

    for row in rows {
        if suggestions.len() >= 8 {
            break;
        }

        let mut candidates = vec![row.title.clone(), row.provider_item_id.clone()];
        if let Some(iteration_title) = &row.iteration_title {
            candidates.push(iteration_title.clone());
        }

        for candidate in candidates {
            let lower = candidate.to_lowercase();
            if !lower.contains(&query) || suggestions.iter().any(|item| item.value == candidate) {
                continue;
            }
            suggestions.push(AssignedIssueSuggestion {
                value: candidate.clone(),
                label: candidate,
            });
            if suggestions.len() >= 8 {
                break;
            }
        }
    }
}

fn matches_assigned_issue_query(record: &AssignedIssueRecord, input: &AssignedIssuesQueryInput) -> bool {
    if let Some(search) = normalized_search(input.search.as_deref()) {
        let search = search.to_lowercase();
        let searchable = [
            record.title.as_str(),
            record.provider_item_id.as_str(),
            record.iteration_title.as_deref().unwrap_or_default(),
            record.milestone_title.as_deref().unwrap_or_default(),
        ];
        if !searchable.iter().any(|value| value.to_lowercase().contains(&search)) {
            return false;
        }
    }

    if let Some(iteration_code) = normalized_search(input.iteration_code.as_deref()) {
        let expected = iteration_code.to_lowercase();
        if !collect_iteration_tokens(record)
            .iter()
            .any(|token| token.eq_ignore_ascii_case(&expected))
        {
            return false;
        }
    }

    if let Some(period) = &input.iteration_period {
        return iteration_overlaps_period(record, period);
    }

    true
}

fn collect_iteration_tokens(record: &AssignedIssueRecord) -> Vec<String> {
    let mut tokens = Vec::new();

    if let Some(iteration_title) = &record.iteration_title {
        for part in iteration_title.split(|ch: char| !ch.is_ascii_alphanumeric()) {
            if (2..=6).contains(&part.len()) && part.chars().all(|ch| ch.is_ascii_alphabetic()) {
                let token = part.to_ascii_uppercase();
                if !tokens.contains(&token) {
                    tokens.push(token);
                }
            }
        }
    }

    for label in &record.labels {
        for part in label.split(|ch: char| !ch.is_ascii_alphanumeric()) {
            if (2..=6).contains(&part.len()) && part.chars().all(|ch| ch.is_ascii_alphabetic()) {
                let token = part.to_ascii_uppercase();
                if !tokens.contains(&token) {
                    tokens.push(token);
                }
            }
        }
    }

    if let Some(project) = record.provider_item_id.split('#').next() {
        for segment in project.split('/') {
            if (2..=6).contains(&segment.len()) && segment.chars().all(|ch| ch.is_ascii_alphabetic()) {
                let token = segment.to_ascii_uppercase();
                if !tokens.contains(&token) {
                    tokens.push(token);
                }
            }
        }
    }

    tokens
}

fn iteration_overlaps_period(record: &AssignedIssueRecord, period: &AssignedIssuesPeriodInput) -> bool {
    let Ok(period_start) = NaiveDate::parse_from_str(&period.start, "%Y-%m-%d") else {
        return true;
    };
    let Ok(period_end) = NaiveDate::parse_from_str(&period.end, "%Y-%m-%d") else {
        return true;
    };
    let Some(iteration_start) = record
        .iteration_start_date
        .as_deref()
        .and_then(|value| NaiveDate::parse_from_str(value, "%Y-%m-%d").ok())
    else {
        return true;
    };
    let Some(iteration_end) = record
        .iteration_due_date
        .as_deref()
        .and_then(|value| NaiveDate::parse_from_str(value, "%Y-%m-%d").ok())
    else {
        return true;
    };

    iteration_start <= period_end && iteration_end >= period_start
}

/// `https://host/group/proj/-/issues/12` → `group/proj#12`
fn provider_item_id_from_issue_web_url(web_url: &str) -> Option<String> {
    let path = web_url.split("/-/issues/").nth(1)?;
    let iid = path.split('?').next()?.trim_end_matches('/');
    if iid.is_empty() {
        return None;
    }
    let base = web_url.split("/-/issues/").next()?;
    let host_and_path = base
        .strip_prefix("https://")
        .or_else(|| base.strip_prefix("http://"))?;
    let path_only = host_and_path.find('/').map(|i| &host_and_path[i + 1..])?;
    if path_only.is_empty() {
        return None;
    }
    Some(format!("{path_only}#{iid}"))
}

fn build_timelog_query(start_date: &str, end_date: &str, cursor: Option<&str>) -> String {
    let after_clause = cursor
        .map(|value| format!(", after: \"{}\"", value))
        .unwrap_or_default();

    format!(
        r#"query {{
  currentUser {{
    timelogs(first: 100, sort: SPENT_AT_DESC, startDate: "{}", endDate: "{}"{}) {{
      nodes {{
        id
        timeSpent
        spentAt
        note {{
          createdAt
        }}
        issue {{
          iid
          title
          state
          webUrl
          labels(first: 10) {{ nodes {{ title }} }}
        }}
        mergeRequest {{
          iid
          title
          state
          webUrl
        }}
        project {{
          fullPath
          name
        }}
      }}
      pageInfo {{
        hasNextPage
        endCursor
      }}
    }}
  }}
}}"#,
        start_date, end_date, after_clause
    )
}

fn extract_timelog_connection(
    body: GraphQLResponse<TimelogsData>,
) -> Result<TimelogConnection, AppError> {
    if let Some(errors) = &body.errors {
        if !errors.is_empty() {
            let messages = errors
                .iter()
                .map(|error| error.message.as_str())
                .collect::<Vec<_>>()
                .join("; ");
            return Err(AppError::GitLabApi(format!("GraphQL errors: {}", messages)));
        }
    }

    let data = body
        .data
        .ok_or_else(|| AppError::GitLabApi("GraphQL response missing data field".to_string()))?;
    let user = data
        .current_user
        .ok_or_else(|| AppError::GitLabApi("GraphQL response missing currentUser".to_string()))?;

    Ok(user.timelogs)
}

fn flatten_timelog(node: GraphQLTimelog) -> FlatTimelog {
    let spent_at = node.spent_at.unwrap_or_else(|| "1970-01-01".to_string());
    let uploaded_at = node.note.as_ref().map(|note| note.created_at.clone());
    let project_path = node
        .project
        .as_ref()
        .map(|project| project.full_path.clone());
    let project_name = node.project.as_ref().map(|project| project.name.clone());

    if let Some(issue) = node.issue {
        return FlatTimelog {
            id: node.id,
            time_spent: node.time_spent,
            spent_at,
            uploaded_at,
            project_path: project_path.clone(),
            project_name,
            item_key: Some(build_item_key(project_path.as_deref(), '#', &issue.iid)),
            item_title: Some(issue.title),
            item_state: Some(issue.state),
            item_web_url: issue.web_url,
            item_labels: issue
                .labels
                .map(|labels| labels.nodes.into_iter().map(|label| label.title).collect()),
        };
    }

    if let Some(merge_request) = node.merge_request {
        return FlatTimelog {
            id: node.id,
            time_spent: node.time_spent,
            spent_at,
            uploaded_at,
            project_path: project_path.clone(),
            project_name,
            item_key: Some(build_item_key(
                project_path.as_deref(),
                '!',
                &merge_request.iid,
            )),
            item_title: Some(merge_request.title),
            item_state: Some(merge_request.state),
            item_web_url: merge_request.web_url,
            item_labels: None,
        };
    }

    FlatTimelog {
        id: node.id,
        time_spent: node.time_spent,
        spent_at,
        uploaded_at,
        project_path,
        project_name,
        item_key: None,
        item_title: None,
        item_state: None,
        item_web_url: None,
        item_labels: None,
    }
}

fn build_item_key(project_path: Option<&str>, separator: char, iid: &str) -> String {
    project_path
        .map(|path| format!("{}{}{}", path, separator, iid))
        .unwrap_or_else(|| format!("{}{}", separator, iid))
}

#[cfg(test)]
mod assigned_issues_tests {
    use super::*;

    #[test]
    fn parse_assigned_issues_page_reads_root_issues_connection() {
        let v = serde_json::json!({
            "data": {
                "issues": {
                    "nodes": [{
                        "id": "gid://gitlab/Issue/1",
                        "iid": "42",
                        "title": "Hello",
                        "state": "opened",
                        "webUrl": "https://gitlab.com/g/p/-/issues/42",
                        "reference": "g/p#42",
                        "labels": { "nodes": [{ "title": "bug" }] },
                        "milestone": { "title": "M1" },
                        "iteration": { "title": "It1", "startDate": "2026-01-01", "dueDate": "2026-01-14" }
                    }],
                    "pageInfo": { "hasNextPage": false, "endCursor": null }
                }
            }
        });
        let rows = parse_assigned_issues_page(&v).unwrap();
        assert_eq!(rows.len(), 1);
        let r = &rows[0];
        assert_eq!(r.issue_graphql_id, "gid://gitlab/Issue/1");
        assert_eq!(r.provider_item_id, "g/p#42");
        assert_eq!(r.title, "Hello");
        assert_eq!(r.iteration_title.as_deref(), Some("It1"));
        assert_eq!(r.iteration_start_date.as_deref(), Some("2026-01-01"));
        assert_eq!(r.labels, vec!["bug".to_string()]);
    }

    #[test]
    fn parse_assigned_issues_page_falls_back_to_web_url_for_provider_key() {
        let v = serde_json::json!({
            "data": {
                "issues": {
                    "nodes": [{
                        "id": "gid://gitlab/Issue/2",
                        "iid": 99,
                        "title": "Fallback",
                        "state": "opened",
                        "webUrl": "https://gitlab.com/group/sub/-/issues/99",
                        "labels": { "nodes": [] },
                        "milestone": null,
                        "iteration": null
                    }],
                    "pageInfo": { "hasNextPage": false, "endCursor": null }
                }
            }
        });

        let rows = parse_assigned_issues_page(&v).unwrap();
        assert_eq!(rows[0].provider_item_id, "group/sub#99");
    }

    #[test]
    fn assigned_issues_request_includes_assignee_gid_string_variable() {
        let body = assigned_issues_request_body(20, None, "cris", Some("opened"), Some("bug"), true);
        assert!(body
            .get("query")
            .and_then(|q| q.as_str())
            .is_some_and(|q| q.contains("assigneeUsername: \"cris\"")));
        assert!(body
            .get("query")
            .and_then(|q| q.as_str())
            .is_some_and(|q| q.contains("state: opened")));
        assert!(body
            .get("query")
            .and_then(|q| q.as_str())
            .is_some_and(|q| q.contains("search: \"bug\"")));
        assert!(body
            .get("query")
            .and_then(|q| q.as_str())
            .is_some_and(|q| q.contains("reference(full: true)")));
    }

    #[test]
    fn assigned_issue_cursor_round_trip_preserves_source_and_skip() {
        let cursor = AssignedIssuesOpaqueCursor::graphql(Some("abc".to_string()), 7);
        let encoded = encode_assigned_issues_cursor(&cursor).unwrap();
        let decoded = decode_assigned_issues_cursor(Some(encoded.as_str())).unwrap();
        assert_eq!(decoded, cursor);
    }

    #[test]
    fn iteration_period_tolerates_missing_dates() {
        let row = AssignedIssueRecord {
            issue_graphql_id: "gid://gitlab/Issue/1".to_string(),
            provider_item_id: "g/p#1".to_string(),
            title: "Hello".to_string(),
            state: "opened".to_string(),
            web_url: None,
            labels: vec![],
            milestone_title: None,
            iteration_title: None,
            iteration_start_date: None,
            iteration_due_date: None,
        };
        assert!(iteration_overlaps_period(
            &row,
            &AssignedIssuesPeriodInput {
                start: "2026-01-01".to_string(),
                end: "2026-01-14".to_string(),
            }
        ));
    }
}
