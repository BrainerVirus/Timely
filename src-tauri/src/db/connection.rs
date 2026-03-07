use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};

use crate::{domain::models::ProviderConnection, error::AppError};

pub fn upsert_gitlab_connection(
    connection: &Connection,
    host: &str,
    display_name: Option<&str>,
    client_id: Option<&str>,
    auth_mode: &str,
    preferred_scope: &str,
) -> Result<ProviderConnection, AppError> {
    let normalized_host = normalize_host(host);
    let display_name = display_name
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("GitLab workspace")
        .trim()
        .to_string();

    let existing_id = connection
        .query_row(
            "SELECT id FROM provider_accounts WHERE provider = 'GitLab' AND host = ?1 LIMIT 1",
            [normalized_host.as_str()],
            |row| row.get::<_, i64>(0),
        )
        .optional()?;

    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    match existing_id {
        Some(id) => {
            connection.execute(
                "UPDATE provider_accounts
                 SET display_name = ?1, oauth_client_id = ?2, auth_mode = ?3, preferred_scope = ?4, oauth_ready = ?5, status_note = ?6, last_sync_at = ?7
                 WHERE id = ?8",
                params![
                    display_name,
                    client_id,
                    auth_mode,
                    preferred_scope,
                    if client_id.is_some() { 1 } else { 0 },
                    if client_id.is_some() {
                        "GitLab OAuth client is configured locally. Register pulseboard://auth/gitlab as an allowed redirect URI in GitLab."
                    } else {
                        "Client ID missing. Configure a GitLab OAuth application before launching auth."
                    },
                    now,
                    id,
                ],
            )?;
        }
        None => {
            connection.execute(
                "UPDATE provider_accounts SET is_primary = 0 WHERE provider = 'GitLab'",
                [],
            )?;
            connection.execute(
                "INSERT INTO provider_accounts (provider, host, display_name, username, auth_mode, oauth_client_id, preferred_scope, oauth_ready, status_note, is_primary, created_at, last_sync_at)
                 VALUES ('GitLab', ?1, ?2, NULL, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?8)",
                params![
                    normalized_host,
                    display_name,
                    auth_mode,
                    client_id,
                    preferred_scope,
                    if client_id.is_some() { 1 } else { 0 },
                    if client_id.is_some() {
                        "GitLab OAuth client is configured locally. Register pulseboard://auth/gitlab as an allowed redirect URI in GitLab."
                    } else {
                        "Client ID missing. Configure a GitLab OAuth application before launching auth."
                    },
                    now,
                ],
            )?;
        }
    }

    load_gitlab_connections(connection)?
        .into_iter()
        .find(|provider| provider.host == normalized_host)
        .ok_or_else(|| rusqlite::Error::QueryReturnedNoRows.into())
}

pub fn save_gitlab_pat(
    connection: &Connection,
    host: &str,
    token: &str,
) -> Result<ProviderConnection, AppError> {
    let normalized_host = normalize_host(host);

    let existing_id = connection
        .query_row(
            "SELECT id FROM provider_accounts WHERE provider = 'GitLab' AND host = ?1 LIMIT 1",
            [normalized_host.as_str()],
            |row| row.get::<_, i64>(0),
        )
        .optional()?;

    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    match existing_id {
        Some(id) => {
            connection.execute(
                "UPDATE provider_accounts
                 SET auth_mode = 'PAT', personal_access_token = ?1, oauth_ready = 1, status_note = ?2, last_sync_at = ?3
                 WHERE id = ?4",
                params![
                    token,
                    "Connected via Personal Access Token.",
                    now,
                    id,
                ],
            )?;
        }
        None => {
            connection.execute(
                "UPDATE provider_accounts SET is_primary = 0 WHERE provider = 'GitLab'",
                [],
            )?;
            connection.execute(
                "INSERT INTO provider_accounts (provider, host, display_name, username, auth_mode, personal_access_token, preferred_scope, oauth_ready, status_note, is_primary, created_at, last_sync_at)
                 VALUES ('GitLab', ?1, ?2, NULL, 'PAT', ?3, 'read_api', 1, ?4, 1, ?5, ?5)",
                params![
                    normalized_host,
                    normalized_host,
                    token,
                    "Connected via Personal Access Token.",
                    now,
                ],
            )?;
        }
    }

    load_gitlab_connections(connection)?
        .into_iter()
        .find(|provider| provider.host == normalized_host)
        .ok_or_else(|| rusqlite::Error::QueryReturnedNoRows.into())
}

