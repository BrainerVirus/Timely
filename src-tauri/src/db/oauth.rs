use rusqlite::{params, Connection, OptionalExtension};

use crate::{domain::models::OAuthSession, error::AppError};

pub fn store_session(connection: &Connection, session: &OAuthSession) -> Result<(), AppError> {
    connection.execute(
        "INSERT OR REPLACE INTO oauth_sessions (session_id, provider, host, state, code_verifier, code_challenge, scope, redirect_uri, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            session.session_id,
            session.provider,
            session.host,
            session.state,
            session.code_verifier,
            session.code_challenge,
            session.scope,
            session.redirect_uri,
            session.created_at,
        ],
    )?;

    Ok(())
}

pub fn load_session(
    connection: &Connection,
    session_id: &str,
) -> Result<Option<OAuthSession>, AppError> {
    connection
        .query_row(
            "SELECT session_id, provider, host, state, code_verifier, code_challenge, scope, redirect_uri, created_at
             FROM oauth_sessions WHERE session_id = ?1 LIMIT 1",
            [session_id],
            |row| {
                Ok(OAuthSession {
                    session_id: row.get(0)?,
                    provider: row.get(1)?,
                    host: row.get(2)?,
                    state: row.get(3)?,
                    code_verifier: row.get(4)?,
                    code_challenge: row.get(5)?,
                    scope: row.get(6)?,
                    redirect_uri: row.get(7)?,
                    created_at: row.get(8)?,
                })
            },
        )
        .optional()
        .map_err(AppError::from)
}

pub fn load_session_by_state(
    connection: &Connection,
    state: &str,
) -> Result<Option<OAuthSession>, AppError> {
    connection
        .query_row(
            "SELECT session_id, provider, host, state, code_verifier, code_challenge, scope, redirect_uri, created_at
             FROM oauth_sessions WHERE state = ?1 LIMIT 1",
            [state],
            |row| {
                Ok(OAuthSession {
                    session_id: row.get(0)?,
                    provider: row.get(1)?,
                    host: row.get(2)?,
                    state: row.get(3)?,
                    code_verifier: row.get(4)?,
                    code_challenge: row.get(5)?,
                    scope: row.get(6)?,
                    redirect_uri: row.get(7)?,
                    created_at: row.get(8)?,
                })
            },
        )
        .optional()
        .map_err(AppError::from)
}

pub fn delete_session(connection: &Connection, session_id: &str) -> Result<(), AppError> {
    connection.execute(
        "DELETE FROM oauth_sessions WHERE session_id = ?1",
        [session_id],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stores_and_loads_oauth_session() {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute_batch(
                "CREATE TABLE oauth_sessions (
                    session_id TEXT PRIMARY KEY,
                    provider TEXT NOT NULL,
                    host TEXT NOT NULL,
                    state TEXT NOT NULL,
                    code_verifier TEXT NOT NULL,
                    code_challenge TEXT NOT NULL,
                    scope TEXT NOT NULL,
                    redirect_uri TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );",
            )
            .unwrap();

        let session = OAuthSession {
            session_id: "session-1".to_string(),
            provider: "GitLab".to_string(),
            host: "gitlab.com".to_string(),
            state: "state-1".to_string(),
            code_verifier: "verifier".to_string(),
            code_challenge: "challenge".to_string(),
            scope: "read_api".to_string(),
            redirect_uri: "pulseboard://auth/gitlab".to_string(),
            created_at: "2026-03-06T20:00:00Z".to_string(),
        };

        store_session(&connection, &session).unwrap();
        let loaded = load_session(&connection, "session-1").unwrap().unwrap();
        let loaded_by_state = load_session_by_state(&connection, "state-1")
            .unwrap()
            .unwrap();

        assert_eq!(loaded.state, "state-1");
        assert_eq!(loaded_by_state.session_id, "session-1");
    }
}
