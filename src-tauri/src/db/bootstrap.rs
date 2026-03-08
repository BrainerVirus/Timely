use chrono::{Datelike, Duration, Local, NaiveDate};
use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    domain::models::{
        AuditFlag, BootstrapPayload, DayOverview, IssueBreakdown, MonthSnapshot, ProfileSnapshot,
        ProviderConnection, ProviderStatus, ScheduleSnapshot,
    },
    error::AppError,
};

pub fn load_bootstrap_payload(connection: &Connection) -> Result<BootstrapPayload, AppError> {
    let provider_connections = load_provider_connections(connection)?;

    // If no providers exist (e.g. empty DB after reset), return an empty payload
    let primary = match provider_connections
        .iter()
        .find(|provider| provider.is_primary)
        .cloned()
        .or_else(|| provider_connections.first().cloned())
    {
        Some(p) => p,
        None => {
            let actual_today = Local::now().date_naive();
            return Ok(BootstrapPayload {
                app_name: "Pulseboard".to_string(),
                phase: "Foundation shell".to_string(),
                demo_mode: true,
                profile: ProfileSnapshot {
                    alias: "Pilot".to_string(),
                    level: 1,
                    xp: 0,
                    streak_days: 0,
                    companion: "Aurora fox".to_string(),
                },
                provider_status: vec![],
                schedule: ScheduleSnapshot {
                    hours_per_day: 8.0,
                    shift_start: None,
                    shift_end: None,
                    lunch_minutes: None,
                    workdays: "Mon - Tue - Wed - Thu - Fri".to_string(),
                    timezone: "UTC".to_string(),
                },
                today: DayOverview {
                    short_label: actual_today.format("%a").to_string(),
                    date_label: actual_today.format("%a %d").to_string(),
                    is_today: true,
                    logged_hours: 0.0,
                    target_hours: 0.0,
                    focus_hours: 0.0,
                    overflow_hours: 0.0,
                    status: "empty".to_string(),
                    top_issues: vec![],
                },
                week: vec![],
                month: MonthSnapshot {
                    logged_hours: 0.0,
                    target_hours: 0.0,
                    consistency_score: 0,
                    clean_days: 0,
                    overflow_days: 0,
                },
                audit_flags: vec![],
                quests: vec![],
            });
        }
    };

    let alias = primary
        .username
        .clone()
        .unwrap_or_else(|| primary.display_name.clone());

    let profile = connection
        .query_row(
            "SELECT xp, level, streak_days, companion_state_json FROM gamification_profiles WHERE provider_account_id = ?1 LIMIT 1",
            [primary.id],
            |row| {
                let companion_state: String = row.get(3)?;
                let companion = serde_json::from_str::<serde_json::Value>(&companion_state)
                    .ok()
                    .and_then(|json| json.get("name").and_then(|value| value.as_str()).map(str::to_string))
                    .unwrap_or_else(|| "Aurora fox".to_string());

                Ok(ProfileSnapshot {
                    alias: alias.clone(),
                    level: row.get(1)?,
                    xp: row.get(0)?,
                    streak_days: row.get(2)?,
                    companion,
                })
            },
        )
        .optional()?
        .unwrap_or_else(|| ProfileSnapshot {
            alias,
            level: 1,
            xp: 0,
            streak_days: 0,
            companion: "Aurora fox".to_string(),
        });

    let schedule = connection.query_row(
        "SELECT timezone, hours_per_day, workdays_json, shift_start, shift_end, lunch_minutes FROM schedule_profiles WHERE is_default = 1 LIMIT 1",
        [],
        |row| {
            let workdays_json: String = row.get(2)?;
            let workdays = serde_json::from_str::<Vec<String>>(&workdays_json)
                .unwrap_or_default()
                .join(" - ");

            Ok(ScheduleSnapshot {
                hours_per_day: row.get(1)?,
                shift_start: row.get(3)?,
                shift_end: row.get(4)?,
                lunch_minutes: row.get::<_, Option<u32>>(5)?,
                workdays,
                timezone: row.get(0)?,
            })
        },
    )?;

    let actual_today = Local::now().date_naive();
    let week = load_week_overview(connection, primary.id, &actual_today)?;

    // Find today in the week; if it's a weekend, create a non_workday entry
    let today = week
        .iter()
        .find(|d| d.is_today)
        .cloned()
        .unwrap_or_else(|| DayOverview {
            short_label: actual_today.format("%a").to_string(),
            date_label: actual_today.format("%a %d").to_string(),
            is_today: true,
            logged_hours: 0.0,
            target_hours: 0.0,
            focus_hours: 0.0,
            overflow_hours: 0.0,
            status: "non_workday".to_string(),
            top_issues: vec![],
        });

    let month = load_month_snapshot(connection, primary.id, schedule.hours_per_day)?;
    let demo_mode = !has_sync_data(connection)?;
    let audit_flags = build_audit_flags(&week, demo_mode);

    // Only show real provider connections, not placeholder future providers
    let provider_status = provider_connections
        .iter()
        .map(|provider| ProviderStatus {
            name: provider.provider.clone(),
            state: provider.state.clone(),
            host: provider.host.clone(),
            auth_mode: provider.auth_mode.clone(),
            note: provider.status_note.clone(),
        })
        .collect();

    Ok(BootstrapPayload {
        app_name: "Pulseboard".to_string(),
        phase: "Foundation shell".to_string(),
        demo_mode,
        profile,
        provider_status,
        schedule,
        today,
        week,
        month,
        audit_flags,
        quests: vec![],
    })
}

