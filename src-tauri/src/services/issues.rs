use crate::{
    db,
    domain::models::{
        CachedIterationRecord, CreateIssueCommentInput, DeleteIssueCommentInput, DeleteIssueInput,
        IssueActivityPage, IssueComposerCapabilities, IssueDetailsCapabilities, IssueDetailsSnapshot,
        IssueMetadataCapability, IssueReference, IssueTimeTrackingCapabilities,
        LoadIssueActivityPageInput, LoadIssueDetailsInput, LoadIssueDetailsResponse, LogIssueTimeInput,
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
    input: &LoadIssueDetailsInput,
) -> Result<LoadIssueDetailsResponse, AppError> {
    match input.provider.as_str() {
        "gitlab" => {
            let reference = crate::domain::models::IssueReference {
                provider: input.provider.clone(),
                issue_id: input.issue_id.clone(),
                provider_issue_ref: String::new(),
            };
            let (client, catalog) = load_gitlab_client_and_iteration_catalog(state)?;
            let mut response =
                client.load_issue_details(&reference, input.if_none_match.as_deref())?;
            if let LoadIssueDetailsResponse::Full { snapshot } = &mut response {
                enrich_and_dedupe_issue_iteration_options(snapshot, &catalog);
            }
            Ok(response)
        }
        "youtrack" => Ok(LoadIssueDetailsResponse::Full {
            snapshot: Box::new(youtrack_limited_snapshot(IssueReference {
                provider: "youtrack".to_string(),
                issue_id: input.issue_id.clone(),
                provider_issue_ref: input.issue_id.clone(),
            })),
        }),
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
        "youtrack" => Ok(youtrack_limited_snapshot(input.reference.clone())),
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
        "youtrack" => Err(AppError::GitLabApi(
            "YouTrack comments are not available in this version yet.".to_string(),
        )),
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
        "youtrack" => Err(AppError::GitLabApi(
            "YouTrack comment edits are not available in this version yet.".to_string(),
        )),
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
        "youtrack" => Err(AppError::GitLabApi(
            "YouTrack comment deletes are not available in this version yet.".to_string(),
        )),
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
        "youtrack" => Err(AppError::GitLabApi(
            "YouTrack time logging is not available in this version yet.".to_string(),
        )),
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
        "youtrack" => Err(AppError::GitLabApi(
            "YouTrack issue delete is not available in this version yet.".to_string(),
        )),
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
        "youtrack" => Ok(IssueActivityPage {
            items: vec![],
            has_next_page: false,
            next_page: None,
        }),
        other => Err(AppError::GitLabApi(format!(
            "Issue provider '{}' is not supported yet.",
            other
        ))),
    }
}

fn disabled_capability(reason: &str) -> IssueMetadataCapability {
    IssueMetadataCapability {
        enabled: false,
        reason: Some(reason.to_string()),
        options: vec![],
    }
}

fn youtrack_limited_snapshot(reference: IssueReference) -> IssueDetailsSnapshot {
    let reason = "This YouTrack issue is connected, but full API parity is still in progress.";
    IssueDetailsSnapshot {
        key: reference.issue_id.clone(),
        title: format!("YouTrack issue {}", reference.issue_id),
        state: "open".to_string(),
        reference,
        author: None,
        created_at: None,
        updated_at: None,
        web_url: None,
        total_time_spent: None,
        description: Some(reason.to_string()),
        status: None,
        status_options: None,
        labels: vec![],
        milestone_title: None,
        milestone: None,
        iteration: None,
        linked_items: Some(vec![]),
        child_items: Some(vec![]),
        activity: vec![],
        activity_has_next_page: Some(false),
        activity_next_page: None,
        viewer_username: None,
        issue_etag: None,
        capabilities: IssueDetailsCapabilities {
            status: disabled_capability(reason),
            labels: disabled_capability(reason),
            iteration: disabled_capability(reason),
            milestone: disabled_capability(reason),
            composer: IssueComposerCapabilities {
                enabled: false,
                modes: vec!["write".to_string()],
                supports_quick_actions: false,
            },
            time_tracking: IssueTimeTrackingCapabilities {
                enabled: false,
                supports_quick_actions: false,
            },
        },
    }
}
