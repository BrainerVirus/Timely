use std::collections::BTreeMap;

use chrono::{Datelike, Duration, NaiveDate};
use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    domain::models::{StreakDaySnapshot, StreakSnapshot},
    error::AppError,
};

const DEFAULT_WORKDAYS: [&str; 5] = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const WINDOW_DAYS: usize = 7;

pub fn build_streak_snapshot(
    connection: &Connection,
    provider_account_id: i64,
    today: NaiveDate,
) -> Result<StreakSnapshot, AppError> {
    let schedule = load_schedule_context(connection)?;
    let mut statement = connection.prepare(
        "SELECT spent_at, uploaded_at
         FROM time_entries
         WHERE provider_account_id = ?1
         ORDER BY spent_at ASC",
    )?;

    let rows = statement.query_map(params![provider_account_id], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?))
    })?;

    let mut states = BTreeMap::<NaiveDate, DayState>::new();

    for row in rows {
        let (spent_at, uploaded_at) = row?;
        let Some(logged_day) = extract_naive_date(&spent_at) else {
            continue;
        };

        let next_state = match uploaded_at.as_deref().and_then(extract_naive_date) {
            Some(uploaded_day) if uploaded_day == logged_day => DayState::Counted,
            Some(_) => DayState::Broken,
            None => DayState::Counted,
        };

        states
            .entry(logged_day)
            .and_modify(|current| *current = current.merge(next_state))
            .or_insert(next_state);
    }

    let current_days = calculate_current_streak(&states, &schedule.workdays, today);
    let window = build_window(
        today,
        &states,
        &schedule.workdays,
        week_start_to_index(schedule.week_start.as_deref(), &schedule.timezone),
    );

    Ok(StreakSnapshot {
        current_days,
        window,
    })
}

pub fn persist_current_streak(
    connection: &Connection,
    provider_account_id: i64,
    current_days: u8,
) -> Result<(), AppError> {
    connection.execute(
        "UPDATE gamification_profiles SET streak_days = ?1 WHERE provider_account_id = ?2",
        params![current_days, provider_account_id],
    )?;

    Ok(())
}

struct ScheduleContext {
    workdays: Vec<String>,
    timezone: String,
    week_start: Option<String>,
}

fn load_schedule_context(connection: &Connection) -> Result<ScheduleContext, AppError> {
    let schedule = connection
        .query_row(
            "SELECT workdays_json, timezone, week_start FROM schedule_profiles WHERE is_default = 1 LIMIT 1",
            [],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                ))
            },
        )
        .optional()?;

    let (workdays_json, timezone, week_start) = schedule.unwrap_or_else(|| {
        (
            serde_json::to_string(&DEFAULT_WORKDAYS).expect("default workdays json"),
            "UTC".to_string(),
            Some("monday".to_string()),
        )
    });

    Ok(ScheduleContext {
        workdays: serde_json::from_str::<Vec<String>>(&workdays_json)
            .ok()
            .filter(|days| !days.is_empty())
            .unwrap_or_else(|| {
                DEFAULT_WORKDAYS
                    .iter()
                    .map(|day| (*day).to_string())
                    .collect()
            }),
        timezone,
        week_start,
    })
}

fn calculate_current_streak(
    states: &BTreeMap<NaiveDate, DayState>,
    workdays: &[String],
    today: NaiveDate,
) -> u8 {
    let mut cursor = today;
    let mut can_skip_open_today = true;

    let mut streak = 0_u8;

    loop {
        match states.get(&cursor).copied() {
            Some(DayState::Counted) => {
                streak = streak.saturating_add(1);
            }
            Some(DayState::Broken) => break,
            None if is_workday(cursor, workdays) && can_skip_open_today => {
                can_skip_open_today = false;
                cursor -= Duration::days(1);
                continue;
            }
            None if is_workday(cursor, workdays) => break,
            None => {
                can_skip_open_today = false;
                cursor -= Duration::days(1);
                continue;
            }
        }

        can_skip_open_today = false;
        cursor -= Duration::days(1);
    }

    streak
}

