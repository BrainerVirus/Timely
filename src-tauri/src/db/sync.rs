use chrono::{NaiveDate, Utc};
use rusqlite::{params, Connection, OptionalExtension};

use crate::error::AppError;

pub fn upsert_work_item(
    connection: &Connection,
    provider_account_id: i64,
    provider_item_id: &str,
    title: &str,
    state: &str,
    web_url: Option<&str>,
    labels_json: Option<&str>,
) -> Result<i64, AppError> {
    let existing_id: Option<i64> = connection
        .query_row(
            "SELECT id FROM work_items WHERE provider_account_id = ?1 AND provider_item_id = ?2 LIMIT 1",
            params![provider_account_id, provider_item_id],
            |row| row.get(0),
        )
        .optional()?;

    match existing_id {
        Some(id) => {
            connection.execute(
                "UPDATE work_items SET title = ?1, state = ?2, web_url = ?3, labels_json = ?4, updated_at = ?5 WHERE id = ?6",
                params![
                    title,
                    state,
                    web_url,
                    labels_json,
                    Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string(),
                    id,
                ],
            )?;
            Ok(id)
        }
        None => {
            connection.execute(
                "INSERT INTO work_items (provider_account_id, provider_item_id, title, state, web_url, labels_json, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    provider_account_id,
                    provider_item_id,
                    title,
                    state,
                    web_url,
                    labels_json,
                    Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string(),
                ],
            )?;
            Ok(connection.last_insert_rowid())
        }
    }
}

pub fn upsert_time_entry(
    connection: &Connection,
    provider_account_id: i64,
    provider_entry_id: &str,
    work_item_id: Option<i64>,
    spent_at: &str,
    seconds: i64,
) -> Result<(), AppError> {
    let existing_id: Option<i64> = connection
        .query_row(
            "SELECT id FROM time_entries WHERE provider_account_id = ?1 AND provider_entry_id = ?2 LIMIT 1",
            params![provider_account_id, provider_entry_id],
            |row| row.get(0),
        )
        .optional()?;

    match existing_id {
        Some(id) => {
            connection.execute(
                "UPDATE time_entries SET work_item_id = ?1, spent_at = ?2, seconds = ?3 WHERE id = ?4",
                params![work_item_id, spent_at, seconds, id],
            )?;
        }
        None => {
            connection.execute(
                "INSERT INTO time_entries (provider_account_id, provider_entry_id, work_item_id, spent_at, seconds) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![provider_account_id, provider_entry_id, work_item_id, spent_at, seconds],
            )?;
        }
    }

    Ok(())
}

pub fn upsert_project(
    connection: &Connection,
    provider_account_id: i64,
    provider_project_id: &str,
    name: &str,
    path: &str,
) -> Result<(), AppError> {
    let existing_id: Option<i64> = connection
        .query_row(
            "SELECT id FROM projects WHERE provider_account_id = ?1 AND provider_project_id = ?2 LIMIT 1",
            params![provider_account_id, provider_project_id],
            |row| row.get(0),
        )
        .optional()?;

    match existing_id {
        Some(id) => {
            connection.execute(
                "UPDATE projects SET name = ?1, path = ?2 WHERE id = ?3",
                params![name, path, id],
            )?;
        }
        None => {
            connection.execute(
                "INSERT INTO projects (provider_account_id, provider_project_id, name, path) VALUES (?1, ?2, ?3, ?4)",
                params![provider_account_id, provider_project_id, name, path],
            )?;
        }
    }

    Ok(())
}

pub fn rebuild_daily_buckets(
    connection: &Connection,
    provider_account_id: i64,
    start_date: &NaiveDate,
    end_date: &NaiveDate,
) -> Result<(), AppError> {
    let tx = connection.unchecked_transaction()?;

    let start_str = start_date.format("%Y-%m-%d").to_string();
    let end_str = end_date.format("%Y-%m-%d").to_string();

    // Load target seconds from schedule — error out clearly if missing
    let target_seconds: i64 = tx
        .query_row(
            "SELECT hours_per_day FROM schedule_profiles WHERE is_default = 1 LIMIT 1",
            [],
            |row| {
                let hours: f64 = row.get(0)?;
                Ok((hours * 3600.0) as i64)
            },
        )
        .map_err(|_| {
            AppError::GitLabApi(
                "no default schedule profile found; configure your work schedule first".to_string(),
            )
        })?;

    // Delete existing buckets in range
    tx.execute(
        "DELETE FROM daily_buckets WHERE provider_account_id = ?1 AND date >= ?2 AND date <= ?3",
        params![provider_account_id, start_str, end_str],
    )?;

    // Rebuild from time_entries
    let mut statement = tx.prepare(
        "SELECT date(spent_at) as day, SUM(seconds) as total
         FROM time_entries
         WHERE provider_account_id = ?1 AND date(spent_at) >= ?2 AND date(spent_at) <= ?3
         GROUP BY date(spent_at)
         ORDER BY day ASC",
    )?;

    let rows = statement.query_map(params![provider_account_id, start_str, end_str], |row| {
        let day: String = row.get(0)?;
        let logged: i64 = row.get(1)?;
        Ok((day, logged))
    })?;

    let collected: Vec<(String, i64)> = rows.collect::<Result<_, _>>()?;
    drop(statement);

    for (day, logged_seconds) in collected {
        let variance = logged_seconds - target_seconds;
        let status = if logged_seconds == 0 {
            "empty"
        } else if variance > 1800 {
            "over_target"
        } else if variance >= -1800 {
            "met_target"
        } else if logged_seconds > 0 {
            "on_track"
        } else {
            "under_target"
        };

        tx.execute(
            "INSERT INTO daily_buckets (provider_account_id, date, target_seconds, logged_seconds, variance_seconds, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![provider_account_id, day, target_seconds, logged_seconds, variance, status],
        )?;
    }

    tx.commit()?;
    Ok(())
}

#[allow(dead_code)]
pub fn load_sync_cursor(
    connection: &Connection,
    provider_account_id: i64,
    entity_type: &str,
) -> Result<Option<String>, AppError> {
    let cursor = connection
        .query_row(
            "SELECT cursor_value FROM sync_cursors WHERE provider_account_id = ?1 AND entity_type = ?2 LIMIT 1",
            params![provider_account_id, entity_type],
            |row| row.get::<_, Option<String>>(0),
        )
        .optional()?;

    Ok(cursor.flatten())
}

pub fn update_sync_cursor(
    connection: &Connection,
    provider_account_id: i64,
    entity_type: &str,
    cursor_value: &str,
) -> Result<(), AppError> {
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    let existing: Option<i64> = connection
        .query_row(
            "SELECT id FROM sync_cursors WHERE provider_account_id = ?1 AND entity_type = ?2 LIMIT 1",
            params![provider_account_id, entity_type],
            |row| row.get(0),
        )
        .optional()?;

    match existing {
        Some(id) => {
            connection.execute(
                "UPDATE sync_cursors SET cursor_value = ?1, synced_at = ?2 WHERE id = ?3",
                params![cursor_value, now, id],
            )?;
        }
        None => {
            connection.execute(
                "INSERT INTO sync_cursors (provider_account_id, entity_type, cursor_value, synced_at) VALUES (?1, ?2, ?3, ?4)",
                params![provider_account_id, entity_type, cursor_value, now],
            )?;
        }
    }

    Ok(())
}
