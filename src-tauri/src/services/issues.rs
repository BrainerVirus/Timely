use crate::{
    db,
    domain::models::{
        CreateIssueCommentInput, DeleteIssueCommentInput, IssueDetailsSnapshot, LogIssueTimeInput,
        UpdateIssueCommentInput, UpdateIssueMetadataInput,
    },
    error::AppError,
    providers::gitlab::GitLabClient,
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

pub fn load_issue_details(
    state: &AppState,
    provider: &str,
    issue_id: &str,
) -> Result<IssueDetailsSnapshot, AppError> {
    match provider {
        "gitlab" => {
            let client = load_gitlab_client(state)?;
            let reference = crate::domain::models::IssueReference {
                provider: provider.to_string(),
                issue_id: issue_id.to_string(),
                provider_issue_ref: String::new(),
            };
            client.load_issue_details(&reference)
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
            let client = load_gitlab_client(state)?;
            client.update_issue_metadata(input)
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