fn build_window(
    today: NaiveDate,
    states: &BTreeMap<NaiveDate, DayState>,
    workdays: &[String],
    week_starts_on: u32,
) -> Vec<StreakDaySnapshot> {
    let week_start = start_of_week(today, week_starts_on);

    (0..WINDOW_DAYS)
        .map(|index| week_start + Duration::days(index as i64))
        .map(|date| StreakDaySnapshot {
            date: date.format("%Y-%m-%d").to_string(),
            state: states
                .get(&date)
                .copied()
                .map(DayState::as_str)
                .unwrap_or_else(|| {
                    if is_workday(date, workdays) {
                        "idle"
                    } else {
                        "skipped"
                    }
                })
                .to_string(),
            is_today: date == today,
        })
        .collect()
}

fn is_workday(date: NaiveDate, workdays: &[String]) -> bool {
    let short_name = date.format("%a").to_string();
    workdays.iter().any(|day| day == &short_name)
}

fn start_of_week(today: NaiveDate, week_starts_on: u32) -> NaiveDate {
    let current = today.weekday().num_days_from_sunday();
    let delta = (current + 7 - week_starts_on) % 7;
    today - Duration::days(delta as i64)
}

fn week_start_to_index(week_start: Option<&str>, timezone: &str) -> u32 {
    match week_start.unwrap_or("monday") {
        "sunday" => 0,
        "saturday" => 6,
        "auto" => timezone_to_week_start_index(timezone),
        _ => 1,
    }
}

fn timezone_to_week_start_index(timezone: &str) -> u32 {
    if timezone.starts_with("America/") {
        return 0;
    }

    if matches!(
        timezone,
        "Asia/Riyadh"
            | "Asia/Dubai"
            | "Asia/Kuwait"
            | "Asia/Qatar"
            | "Asia/Bahrain"
            | "Asia/Jerusalem"
    ) {
        return 6;
    }

    1
}

