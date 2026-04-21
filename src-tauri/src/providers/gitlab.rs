use chrono::NaiveDate;
use std::collections::HashSet;
use std::time::Duration;

use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

use crate::domain::models::{
    AssignedIssueRecord, AssignedIssueSnapshot, AssignedIssueSuggestion, AssignedIssuesPage,
    AssignedIssuesPeriodInput, AssignedIssuesQueryInput, CachedIterationRecord, IssueActivityItem,
    IssueActor, IssueComposerCapabilities, IssueDetailsCapabilities, IssueDetailsSnapshot,
    IssueIterationDetails, IssueMetadataCapability, IssueMetadataOption, IssueReference,
    IssueRelatedItem, IssueStatusOption, IssueTimeTrackingCapabilities, UpdateIssueMetadataInput,
};
use crate::error::AppError;
use crate::support::iteration_label::iteration_display_label;

const MAX_PAGES: u32 = 100;

pub struct GitLabClient {
    client: Client,
    base_url: String,
    token: String,
}

pub struct IterationCatalogSyncResult {
    pub iterations: Vec<CachedIterationRecord>,
    pub groups_fetched: usize,
    pub pages_fetched: usize,
    pub cadence_batches_resolved: usize,
    pub catalog_state: String,
    pub catalog_message: Option<String>,
}

pub struct AssignedIssuesFetchResult {
    pub records: Vec<AssignedIssueRecord>,
    pub used_fallback_full_scan: bool,
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

    pub fn fetch_open_assigned_issues(
        &self,
        on_progress: &mut dyn FnMut(String),
    ) -> Result<Vec<AssignedIssueRecord>, AppError> {
        self.fetch_assigned_issues_for_state_rest("opened", on_progress)
    }

    pub fn fetch_recent_closed_assigned_issues(
        &self,
        closed_after: &str,
        on_progress: &mut dyn FnMut(String),
    ) -> Result<AssignedIssuesFetchResult, AppError> {
        match self.fetch_assigned_issues_closed_after_graphql(closed_after, on_progress) {
            Ok(records) => Ok(AssignedIssuesFetchResult {
                records,
                used_fallback_full_scan: false,
            }),
            Err(error) => {
                on_progress(format!(
                    "WARN: recent closed GraphQL sync failed, falling back to full closed scan: {error}"
                ));
                Ok(AssignedIssuesFetchResult {
                    records: self.fetch_assigned_issues_for_state_rest("closed", on_progress)?,
                    used_fallback_full_scan: true,
                })
            }
        }
    }

    pub fn fetch_all_closed_assigned_issues(
        &self,
        on_progress: &mut dyn FnMut(String),
    ) -> Result<Vec<AssignedIssueRecord>, AppError> {
        self.fetch_assigned_issues_for_state_rest("closed", on_progress)
    }

    pub fn fetch_iteration_catalog_for_group(
        &self,
        group_id: &str,
        updated_after: Option<&str>,
        on_progress: &mut dyn FnMut(String),
    ) -> Result<IterationCatalogSyncResult, AppError> {
        let encoded_group = urlencoding::encode(group_id);
        let mut merged = std::collections::HashMap::<String, CachedIterationRecord>::new();
        let mut pages_fetched = 0_usize;

        for page in 1..=MAX_PAGES {
            pages_fetched += 1;
            on_progress(format!(
                "Fetching iterations for group {group_id} (page {page})..."
            ));

            let mut url = format!(
                "{}/api/v4/groups/{}/iterations?include_ancestors=true&state=all&per_page=100&page={}",
                self.base_url, encoded_group, page
            );
            if let Some(updated_after) = updated_after {
                url.push_str("&updated_after=");
                url.push_str(&urlencoding::encode(updated_after));
            }

            let response = self
                .client
                .get(&url)
                .header("PRIVATE-TOKEN", &self.token)
                .send()?;

            if !response.status().is_success() {
                return Err(AppError::GitLabApi(format!(
                    "GET /api/v4/groups/{}/iterations returned {}",
                    group_id,
                    response.status()
                )));
            }

            let rows: Vec<JsonValue> = response.json().map_err(|error| {
                AppError::GitLabApi(format!(
                    "Failed to parse group iterations JSON for {}: {}",
                    group_id, error
                ))
            })?;

            if rows.is_empty() {
                break;
            }

            let row_count = rows.len();
            for row in rows {
                let Some(mut iteration) = parse_iteration_catalog_row(&row)? else {
                    continue;
                };
                if iteration.group_id.is_none() {
                    iteration.group_id = Some(group_id.to_string());
                }
                merged
                    .entry(iteration.iteration_gitlab_id.clone())
                    .and_modify(|existing| merge_iteration_catalog_record(existing, &iteration))
                    .or_insert(iteration);
            }

            if row_count < 100 {
                break;
            }
        }

        let mut iterations = merged.into_values().collect::<Vec<_>>();
        iterations.sort_by(|left, right| left.iteration_gitlab_id.cmp(&right.iteration_gitlab_id));

        let cadence_resolution = self.resolve_iteration_cadences(&iterations, on_progress);
        let mut cadence_batches_resolved = 0_usize;
        let mut catalog_state = "ready".to_string();
        let mut catalog_message = None;

        match cadence_resolution {
            Ok(result) => {
                cadence_batches_resolved = result.batches_resolved;
                for iteration in &mut iterations {
                    if let Some(enrichment) =
                        result.by_iteration_id.get(&iteration.iteration_gitlab_id)
                    {
                        if iteration.cadence_id.is_none() {
                            iteration.cadence_id = enrichment.cadence_id.clone();
                        }
                        if iteration.cadence_title.is_none() {
                            iteration.cadence_title = enrichment.cadence_title.clone();
                        }
                    }
                }
            }
            Err(error) => {
                catalog_state = "partial".to_string();
                catalog_message = Some(format!(
                    "Iteration cadence metadata could not be resolved from GitLab: {error}"
                ));
            }
        }

        Ok(IterationCatalogSyncResult {
            iterations,
            groups_fetched: 1,
            pages_fetched,
            cadence_batches_resolved,
            catalog_state,
            catalog_message,
        })
    }

    #[allow(dead_code)]
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

