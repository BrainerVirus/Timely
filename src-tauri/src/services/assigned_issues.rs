use crate::{
    db,
    domain::models::{AssignedIssuesPage, AssignedIssuesQueryInput, ProviderConnection},
    error::AppError,
    services::shared,
    state::AppState,
};

pub fn load_assigned_issues_page(
    state: &AppState,
    input: AssignedIssuesQueryInput,
) -> Result<AssignedIssuesPage, AppError> {
    let connection = shared::open_connection(state)?;
    let provider_ids = active_provider_ids_for_query(
        shared::load_active_provider_connections(&connection)?,
        input.provider.as_deref(),
    );

    let page = db::bootstrap::load_assigned_issues_page_from_cache_for_providers(
        &connection,
        &provider_ids,
        &input,
        chrono::Local::now().date_naive(),
    )?;
    Ok(page)
}

fn active_provider_ids_for_query(
    connections: Vec<ProviderConnection>,
    provider_filter: Option<&str>,
) -> Vec<i64> {
    connections
        .into_iter()
        .filter(|connection| {
            provider_filter
                .is_none_or(|provider| connection.provider.eq_ignore_ascii_case(provider))
        })
        .map(|connection| connection.id)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn provider(id: i64, name: &str) -> ProviderConnection {
        ProviderConnection {
            id,
            provider: name.to_string(),
            display_name: name.to_string(),
            host: format!("{}.example.com", name.to_lowercase()),
            username: None,
            client_id: None,
            has_token: true,
            state: "live".to_string(),
            auth_mode: "pat".to_string(),
            preferred_scope: "api".to_string(),
            status_note: String::new(),
            oauth_ready: false,
            is_primary: true,
        }
    }

    #[test]
    fn provider_filter_limits_active_assigned_issue_accounts() {
        let connections = vec![provider(17, "YouTrack"), provider(18, "GitLab")];
        assert_eq!(
            active_provider_ids_for_query(connections.clone(), Some("youtrack")),
            vec![17]
        );
        assert_eq!(
            active_provider_ids_for_query(connections, None),
            vec![17, 18]
        );
    }
}
