use std::time::Duration;

use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};

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
    time_spent: i64,
    spent_at: Option<String>,
    issue: Option<GraphQLTimelogIssue>,
    merge_request: Option<GraphQLTimelogMr>,
    project: Option<GraphQLTimelogProject>,
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
    pub time_spent: i64,
    pub spent_at: String,
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
        timeSpent
        spentAt
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
    let project_path = node
        .project
        .as_ref()
        .map(|project| project.full_path.clone());
    let project_name = node.project.as_ref().map(|project| project.name.clone());

    if let Some(issue) = node.issue {
        return FlatTimelog {
            time_spent: node.time_spent,
            spent_at,
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
            time_spent: node.time_spent,
            spent_at,
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
        time_spent: node.time_spent,
        spent_at,
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