pub fn load_provider_connections(
    connection: &Connection,
) -> Result<Vec<ProviderConnection>, AppError> {
    let mut statement = connection.prepare(
        "SELECT id, provider, display_name, host, oauth_client_id, auth_mode, preferred_scope, oauth_ready, status_note, is_primary, username
         FROM provider_accounts
         ORDER BY is_primary DESC, id ASC",
    )?;

    let rows = statement.query_map([], |row| {
        let oauth_ready: i64 = row.get(7)?;
        Ok(ProviderConnection {
            id: row.get(0)?,
            provider: row.get(1)?,
            display_name: row.get(2)?,
            host: row.get(3)?,
            username: row.get(10)?,
            client_id: row.get(4)?,
            has_token: false,
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

fn load_week_overview(
    connection: &Connection,
    provider_account_id: i64,
    actual_today: &NaiveDate,
) -> Result<Vec<DayOverview>, AppError> {
    let week_start = start_of_week(*actual_today);
    let mut days = Vec::with_capacity(5);

    for offset in 0..5 {
        let date = week_start + Duration::days(offset);
        let is_today = date == *actual_today;
        let is_past = date < *actual_today;

        let bucket = connection
            .query_row(
                "SELECT logged_seconds, target_seconds, variance_seconds, status FROM daily_buckets WHERE provider_account_id = ?1 AND date = ?2 LIMIT 1",
                params![provider_account_id, date.format("%Y-%m-%d").to_string()],
                |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, i64>(1)?,
                        row.get::<_, i64>(2)?,
                        row.get::<_, String>(3)?,
                    ))
                },
            )
            .optional()?;

        let (logged_seconds, target_seconds, variance_seconds, mut status) =
            bucket.unwrap_or((0, 8 * 3600, 0, "empty".to_string()));

        // Past days that were "on_track" never reached target
        if is_past && status == "on_track" {
            status = "under_target".to_string();
        }

        let top_issues = load_issue_breakdown(connection, provider_account_id, &date)?;
        let focus_hours = top_issues
            .iter()
            .take(2)
            .map(|issue| issue.hours)
            .sum::<f32>();

        days.push(DayOverview {
            short_label: date.format("%a").to_string(),
            date_label: date.format("%a %d").to_string(),
            is_today,
            logged_hours: seconds_to_hours(logged_seconds),
            target_hours: seconds_to_hours(target_seconds),
            focus_hours,
            overflow_hours: seconds_to_hours(variance_seconds.max(0)),
            status,
            top_issues,
        });
    }

    Ok(days)
}

fn load_issue_breakdown(
    connection: &Connection,
    provider_account_id: i64,
    date: &NaiveDate,
) -> Result<Vec<IssueBreakdown>, AppError> {
    let mut statement = connection.prepare(
        "SELECT wi.provider_item_id, wi.title, wi.labels_json, SUM(te.seconds) AS total_seconds
         FROM time_entries te
         JOIN work_items wi ON wi.id = te.work_item_id
         WHERE te.provider_account_id = ?1 AND date(te.spent_at) = ?2
         GROUP BY wi.provider_item_id, wi.title, wi.labels_json
         ORDER BY total_seconds DESC, wi.provider_item_id ASC",
    )?;

    let rows = statement.query_map(
        params![provider_account_id, date.format("%Y-%m-%d").to_string()],
        |row| {
            let labels_json: Option<String> = row.get(2)?;
            let tone = labels_json
                .as_deref()
                .and_then(|json| serde_json::from_str::<Vec<String>>(json).ok())
                .and_then(|labels| {
                    labels.into_iter().find(|label| {
                        ["emerald", "amber", "cyan", "rose", "violet"].contains(&label.as_str())
                    })
                })
                .unwrap_or_else(|| "cyan".to_string());

            Ok(IssueBreakdown {
                key: row.get(0)?,
                title: row.get(1)?,
                hours: seconds_to_hours(row.get(3)?),
                tone,
            })
        },
    )?;

    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

fn load_month_snapshot(
    connection: &Connection,
    provider_account_id: i64,
    hours_per_day: f32,
) -> Result<MonthSnapshot, AppError> {
    let month_start = Local::now()
        .date_naive()
        .with_day(1)
        .ok_or_else(|| rusqlite::Error::QueryReturnedNoRows)?;
    let month_end = next_month_start(month_start);

    let logged_seconds: i64 = connection.query_row(
        "SELECT COALESCE(SUM(logged_seconds), 0) FROM daily_buckets WHERE provider_account_id = ?1 AND date >= ?2 AND date < ?3",
        params![provider_account_id, month_start.format("%Y-%m-%d").to_string(), month_end.format("%Y-%m-%d").to_string()],
        |row| row.get(0),
    )?;

    let (clean_days, overflow_days): (i64, i64) = connection.query_row(
        "SELECT
            SUM(CASE WHEN status IN ('met_target', 'on_track') THEN 1 ELSE 0 END),
            SUM(CASE WHEN status = 'over_target' THEN 1 ELSE 0 END)
         FROM daily_buckets
         WHERE provider_account_id = ?1 AND date >= ?2 AND date < ?3",
        params![
            provider_account_id,
            month_start.format("%Y-%m-%d").to_string(),
            month_end.format("%Y-%m-%d").to_string()
        ],
        |row| {
            Ok((
                row.get::<_, Option<i64>>(0)?.unwrap_or(0),
                row.get::<_, Option<i64>>(1)?.unwrap_or(0),
            ))
        },
    )?;

    let target_hours = working_days_in_month(month_start) as f32 * hours_per_day;
    let logged_hours = seconds_to_hours(logged_seconds);
    let consistency_score = if target_hours > 0.0 {
        ((logged_hours / target_hours).min(1.0) * 100.0).round() as u8
    } else {
        0
    };

    Ok(MonthSnapshot {
        logged_hours,
        target_hours,
        consistency_score,
        clean_days: clean_days as u8,
        overflow_days: overflow_days as u8,
    })
}

fn build_audit_flags(week: &[DayOverview], demo_mode: bool) -> Vec<AuditFlag> {
    let mut flags = Vec::new();

    for day in week {
        if day.status == "over_target" {
            flags.push(AuditFlag {
                title: format!(
                    "{} exceeded target by {:.1}h",
                    day.date_label, day.overflow_hours
                ),
                severity: "medium".to_string(),
                detail: "Review the top issues for duplicate or late-posted entries.".to_string(),
            });
        }

        if day.status == "under_target" {
            flags.push(AuditFlag {
                title: format!("{} closed under target", day.date_label),
                severity: "high".to_string(),
                detail: "A completed workday is missing time against the configured schedule."
                    .to_string(),
            });
        }
    }

    if demo_mode {
        flags.push(AuditFlag {
            title: "Showing seed data".to_string(),
            severity: "low".to_string(),
            detail: "Connect GitLab and sync to see your real time entries.".to_string(),
        });
    }

    flags
}

fn start_of_week(today: NaiveDate) -> NaiveDate {
    today - Duration::days(today.weekday().num_days_from_monday() as i64)
}

fn next_month_start(date: NaiveDate) -> NaiveDate {
    let (year, month) = if date.month() == 12 {
        (date.year() + 1, 1)
    } else {
        (date.year(), date.month() + 1)
    };

    NaiveDate::from_ymd_opt(year, month, 1).expect("valid next month start")
}

fn working_days_in_month(month_start: NaiveDate) -> usize {
    let month_end = next_month_start(month_start);
    let mut day = month_start;
    let mut count = 0;

    while day < month_end {
        if day.weekday().num_days_from_monday() < 5 {
            count += 1;
        }
        day += Duration::days(1);
    }

    count
}

fn seconds_to_hours(value: i64) -> f32 {
    value as f32 / 3600.0
}

pub fn upsert_schedule(
    connection: &Connection,
    provider_account_id: i64,
    shift_start: Option<&str>,
    shift_end: Option<&str>,
    lunch_minutes: Option<u32>,
    workdays: &[String],
    timezone: &str,
) -> Result<(), AppError> {
    let workdays_json = serde_json::to_string(workdays).unwrap_or_else(|_| "[]".to_string());
    let hours_per_day = compute_hours_per_day(shift_start, shift_end, lunch_minutes);

    let existing_id: Option<i64> = connection
        .query_row(
            "SELECT id FROM schedule_profiles WHERE is_default = 1 LIMIT 1",
            [],
            |row| row.get(0),
        )
        .optional()?;

    match existing_id {
        Some(id) => {
            connection.execute(
                "UPDATE schedule_profiles SET hours_per_day = ?1, workdays_json = ?2, timezone = ?3, provider_account_id = ?4, shift_start = ?5, shift_end = ?6, lunch_minutes = ?7 WHERE id = ?8",
                params![hours_per_day, workdays_json, timezone, provider_account_id, shift_start, shift_end, lunch_minutes, id],
            )?;
        }
        None => {
            connection.execute(
                "INSERT INTO schedule_profiles (provider_account_id, timezone, hours_per_day, workdays_json, shift_start, shift_end, lunch_minutes, is_default) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1)",
                params![provider_account_id, timezone, hours_per_day, workdays_json, shift_start, shift_end, lunch_minutes],
            )?;
        }
    }

    Ok(())
}

fn compute_hours_per_day(
    shift_start: Option<&str>,
    shift_end: Option<&str>,
    lunch_minutes: Option<u32>,
) -> f32 {
    let (start, end) = match (shift_start, shift_end) {
        (Some(s), Some(e)) => (s, e),
        _ => return 8.0,
    };

    let start_mins = parse_time_to_minutes(start).unwrap_or(9 * 60);
    let end_mins = parse_time_to_minutes(end).unwrap_or(17 * 60);
    let shift_mins = if end_mins > start_mins {
        end_mins - start_mins
    } else {
        (24 * 60 - start_mins) + end_mins
    };

    let net_mins = shift_mins.saturating_sub(lunch_minutes.unwrap_or(0));
    net_mins as f32 / 60.0
}

fn parse_time_to_minutes(time: &str) -> Option<u32> {
    let parts: Vec<&str> = time.split(':').collect();
    if parts.len() >= 2 {
        let hours = parts[0].parse::<u32>().ok()?;
        let minutes = parts[1].parse::<u32>().ok()?;
        Some(hours * 60 + minutes)
    } else {
        None
    }
}

pub fn has_sync_data(connection: &Connection) -> Result<bool, AppError> {
    let count: i64 = connection.query_row(
        "SELECT COUNT(*) FROM sync_cursors WHERE entity_type = 'timelogs'",
        [],
        |row| row.get(0),
    )?;
    Ok(count > 0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::seed::ensure_seed_data;

    /// Schema-only DB — no seed data, simulates a truly fresh start
    fn setup_empty_connection() -> Connection {
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
                    shift_start TEXT,
                    shift_end TEXT,
                    lunch_minutes INTEGER,
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
                CREATE TABLE oauth_sessions (
                    session_id TEXT PRIMARY KEY,
                    provider TEXT NOT NULL,
                    host TEXT NOT NULL,
                    state TEXT NOT NULL,
                    code_verifier TEXT NOT NULL,
                    code_challenge TEXT NOT NULL,
                    scope TEXT NOT NULL,
                    redirect_uri TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider_account_id INTEGER NOT NULL,
                    provider_project_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    path TEXT NOT NULL,
                    metadata_json TEXT
                );
                "#,
            )
            .unwrap();
        connection
    }

    /// DB with seed data — for legacy tests that need populated data
    fn setup_seeded_connection() -> Connection {
        let connection = setup_empty_connection();
        ensure_seed_data(&connection, &NaiveDate::from_ymd_opt(2026, 3, 6).unwrap()).unwrap();
        connection
    }

    #[test]
    fn loads_provider_connections() {
        let connection = setup_seeded_connection();
        let connections = load_provider_connections(&connection).unwrap();
        assert_eq!(connections.len(), 1);
        assert_eq!(connections[0].provider, "GitLab");
    }

    #[test]
    fn month_snapshot_counts_weekdays() {
        let month_start = NaiveDate::from_ymd_opt(2026, 3, 1).unwrap();
        assert!(working_days_in_month(month_start) >= 20);
    }

    #[test]
    fn empty_db_returns_empty_payload() {
        let connection = setup_empty_connection();
        let payload = load_bootstrap_payload(&connection).unwrap();

        assert!(payload.demo_mode);
        assert_eq!(payload.profile.alias, "Pilot");
        assert_eq!(payload.profile.xp, 0);
        assert_eq!(payload.profile.level, 1);
        assert!(payload.provider_status.is_empty());
        assert!(payload.week.is_empty());
        assert!(payload.quests.is_empty());
        assert_eq!(payload.today.logged_hours, 0.0);
        assert_eq!(payload.today.target_hours, 0.0);
        assert_eq!(payload.today.status, "empty");
        assert_eq!(payload.month.logged_hours, 0.0);
    }

    #[test]
    fn empty_db_has_no_audit_flags() {
        let connection = setup_empty_connection();
        let payload = load_bootstrap_payload(&connection).unwrap();

        // Empty DB has no week data and no seed flag; audit_flags should be empty
        assert!(payload.audit_flags.is_empty());
    }

    #[test]
    fn reset_then_bootstrap_returns_empty() {
        let connection = setup_seeded_connection();

        // Verify seeded data exists
        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM time_entries", [], |row| row.get(0))
            .unwrap();
        assert!(count > 0, "seed data should have time entries");

        // Simulate reset: delete all data
        connection
            .execute_batch(
                "DELETE FROM time_entries;
                 DELETE FROM work_items;
                 DELETE FROM daily_buckets;
                 DELETE FROM sync_cursors;
                 DELETE FROM gamification_profiles;
                 DELETE FROM schedule_profiles;
                 DELETE FROM oauth_sessions;
                 DELETE FROM projects;
                 DELETE FROM provider_accounts;",
            )
            .unwrap();

        // Bootstrap should return empty payload, not crash
        let payload = load_bootstrap_payload(&connection).unwrap();
        assert!(payload.demo_mode);
        assert_eq!(payload.profile.alias, "Pilot");
        assert!(payload.provider_status.is_empty());
        assert!(payload.week.is_empty());
        assert_eq!(payload.today.logged_hours, 0.0);
        assert_eq!(payload.month.logged_hours, 0.0);
    }

    #[test]
    fn seeded_payload_is_demo_mode() {
        let connection = setup_seeded_connection();
        let payload = load_bootstrap_payload(&connection).unwrap();

        // Seed uses entity_type='bootstrap', not 'timelogs', so demo_mode = true
        assert!(payload.demo_mode);
    }
}