pub fn load_gitlab_connections(
    connection: &Connection,
) -> Result<Vec<ProviderConnection>, AppError> {
    let mut statement = connection.prepare(
        "SELECT id, provider, display_name, host, oauth_client_id, auth_mode, preferred_scope, oauth_ready, status_note, is_primary, personal_access_token
         FROM provider_accounts
         WHERE provider = 'GitLab'
         ORDER BY is_primary DESC, id ASC",
    )?;

    let rows = statement.query_map([], |row| {
        let oauth_ready: i64 = row.get(7)?;
        let pat: Option<String> = row.get(10)?;
        Ok(ProviderConnection {
            id: row.get(0)?,
            provider: row.get(1)?,
            display_name: row.get(2)?,
            host: row.get(3)?,
            client_id: row.get(4)?,
            has_token: pat.filter(|t| !t.is_empty()).is_some(),
            state: if oauth_ready == 1 {
                "live".to_string()
            } else {
                "beta".to_string()
            },
            auth_mode: row.get(5)?,
            preferred_scope: row.get(6)?,
            status_note: row.get(8)?,
            oauth_ready: oauth_ready == 1,
            is_primary: row.get::<_, i64>(9)? == 1,
        })
    })?;

    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

fn normalize_host(host: &str) -> String {
    let trimmed = host.trim().trim_end_matches('/');
    let without_scheme = trimmed
        .strip_prefix("https://")
        .or_else(|| trimmed.strip_prefix("http://"))
        .unwrap_or(trimmed);

    without_scheme.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_connection() -> Connection {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute_batch(
                r#"
                CREATE TABLE provider_accounts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider TEXT NOT NULL,
                    host TEXT NOT NULL,
                    display_name TEXT NOT NULL,
                    username TEXT,
                    auth_mode TEXT NOT NULL,
                    oauth_client_id TEXT,
                    personal_access_token TEXT,
                    preferred_scope TEXT NOT NULL DEFAULT 'read_api',
                    oauth_ready INTEGER NOT NULL DEFAULT 0,
                    status_note TEXT NOT NULL DEFAULT '',
                    is_primary INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    last_sync_at TEXT
                );
                "#,
            )
            .unwrap();
        connection
    }

    #[test]
    fn upsert_normalizes_host() {
        let connection = setup_connection();
        let provider = upsert_gitlab_connection(
            &connection,
            "https://gitlab.example.com/",
            Some("Acme GitLab"),
            Some("client-123"),
            "OAuth PKCE + PAT fallback",
            "read_api",
        )
        .unwrap();

        assert_eq!(provider.host, "gitlab.example.com");
        assert_eq!(provider.client_id.as_deref(), Some("client-123"));
    }

    #[test]
    fn save_pat_stores_token() {
        let connection = setup_connection();
        let provider = save_gitlab_pat(&connection, "gitlab.com", "glpat-test-token").unwrap();

        assert_eq!(provider.host, "gitlab.com");
        assert!(provider.has_token);
        assert!(provider.oauth_ready);
        assert_eq!(provider.auth_mode, "PAT");
    }

    #[test]
    fn normalize_host_removes_scheme_and_slash() {
        assert_eq!(normalize_host("https://gitlab.com/"), "gitlab.com");
    }
}
