use crate::{
    db,
    domain::models::{
        CachedIterationRecord, CreateIssueCommentInput, DeleteIssueCommentInput, DeleteIssueInput,
        IssueActivityPage, IssueDetailsSnapshot, LoadIssueActivityPageInput, LogIssueTimeInput,
        UpdateIssueCommentInput, UpdateIssueMetadataInput,
    },
    error::AppError,
    providers::gitlab::{enrich_and_dedupe_issue_iteration_options, GitLabClient},
    services::shared,
    state::AppState,
};

fn load_gitlab_client(state: &AppState) -> Result<GitLabClient, AppError> {
    let connection = shared::open_connection(state)?;
    let primary = shared::load_primary_gitlab_connection(&connection)?;
    let token = db::connection::load_gitlab_token(&connection, &primary.host)?
        .ok_or_else(|| AppError::GitLabApi("No token found for primary connection.".to_string()))?;

    GitLabClient::new(&primary.host, &token)
}

fn load_gitlab_client_and_iteration_catalog(
    state: &AppState,
) -> Result<(GitLabClient, Vec<CachedIterationRecord>), AppError> {
    let connection = shared::open_connection(state)?;
    let primary = shared::load_primary_gitlab_connection(&connection)?;
    let catalog = db::iteration_catalog::load_rows(&connection, primary.id).unwrap_or_default();
    let token = db::connection::load_gitlab_token(&connection, &primary.host)?
        .ok_or_else(|| AppError::GitLabApi("No token found for primary connection.".to_string()))?;

    Ok((GitLabClient::new(&primary.host, &token)?, catalog))
}

pub fn load_issue_details(
    state: &AppState,
    provider: &str,
    issue_id: &str,
) -> Result<IssueDetailsSnapshot, AppError> {
    match provider {
        "gitlab" => {
            let reference = crate::domain::models::IssueReference {
                provider: provider.to_string(),
                issue_id: issue_id.to_string(),
                provider_issue_ref: String::new(),
            };
            let (client, catalog) = load_gitlab_client_and_iteration_catalog(state)?;
            let mut snapshot = client.load_issue_details(&reference)?;
            enrich_and_dedupe_issue_iteration_options(&mut snapshot, &catalog);
            Ok(snapshot)
        }
        other => Err(AppError::GitLabApi(format!(
            "Issue provider '{}' is not supported yet.",
            other
        ))),
    }
}

pub fn update_issue_metadata(
    state: &AppState,
    input: &UpdateIssueMetadataInput,
) -> Result<IssueDetailsSnapshot, AppError> {
    match input.reference.provider.as_str() {
        "gitlab" => {
            let (client, catalog) = load_gitlab_client_and_iteration_catalog(state)?;
            let mut snapshot = client.update_issue_metadata(input)?;
            enrich_and_dedupe_issue_iteration_options(&mut snapshot, &catalog);
            Ok(snapshot)
        }
        other => Err(AppError::GitLabApi(format!(
            "Issue provider '{}' is not supported yet.",
            other
        ))),
    }
}

pub fn create_issue_comment(
    state: &AppState,
    input: &CreateIssueCommentInput,
) -> Result<String, AppError> {
    match input.reference.provider.as_str() {
        "gitlab" => {
            let client = load_gitlab_client(state)?;
            client.create_issue_note(&input.reference.provider_issue_ref, &input.body)
        }
        other => Err(AppError::GitLabApi(format!(
            "Issue provider '{}' is not supported yet.",
            other
        ))),
    }
}

pub fn update_issue_comment(
    state: &AppState,
    input: &UpdateIssueCommentInput,
) -> Result<(), AppError> {
    match input.reference.provider.as_str() {
        "gitlab" => {
            let client = load_gitlab_client(state)?;
            client.update_issue_note(&input.reference.issue_id, &input.note_id, &input.body)
        }
        other => Err(AppError::GitLabApi(format!(
            "Issue provider '{}' is not supported yet.",
            other
        ))),
    }
}

pub fn delete_issue_comment(
    state: &AppState,
    input: &DeleteIssueCommentInput,
) -> Result<(), AppError> {
    match input.reference.provider.as_str() {
        "gitlab" => {
            let client = load_gitlab_client(state)?;
            client.delete_issue_note(&input.reference.issue_id, &input.note_id)
        }
        other => Err(AppError::GitLabApi(format!(
            "Issue provider '{}' is not supported yet.",
            other
        ))),
    }
}

pub fn log_issue_time(state: &AppState, input: &LogIssueTimeInput) -> Result<String, AppError> {
    match input.reference.provider.as_str() {
        "gitlab" => {
            let client = load_gitlab_client(state)?;
            client.create_issue_timelog(
                &input.reference.provider_issue_ref,
                &input.time_spent,
                input.spent_at.as_deref(),
                input.summary.as_deref(),
            )
        }
        other => Err(AppError::GitLabApi(format!(
            "Issue provider '{}' is not supported yet.",
            other
        ))),
    }
}

pub fn delete_issue(state: &AppState, input: &DeleteIssueInput) -> Result<(), AppError> {
    match input.reference.provider.as_str() {
        "gitlab" => {
            let client = load_gitlab_client(state)?;
            client.delete_issue(&input.reference.issue_id)
        }
        other => Err(AppError::GitLabApi(format!(
            "Issue provider '{}' is not supported yet.",
            other
        ))),
    }
}

pub fn load_issue_activity_page(
    state: &AppState,
    input: &LoadIssueActivityPageInput,
) -> Result<IssueActivityPage, AppError> {
    match input.reference.provider.as_str() {
        "gitlab" => {
            let client = load_gitlab_client(state)?;
            client.load_issue_activity_page(&input.reference, input.page, 10)
        }
        other => Err(AppError::GitLabApi(format!(
            "Issue provider '{}' is not supported yet.",
            other
        ))),
    }
}