fn extract_naive_date(value: &str) -> Option<NaiveDate> {
    chrono::DateTime::parse_from_rfc3339(value)
        .map(|date_time| date_time.date_naive())
        .ok()
        .or_else(|| NaiveDate::parse_from_str(value.split('T').next()?, "%Y-%m-%d").ok())
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum DayState {
    Counted,
    Broken,
}

impl DayState {
    fn merge(self, next: Self) -> Self {
        match (self, next) {
            (Self::Broken, _) | (_, Self::Broken) => Self::Broken,
            _ => Self::Counted,
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::Counted => "counted",
            Self::Broken => "broken",
        }
    }
}

#[cfg(test)]
mod tests {
    use chrono::NaiveDate;
    use rusqlite::Connection;

    use super::*;

    fn state_for<'a>(snapshot: &'a StreakSnapshot, date: &str) -> &'a str {
        snapshot
            .window
            .iter()
            .find(|day| day.date == date)
            .map(|day| day.state.as_str())
            .expect("date present in streak window")
    }

    fn setup_connection() -> Connection {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute_batch(
                r#"
                CREATE TABLE schedule_profiles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider_account_id INTEGER,
                    timezone TEXT NOT NULL,
                    hours_per_day REAL NOT NULL,
                    workdays_json TEXT NOT NULL,
                    weekday_schedule_json TEXT,
                    week_start TEXT,
                    is_default INTEGER NOT NULL DEFAULT 0
                );
                CREATE TABLE time_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider_account_id INTEGER NOT NULL,
                    provider_entry_id TEXT NOT NULL,
                    work_item_id INTEGER,
                    spent_at TEXT NOT NULL,
                    seconds INTEGER NOT NULL,
                    raw_json TEXT,
                    uploaded_at TEXT
                );
                CREATE TABLE gamification_profiles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider_account_id INTEGER,
                    xp INTEGER NOT NULL,
                    level INTEGER NOT NULL,
                    streak_days INTEGER NOT NULL,
                    token_balance INTEGER NOT NULL DEFAULT 0,
                    badges_json TEXT,
                    companion_state_json TEXT
                );
                "#,
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO schedule_profiles (provider_account_id, timezone, hours_per_day, workdays_json, week_start, is_default)
                 VALUES (1, 'UTC', 8, '[\"Mon\",\"Tue\",\"Wed\",\"Thu\",\"Fri\"]', 'monday', 1)",
                [],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO gamification_profiles (provider_account_id, xp, level, streak_days, token_balance, badges_json, companion_state_json)
                 VALUES (1, 0, 1, 0, 0, '[]', '{}')",
                [],
            )
            .unwrap();
        connection
    }

    #[test]
    fn counts_consecutive_same_day_uploads() {
        let connection = setup_connection();
        connection
            .execute(
                "INSERT INTO time_entries (provider_account_id, provider_entry_id, spent_at, seconds, uploaded_at)
                 VALUES (1, 'a', '2026-03-09T10:00:00Z', 3600, '2026-03-09T13:00:00Z')",
                [],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO time_entries (provider_account_id, provider_entry_id, spent_at, seconds, uploaded_at)
                 VALUES (1, 'b', '2026-03-10T10:00:00Z', 3600, '2026-03-10T15:00:00Z')",
                [],
            )
            .unwrap();

        let snapshot = build_streak_snapshot(
            &connection,
            1,
            NaiveDate::from_ymd_opt(2026, 3, 10).unwrap(),
        )
        .unwrap();

        assert_eq!(snapshot.current_days, 2);
        assert_eq!(state_for(&snapshot, "2026-03-10"), "counted");
    }

    #[test]
    fn breaks_when_upload_date_differs_from_logged_date() {
        let connection = setup_connection();
        connection
            .execute(
                "INSERT INTO time_entries (provider_account_id, provider_entry_id, spent_at, seconds, uploaded_at)
                 VALUES (1, 'a', '2026-03-10T10:00:00Z', 3600, '2026-03-11T09:00:00Z')",
                [],
            )
            .unwrap();

        let snapshot = build_streak_snapshot(
            &connection,
            1,
            NaiveDate::from_ymd_opt(2026, 3, 10).unwrap(),
        )
        .unwrap();

        assert_eq!(snapshot.current_days, 0);
        assert_eq!(state_for(&snapshot, "2026-03-10"), "broken");
    }

    #[test]
    fn skips_non_workdays_without_breaking_streak() {
        let connection = setup_connection();
        connection
            .execute(
                "INSERT INTO time_entries (provider_account_id, provider_entry_id, spent_at, seconds, uploaded_at)
                 VALUES (1, 'fri', '2026-03-06T10:00:00Z', 3600, '2026-03-06T12:00:00Z')",
                [],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO time_entries (provider_account_id, provider_entry_id, spent_at, seconds, uploaded_at)
                 VALUES (1, 'mon', '2026-03-09T10:00:00Z', 3600, '2026-03-09T12:00:00Z')",
                [],
            )
            .unwrap();

        let snapshot =
            build_streak_snapshot(&connection, 1, NaiveDate::from_ymd_opt(2026, 3, 9).unwrap())
                .unwrap();

        assert_eq!(snapshot.current_days, 2);
    }

    #[test]
    fn aligns_window_to_configured_week_start() {
        let connection = setup_connection();
        connection
            .execute(
                "UPDATE schedule_profiles SET week_start = 'sunday' WHERE is_default = 1",
                [],
            )
            .unwrap();

        let snapshot = build_streak_snapshot(
            &connection,
            1,
            NaiveDate::from_ymd_opt(2026, 3, 11).unwrap(),
        )
        .unwrap();

        assert_eq!(snapshot.window.first().unwrap().date, "2026-03-08");
        assert_eq!(snapshot.window.last().unwrap().date, "2026-03-14");
    }
}