    #[allow(dead_code)]
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
                None,
                input.search.as_deref(),
                AssignedIssuesIterationFields::Cadence,
            );
            let v = match self.post_graphql_value(&body) {
                Ok(v) => v,
                Err(error) => {
                    let message = error.to_string();
                    if message.contains("iterationCadence") {
                        let fallback = assigned_issues_request_body(
                            page_size,
                            cursor.provider_cursor.as_deref(),
                            &user.username,
                            status_query_arg(input.status.as_str()),
                            None,
                            input.search.as_deref(),
                            AssignedIssuesIterationFields::Basic,
                        );
                        self.post_graphql_value(&fallback)?
                    } else if message.contains("iteration") {
                        let fallback = assigned_issues_request_body(
                            page_size,
                            cursor.provider_cursor.as_deref(),
                            &user.username,
                            status_query_arg(input.status.as_str()),
                            None,
                            input.search.as_deref(),
                            AssignedIssuesIterationFields::None,
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
                    years: vec![],
                    iteration_options: vec![],
                    catalog_state: "ready".to_string(),
                    catalog_message: None,
                    page: 1,
                    page_size,
                    total_items: page_size,
                    total_pages: 2,
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
                    years: vec![],
                    iteration_options: vec![],
                    catalog_state: "ready".to_string(),
                    catalog_message: None,
                    page: 1,
                    page_size,
                    total_items: 0,
                    total_pages: 1,
                });
            }

            cursor = AssignedIssuesOpaqueCursor::graphql(next_provider_cursor.clone(), 0);
            if items.len() == page_size {
                return Ok(AssignedIssuesPage {
                    items,
                    has_next_page: true,
                    end_cursor: Some(encode_assigned_issues_cursor(&cursor)?),
                    suggestions,
                    years: vec![],
                    iteration_options: vec![],
                    catalog_state: "ready".to_string(),
                    catalog_message: None,
                    page: 1,
                    page_size,
                    total_items: page_size,
                    total_pages: 2,
                });
            }
        }

        Ok(AssignedIssuesPage {
            items,
            has_next_page: false,
            end_cursor: None,
            suggestions,
            years: vec![],
            iteration_options: vec![],
            catalog_state: "ready".to_string(),
            catalog_message: None,
            page: 1,
            page_size,
            total_items: 0,
            total_pages: 1,
        })
    }

    #[allow(dead_code)]
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
                let next_cursor =
                    AssignedIssuesOpaqueCursor::rest_with_skip(page, cursor.skip + take_count);
                return Ok(AssignedIssuesPage {
                    items,
                    has_next_page: true,
                    end_cursor: Some(encode_assigned_issues_cursor(&next_cursor)?),
                    suggestions,
                    years: vec![],
                    iteration_options: vec![],
                    catalog_state: "ready".to_string(),
                    catalog_message: None,
                    page: 1,
                    page_size,
                    total_items: page_size,
                    total_pages: 2,
                });
            }

            if next_page.is_none() {
                return Ok(AssignedIssuesPage {
                    items,
                    has_next_page: false,
                    end_cursor: None,
                    suggestions,
                    years: vec![],
                    iteration_options: vec![],
                    catalog_state: "ready".to_string(),
                    catalog_message: None,
                    page: 1,
                    page_size,
                    total_items: 0,
                    total_pages: 1,
                });
            }

            cursor = AssignedIssuesOpaqueCursor::rest(next_page.unwrap_or(page + 1));
            if items.len() == page_size {
                return Ok(AssignedIssuesPage {
                    items,
                    has_next_page: true,
                    end_cursor: Some(encode_assigned_issues_cursor(&cursor)?),
                    suggestions,
                    years: vec![],
                    iteration_options: vec![],
                    catalog_state: "ready".to_string(),
                    catalog_message: None,
                    page: 1,
                    page_size,
                    total_items: page_size,
                    total_pages: 2,
                });
            }
        }

        Ok(AssignedIssuesPage {
            items,
            has_next_page: false,
            end_cursor: None,
            suggestions,
            years: vec![],
            iteration_options: vec![],
            catalog_state: "ready".to_string(),
            catalog_message: None,
            page: 1,
            page_size,
            total_items: 0,
            total_pages: 1,
        })
    }

    #[allow(dead_code)]
    fn fetch_assigned_issues_for_state_graphql(
        &self,
        state: &str,
        closed_after: Option<&str>,
        on_progress: &mut dyn FnMut(String),
    ) -> Result<Vec<AssignedIssueRecord>, AppError> {
        let user = self.fetch_user()?;

        let mut all = Vec::new();
        let mut cursor: Option<String> = None;

        for page in 1..=MAX_PAGES {
            on_progress(format!("Fetching {state} assigned issues page {}...", page));
            let body = assigned_issues_request_body(
                100,
                cursor.as_deref(),
                &user.username,
                Some(state),
                closed_after,
                None,
                AssignedIssuesIterationFields::Cadence,
            );
            let v = match self.post_graphql_value(&body) {
                Ok(v) => v,
                Err(err) => {
                    let msg = err.to_string();
                    if msg.contains("iterationCadence") {
                        let fallback = assigned_issues_request_body(
                            100,
                            cursor.as_deref(),
                            &user.username,
                            Some(state),
                            closed_after,
                            None,
                            AssignedIssuesIterationFields::Basic,
                        );
                        self.post_graphql_value(&fallback)?
                    } else if msg.contains("iteration") {
                        let fallback = assigned_issues_request_body(
                            100,
                            cursor.as_deref(),
                            &user.username,
                            Some(state),
                            closed_after,
                            None,
                            AssignedIssuesIterationFields::None,
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
                "{state} assigned issues page {}: {} (total {})",
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

    fn fetch_assigned_issues_closed_after_graphql(
        &self,
        closed_after: &str,
        on_progress: &mut dyn FnMut(String),
    ) -> Result<Vec<AssignedIssueRecord>, AppError> {
        self.fetch_assigned_issues_for_state_graphql("closed", Some(closed_after), on_progress)
    }

    pub fn load_issue_details(
        &self,
        reference: &IssueReference,
    ) -> Result<IssueDetailsSnapshot, AppError> {
        let viewer_username = self.fetch_user().ok().map(|user| user.username);
        let (project_path, issue_iid) = parse_issue_reference_key(&reference.issue_id)?;
        let issue = self.fetch_issue_json(project_path, issue_iid)?;
        let notes = self.fetch_issue_notes_json(project_path, issue_iid)?;
        let project_labels = self.fetch_project_labels_json(project_path)?;
        let graph_ql_details = self
            .fetch_issue_work_item_details_graphql(project_path, issue_iid)
            .ok();

        let current_labels = issue
            .get("labels")
            .and_then(|labels| labels.as_array())
            .map(|labels| {
                labels
                    .iter()
                    .filter_map(|label| label.as_str())
                    .map(|label| IssueMetadataOption {
                        id: label.to_string(),
                        label: label.to_string(),
                        color: None,
                        badge: None,
                    })
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();

        let label_options = project_labels
            .into_iter()
            .filter_map(|label| {
                let name = label
                    .get("name")
                    .or_else(|| label.get("title"))
                    .and_then(|value| value.as_str())?;
                Some(IssueMetadataOption {
                    id: name.to_string(),
                    label: name.to_string(),
                    color: label
                        .get("color")
                        .and_then(|value| value.as_str())
                        .map(str::to_string),
                    badge: None,
                })
            })
            .collect::<Vec<_>>();

        let milestone_title = issue
            .get("milestone")
            .and_then(|milestone| milestone.get("title"))
            .and_then(|value| value.as_str())
            .map(str::to_string);

        let current_milestone = issue.get("milestone").and_then(parse_issue_milestone_option);

        let milestone_options = self
            .fetch_project_milestones_json(project_path)
            .ok()
            .map(|rows| {
                rows.into_iter()
                    .filter_map(|row| parse_issue_milestone_option(&row))
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();

        let group_iteration_options = project_group_path(project_path)
            .and_then(|group_path| self.fetch_group_iterations_json(group_path).ok())
            .map(|rows| {
                rows.into_iter()
                    .filter_map(|row| parse_group_iteration_option(&row))
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();

        let mut iteration = graph_ql_details
            .as_ref()
            .and_then(parse_graphql_issue_iteration)
            .or_else(|| parse_rest_issue_iteration(&issue));

        if let Some(ref mut current) = iteration {
            enrich_issue_iteration_label_from_catalog(current, &group_iteration_options);
        }

        let activity = notes
            .into_iter()
            .map(|note| IssueActivityItem {
                id: note
                    .get("id")
                    .and_then(|value| value.as_i64())
                    .map(|value| value.to_string())
                    .unwrap_or_else(|| "note".to_string()),
                kind: if note
                    .get("system")
                    .and_then(|value| value.as_bool())
                    .unwrap_or(false)
                {
                    "system".to_string()
                } else {
                    "comment".to_string()
                },
                body: note
                    .get("body")
                    .and_then(|value| value.as_str())
                    .unwrap_or_default()
                    .to_string(),
                created_at: note
                    .get("created_at")
                    .and_then(|value| value.as_str())
                    .unwrap_or_default()
                    .to_string(),
                updated_at: note
                    .get("updated_at")
                    .and_then(|value| value.as_str())
                    .map(str::to_string),
                system: note
                    .get("system")
                    .and_then(|value| value.as_bool())
                    .unwrap_or(false),
                author: note.get("author").and_then(|author| {
                    Some(IssueActor {
                        name: author
                            .get("name")
                            .and_then(|value| value.as_str())?
                            .to_string(),
                        username: author
                            .get("username")
                            .and_then(|value| value.as_str())
                            .map(str::to_string),
                        avatar_url: author
                            .get("avatar_url")
                            .and_then(|value| value.as_str())
                            .map(str::to_string),
                    })
                }),
            })
            .collect::<Vec<_>>();

        let iteration_options = if group_iteration_options.is_empty() {
            iteration
                .clone()
                .map(|value| {
                    vec![IssueMetadataOption {
                        id: value.id.clone(),
                        label: value.label.clone(),
                        color: None,
                        badge: None,
                    }]
                })
                .unwrap_or_default()
        } else {
            let mut options = group_iteration_options.clone();
            if let Some(current) = iteration.as_ref() {
                if !options.iter().any(|option| option.id == current.id) {
                    options.insert(
                        0,
                        IssueMetadataOption {
                            id: current.id.clone(),
                            label: current.label.clone(),
                            color: None,
                            badge: None,
                        },
                    );
                }
            }
            options
        };
        let iteration_enabled = !group_iteration_options.is_empty();
        let status = graph_ql_details.as_ref().and_then(parse_graphql_issue_status);
        let status_options = status.clone().map(|value| {
            vec![IssueStatusOption {
                id: value.id.clone(),
                label: value.label.clone(),
                color: value.color.clone(),
                icon: value.icon.clone(),
            }]
        });
        let linked_items = graph_ql_details
            .as_ref()
            .and_then(parse_graphql_linked_items)
            .or_else(|| self.fetch_issue_links_json(project_path, issue_iid).ok())
            .map(|items| items.into_iter().collect::<Vec<_>>());
        let child_items = graph_ql_details
            .as_ref()
            .and_then(parse_graphql_child_items)
            .map(|items| items.into_iter().collect::<Vec<_>>());

        Ok(IssueDetailsSnapshot {
            reference: IssueReference {
                provider: reference.provider.clone(),
                issue_id: reference.issue_id.clone(),
                provider_issue_ref: issue
                    .get("id")
                    .and_then(|value| value.as_i64())
                    .map(|value| format!("gid://gitlab/Issue/{}", value))
                    .or_else(|| {
                        issue
                            .get("id")
                            .and_then(|value| value.as_str())
                            .map(str::to_string)
                    })
                    .unwrap_or_else(|| reference.provider_issue_ref.clone()),
            },
            key: reference.issue_id.clone(),
            title: issue
                .get("title")
                .and_then(|value| value.as_str())
                .unwrap_or_default()
                .to_string(),
            state: issue
                .get("state")
                .and_then(|value| value.as_str())
                .unwrap_or("opened")
                .to_string(),
            author: issue.get("author").and_then(parse_issue_actor_json),
            created_at: issue
                .get("created_at")
                .and_then(|value| value.as_str())
                .map(str::to_string),
            updated_at: issue
                .get("updated_at")
                .and_then(|value| value.as_str())
                .map(str::to_string),
            web_url: issue
                .get("web_url")
                .or_else(|| issue.get("webUrl"))
                .and_then(|value| value.as_str())
                .map(str::to_string),
            description: issue
                .get("description")
                .and_then(|value| value.as_str())
                .map(str::to_string),
            status,
            status_options: status_options.clone(),
            labels: current_labels,
            milestone_title,
            milestone: current_milestone.clone(),
            iteration: iteration.clone(),
            linked_items,
            child_items,
            activity,
            viewer_username,
            capabilities: IssueDetailsCapabilities {
                status: IssueMetadataCapability {
                    enabled: false,
                    reason: status_options.as_ref().map(|_| {
                        "Workflow status is not editable from Timely yet.".to_string()
                    }),
                    options: status_options
                        .clone()
                        .unwrap_or_default()
                        .into_iter()
                        .map(|value| IssueMetadataOption {
                            id: value.id,
                            label: value.label,
                            color: value.color,
                            badge: None,
                        })
                        .collect::<Vec<_>>(),
                },
                labels: IssueMetadataCapability {
                    enabled: true,
                    reason: None,
                    options: label_options,
                },
                iteration: IssueMetadataCapability {
                    enabled: iteration_enabled,
                    reason: if iteration_enabled {
                        None
                    } else {
                        Some(
                            "GitLab does not expose iteration options for this view yet."
                                .to_string(),
                        )
                    },
                    options: iteration_options,
                },
                milestone: IssueMetadataCapability {
                    enabled: !milestone_options.is_empty(),
                    reason: if milestone_options.is_empty() {
                        Some("No active milestones available for this project.".to_string())
                    } else {
                        None
                    },
                    options: milestone_options,
                },
                composer: IssueComposerCapabilities {
                    enabled: true,
                    modes: vec!["write".to_string(), "preview".to_string()],
                    supports_quick_actions: true,
                },
                time_tracking: IssueTimeTrackingCapabilities {
                    enabled: true,
                    supports_quick_actions: true,
                },
            },
        })
    }

    pub fn update_issue_metadata(
        &self,
        input: &UpdateIssueMetadataInput,
    ) -> Result<IssueDetailsSnapshot, AppError> {
        let (project_path, issue_iid) = parse_issue_reference_key(&input.reference.issue_id)?;
        let mut body = serde_json::Map::new();

        if let Some(state) = input.state.as_deref() {
            if let Some(state_event) = match state {
                "closed" => Some("close"),
                "opened" => Some("reopen"),
                _ => None,
            } {
                body.insert(
                    "state_event".to_string(),
                    JsonValue::String(state_event.to_string()),
                );
            }
        }

        if let Some(labels) = input.labels.as_ref() {
            body.insert(
                "labels".to_string(),
                JsonValue::String(labels.join(",")),
            );
        }

        if let Some(milestone_id) = input.milestone_id.as_ref() {
            let value = milestone_id
                .as_deref()
                .map(gitlab_numeric_id_from_gid)
                .unwrap_or_else(|| "0".to_string());
            body.insert("milestone_id".to_string(), JsonValue::String(value));
        }

        if let Some(description) = input.description.as_ref() {
            body.insert(
                "description".to_string(),
                JsonValue::String(description.clone()),
            );
        }

        let has_json_body = !body.is_empty();
        let has_iteration_change = input.iteration_id.is_some();

        if !has_json_body && !has_iteration_change {
            return Err(AppError::GitLabApi(
                "No supported metadata changes were provided.".to_string(),
            ));
        }

        if has_json_body {
            let encoded_project = urlencoding::encode(project_path);
            let url = format!(
                "{}/api/v4/projects/{}/issues/{}",
                self.base_url, encoded_project, issue_iid
            );
            let response = self
                .client
                .put(url)
                .header("PRIVATE-TOKEN", &self.token)
                .header("Content-Type", "application/json")
                .json(&JsonValue::Object(body))
                .send()?;

            if !response.status().is_success() {
                return Err(AppError::GitLabApi(format!(
                    "PUT /api/v4/projects/{}/issues/{} returned {}",
                    project_path,
                    issue_iid,
                    response.status()
                )));
            }
        }

        if let Some(iteration_setting) = input.iteration_id.as_ref() {
            self.apply_issue_iteration(project_path, issue_iid, iteration_setting.as_deref())?;
        }

        self.load_issue_details(&input.reference)
    }

    fn apply_issue_iteration(
        &self,
        project_path: &str,
        issue_iid: &str,
        iteration_id: Option<&str>,
    ) -> Result<(), AppError> {
        let iteration_gid = iteration_id.map(ensure_iteration_global_id);
        let body = serde_json::json!({
            "query": r#"
              mutation SetIssueIteration($projectPath: ID!, $iid: String!, $iterationId: IterationID) {
                issueSetIteration(input: { projectPath: $projectPath, iid: $iid, iterationId: $iterationId }) {
                  errors
                }
              }
            "#,
            "variables": {
                "projectPath": project_path,
                "iid": issue_iid,
                "iterationId": iteration_gid,
            },
        });
        let value = self.post_graphql_value(&body)?;
        if let Some(errors) = value.pointer("/data/issueSetIteration/errors").and_then(|v| v.as_array()) {
            if !errors.is_empty() {
                let message = errors
                    .iter()
                    .filter_map(|item| item.as_str())
                    .collect::<Vec<_>>()
                    .join("; ");
                return Err(AppError::GitLabApi(format!(
                    "issueSetIteration failed: {}",
                    message
                )));
            }
        }
        Ok(())
    }

    fn fetch_project_milestones_json(
        &self,
        project_path: &str,
    ) -> Result<Vec<JsonValue>, AppError> {
        let encoded_project = urlencoding::encode(project_path);
        let response = self
            .client
            .get(format!(
                "{}/api/v4/projects/{}/milestones?state=active&per_page=100&include_parent_milestones=true",
                self.base_url, encoded_project
            ))
            .header("PRIVATE-TOKEN", &self.token)
            .send()?;

        if !response.status().is_success() {
            return Err(AppError::GitLabApi(format!(
                "GET /api/v4/projects/{}/milestones returned {}",
                project_path,
                response.status()
            )));
        }

        response.json().map_err(AppError::from)
    }

    fn fetch_group_iterations_json(&self, group_path: &str) -> Result<Vec<JsonValue>, AppError> {
        let encoded_group = urlencoding::encode(group_path);
        let response = self
            .client
            .get(format!(
                "{}/api/v4/groups/{}/iterations?include_ancestors=true&state=opened&per_page=100",
                self.base_url, encoded_group
            ))
            .header("PRIVATE-TOKEN", &self.token)
            .send()?;

        if !response.status().is_success() {
            return Err(AppError::GitLabApi(format!(
                "GET /api/v4/groups/{}/iterations returned {}",
                group_path,
                response.status()
            )));
        }

        response.json().map_err(AppError::from)
    }

    /// `GET /api/v4/issues?assignee_id=…&state=…&scope=all` (same auth style as GraphQL).
    fn fetch_assigned_issues_for_state_rest(
        &self,
        state: &str,
        on_progress: &mut dyn FnMut(String),
    ) -> Result<Vec<AssignedIssueRecord>, AppError> {
        let user = self.fetch_user()?;
        let mut all = Vec::new();

        for page in 1..=MAX_PAGES {
            on_progress(format!(
                "Fetching {state} assigned issues via REST (page {})…",
                page,
            ));
            let url = format!(
                "{}/api/v4/issues?assignee_id={}&state={}&scope=all&per_page=100&page={}",
                self.base_url, user.id, state, page
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
                "REST {state} assigned issues page {}: {} (total {})",
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

    pub fn update_issue_note(
        &self,
        issue_key: &str,
        note_id: &str,
        body_md: &str,
    ) -> Result<(), AppError> {
        let (project_path, issue_iid) = parse_issue_reference_key(issue_key)?;
        let numeric_note_id = gitlab_numeric_id_from_gid(note_id);
        let encoded_project = urlencoding::encode(project_path);
        let response = self
            .client
            .put(format!(
                "{}/api/v4/projects/{}/issues/{}/notes/{}",
                self.base_url, encoded_project, issue_iid, numeric_note_id
            ))
            .header("PRIVATE-TOKEN", &self.token)
            .json(&serde_json::json!({ "body": body_md }))
            .send()?;

        if !response.status().is_success() {
            return Err(AppError::GitLabApi(format!(
                "PUT /api/v4/projects/{}/issues/{}/notes/{} returned {}",
                project_path,
                issue_iid,
                numeric_note_id,
                response.status()
            )));
        }

        Ok(())
    }

    pub fn delete_issue_note(&self, issue_key: &str, note_id: &str) -> Result<(), AppError> {
        let (project_path, issue_iid) = parse_issue_reference_key(issue_key)?;
        let numeric_note_id = gitlab_numeric_id_from_gid(note_id);
        let encoded_project = urlencoding::encode(project_path);
        let response = self
            .client
            .delete(format!(
                "{}/api/v4/projects/{}/issues/{}/notes/{}",
                self.base_url, encoded_project, issue_iid, numeric_note_id
            ))
            .header("PRIVATE-TOKEN", &self.token)
            .send()?;

        if !response.status().is_success() {
            return Err(AppError::GitLabApi(format!(
                "DELETE /api/v4/projects/{}/issues/{}/notes/{} returned {}",
                project_path,
                issue_iid,
                numeric_note_id,
                response.status()
            )));
        }

        Ok(())
    }

    fn fetch_issue_json(&self, project_path: &str, issue_iid: &str) -> Result<JsonValue, AppError> {
        let encoded_project = urlencoding::encode(project_path);
        let response = self
            .client
            .get(format!(
                "{}/api/v4/projects/{}/issues/{}?with_labels_details=true",
                self.base_url, encoded_project, issue_iid
            ))
            .header("PRIVATE-TOKEN", &self.token)
            .send()?;

        if !response.status().is_success() {
            return Err(AppError::GitLabApi(format!(
                "GET /api/v4/projects/{}/issues/{} returned {}",
                project_path,
                issue_iid,
                response.status()
            )));
        }

        response.json().map_err(AppError::from)
    }

    fn fetch_issue_notes_json(
        &self,
        project_path: &str,
        issue_iid: &str,
    ) -> Result<Vec<JsonValue>, AppError> {
        let encoded_project = urlencoding::encode(project_path);
        let response = self
            .client
            .get(format!(
                "{}/api/v4/projects/{}/issues/{}/notes?activity_filter=all_notes&sort=asc&order_by=created_at&per_page=100",
                self.base_url, encoded_project, issue_iid
            ))
            .header("PRIVATE-TOKEN", &self.token)
            .send()?;

        if !response.status().is_success() {
            return Err(AppError::GitLabApi(format!(
                "GET /api/v4/projects/{}/issues/{}/notes returned {}",
                project_path,
                issue_iid,
                response.status()
            )));
        }

        response.json().map_err(AppError::from)
    }

    fn fetch_issue_links_json(
        &self,
        project_path: &str,
        issue_iid: &str,
    ) -> Result<Vec<IssueRelatedItem>, AppError> {
        let encoded_project = urlencoding::encode(project_path);
        let response = self
            .client
            .get(format!(
                "{}/api/v4/projects/{}/issues/{}/links",
                self.base_url, encoded_project, issue_iid
            ))
            .header("PRIVATE-TOKEN", &self.token)
            .send()?;

        if !response.status().is_success() {
            return Err(AppError::GitLabApi(format!(
                "GET /api/v4/projects/{}/issues/{}/links returned {}",
                project_path,
                issue_iid,
                response.status()
            )));
        }

        let items: Vec<JsonValue> = response.json().map_err(AppError::from)?;
        Ok(items
            .into_iter()
            .filter_map(|item| parse_rest_issue_link(project_path, &item))
            .collect::<Vec<_>>())
    }

    fn fetch_issue_work_item_details_graphql(
        &self,
        project_path: &str,
        issue_iid: &str,
    ) -> Result<JsonValue, AppError> {
        let body = serde_json::json!({
            "query": r#"
              query IssueHubDetails($fullPath: ID!, $iid: String!) {
                project(fullPath: $fullPath) {
                  workItem(iid: $iid) {
                    widgets {
                      __typename
                      ... on WorkItemWidgetStatus {
                        status {
                          id
                          name
                          color
                          iconName
                        }
                      }
                      ... on WorkItemWidgetIteration {
                        iteration {
                          id
                          title
                          startDate
                          dueDate
                          webUrl
                        }
                      }
                      ... on WorkItemWidgetHierarchy {
                        children {
                          nodes {
                            iid
                            title
                            state
                            webUrl
                            labels {
                              nodes {
                                title
                                color
                              }
                            }
                          }
                        }
                      }
                      ... on WorkItemWidgetLinkedItems {
                        linkedItems {
                          nodes {
                            linkType
                            workItem {
                              iid
                              title
                              state
                              webUrl
                              labels {
                                nodes {
                                  title
                                  color
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            "#,
            "variables": {
              "fullPath": project_path,
              "iid": issue_iid,
            },
        });

        let value = self.post_graphql_value(&body)?;
        Ok(value
            .pointer("/data/project/workItem")
            .cloned()
            .unwrap_or(JsonValue::Null))
    }

    fn fetch_project_labels_json(&self, project_path: &str) -> Result<Vec<JsonValue>, AppError> {
        let encoded_project = urlencoding::encode(project_path);
        let response = self
            .client
            .get(format!(
                "{}/api/v4/projects/{}/labels?per_page=100&with_counts=false",
                self.base_url, encoded_project
            ))
            .header("PRIVATE-TOKEN", &self.token)
            .send()?;

        if !response.status().is_success() {
            return Err(AppError::GitLabApi(format!(
                "GET /api/v4/projects/{}/labels returned {}",
                project_path,
                response.status()
            )));
        }

        response.json().map_err(AppError::from)
    }

    fn resolve_iteration_cadences(
        &self,
        iterations: &[CachedIterationRecord],
        on_progress: &mut dyn FnMut(String),
    ) -> Result<IterationCadenceResolution, AppError> {
        const GRAPHQL_BATCH_SIZE: usize = 50;

        let unresolved_ids = iterations
            .iter()
            .filter(|iteration| iteration.cadence_title.is_none() || iteration.cadence_id.is_none())
            .map(|iteration| iteration.iteration_gitlab_id.clone())
            .collect::<Vec<_>>();

        if unresolved_ids.is_empty() {
            return Ok(IterationCadenceResolution {
                by_iteration_id: std::collections::HashMap::new(),
                batches_resolved: 0,
            });
        }

        let mut by_iteration_id = std::collections::HashMap::new();
        let mut batches_resolved = 0_usize;
        for batch in unresolved_ids.chunks(GRAPHQL_BATCH_SIZE) {
            batches_resolved += 1;
            on_progress(format!(
                "Resolving iteration cadence metadata (batch {} of {})...",
                batches_resolved,
                unresolved_ids.len().div_ceil(GRAPHQL_BATCH_SIZE)
            ));
            let body = build_iteration_cadence_query(batch);
            let value = self.post_graphql_value(&body)?;
            by_iteration_id.extend(parse_iteration_cadence_nodes(&value)?);
        }

        Ok(IterationCadenceResolution {
            by_iteration_id,
            batches_resolved,
        })
    }
}

#[allow(dead_code)]
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
struct AssignedIssuesOpaqueCursor {
    source: AssignedIssuesCursorSource,
    provider_cursor: Option<String>,
    rest_page: u32,
    skip: usize,
}

#[allow(dead_code)]
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

#[allow(dead_code)]
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
enum AssignedIssuesCursorSource {
    Graphql,
    Rest,
}

#[allow(dead_code)]
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

#[allow(dead_code)]
fn encode_assigned_issues_cursor(cursor: &AssignedIssuesOpaqueCursor) -> Result<String, AppError> {
    serde_json::to_string(cursor)
        .map_err(|error| AppError::GitLabApi(format!("Failed to encode cursor: {error}")))
}

#[derive(Clone, Copy)]
enum AssignedIssuesIterationFields {
    None,
    Basic,
    Cadence,
}

fn assigned_issues_request_body(
    page_size: usize,
    cursor: Option<&str>,
    assignee_username: &str,
    state: Option<&str>,
    closed_after: Option<&str>,
    search: Option<&str>,
    iteration_fields: AssignedIssuesIterationFields,
) -> JsonValue {
    let after_clause = cursor
        .map(|value| {
            format!(
                ", after: {}",
                serde_json::to_string(value).unwrap_or_default()
            )
        })
        .unwrap_or_default();
    let state_clause = state
        .map(|value| format!(", state: {value}"))
        .unwrap_or_default();
    let closed_after_clause = closed_after
        .map(|value| {
            format!(
                ", closedAfter: {}",
                serde_json::to_string(value).unwrap_or_default()
            )
        })
        .unwrap_or_default();
    let search_clause = normalized_search(search)
        .map(|value| {
            format!(
                ", search: {}",
                serde_json::to_string(value).unwrap_or_default()
            )
        })
        .unwrap_or_default();
    let iteration_fields = match iteration_fields {
        AssignedIssuesIterationFields::None => "",
        AssignedIssuesIterationFields::Basic => "iteration { id title startDate dueDate }",
        AssignedIssuesIterationFields::Cadence => {
            "iteration { id title startDate dueDate iterationCadence { id title } }"
        }
    };
    let query = format!(
        r#"query {{
  issues(first: {page_size}, assigneeUsername: {assignee_username}{state_clause}{closed_after_clause}{search_clause}{after_clause}) {{
    nodes {{
      id
      iid
      title
      state
      closedAt
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

#[allow(dead_code)]
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

fn normalize_gitlab_resource_id(value: Option<String>) -> Option<String> {
    let raw = value?;
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }

    trimmed
        .rsplit('/')
        .next()
        .filter(|segment| segment.chars().all(|character| character.is_ascii_digit()))
        .map(str::to_string)
        .or_else(|| Some(trimmed.to_string()))
}

fn parse_iteration_catalog_row(
    item: &JsonValue,
) -> Result<Option<CachedIterationRecord>, AppError> {
    let Some(iteration_gitlab_id) = normalize_gitlab_resource_id(
        json_scalar_to_string(item.get("id")).or_else(|| json_scalar_to_string(item.get("iid"))),
    ) else {
        return Ok(None);
    };

    Ok(Some(CachedIterationRecord {
        iteration_gitlab_id,
        cadence_id: normalize_gitlab_resource_id(
            json_scalar_to_string(item.get("cadence_id"))
                .or_else(|| json_scalar_to_string(item.pointer("/cadence/id")))
                .or_else(|| json_scalar_to_string(item.pointer("/iteration_cadence/id")))
                .or_else(|| json_scalar_to_string(item.pointer("/iterationCadence/id"))),
        ),
        cadence_title: item
            .get("cadence_title")
            .and_then(|x| x.as_str())
            .map(str::to_string)
            .or_else(|| {
                item.pointer("/cadence/title")
                    .and_then(|x| x.as_str())
                    .map(str::to_string)
            })
            .or_else(|| {
                item.pointer("/iteration_cadence/title")
                    .and_then(|x| x.as_str())
                    .map(str::to_string)
            })
            .or_else(|| {
                item.pointer("/iterationCadence/title")
                    .and_then(|x| x.as_str())
                    .map(str::to_string)
            }),
        title: item
            .get("title")
            .and_then(|x| x.as_str())
            .map(str::to_string),
        start_date: item
            .get("start_date")
            .and_then(|x| x.as_str())
            .map(str::to_string)
            .or_else(|| {
                item.get("startDate")
                    .and_then(|x| x.as_str())
                    .map(str::to_string)
            }),
        due_date: item
            .get("due_date")
            .and_then(|x| x.as_str())
            .map(str::to_string)
            .or_else(|| {
                item.get("dueDate")
                    .and_then(|x| x.as_str())
                    .map(str::to_string)
            }),
        state: item.get("state").and_then(|x| {
            x.as_str()
                .map(str::to_string)
                .or_else(|| x.as_i64().map(|value| value.to_string()))
                .or_else(|| x.as_u64().map(|value| value.to_string()))
        }),
        web_url: item
            .get("web_url")
            .and_then(|x| x.as_str())
            .map(str::to_string)
            .or_else(|| {
                item.get("webUrl")
                    .and_then(|x| x.as_str())
                    .map(str::to_string)
            }),
        group_id: json_scalar_to_string(item.get("group_id"))
            .or_else(|| json_scalar_to_string(item.get("groupId"))),
    }))
}

struct IterationCadenceResolution {
    by_iteration_id: std::collections::HashMap<String, IterationCadenceMetadata>,
    batches_resolved: usize,
}

#[derive(Clone)]
struct IterationCadenceMetadata {
    cadence_id: Option<String>,
    cadence_title: Option<String>,
}

fn build_iteration_cadence_query(ids: &[String]) -> JsonValue {
    let fields = ids
        .iter()
        .enumerate()
        .map(|(index, id)| {
            format!(
                r#"  iteration_{index}: iteration(id: "gid://gitlab/Iteration/{id}") {{
    id
    iterationCadence {{
      id
      title
    }}
  }}"#
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    serde_json::json!({
        "query": format!(
            r#"query TimelyIterationCadences {{
{fields}
}}"#
        ),
    })
}

fn parse_iteration_cadence_nodes(
    value: &JsonValue,
) -> Result<std::collections::HashMap<String, IterationCadenceMetadata>, AppError> {
    let nodes = value
        .get("data")
        .and_then(|data| data.as_object())
        .ok_or_else(|| AppError::GitLabApi("Missing iteration cadence nodes".to_string()))?;

    let mut by_iteration_id = std::collections::HashMap::new();
    for node in nodes.values() {
        if node.is_null() {
            continue;
        }
        let Some(iteration_id) =
            normalize_gitlab_resource_id(json_scalar_to_string(node.get("id")))
        else {
            continue;
        };
        by_iteration_id.insert(
            iteration_id,
            IterationCadenceMetadata {
                cadence_id: normalize_gitlab_resource_id(json_scalar_to_string(
                    node.pointer("/iterationCadence/id"),
                )),
                cadence_title: node
                    .pointer("/iterationCadence/title")
                    .and_then(|x| x.as_str())
                    .map(str::to_string),
            },
        );
    }

    Ok(by_iteration_id)
}

fn merge_iteration_catalog_record(
    existing: &mut CachedIterationRecord,
    incoming: &CachedIterationRecord,
) {
    if existing.cadence_id.is_none() {
        existing.cadence_id = incoming.cadence_id.clone();
    }
    if existing.cadence_title.is_none() {
        existing.cadence_title = incoming.cadence_title.clone();
    }
    if existing.title.is_none() {
        existing.title = incoming.title.clone();
    }
    if existing.start_date.is_none() {
        existing.start_date = incoming.start_date.clone();
    }
    if existing.due_date.is_none() {
        existing.due_date = incoming.due_date.clone();
    }
    if existing.state.is_none() {
        existing.state = incoming.state.clone();
    }
    if existing.web_url.is_none() {
        existing.web_url = incoming.web_url.clone();
    }
    if existing.group_id.is_none() {
        existing.group_id = incoming.group_id.clone();
    }
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
        let closed_at = node
            .get("closedAt")
            .and_then(|x| x.as_str())
            .map(str::to_string);
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
        let iteration_gitlab_id =
            normalize_gitlab_resource_id(json_scalar_to_string(node.pointer("/iteration/id")));
        let iteration_group_id = json_scalar_to_string(node.pointer("/iteration/groupId"));
        let iteration_cadence_id = normalize_gitlab_resource_id(json_scalar_to_string(
            node.pointer("/iteration/iterationCadence/id"),
        ));
        let iteration_cadence_title = node
            .pointer("/iteration/iterationCadence/title")
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
            closed_at,
            web_url,
            labels,
            milestone_title,
            iteration_gitlab_id,
            iteration_group_id,
            iteration_cadence_id,
            iteration_cadence_title,
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
    let closed_at = item
        .get("closed_at")
        .and_then(|x| x.as_str())
        .map(str::to_string)
        .or_else(|| {
            item.get("closedAt")
                .and_then(|x| x.as_str())
                .map(str::to_string)
        });

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
    let iteration_gitlab_id = normalize_gitlab_resource_id(
        json_scalar_to_string(item.pointer("/iteration/id"))
            .or_else(|| json_scalar_to_string(item.pointer("/iteration/iid"))),
    );
    let iteration_group_id = json_scalar_to_string(item.pointer("/iteration/group_id"))
        .or_else(|| json_scalar_to_string(item.pointer("/iteration/groupId")));
    let iteration_cadence_id = normalize_gitlab_resource_id(
        json_scalar_to_string(item.pointer("/iteration/cadence_id"))
            .or_else(|| json_scalar_to_string(item.pointer("/iteration/cadence/id")))
            .or_else(|| json_scalar_to_string(item.pointer("/iteration/iteration_cadence/id")))
            .or_else(|| json_scalar_to_string(item.pointer("/iteration/iterationCadence/id"))),
    );
    let iteration_cadence_title = item
        .pointer("/iteration/cadence_title")
        .and_then(|x| x.as_str())
        .map(str::to_string)
        .or_else(|| {
            item.pointer("/iteration/cadence/title")
                .and_then(|x| x.as_str())
                .map(str::to_string)
        })
        .or_else(|| {
            item.pointer("/iteration/iteration_cadence/title")
                .and_then(|x| x.as_str())
                .map(str::to_string)
        })
        .or_else(|| {
            item.pointer("/iteration/iterationCadence/title")
                .and_then(|x| x.as_str())
                .map(str::to_string)
        });
    let iteration_title = item
        .pointer("/iteration/title")
        .and_then(|x| x.as_str())
        .map(str::to_string);
    let iteration_start_date = item
        .pointer("/iteration/start_date")
        .and_then(|x| x.as_str())
        .map(str::to_string)
        .or_else(|| {
            item.pointer("/iteration/startDate")
                .and_then(|x| x.as_str())
                .map(str::to_string)
        });
    let iteration_due_date = item
        .pointer("/iteration/due_date")
        .and_then(|x| x.as_str())
        .map(str::to_string)
        .or_else(|| {
            item.pointer("/iteration/dueDate")
                .and_then(|x| x.as_str())
                .map(str::to_string)
        });

    let issue_graphql_id = format!("gid://gitlab/Issue/{id}");

    Ok(Some(AssignedIssueRecord {
        issue_graphql_id,
        provider_item_id,
        title,
        state,
        closed_at,
        web_url,
        labels,
        milestone_title,
        iteration_gitlab_id,
        iteration_group_id,
        iteration_cadence_id,
        iteration_cadence_title,
        iteration_title,
        iteration_start_date,
        iteration_due_date,
    }))
}

fn parse_issue_milestone_option(value: &JsonValue) -> Option<IssueMetadataOption> {
    let title = value
        .get("title")
        .or_else(|| value.get("name"))
        .and_then(|v| v.as_str())?;
    let id = json_scalar_to_string(value.get("id"))
        .or_else(|| json_scalar_to_string(value.get("iid")))
        .unwrap_or_else(|| title.to_string());
    Some(IssueMetadataOption {
        id,
        label: title.to_string(),
        color: None,
        badge: None,
    })
}

fn gitlab_iteration_id_tail(id: &str) -> &str {
    id.rsplit('/').next().unwrap_or(id)
}

fn gitlab_iteration_ids_match(left: &str, right: &str) -> bool {
    if left == right {
        return true;
    }
    gitlab_iteration_id_tail(left) == gitlab_iteration_id_tail(right)
}

/// Prefer catalog row labels when they include cadence (e.g. `WEB · May 4 - 17, 2026`) and the
/// issue payload only had a plain range.
fn enrich_issue_iteration_label_from_catalog(
    iteration: &mut IssueIterationDetails,
    catalog: &[IssueMetadataOption],
) {
    let Some(entry) = catalog
        .iter()
        .find(|option| gitlab_iteration_ids_match(&option.id, &iteration.id))
    else {
        return;
    };
    let catalog_has_cadence = entry.label.contains('·');
    let current_has_cadence = iteration.label.contains('·');
    if catalog_has_cadence && !current_has_cadence {
        iteration.label = entry.label.clone();
    }
}

fn iteration_catalog_record_for_option<'a>(
    option_id: &str,
    catalog: &'a [CachedIterationRecord],
) -> Option<&'a CachedIterationRecord> {
    catalog
        .iter()
        .find(|record| gitlab_iteration_ids_match(option_id, &record.iteration_gitlab_id))
}

fn dedupe_key_for_iteration_option(option: &IssueMetadataOption, catalog: &[CachedIterationRecord]) -> String {
    if let Some(record) = iteration_catalog_record_for_option(&option.id, catalog) {
        if record
            .start_date
            .as_ref()
            .is_some_and(|value| !value.is_empty())
            && record
                .due_date
                .as_ref()
                .is_some_and(|value| !value.is_empty())
        {
            return format!(
                "{}|{}|{}",
                record.start_date.as_deref().unwrap_or(""),
                record.due_date.as_deref().unwrap_or(""),
                record.cadence_title.as_deref().unwrap_or("")
            );
        }
    }
    option.label.clone()
}

fn parent_group_hint(reference: &IssueReference) -> Option<&str> {
    let (project_path, _) = reference.issue_id.split_once('#')?;
    if project_path.trim().is_empty() {
        return None;
    }
    project_path.rfind('/').map(|index| &project_path[..index])
}

fn catalog_parent_match_score(record: &CachedIterationRecord, parent_hint: Option<&str>) -> i32 {
    let Some(parent) = parent_hint else {
        return 0;
    };
    let Some(group_id) = record.group_id.as_deref() else {
        return 0;
    };
    if group_id.contains(parent) || parent.contains(group_id) {
        return 2;
    }
    0
}

fn iteration_parent_match_score(
    option: &IssueMetadataOption,
    catalog: &[CachedIterationRecord],
    parent_hint: Option<&str>,
) -> i32 {
    iteration_catalog_record_for_option(&option.id, catalog)
        .map(|record| catalog_parent_match_score(record, parent_hint))
        .unwrap_or(0)
}

/// Enriches iteration combobox options and the current iteration label from the local SQLite
/// `iteration_catalog` (cadence + compact range), then deduplicates rows that only differ by
/// ancestor group iteration GIDs.
pub fn enrich_and_dedupe_issue_iteration_options(
    snapshot: &mut IssueDetailsSnapshot,
    catalog: &[CachedIterationRecord],
) {
    let parent_hint = parent_group_hint(&snapshot.reference);
    let options = &mut snapshot.capabilities.iteration.options;

    for option in options.iter_mut() {
        if let Some(record) = iteration_catalog_record_for_option(&option.id, catalog) {
            option.label = iteration_display_label(
                record.title.as_deref(),
                record.start_date.as_deref(),
                record.due_date.as_deref(),
                record.cadence_title.as_deref(),
                &option.id,
            );
            option.badge = record
                .cadence_title
                .clone()
                .filter(|value| !value.trim().is_empty());
        }
    }

    if let Some(iteration) = snapshot.iteration.as_mut() {
        if let Some(record) = iteration_catalog_record_for_option(&iteration.id, catalog) {
            iteration.label = iteration_display_label(
                record.title.as_deref(),
                record.start_date.as_deref(),
                record.due_date.as_deref(),
                record.cadence_title.as_deref(),
                &iteration.id,
            );
            if iteration.start_date.is_none() {
                iteration.start_date = record.start_date.clone();
            }
            if iteration.due_date.is_none() {
                iteration.due_date = record.due_date.clone();
            }
        }
    }

    if options.is_empty() {
        return;
    }

    let mut taken = std::mem::take(options);
    taken.sort_by(|left, right| {
        let score_left = iteration_parent_match_score(left, catalog, parent_hint);
        let score_right = iteration_parent_match_score(right, catalog, parent_hint);
        score_right
            .cmp(&score_left)
            .then_with(|| left.id.cmp(&right.id))
    });

    let mut seen = HashSet::new();
    let mut deduped = Vec::new();
    for option in taken {
        let key = dedupe_key_for_iteration_option(&option, catalog);
        if seen.insert(key) {
            deduped.push(option);
        }
    }
    *options = deduped;
}

fn parse_group_iteration_option(value: &JsonValue) -> Option<IssueMetadataOption> {
    let id = json_scalar_to_string(value.get("id"))?;
    let title = value.get("title").and_then(|v| v.as_str());
    let start_date = value
        .get("start_date")
        .or_else(|| value.get("startDate"))
        .and_then(|v| v.as_str())
        .map(str::to_string);
    let due_date = value
        .get("due_date")
        .or_else(|| value.get("dueDate"))
        .and_then(|v| v.as_str())
        .map(str::to_string);
    let cadence_title = value
        .get("iteration_cadence")
        .or_else(|| value.get("iterationCadence"))
        .and_then(|c| c.get("title").or_else(|| c.get("name")))
        .and_then(|v| v.as_str());
    let label = iteration_display_label(
        title,
        start_date.as_deref(),
        due_date.as_deref(),
        cadence_title,
        &id,
    );
    let badge = cadence_title
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string);
    Some(IssueMetadataOption {
        id,
        label,
        color: None,
        badge,
    })
}

fn project_group_path(project_path: &str) -> Option<&str> {
    project_path.rfind('/').map(|index| &project_path[..index])
}

fn gitlab_numeric_id_from_gid(id: &str) -> String {
    id.rsplit('/').next().unwrap_or(id).to_string()
}

fn ensure_iteration_global_id(id: &str) -> String {
    if id.starts_with("gid://") {
        id.to_string()
    } else {
        format!("gid://gitlab/Iteration/{}", id)
    }
}

fn parse_issue_actor_json(author: &JsonValue) -> Option<IssueActor> {
    Some(IssueActor {
        name: author.get("name").and_then(|value| value.as_str())?.to_string(),
        username: author
            .get("username")
            .and_then(|value| value.as_str())
            .map(str::to_string),
        avatar_url: author
            .get("avatar_url")
            .or_else(|| author.get("avatarUrl"))
            .and_then(|value| value.as_str())
            .map(str::to_string),
    })
}

fn parse_rest_issue_iteration(issue: &JsonValue) -> Option<IssueIterationDetails> {
    let iteration = issue.get("iteration")?;
    let start_date = iteration
        .get("start_date")
        .or_else(|| iteration.get("startDate"))
        .and_then(|value| value.as_str())
        .map(str::to_string);
    let due_date = iteration
        .get("due_date")
        .or_else(|| iteration.get("dueDate"))
        .and_then(|value| value.as_str())
        .map(str::to_string);
    let title = iteration.get("title").and_then(|value| value.as_str());
    let cadence_title = iteration
        .get("iteration_cadence")
        .or_else(|| iteration.get("iterationCadence"))
        .and_then(|c| c.get("title").or_else(|| c.get("name")))
        .and_then(|v| v.as_str());
    let id = json_scalar_to_string(iteration.get("id")).filter(|s| !s.is_empty())?;
    let label = iteration_display_label(
        title,
        start_date.as_deref(),
        due_date.as_deref(),
        cadence_title,
        &id,
    );

    Some(IssueIterationDetails {
        id,
        label,
        start_date,
        due_date,
        web_url: iteration
            .get("web_url")
            .or_else(|| iteration.get("webUrl"))
            .and_then(|value| value.as_str())
            .map(str::to_string),
    })
}

fn parse_graphql_issue_status(work_item: &JsonValue) -> Option<IssueStatusOption> {
    let widgets = work_item.get("widgets")?.as_array()?;

    for widget in widgets {
        let status = widget.get("status")?;
        let label = status
            .get("name")
            .or_else(|| status.get("label"))
            .and_then(|value| value.as_str())?;

        return Some(IssueStatusOption {
            id: status
                .get("id")
                .and_then(|value| value.as_str())
                .unwrap_or(label)
                .to_string(),
            label: label.to_string(),
            color: status
                .get("color")
                .and_then(|value| value.as_str())
                .map(str::to_string),
            icon: status
                .get("iconName")
                .or_else(|| status.get("icon"))
                .and_then(|value| value.as_str())
                .map(str::to_string),
        });
    }

    None
}

fn parse_graphql_issue_iteration(work_item: &JsonValue) -> Option<IssueIterationDetails> {
    let widgets = work_item.get("widgets")?.as_array()?;

    for widget in widgets {
        let Some(iteration) = widget.get("iteration") else {
            continue;
        };
        let title = iteration.get("title").and_then(|value| value.as_str());
        let start_date = iteration
            .get("startDate")
            .and_then(|value| value.as_str())
            .map(str::to_string);
        let due_date = iteration
            .get("dueDate")
            .and_then(|value| value.as_str())
            .map(str::to_string);
        let cadence_title = iteration
            .pointer("/iterationCadence/title")
            .or_else(|| iteration.pointer("/iterationCadence/name"))
            .and_then(|v| v.as_str())
            .or_else(|| {
                iteration
                    .get("iterationCadence")
                    .and_then(|c| c.get("title").or_else(|| c.get("name")))
                    .and_then(|v| v.as_str())
            });
        let Some(id) = iteration
            .get("id")
            .and_then(|value| value.as_str())
            .map(str::to_string)
            .or_else(|| json_scalar_to_string(iteration.get("id")))
            .filter(|s| !s.is_empty())
        else {
            continue;
        };
        let label = iteration_display_label(
            title,
            start_date.as_deref(),
            due_date.as_deref(),
            cadence_title,
            &id,
        );

        return Some(IssueIterationDetails {
            id,
            label,
            start_date,
            due_date,
            web_url: iteration
                .get("webUrl")
                .and_then(|value| value.as_str())
                .map(str::to_string),
        });
    }

    None
}

fn parse_graphql_linked_items(work_item: &JsonValue) -> Option<Vec<IssueRelatedItem>> {
    let widgets = work_item.get("widgets")?.as_array()?;

    for widget in widgets {
        let nodes = widget.pointer("/linkedItems/nodes")?.as_array()?;
        let items = nodes
            .iter()
            .filter_map(|node| {
                let target = node.get("workItem")?;
                parse_graphql_related_item(
                    target,
                    node.get("linkType")
                        .and_then(|value| value.as_str())
                        .unwrap_or("related"),
                )
            })
            .collect::<Vec<_>>();

        if !items.is_empty() {
            return Some(items);
        }
    }

    None
}

fn parse_graphql_child_items(work_item: &JsonValue) -> Option<Vec<IssueRelatedItem>> {
    let widgets = work_item.get("widgets")?.as_array()?;

    for widget in widgets {
        let nodes = widget.pointer("/children/nodes")?.as_array()?;
        let items = nodes
            .iter()
            .filter_map(|node| parse_graphql_related_item(node, "child"))
            .collect::<Vec<_>>();

        if !items.is_empty() {
            return Some(items);
        }
    }

    None
}

fn parse_graphql_related_item(item: &JsonValue, relation_label: &str) -> Option<IssueRelatedItem> {
    let iid = json_scalar_to_string(item.get("iid"))?;
    let web_url = item
        .get("webUrl")
        .or_else(|| item.get("web_url"))
        .and_then(|value| value.as_str())
        .map(str::to_string);
    let key = web_url
        .as_deref()
        .and_then(provider_item_id_from_issue_web_url)
        .unwrap_or(iid.clone());
    key.rsplit_once('#')?;

    Some(IssueRelatedItem {
        reference: IssueReference {
            provider: "gitlab".to_string(),
            issue_id: key.clone(),
            provider_issue_ref: item
                .get("id")
                .and_then(|value| value.as_str())
                .unwrap_or(&key)
                .to_string(),
        },
        key,
        title: item.get("title").and_then(|value| value.as_str())?.to_string(),
        relation_label: humanize_issue_relation_label(relation_label),
        state: item
            .get("state")
            .and_then(|value| value.as_str())
            .unwrap_or("opened")
            .to_string(),
        web_url,
        labels: parse_issue_label_options(item.get("labels")),
    })
}

fn parse_rest_issue_link(project_path: &str, item: &JsonValue) -> Option<IssueRelatedItem> {
    let iid = json_scalar_to_string(item.get("iid"))?;
    let key = format!("{project_path}#{iid}");

    Some(IssueRelatedItem {
        reference: IssueReference {
            provider: "gitlab".to_string(),
            issue_id: key.clone(),
            provider_issue_ref: item
                .get("id")
                .and_then(|value| value.as_i64())
                .map(|value| format!("gid://gitlab/Issue/{value}"))
                .unwrap_or_else(|| key.clone()),
        },
        key,
        title: item.get("title").and_then(|value| value.as_str())?.to_string(),
        relation_label: humanize_issue_relation_label(
            item.get("link_type")
                .or_else(|| item.get("linkType"))
                .and_then(|value| value.as_str())
                .unwrap_or("related"),
        ),
        state: item
            .get("state")
            .and_then(|value| value.as_str())
            .unwrap_or("opened")
            .to_string(),
        web_url: item
            .get("web_url")
            .or_else(|| item.get("webUrl"))
            .and_then(|value| value.as_str())
            .map(str::to_string),
        labels: parse_issue_label_options(item.get("labels")),
    })
}

fn parse_issue_label_options(labels: Option<&JsonValue>) -> Vec<IssueMetadataOption> {
    labels
        .and_then(|value| value.as_array().or_else(|| value.get("nodes").and_then(|x| x.as_array())))
        .map(|items| {
            items.iter()
                .filter_map(|item| {
                    let label = item
                        .get("title")
                        .or_else(|| item.get("name"))
                        .and_then(|value| value.as_str())
                        .or_else(|| item.as_str())?;
                    Some(IssueMetadataOption {
                        id: label.to_string(),
                        label: label.to_string(),
                        color: item
                            .get("color")
                            .and_then(|value| value.as_str())
                            .map(str::to_string),
                        badge: None,
                    })
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default()
}

fn humanize_issue_relation_label(value: &str) -> String {
    match value {
        "child" => "Child item".to_string(),
        "relates_to" | "related" | "related_to" => "Related to".to_string(),
        "blocks" => "Blocks".to_string(),
        "is_blocked_by" | "blocked_by" => "Blocked by".to_string(),
        _ => value.replace('_', " "),
    }
}

fn normalized_search(search: Option<&str>) -> Option<&str> {
    search.map(str::trim).filter(|value| !value.is_empty())
}

fn parse_issue_reference_key(issue_key: &str) -> Result<(&str, &str), AppError> {
    let (project_path, issue_iid) = issue_key.split_once('#').ok_or_else(|| {
        AppError::GitLabApi(format!("Unsupported issue reference format: {}", issue_key))
    })?;

    if project_path.trim().is_empty() || issue_iid.trim().is_empty() {
        return Err(AppError::GitLabApi(format!(
            "Unsupported issue reference format: {}",
            issue_key
        )));
    }

    Ok((project_path, issue_iid))
}

#[allow(dead_code)]
fn snapshot_from_assigned_issue_record(record: &AssignedIssueRecord) -> AssignedIssueSnapshot {
    AssignedIssueSnapshot {
        provider: "gitlab".to_string(),
        issue_id: record.provider_item_id.clone(),
        provider_issue_ref: record.issue_graphql_id.clone(),
        key: record.provider_item_id.clone(),
        title: record.title.clone(),
        state: record.state.clone(),
        closed_at: record.closed_at.clone(),
        web_url: record.web_url.clone(),
        labels: record.labels.clone(),
        milestone_title: record.milestone_title.clone(),
        iteration_gitlab_id: record.iteration_gitlab_id.clone(),
        iteration_group_id: record.iteration_group_id.clone(),
        iteration_cadence_id: record.iteration_cadence_id.clone(),
        iteration_cadence_title: record.iteration_cadence_title.clone(),
        iteration_title: record.iteration_title.clone(),
        iteration_start_date: record.iteration_start_date.clone(),
        iteration_due_date: record.iteration_due_date.clone(),
        assigned_bucket: None,
    }
}

#[allow(dead_code)]
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

#[allow(dead_code)]
fn matches_assigned_issue_query(
    record: &AssignedIssueRecord,
    input: &AssignedIssuesQueryInput,
) -> bool {
    if let Some(search) = normalized_search(input.search.as_deref()) {
        let search = search.to_lowercase();
        let searchable = [
            record.title.as_str(),
            record.provider_item_id.as_str(),
            record.iteration_title.as_deref().unwrap_or_default(),
            record.milestone_title.as_deref().unwrap_or_default(),
        ];
        if !searchable
            .iter()
            .any(|value| value.to_lowercase().contains(&search))
        {
            return false;
        }
    }

    if let Some(year) = normalized_search(input.year.as_deref()) {
        let Some(iteration_start_date) = record.iteration_start_date.as_deref() else {
            return false;
        };
        if !iteration_start_date.starts_with(year) {
            return false;
        }
    }

    if let Some(iteration_id) = normalized_search(input.iteration_id.as_deref()) {
        let Some(label) = record.iteration_title.as_deref() else {
            return false;
        };
        if assigned_iteration_option_id(
            label,
            record.iteration_start_date.as_deref(),
            record.iteration_due_date.as_deref(),
        ) != iteration_id
        {
            return false;
        }
    }

    true
}

#[allow(dead_code)]
fn assigned_iteration_option_id(
    label: &str,
    start_date: Option<&str>,
    due_date: Option<&str>,
) -> String {
    format!(
        "{label}::{}::{}",
        start_date.unwrap_or("none"),
        due_date.unwrap_or("none")
    )
}

#[allow(dead_code)]
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
            if (2..=6).contains(&segment.len())
                && segment.chars().all(|ch| ch.is_ascii_alphabetic())
            {
                let token = segment.to_ascii_uppercase();
                if !tokens.contains(&token) {
                    tokens.push(token);
                }
            }
        }
    }

    tokens
}

#[allow(dead_code)]
fn iteration_overlaps_period(
    record: &AssignedIssueRecord,
    period: &AssignedIssuesPeriodInput,
) -> bool {
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
                        "closedAt": null,
                        "webUrl": "https://gitlab.com/g/p/-/issues/42",
                        "reference": "g/p#42",
                        "labels": { "nodes": [{ "title": "bug" }] },
                        "milestone": { "title": "M1" },
                        "iteration": {
                            "id": "gid://gitlab/Iteration/90",
                            "title": "It1",
                            "startDate": "2026-01-01",
                            "dueDate": "2026-01-14",
                            "iterationCadence": {
                                "id": "gid://gitlab/IterationsCadence/12",
                                "title": "WEB"
                            }
                        }
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
        assert_eq!(r.iteration_gitlab_id.as_deref(), Some("90"));
        assert_eq!(r.iteration_cadence_id.as_deref(), Some("12"));
        assert_eq!(r.iteration_cadence_title.as_deref(), Some("WEB"));
        assert_eq!(r.iteration_start_date.as_deref(), Some("2026-01-01"));
        assert_eq!(r.closed_at, None);
        assert_eq!(r.labels, vec!["bug".to_string()]);
    }

    #[test]
    fn parse_assigned_issues_page_reads_closed_at() {
        let v = serde_json::json!({
            "data": {
                "issues": {
                    "nodes": [{
                        "id": "gid://gitlab/Issue/11",
                        "iid": "11",
                        "title": "Closed",
                        "state": "closed",
                        "closedAt": "2026-04-01T08:00:00Z",
                        "webUrl": "https://gitlab.com/g/p/-/issues/11",
                        "reference": "g/p#11",
                        "labels": { "nodes": [] },
                        "milestone": null,
                        "iteration": null
                    }],
                    "pageInfo": { "hasNextPage": false, "endCursor": null }
                }
            }
        });

        let rows = parse_assigned_issues_page(&v).unwrap();
        assert_eq!(rows[0].closed_at.as_deref(), Some("2026-04-01T08:00:00Z"));
    }

    #[test]
    fn parse_rest_issue_row_reads_iteration_identity_fields() {
        let item = serde_json::json!({
            "id": 77,
            "iid": 42,
            "title": "Hello",
            "state": "opened",
            "closed_at": null,
            "web_url": "https://gitlab.example.com/g/p/-/issues/42",
            "references": { "full": "g/p#42" },
            "labels": ["bug"],
            "iteration": {
                "id": 90,
                "iid": 4,
                "group_id": 162,
                "title": null,
                "description": null,
                "state": 2,
                "start_date": "2026-04-06",
                "due_date": "2026-04-19",
                "web_url": "https://gitlab.example.com/groups/my-group/-/iterations/90",
                "cadence_title": "WEB",
                "cadence_id": 12
            }
        });

        let row = parse_rest_issue_row(&item).unwrap().unwrap();
        assert_eq!(row.iteration_gitlab_id.as_deref(), Some("90"));
        assert_eq!(row.iteration_group_id.as_deref(), Some("162"));
        assert_eq!(row.iteration_cadence_title.as_deref(), Some("WEB"));
        assert_eq!(row.iteration_cadence_id.as_deref(), Some("12"));
        assert_eq!(row.iteration_start_date.as_deref(), Some("2026-04-06"));
        assert_eq!(row.iteration_due_date.as_deref(), Some("2026-04-19"));
    }

    #[test]
    fn parse_rest_issue_row_reads_closed_at() {
        let item = serde_json::json!({
            "id": 78,
            "iid": 43,
            "title": "Closed",
            "state": "closed",
            "closed_at": "2026-04-02T10:30:00Z",
            "web_url": "https://gitlab.example.com/g/p/-/issues/43",
            "references": { "full": "g/p#43" },
            "labels": []
        });

        let row = parse_rest_issue_row(&item).unwrap().unwrap();
        assert_eq!(row.closed_at.as_deref(), Some("2026-04-02T10:30:00Z"));
    }

    #[test]
    fn parse_iteration_catalog_row_reads_group_iteration_payload() {
        let item = serde_json::json!({
            "id": 2721401,
            "group_id": 2063424,
            "title": null,
            "start_date": "2026-04-06",
            "due_date": "2026-04-19",
            "state": 2,
            "web_url": "https://gitlab.example.com/groups/sixbell/-/iterations/2721401"
        });

        let iteration = parse_iteration_catalog_row(&item).unwrap().unwrap();
        assert_eq!(iteration.iteration_gitlab_id, "2721401");
        assert_eq!(iteration.group_id.as_deref(), Some("2063424"));
        assert_eq!(iteration.start_date.as_deref(), Some("2026-04-06"));
        assert_eq!(iteration.due_date.as_deref(), Some("2026-04-19"));
        assert!(iteration.cadence_title.is_none());
    }

    #[test]
    fn parse_iteration_cadence_nodes_reads_batched_graphql_resolution() {
        let value = serde_json::json!({
            "data": {
                "iteration_0": {
                    "id": "gid://gitlab/Iteration/2721401",
                    "iterationCadence": {
                        "id": "gid://gitlab/IterationsCadence/40223",
                        "title": "WEB"
                    }
                },
                "iteration_1": {
                    "id": "gid://gitlab/Iteration/2590543",
                    "iterationCadence": {
                        "id": "gid://gitlab/IterationsCadence/40049",
                        "title": "CCP"
                    }
                },
                "iteration_2": null
            }
        });

        let nodes = parse_iteration_cadence_nodes(&value).unwrap();
        assert_eq!(
            nodes
                .get("2721401")
                .and_then(|item| item.cadence_title.as_deref()),
            Some("WEB")
        );
        assert_eq!(
            nodes
                .get("2721401")
                .and_then(|item| item.cadence_id.as_deref()),
            Some("40223")
        );
        assert_eq!(
            nodes
                .get("2590543")
                .and_then(|item| item.cadence_title.as_deref()),
            Some("CCP")
        );
        assert_eq!(
            nodes
                .get("2590543")
                .and_then(|item| item.cadence_id.as_deref()),
            Some("40049")
        );
    }

    #[test]
    fn build_iteration_cadence_query_uses_aliased_iteration_fields() {
        let body = build_iteration_cadence_query(&["2721401".to_string(), "2590543".to_string()]);
        let query = body.get("query").and_then(|value| value.as_str()).unwrap();

        assert!(query.contains("query TimelyIterationCadences {"));
        assert!(query.contains("iteration_0: iteration(id: \"gid://gitlab/Iteration/2721401\")"));
        assert!(query.contains("iteration_1: iteration(id: \"gid://gitlab/Iteration/2590543\")"));
        assert!(query.contains("iterationCadence"));
        assert!(!query.contains("nodes("));
        assert!(body.get("variables").is_none());
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
        let body = assigned_issues_request_body(
            20,
            None,
            "cris",
            Some("opened"),
            None,
            Some("bug"),
            AssignedIssuesIterationFields::Cadence,
        );
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
        assert!(body
            .get("query")
            .and_then(|q| q.as_str())
            .is_some_and(|q| q.contains("iterationCadence")));
    }

    #[test]
    fn assigned_issues_request_includes_closed_after_when_present() {
        let body = assigned_issues_request_body(
            20,
            None,
            "cris",
            Some("closed"),
            Some("2025-10-11T00:00:00Z"),
            None,
            AssignedIssuesIterationFields::Basic,
        );

        assert!(body
            .get("query")
            .and_then(|q| q.as_str())
            .is_some_and(|q| q.contains("closedAfter: \"2025-10-11T00:00:00Z\"")));
        assert!(body
            .get("query")
            .and_then(|q| q.as_str())
            .is_some_and(|q| q.contains("closedAt")));
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
            closed_at: None,
            web_url: None,
            labels: vec![],
            milestone_title: None,
            iteration_gitlab_id: None,
            iteration_group_id: None,
            iteration_cadence_id: None,
            iteration_cadence_title: None,
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

    #[test]
    fn snapshot_from_assigned_issue_record_uses_provider_neutral_identity_fields() {
        let snapshot = snapshot_from_assigned_issue_record(&AssignedIssueRecord {
            issue_graphql_id: "gid://gitlab/Issue/7".to_string(),
            provider_item_id: "g/p#7".to_string(),
            title: "Hello".to_string(),
            state: "opened".to_string(),
            closed_at: None,
            web_url: None,
            labels: vec![],
            milestone_title: None,
            iteration_gitlab_id: None,
            iteration_group_id: None,
            iteration_cadence_id: None,
            iteration_cadence_title: None,
            iteration_title: None,
            iteration_start_date: None,
            iteration_due_date: None,
        });

        assert_eq!(snapshot.provider, "gitlab");
        assert_eq!(snapshot.issue_id, "g/p#7");
        assert_eq!(snapshot.provider_issue_ref, "gid://gitlab/Issue/7");
    }

    #[test]
    fn parse_issue_reference_key_splits_project_path_and_iid() {
        let parsed = parse_issue_reference_key("group/subgroup/project#42").unwrap();

        assert_eq!(parsed.0, "group/subgroup/project");
        assert_eq!(parsed.1, "42");
    }
}

#[cfg(test)]
mod iteration_catalog_enrich_tests {
    use crate::domain::models::{
        CachedIterationRecord, IssueComposerCapabilities, IssueDetailsCapabilities,
        IssueDetailsSnapshot, IssueIterationDetails, IssueMetadataCapability, IssueMetadataOption,
        IssueReference, IssueTimeTrackingCapabilities,
    };

    use super::enrich_and_dedupe_issue_iteration_options;

    fn empty_metadata_capability() -> IssueMetadataCapability {
        IssueMetadataCapability {
            enabled: false,
            reason: None,
            options: Vec::new(),
        }
    }

    fn snapshot_with_iteration_options(
        issue_id: &str,
        options: Vec<IssueMetadataOption>,
        iteration: Option<IssueIterationDetails>,
    ) -> IssueDetailsSnapshot {
        IssueDetailsSnapshot {
            reference: IssueReference {
                provider: "gitlab".to_string(),
                issue_id: issue_id.to_string(),
                provider_issue_ref: "gid://gitlab/Issue/1".to_string(),
            },
            key: "k".to_string(),
            title: "t".to_string(),
            state: "opened".to_string(),
            author: None,
            created_at: None,
            updated_at: None,
            web_url: None,
            description: None,
            status: None,
            status_options: None,
            labels: Vec::new(),
            milestone_title: None,
            milestone: None,
            iteration,
            linked_items: None,
            child_items: None,
            activity: Vec::new(),
            viewer_username: None,
            capabilities: IssueDetailsCapabilities {
                status: empty_metadata_capability(),
                labels: empty_metadata_capability(),
                iteration: IssueMetadataCapability {
                    enabled: true,
                    reason: None,
                    options,
                },
                milestone: empty_metadata_capability(),
                composer: IssueComposerCapabilities {
                    enabled: false,
                    modes: Vec::new(),
                    supports_quick_actions: false,
                },
                time_tracking: IssueTimeTrackingCapabilities {
                    enabled: false,
                    supports_quick_actions: false,
                },
            },
        }
    }

    fn catalog_row(
        iteration_id: &str,
        cadence: &str,
        start: &str,
        end: &str,
        group_id: Option<&str>,
    ) -> CachedIterationRecord {
        CachedIterationRecord {
            iteration_gitlab_id: iteration_id.to_string(),
            cadence_id: None,
            cadence_title: Some(cadence.to_string()),
            title: None,
            start_date: Some(start.to_string()),
            due_date: Some(end.to_string()),
            state: None,
            web_url: None,
            group_id: group_id.map(str::to_string),
        }
    }

    #[test]
    fn enrich_and_dedupe_collapses_same_window_and_cadence_from_ancestor_duplicate_ids() {
        let catalog = vec![
            catalog_row(
                "gid://gitlab/Iteration/10",
                "WEB",
                "2026-04-20",
                "2026-05-03",
                Some("group/subgroup"),
            ),
            catalog_row(
                "gid://gitlab/Iteration/99",
                "WEB",
                "2026-04-20",
                "2026-05-03",
                Some("group"),
            ),
        ];

        let mut snapshot = snapshot_with_iteration_options(
            "group/subgroup/project#1",
            vec![
                IssueMetadataOption {
                    id: "gid://gitlab/Iteration/99".to_string(),
                    label: "Apr 20 - May 3, 2026".to_string(),
                    color: None,
                    badge: None,
                },
                IssueMetadataOption {
                    id: "gid://gitlab/Iteration/10".to_string(),
                    label: "Apr 20 - May 3, 2026".to_string(),
                    color: None,
                    badge: None,
                },
            ],
            None,
        );

        enrich_and_dedupe_issue_iteration_options(&mut snapshot, &catalog);

        assert_eq!(snapshot.capabilities.iteration.options.len(), 1);
        let only = &snapshot.capabilities.iteration.options[0];
        assert_eq!(only.id, "gid://gitlab/Iteration/10");
        assert_eq!(only.badge.as_deref(), Some("WEB"));
        assert!(only.label.contains("WEB"));
        assert!(only.label.contains("Apr"));
    }

    #[test]
    fn enrich_keeps_distinct_cadences_even_when_dates_match() {
        let catalog = vec![
            catalog_row(
                "gid://gitlab/Iteration/1",
                "WEB",
                "2026-04-20",
                "2026-05-03",
                None,
            ),
            catalog_row(
                "gid://gitlab/Iteration/2",
                "OPS",
                "2026-04-20",
                "2026-05-03",
                None,
            ),
        ];

        let mut snapshot = snapshot_with_iteration_options(
            "g/p#1",
            vec![
                IssueMetadataOption {
                    id: "gid://gitlab/Iteration/1".to_string(),
                    label: "Apr 20 - May 3, 2026".to_string(),
                    color: None,
                    badge: None,
                },
                IssueMetadataOption {
                    id: "gid://gitlab/Iteration/2".to_string(),
                    label: "Apr 20 - May 3, 2026".to_string(),
                    color: None,
                    badge: None,
                },
            ],
            None,
        );

        enrich_and_dedupe_issue_iteration_options(&mut snapshot, &catalog);

        assert_eq!(snapshot.capabilities.iteration.options.len(), 2);
    }

    #[test]
    fn enrich_updates_current_iteration_label_from_catalog() {
        let catalog = vec![catalog_row(
            "gid://gitlab/Iteration/7",
            "WEB",
            "2026-04-06",
            "2026-04-19",
            None,
        )];

        let mut snapshot = snapshot_with_iteration_options(
            "g/p#1",
            vec![IssueMetadataOption {
                id: "gid://gitlab/Iteration/7".to_string(),
                label: "Apr 6 - 19, 2026".to_string(),
                color: None,
                badge: None,
            }],
            Some(IssueIterationDetails {
                id: "gid://gitlab/Iteration/7".to_string(),
                label: "Apr 6 - 19, 2026".to_string(),
                start_date: Some("2026-04-06".to_string()),
                due_date: Some("2026-04-19".to_string()),
                web_url: None,
            }),
        );

        enrich_and_dedupe_issue_iteration_options(&mut snapshot, &catalog);

        let current = snapshot.iteration.expect("iteration");
        assert!(current.label.contains("WEB"));
        assert!(current.label.contains("Apr"));
    }

    #[test]
    fn dedupe_falls_back_to_label_when_catalog_row_has_no_dates() {
        let catalog = vec![CachedIterationRecord {
            iteration_gitlab_id: "gid://gitlab/Iteration/1".to_string(),
            cadence_id: None,
            cadence_title: Some("WEB".to_string()),
            title: Some("Custom".to_string()),
            start_date: None,
            due_date: None,
            state: None,
            web_url: None,
            group_id: None,
        }];

        let mut snapshot = snapshot_with_iteration_options(
            "g/p#1",
            vec![
                IssueMetadataOption {
                    id: "gid://gitlab/Iteration/1".to_string(),
                    label: "Custom".to_string(),
                    color: None,
                    badge: None,
                },
                IssueMetadataOption {
                    id: "gid://gitlab/Iteration/2".to_string(),
                    label: "Custom".to_string(),
                    color: None,
                    badge: None,
                },
            ],
            None,
        );

        enrich_and_dedupe_issue_iteration_options(&mut snapshot, &catalog);

        assert_eq!(snapshot.capabilities.iteration.options.len(), 1);
    }
}
