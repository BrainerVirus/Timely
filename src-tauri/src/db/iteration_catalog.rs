use rusqlite::{params, Connection};

use crate::domain::models::CachedIterationRecord;
use crate::error::AppError;

/// Loads cached GitLab iteration rows for a provider account (same source as My Issues filters).
pub fn load_rows(connection: &Connection, provider_account_id: i64) -> Result<Vec<CachedIterationRecord>, AppError> {
    let mut statement = connection.prepare(
        "SELECT iteration_gitlab_id, cadence_id, cadence_title, title, start_date, due_date, state, web_url, group_id
         FROM iteration_catalog
         WHERE provider_account_id = ?1",
    )?;

    let rows = statement.query_map(params![provider_account_id], |row| {
        Ok(CachedIterationRecord {
            iteration_gitlab_id: row.get(0)?,
            cadence_id: row.get(1)?,
            cadence_title: row.get(2)?,
            title: row.get(3)?,
            start_date: row.get(4)?,
            due_date: row.get(5)?,
            state: row.get(6)?,
            web_url: row.get(7)?,
            group_id: row.get(8)?,
        })
    })?;

    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}
