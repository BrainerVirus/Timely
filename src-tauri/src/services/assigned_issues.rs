use std::{fs::OpenOptions, io::Write};

use serde_json::{json, Value};

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
    let primary = shared::load_primary_gitlab_connection(&connection)?;
    let provider_ids = active_provider_ids_for_query(
        shared::load_active_provider_connections(&connection)?,
        input.provider.as_deref(),
    );
    // #region agent log
    debug_log(
        "run2",
        "H6,H7,H8,H10",
        "src-tauri/src/services/assigned_issues.rs:load_assigned_issues_page",
        "Assigned issues read selected provider account",
        json!({
            "selectedProviderAccountId": primary.id,
            "selectedProvider": primary.provider,
            "selectedHost": primary.host,
            "readProviderAccountIds": &provider_ids,
            "status": input.status.as_str(),
            "providerFilter": input.provider.as_deref(),
            "page": input.page,
            "providerAccounts": provider_account_debug_summary(&connection),
            "assignedWorkItemsByProvider": assigned_work_items_debug_summary(&connection),
        }),
    );
    // #endregion

    let page = db::bootstrap::load_assigned_issues_page_from_cache_for_providers(
        &connection,
        &provider_ids,
        &input,
        chrono::Local::now().date_naive(),
    )?;
    // #region agent log
    debug_log(
        "post-fix",
        "H6,H7,H8,H10",
        "src-tauri/src/services/assigned_issues.rs:load_assigned_issues_page",
        "Assigned issues page returned providers",
        json!({
            "status": input.status.as_str(),
            "page": page.page,
            "totalItems": page.total_items,
            "returnedProviders": page.items.iter().map(|item| item.provider.as_str()).collect::<Vec<_>>(),
            "returnedKeys": page.items.iter().take(10).map(|item| item.key.as_str()).collect::<Vec<_>>(),
        }),
    );
    // #endregion
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

fn provider_account_debug_summary(connection: &rusqlite::Connection) -> Value {
    let Ok(mut statement) = connection
        .prepare("SELECT id, provider, host, is_primary FROM provider_accounts ORDER BY id")
    else {
        return json!({ "error": "prepare-failed" });
    };
    let Ok(rows) = statement.query_map([], |row| {
        Ok(json!({
            "id": row.get::<_, i64>(0)?,
            "provider": row.get::<_, String>(1)?,
            "host": row.get::<_, String>(2)?,
            "isPrimary": row.get::<_, i64>(3)?,
        }))
    }) else {
        return json!({ "error": "query-failed" });
    };
    json!(rows.filter_map(Result::ok).collect::<Vec<_>>())
}

fn assigned_work_items_debug_summary(connection: &rusqlite::Connection) -> Value {
    let Ok(mut statement) = connection.prepare(
        "SELECT pa.id, pa.provider, COUNT(wi.id)
         FROM provider_accounts pa
         LEFT JOIN work_items wi
           ON wi.provider_account_id = pa.id AND wi.from_assigned_sync = 1
         GROUP BY pa.id, pa.provider
         ORDER BY pa.id",
    ) else {
        return json!({ "error": "prepare-failed" });
    };
    let Ok(rows) = statement.query_map([], |row| {
        Ok(json!({
            "providerAccountId": row.get::<_, i64>(0)?,
            "provider": row.get::<_, String>(1)?,
            "assignedWorkItems": row.get::<_, i64>(2)?,
        }))
    }) else {
        return json!({ "error": "query-failed" });
    };
    json!(rows.filter_map(Result::ok).collect::<Vec<_>>())
}

fn debug_log(run_id: &str, hypothesis_id: &str, location: &str, message: &str, data: Value) {
    let payload = json!({
        "sessionId": "2eafcf",
        "runId": run_id,
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": chrono::Utc::now().timestamp_millis(),
    });
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open("/Users/cristhoferpincetti/Documents/projects/personal/gitlab-time-tracker/.cursor/debug-2eafcf.log")
    {
        let _ = writeln!(file, "{payload}");
    }
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
