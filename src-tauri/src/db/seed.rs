use chrono::{Datelike, Duration, NaiveDate};
use rusqlite::{params, Connection};

use crate::error::AppError;

pub fn ensure_seed_data(connection: &Connection, today: &NaiveDate) -> Result<(), AppError> {
    let count: i64 = connection.query_row("SELECT COUNT(*) FROM provider_accounts", [], |row| {
        row.get(0)
    })?;

    if count > 0 {
        return Ok(());
    }

    let now = today.format("%Y-%m-%d").to_string();

    connection.execute(
        "INSERT INTO provider_accounts (provider, host, display_name, username, auth_mode, oauth_client_id, preferred_scope, oauth_ready, status_note, is_primary, created_at, last_sync_at)
         VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            "GitLab",
            "gitlab.com",
            "GitLab personal cockpit",
            "captain.crisp",
            "OAuth PKCE + PAT fallback",
            "read_api",
            0,
            "Add a real GitLab OAuth client ID to open the in-app auth flow.",
            1,
            now,
            format!("{}T17:40:00Z", today.format("%Y-%m-%d")),
        ],
    )?;

    let provider_id = connection.last_insert_rowid();

    connection.execute(
        "INSERT INTO schedule_profiles (provider_account_id, timezone, hours_per_day, workdays_json, is_default)
         VALUES (?1, ?2, ?3, ?4, 1)",
        params![provider_id, "America/Argentina/Buenos_Aires", 8.0_f32, r#"["Mon","Tue","Wed","Thu","Fri"]"#],
    )?;

    connection.execute(
        "INSERT INTO gamification_profiles (provider_account_id, xp, level, streak_days, badges_json, companion_state_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            provider_id,
            1240,
            8,
            6,
            r#"["clean-week","overflow-guard","sync-scout"]"#,
            r#"{"name":"Aurora fox","mood":"alert","aura":"cyan"}"#,
        ],
    )?;

    let week_start = start_of_week(*today);

    let issues = vec![
        ("GL-470", "Provider contracts", 3.4_f32, "violet", 0_i64),
        ("GL-476", "Schedule bucket rules", 2.9_f32, "amber", 1_i64),
        ("GL-481", "Audit view sorting", 4.2_f32, "rose", 2_i64),
        ("GL-488", "Glass UI system", 3.7_f32, "cyan", 3_i64),
        ("GL-482", "OAuth callback spike", 3.1_f32, "emerald", 4_i64),
        ("GL-499", "Tray HUD styling", 2.2_f32, "cyan", 4_i64),
        ("GL-512", "SQLite schema pass", 1.5_f32, "amber", 4_i64),
    ];

    for (key, title, hours, tone, offset) in issues {
        connection.execute(
            "INSERT INTO work_items (provider_account_id, provider_item_id, title, state, web_url, labels_json, raw_json, updated_at)
             VALUES (?1, ?2, ?3, 'opened', ?4, ?5, ?6, ?7)",
            params![
                provider_id,
                key,
                title,
                format!("https://gitlab.com/example/project/-/issues/{}", key.trim_start_matches("GL-")),
                format!(r#"["{}","desktop"]"#, tone),
                format!(r#"{{"tone":"{}","seed":true}}"#, tone),
                (week_start + Duration::days(offset)).format("%Y-%m-%dT18:00:00Z").to_string(),
            ],
        )?;
        let work_item_id = connection.last_insert_rowid();

        connection.execute(
            "INSERT INTO time_entries (provider_account_id, provider_entry_id, work_item_id, spent_at, seconds, raw_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                provider_id,
                format!("{}-{}", key, offset),
                work_item_id,
                (week_start + Duration::days(offset)).format("%Y-%m-%dT15:00:00Z").to_string(),
                (hours * 3600.0) as i64,
                format!(r#"{{"source":"seed","hours":{}}}"#, hours),
            ],
        )?;
    }

    let buckets = vec![
        (0_i64, 8.0_f32, 8.0_f32, "met_target"),
        (1_i64, 8.0_f32, 7.3_f32, "under_target"),
        (2_i64, 8.0_f32, 8.6_f32, "over_target"),
        (3_i64, 8.0_f32, 8.0_f32, "met_target"),
        (4_i64, 8.0_f32, 6.8_f32, "on_track"),
    ];

    for (offset, target, logged, status) in buckets {
        let date = week_start + Duration::days(offset);
        let variance = ((logged - target) * 3600.0) as i64;
        connection.execute(
            "INSERT INTO daily_buckets (provider_account_id, date, target_seconds, logged_seconds, variance_seconds, status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                provider_id,
                date.format("%Y-%m-%d").to_string(),
                (target * 3600.0) as i64,
                (logged * 3600.0) as i64,
                variance,
                status,
            ],
        )?;
    }

    connection.execute(
        "INSERT INTO sync_cursors (provider_account_id, entity_type, cursor_value, synced_at)
         VALUES (?1, ?2, ?3, ?4)",
        params![
            provider_id,
            "bootstrap",
            week_start.format("%Y-%m-%d").to_string(),
            format!("{}T17:40:00Z", today.format("%Y-%m-%d"))
        ],
    )?;

    Ok(())
}

fn start_of_week(today: NaiveDate) -> NaiveDate {
    today - Duration::days(today.weekday().num_days_from_monday() as i64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn seed_data_is_idempotent() {
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
                    preferred_scope TEXT NOT NULL DEFAULT 'read_api',
                    oauth_ready INTEGER NOT NULL DEFAULT 0,
                    status_note TEXT NOT NULL DEFAULT '',
                    is_primary INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    last_sync_at TEXT
                );
                CREATE TABLE schedule_profiles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider_account_id INTEGER,
                    timezone TEXT NOT NULL,
                    hours_per_day REAL NOT NULL,
                    workdays_json TEXT NOT NULL,
                    is_default INTEGER NOT NULL DEFAULT 0
                );
                CREATE TABLE gamification_profiles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider_account_id INTEGER,
                    xp INTEGER NOT NULL,
                    level INTEGER NOT NULL,
                    streak_days INTEGER NOT NULL,
                    badges_json TEXT,
                    companion_state_json TEXT
                );
                CREATE TABLE work_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider_account_id INTEGER NOT NULL,
                    provider_item_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    state TEXT NOT NULL,
                    web_url TEXT,
                    labels_json TEXT,
                    raw_json TEXT,
                    updated_at TEXT
                );
                CREATE TABLE time_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider_account_id INTEGER NOT NULL,
                    provider_entry_id TEXT NOT NULL,
                    work_item_id INTEGER,
                    spent_at TEXT NOT NULL,
                    seconds INTEGER NOT NULL,
                    raw_json TEXT
                );
                CREATE TABLE daily_buckets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider_account_id INTEGER,
                    date TEXT NOT NULL,
                    target_seconds INTEGER NOT NULL,
                    logged_seconds INTEGER NOT NULL,
                    variance_seconds INTEGER NOT NULL,
                    status TEXT NOT NULL
                );
                CREATE TABLE sync_cursors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider_account_id INTEGER,
                    entity_type TEXT NOT NULL,
                    cursor_value TEXT,
                    synced_at TEXT NOT NULL
                );
                "#,
            )
            .unwrap();

        let today = NaiveDate::from_ymd_opt(2026, 3, 6).unwrap();
        ensure_seed_data(&connection, &today).unwrap();
        ensure_seed_data(&connection, &today).unwrap();

        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM provider_accounts", [], |row| {
                row.get(0)
            })
            .unwrap();

        assert_eq!(count, 1);
    }
}
