use chrono::NaiveDate;
use rusqlite::{params, Connection, OptionalExtension};

use crate::{error::AppError, support::time::utc_timestamp};

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
                    utc_timestamp(),
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
                    utc_timestamp(),
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
    uploaded_at: Option<&str>,
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
                "UPDATE time_entries SET work_item_id = ?1, spent_at = ?2, uploaded_at = ?3, seconds = ?4 WHERE id = ?5",
                params![work_item_id, spent_at, uploaded_at, seconds, id],
            )?;
        }
        None => {
            connection.execute(
                "INSERT INTO time_entries (provider_account_id, provider_entry_id, work_item_id, spent_at, uploaded_at, seconds) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![provider_account_id, provider_entry_id, work_item_id, spent_at, uploaded_at, seconds],
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

pub fn delete_time_entries_in_range(
    connection: &Connection,
    provider_account_id: i64,
    start_date: &NaiveDate,
    end_date: &NaiveDate,
) -> Result<(), AppError> {
    connection.execute(
        "DELETE FROM time_entries WHERE provider_account_id = ?1 AND date(spent_at) >= ?2 AND date(spent_at) <= ?3",
        params![
            provider_account_id,
            start_date.format("%Y-%m-%d").to_string(),
            end_date.format("%Y-%m-%d").to_string(),
        ],
    )?;

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

    // Load schedule — error out clearly if missing
    let (target_seconds, workdays): (i64, Vec<String>) = tx
        .query_row(
            "SELECT hours_per_day, workdays_json FROM schedule_profiles WHERE is_default = 1 LIMIT 1",
            [],
            |row| {
                let hours: f64 = row.get(0)?;
                let workdays_json: String = row.get(1)?;
                let workdays = serde_json::from_str::<Vec<String>>(&workdays_json).unwrap_or_default();
                Ok(((hours * 3600.0) as i64, workdays))
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
        let day_date = NaiveDate::parse_from_str(&day, "%Y-%m-%d").unwrap_or(*start_date);
        let is_workday = workdays
            .iter()
            .any(|configured| configured == &day_date.format("%a").to_string());
        let effective_target_seconds = if is_workday { target_seconds } else { 0 };
        let variance = logged_seconds - effective_target_seconds;
        let status = if logged_seconds == 0 && !is_workday {
            "non_workday"
        } else if logged_seconds == 0 {
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
            params![provider_account_id, day, effective_target_seconds, logged_seconds, variance, status],
        )?;
    }

    tx.commit()?;
    Ok(())
}

pub fn update_quest_progress_from_buckets(
    connection: &Connection,
    provider_account_id: i64,
) -> Result<(), AppError> {
    let balanced_days: i64 = connection.query_row(
        "SELECT COUNT(*) FROM daily_buckets WHERE provider_account_id = ?1 AND status = 'met_target'",
        [provider_account_id],
        |row| row.get(0),
    )?;
    let clean_week_days: i64 = connection.query_row(
        "SELECT COUNT(*) FROM daily_buckets WHERE provider_account_id = ?1 AND status IN ('met_target', 'on_track')",
        [provider_account_id],
        |row| row.get(0),
    )?;
    let issue_sprinter: i64 = connection.query_row(
        "SELECT COUNT(DISTINCT work_item_id) FROM time_entries WHERE provider_account_id = ?1 AND work_item_id IS NOT NULL",
        [provider_account_id],
        |row| row.get(0),
    )?;
    let streak_keeper: i64 = connection.query_row(
        "SELECT COALESCE(streak_days, 0) FROM gamification_profiles WHERE provider_account_id = ?1 LIMIT 1",
        [provider_account_id],
        |row| row.get(0),
    )?;

    upsert_quest_progress(
        connection,
        provider_account_id,
        "balanced_day",
        balanced_days,
    )?;
    upsert_quest_progress(
        connection,
        provider_account_id,
        "clean_week",
        clean_week_days,
    )?;
    upsert_quest_progress(
        connection,
        provider_account_id,
        "issue_sprinter",
        issue_sprinter,
    )?;
    upsert_quest_progress(
        connection,
        provider_account_id,
        "streak_keeper",
        streak_keeper,
    )?;

    connection.execute(
        "INSERT OR IGNORE INTO reward_inventory (provider_account_id, reward_key, reward_name, reward_type, cost_tokens, equipped)
         VALUES
           (?1, 'aurora-evolution', 'Aurora Evolution', 'companion', 120, 1),
           (?1, 'frame-signal', 'Signal Frame', 'avatar-frame', 80, 0),
           (?1, 'desk-constellation', 'Desk Constellation', 'desk-item', 50, 0)",
        [provider_account_id],
    )?;

    Ok(())
}

fn upsert_quest_progress(
    connection: &Connection,
    provider_account_id: i64,
    quest_key: &str,
    progress_value: i64,
) -> Result<(), AppError> {
    let existing_id: Option<i64> = connection
        .query_row(
            "SELECT id FROM quest_progress WHERE provider_account_id = ?1 AND quest_key = ?2 LIMIT 1",
            params![provider_account_id, quest_key],
            |row| row.get(0),
        )
        .optional()?;

    match existing_id {
        Some(id) => {
            connection.execute(
                "UPDATE quest_progress SET progress_value = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                params![progress_value, id],
            )?;
        }
        None => {
            connection.execute(
                "INSERT INTO quest_progress (provider_account_id, quest_key, progress_value, updated_at)
                 VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)",
                params![provider_account_id, quest_key, progress_value],
            )?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use chrono::NaiveDate;
    use rusqlite::Connection;

    use super::{delete_time_entries_in_range, upsert_time_entry};

    fn setup_connection() -> Connection {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute_batch(
                r#"
                CREATE TABLE time_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider_account_id INTEGER NOT NULL,
                    provider_entry_id TEXT NOT NULL,
                    work_item_id INTEGER,
                    spent_at TEXT NOT NULL,
                    uploaded_at TEXT,
                    seconds INTEGER NOT NULL,
                    raw_json TEXT
                );
                "#,
            )
            .unwrap();
        connection
    }

    #[test]
    fn upsert_time_entry_replaces_existing_row_when_key_matches() {
        let connection = setup_connection();

        upsert_time_entry(
            &connection,
            1,
            "gql-same-id",
            None,
            "2026-03-13T10:00:00Z",
            Some("2026-03-13T11:00:00Z"),
            3600,
        )
        .unwrap();

        upsert_time_entry(
            &connection,
            1,
            "gql-same-id",
            None,
            "2026-03-13T10:00:00Z",
            Some("2026-03-13T11:30:00Z"),
            7200,
        )
        .unwrap();

        let (count, seconds): (i64, i64) = connection
            .query_row(
                "SELECT COUNT(*), COALESCE(SUM(seconds), 0) FROM time_entries WHERE provider_account_id = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();

        assert_eq!(count, 1);
        assert_eq!(seconds, 7200);
    }

    #[test]
    fn delete_time_entries_in_range_clears_previous_import_before_refresh() {
        let connection = setup_connection();

        upsert_time_entry(
            &connection,
            1,
            "gql-a",
            None,
            "2026-03-10T10:00:00Z",
            Some("2026-03-10T12:00:00Z"),
            3600,
        )
        .unwrap();
        upsert_time_entry(
            &connection,
            1,
            "gql-b",
            None,
            "2026-03-11T10:00:00Z",
            Some("2026-03-11T12:00:00Z"),
            3600,
        )
        .unwrap();
        upsert_time_entry(
            &connection,
            1,
            "gql-c",
            None,
            "2026-01-20T10:00:00Z",
            Some("2026-01-20T12:00:00Z"),
            3600,
        )
        .unwrap();

        delete_time_entries_in_range(
            &connection,
            1,
            &NaiveDate::from_ymd_opt(2026, 3, 1).unwrap(),
            &NaiveDate::from_ymd_opt(2026, 3, 31).unwrap(),
        )
        .unwrap();

        let remaining: Vec<String> = connection
            .prepare("SELECT provider_entry_id FROM time_entries ORDER BY provider_entry_id ASC")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert_eq!(remaining, vec!["gql-c".to_string()]);
    }
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
    let now = utc_timestamp();

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
