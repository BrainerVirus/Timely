use crate::{
    db,
    domain::models::{
        CachedIterationRecord, CreateIssueCommentInput, DeleteIssueCommentInput, DeleteIssueInput,
        IssueActivityPage, IssueDetailsSnapshot, IssueReference, LoadIssueActivityPageInput,
        LoadIssueDetailsInput, LoadIssueDetailsResponse, LogIssueTimeInput,
        UpdateIssueCommentInput, UpdateIssueMetadataInput,
    },
    error::AppError,
    providers::gitlab::{enrich_and_dedupe_issue_iteration_options, GitLabClient},
    providers::YouTrackClient,
    services::shared,
    state::AppState,
};

fn load_gitlab_client(state: &AppState) -> Result<GitLabClient, AppError> {
    let connection = shared::open_connection(state)?;
    let primary = shared::load_primary_gitlab_connection(&connection)?;
    let token =
        db::connection::load_gitlab_token(&connection, &primary.host)?.ok_or_else(|| {
            AppError::ProviderApi("No token found for primary connection.".to_string())
        })?;

    GitLabClient::new(&primary.host, &token)
}

fn load_youtrack_client(state: &AppState) -> Result<YouTrackClient, AppError> {
    let connection = shared::open_connection(state)?;
    let primary = shared::load_primary_connection(&connection, "youtrack")?;
    let token = db::connection::load_provider_token(&connection, "youtrack", &primary.host)?
        .ok_or_else(|| {
            AppError::ProviderApi("No token found for primary YouTrack connection.".to_string())
        })?;

    YouTrackClient::new(&primary.host, &token)
}

fn load_gitlab_client_and_iteration_catalog(
    state: &AppState,
) -> Result<(GitLabClient, Vec<CachedIterationRecord>), AppError> {
    let connection = shared::open_connection(state)?;
    let primary = shared::load_primary_gitlab_connection(&connection)?;
    let catalog = db::iteration_catalog::load_rows(&connection, primary.id).unwrap_or_default();
    let token =
        db::connection::load_gitlab_token(&connection, &primary.host)?.ok_or_else(|| {
            AppError::ProviderApi("No token found for primary connection.".to_string())
        })?;

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
        "youtrack" => {
            let reference = IssueReference {
                provider: "youtrack".to_string(),
                issue_id: input.issue_id.clone(),
                provider_issue_ref: input.issue_id.clone(),
            };
            let client = load_youtrack_client(state)?;
            Ok(LoadIssueDetailsResponse::Full {
                snapshot: Box::new(client.load_issue_details(&reference)?),
            })
        }
        other => Err(AppError::ProviderApi(format!(
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
        "youtrack" => {
            let client = load_youtrack_client(state)?;
            client.update_issue_metadata(input)
        }
        other => Err(AppError::ProviderApi(format!(
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
        "youtrack" => {
            let client = load_youtrack_client(state)?;
            client.create_issue_comment(&input.reference.issue_id, &input.body)
        }
        other => Err(AppError::ProviderApi(format!(
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
        "youtrack" => {
            let client = load_youtrack_client(state)?;
            client.update_issue_comment(&input.reference.issue_id, &input.note_id, &input.body)
        }
        other => Err(AppError::ProviderApi(format!(
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
        "youtrack" => {
            let client = load_youtrack_client(state)?;
            client.delete_issue_comment(&input.reference.issue_id, &input.note_id)
        }
        other => Err(AppError::ProviderApi(format!(
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
        "youtrack" => {
            let client = load_youtrack_client(state)?;
            client.log_issue_time(
                &input.reference.issue_id,
                &input.time_spent,
                input.summary.as_deref(),
            )
        }
        other => Err(AppError::ProviderApi(format!(
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
        "youtrack" => Err(AppError::ProviderApi(
            "YouTrack issue delete is not available in this version yet.".to_string(),
        )),
        other => Err(AppError::ProviderApi(format!(
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
        "youtrack" => {
            let client = load_youtrack_client(state)?;
            client.load_issue_activity_page(&input.reference, input.page, 10)
        }
        other => Err(AppError::ProviderApi(format!(
            "Issue provider '{}' is not supported yet.",
            other
        ))),
    }
}

#[cfg(test)]
mod tests {
    use std::{env, path::PathBuf};

    use rusqlite::Connection;

    use crate::{
        db,
        domain::models::{DeleteIssueInput, IssueReference, LoadIssueDetailsInput},
        error::AppError,
        state::AppState,
    };

    use super::*;

    fn make_state() -> AppState {
        let mut path = env::temp_dir();
        path.push(format!(
            "timely-issues-test-{}-{}.sqlite3",
            std::process::id(),
            rand::random::<u64>()
        ));
        let _ = std::fs::remove_file(&path);

        let connection = Connection::open(&path).unwrap();
        db::migrate(&connection).unwrap();
        drop(connection);

        AppState::new(PathBuf::from(path))
    }

    #[test]
    fn load_issue_details_rejects_unknown_provider() {
        let state = make_state();
        let input = LoadIssueDetailsInput {
            provider: "phantom".to_string(),
            issue_id: "X-1".to_string(),
            if_none_match: None,
        };
        let err = load_issue_details(&state, &input).unwrap_err();
        assert!(matches!(err, AppError::ProviderApi(_)));
        let message = err.to_string();
        assert!(message.contains("phantom"), "{message}");
        let _ = std::fs::remove_file(&state.db_path);
    }

    #[test]
    fn delete_issue_youtrack_is_unsupported() {
        let state = make_state();
        let input = DeleteIssueInput {
            reference: IssueReference {
                provider: "youtrack".to_string(),
                issue_id: "DEMO-1".to_string(),
                provider_issue_ref: "DEMO-1".to_string(),
            },
        };
        let err = delete_issue(&state, &input).unwrap_err();
        assert!(matches!(err, AppError::ProviderApi(_)));
        let _ = std::fs::remove_file(&state.db_path);
    }
}
