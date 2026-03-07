use chrono::{Datelike, Duration, Local, NaiveDate};
use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    domain::models::{
        AuditFlag, BootstrapPayload, DayOverview, IssueBreakdown, MonthSnapshot, ProfileSnapshot,
        ProviderConnection, ProviderStatus, Quest, ScheduleSnapshot,
    },
    error::AppError,
};

pub fn load_bootstrap_payload(connection: &Connection) -> Result<BootstrapPayload, AppError> {
    let provider_connections = load_provider_connections(connection)?;
    let primary = provider_connections
        .iter()
        .find(|provider| provider.is_primary)
        .cloned()
        .or_else(|| provider_connections.first().cloned())
        .ok_or_else(|| rusqlite::Error::QueryReturnedNoRows)?;

    let profile = connection.query_row(
        "SELECT xp, level, streak_days, companion_state_json FROM gamification_profiles WHERE provider_account_id = ?1 LIMIT 1",
        [primary.id],
        |row| {
            let companion_state: String = row.get(3)?;
            let companion = serde_json::from_str::<serde_json::Value>(&companion_state)
                .ok()
                .and_then(|json| json.get("name").and_then(|value| value.as_str()).map(str::to_string))
                .unwrap_or_else(|| "Aurora fox".to_string());

            Ok(ProfileSnapshot {
                alias: "Captain Crisp".to_string(),
                level: row.get(1)?,
                xp: row.get(0)?,
                streak_days: row.get(2)?,
                companion,
            })
        },
    )?;

    let schedule = connection.query_row(
        "SELECT timezone, hours_per_day, workdays_json FROM schedule_profiles WHERE is_default = 1 LIMIT 1",
        [],
        |row| {
            let workdays_json: String = row.get(2)?;
            let workdays = serde_json::from_str::<Vec<String>>(&workdays_json)
                .unwrap_or_default()
                .join(" - ");

            Ok(ScheduleSnapshot {
                hours_per_day: row.get(1)?,
                workdays,
                timezone: row.get(0)?,
                sync_window: "Current + previous month".to_string(),
                mode: "Read-only audit mode".to_string(),
            })
        },
    )?;

    let week = load_week_overview(connection, primary.id)?;
    let today = week
        .last()
        .cloned()
        .ok_or_else(|| rusqlite::Error::QueryReturnedNoRows)?;

    let month = load_month_snapshot(connection, primary.id, schedule.hours_per_day)?;
    let audit_flags = build_audit_flags(&week);
    let provider_status = provider_connections
        .iter()
        .map(|provider| ProviderStatus {
            name: provider.provider.clone(),
            state: provider.state.clone(),
            host: provider.host.clone(),
            auth_mode: provider.auth_mode.clone(),
            note: provider.status_note.clone(),
        })
        .chain([
            ProviderStatus {
                name: "YouTrack".to_string(),
                state: "beta".to_string(),
                host: "custom".to_string(),
                auth_mode: "Planned provider adapter".to_string(),
                note: "Next in line once GitLab sync contracts are stable.".to_string(),
            },
            ProviderStatus {
                name: "GitHub".to_string(),
                state: "planned".to_string(),
                host: "github.com".to_string(),
                auth_mode: "Capability review required".to_string(),
                note: "Issue time models are less native, so adapter design matters.".to_string(),
            },
            ProviderStatus {
                name: "Bitbucket".to_string(),
                state: "planned".to_string(),
                host: "bitbucket.org".to_string(),
                auth_mode: "Capability review required".to_string(),
                note: "Scheduled after provider abstraction hardens.".to_string(),
            },
        ])
        .collect();

    Ok(BootstrapPayload {
        app_name: "Pulseboard".to_string(),
        phase: "Foundation shell".to_string(),
        demo_mode: true,
        profile,
        provider_status,
        schedule,
        today,
        week,
        month,
        audit_flags,
        quests: vec![
            Quest {
                title: "Land five clean workdays".to_string(),
                progress: 4,
                total: 5,
                reward: "+120 XP".to_string(),
            },
            Quest {
                title: "Keep overflow below 1h".to_string(),
                progress: 1,
                total: 1,
                reward: "Pet aura".to_string(),
            },
            Quest {
                title: "Ship GitLab auth spike".to_string(),
                progress: 2,
                total: 3,
                reward: "OAuth badge".to_string(),
            },
        ],
    })
}

pub fn load_provider_connections(
    connection: &Connection,
) -> Result<Vec<ProviderConnection>, AppError> {
    let mut statement = connection.prepare(
        "SELECT id, provider, display_name, host, oauth_client_id, auth_mode, preferred_scope, oauth_ready, status_note, is_primary
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
) -> Result<Vec<DayOverview>, AppError> {
    let week_start = start_of_week(Local::now().date_naive());
    let mut days = Vec::with_capacity(5);

    for offset in 0..5 {
        let date = week_start + Duration::days(offset);
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

        let (logged_seconds, target_seconds, variance_seconds, status) =
            bucket.unwrap_or((0, 8 * 3600, 0, "empty".to_string()));
        let top_issues = load_issue_breakdown(connection, provider_account_id, &date)?;
        let focus_hours = top_issues
            .iter()
            .take(2)
            .map(|issue| issue.hours)
            .sum::<f32>();

        days.push(DayOverview {
            short_label: date.format("%a").to_string(),
            date_label: date.format("%a %d").to_string(),
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
    let consistency_score = ((logged_hours / target_hours).min(1.0) * 100.0).round() as u8;

    Ok(MonthSnapshot {
        logged_hours,
        target_hours,
        consistency_score,
        clean_days: clean_days as u8,
        overflow_days: overflow_days as u8,
    })
}

fn build_audit_flags(week: &[DayOverview]) -> Vec<AuditFlag> {
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

    flags.push(AuditFlag {
        title: "Current sync is using seeded local data".to_string(),
        severity: "low".to_string(),
        detail: "GitLab auth commands now exist, and live provider sync is the next implementation slice.".to_string(),
    });

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::seed::ensure_seed_data;

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
        ensure_seed_data(&connection, &NaiveDate::from_ymd_opt(2026, 3, 6).unwrap()).unwrap();
        connection
    }

    #[test]
    fn loads_provider_connections() {
        let connection = setup_connection();
        let connections = load_provider_connections(&connection).unwrap();
        assert_eq!(connections.len(), 1);
        assert_eq!(connections[0].provider, "GitLab");
    }

    #[test]
    fn month_snapshot_counts_weekdays() {
        let month_start = NaiveDate::from_ymd_opt(2026, 3, 1).unwrap();
        assert!(working_days_in_month(month_start) >= 20);
    }
}
