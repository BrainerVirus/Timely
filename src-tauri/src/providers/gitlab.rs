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


// --- GraphQL response types ---

#[derive(Debug, Clone, Deserialize)]
pub struct GraphQLResponse<T> {
    pub data: Option<T>,
    pub errors: Option<Vec<GraphQLError>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GraphQLError {
    pub message: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelogsData {
    pub current_user: Option<CurrentUserTimelogs>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CurrentUserTimelogs {
    pub timelogs: TimelogConnection,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelogConnection {
    pub nodes: Vec<GraphQLTimelog>,
    pub page_info: PageInfo,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PageInfo {
    pub has_next_page: bool,
    pub end_cursor: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphQLTimelog {
    pub time_spent: i64,
    pub spent_at: Option<String>,
    pub issue: Option<GraphQLTimelogIssue>,
    pub merge_request: Option<GraphQLTimelogMR>,
    pub project: Option<GraphQLTimelogProject>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphQLTimelogIssue {
    pub iid: String,
    pub title: String,
    pub state: String,
    pub web_url: Option<String>,
    pub labels: Option<GraphQLLabels>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GraphQLLabels {
    pub nodes: Vec<GraphQLLabel>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GraphQLLabel {
    pub title: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphQLTimelogMR {
    pub iid: String,
    pub title: String,
    pub state: String,
    pub web_url: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphQLTimelogProject {
    pub full_path: String,
    pub name: String,
}

/// Flattened timelog entry ready for DB insertion.
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

    /// Fetch timelogs for the authenticated user via GraphQL.
    /// Uses `currentUser.timelogs` with date range and cursor-based pagination.
    pub fn fetch_user_timelogs(
        &self,
        start_date: &str,
        end_date: &str,
        on_progress: &mut dyn FnMut(String),
    ) -> Result<Vec<FlatTimelog>, AppError> {
        let mut all_timelogs = Vec::new();
        let mut cursor: Option<String> = None;
        let mut page = 0u32;

        loop {
            page += 1;
            if page > MAX_PAGES {
                on_progress("Reached max page limit, stopping.".to_string());
                break;
            }

            let after_clause = cursor
                .as_ref()
                .map(|c| format!(", after: \"{}\"", c))
                .unwrap_or_default();

            let query = format!(
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
            );

            on_progress(format!(
                "Fetching timelogs page {}...",
                page,
            ));

            let response = self
                .client
                .post(&format!("{}/api/graphql", self.base_url))
                .header("Authorization", format!("Bearer {}", self.token))
                .header("Content-Type", "application/json")
                .json(&serde_json::json!({ "query": query }))
                .send()?;

            if !response.status().is_success() {
                return Err(AppError::GitLabApi(format!(
                    "POST /api/graphql returned {}",
                    response.status()
                )));
            }

            let body: GraphQLResponse<TimelogsData> = response.json().map_err(|e| {
                AppError::GitLabApi(format!("Failed to parse GraphQL response: {}", e))
            })?;

            if let Some(errors) = &body.errors {
                if !errors.is_empty() {
                    let messages: Vec<&str> = errors.iter().map(|e| e.message.as_str()).collect();
                    return Err(AppError::GitLabApi(format!(
                        "GraphQL errors: {}",
                        messages.join("; ")
                    )));
                }
            }

            let timelogs_data = body.data.ok_or_else(|| {
                AppError::GitLabApi("GraphQL response missing data field".to_string())
            })?;

            let user = timelogs_data.current_user.ok_or_else(|| {
                AppError::GitLabApi("GraphQL response missing currentUser".to_string())
            })?;

            let connection = user.timelogs;
            let count = connection.nodes.len();

            for node in connection.nodes {
                all_timelogs.push(flatten_timelog(node));
            }

            on_progress(format!(
                "Page {}: {} entries (total: {})",
                page, count, all_timelogs.len()
            ));

            if connection.page_info.has_next_page {
                cursor = connection.page_info.end_cursor;
            } else {
                break;
            }
        }

        on_progress(format!("Done. {} timelogs fetched.", all_timelogs.len()));

        Ok(all_timelogs)
    }
}


fn flatten_timelog(node: GraphQLTimelog) -> FlatTimelog {
    let spent_at = node.spent_at.unwrap_or_else(|| "1970-01-01".to_string());
    let project_path = node.project.as_ref().map(|p| p.full_path.clone());
    let project_name = node.project.as_ref().map(|p| p.name.clone());

    if let Some(issue) = node.issue {
        let item_key = project_path
            .as_ref()
            .map(|p| format!("{}#{}", p, issue.iid))
            .unwrap_or_else(|| format!("#{}", issue.iid));
        let labels = issue
            .labels
            .map(|l| l.nodes.into_iter().map(|n| n.title).collect());

        FlatTimelog {
            time_spent: node.time_spent,
            spent_at,
            project_path,
            project_name,
            item_key: Some(item_key),
            item_title: Some(issue.title),
            item_state: Some(issue.state),
            item_web_url: issue.web_url,
            item_labels: labels,
        }
    } else if let Some(mr) = node.merge_request {
        let item_key = project_path
            .as_ref()
            .map(|p| format!("{}!{}", p, mr.iid))
            .unwrap_or_else(|| format!("!{}", mr.iid));

        FlatTimelog {
            time_spent: node.time_spent,
            spent_at,
            project_path,
            project_name,
            item_key: Some(item_key),
            item_title: Some(mr.title),
            item_state: Some(mr.state),
            item_web_url: mr.web_url,
            item_labels: None,
        }
    } else {
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
}
