use crate::{
    db,
    domain::models::{AssignedIssuesPage, AssignedIssuesQueryInput},
    error::AppError,
    providers::gitlab::GitLabClient,
    services::shared,
    state::AppState,
};

pub fn load_assigned_issues_page(
    state: &AppState,
    input: AssignedIssuesQueryInput,
) -> Result<AssignedIssuesPage, AppError> {
    let connection = shared::open_connection(state)?;
    let primary = shared::load_primary_gitlab_connection(&connection)?;
    let token = db::connection::load_gitlab_token(&connection, &primary.host)?
        .ok_or_else(|| AppError::GitLabApi("No token found for primary connection.".to_string()))?;
    let client = GitLabClient::new(&primary.host, &token)?;

    client.query_current_assigned_issues(&input)
}
