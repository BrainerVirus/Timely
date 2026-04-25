use crate::{
    db,
    domain::models::{AssignedIssuesPage, AssignedIssuesQueryInput},
    error::AppError,
    services::shared,
    state::AppState,
};

pub fn load_assigned_issues_page(
    state: &AppState,
    input: AssignedIssuesQueryInput,
) -> Result<AssignedIssuesPage, AppError> {
    let connection = shared::open_connection(state)?;
    let primary = shared::load_primary_gitlab_connection(&connection)?;

    db::bootstrap::load_assigned_issues_page_from_cache(
        &connection,
        primary.id,
        &input,
        chrono::Local::now().date_naive(),
    )
}
