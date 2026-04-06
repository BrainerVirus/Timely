use chrono::{Datelike, Duration, Local, NaiveDate};
use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    domain::models::{
        AssignedIssueSnapshot, AuditFlag, BootstrapPayload, DayOverview, IssueBreakdown,
        MonthSnapshot, ProfileSnapshot, ProviderConnection, ProviderStatus, ScheduleSnapshot,
        StreakSnapshot, WeekdaySchedule,
    },
    error::AppError,
    services::{preferences, streak},
    support::holidays,
};

const DEFAULT_APP_NAME: &str = "Timely";
const DEFAULT_PHASE: &str = "Fresh workspace";
const DEFAULT_COMPANION: &str = "Aurora fox";
const DEFAULT_WORKDAYS: &str = "Mon - Tue - Wed - Thu - Fri";
const DEFAULT_TIMEZONE: &str = "UTC";
const DEFAULT_PROVIDER_TONE: &str = "cyan";
const DEFAULT_SHIFT_START: &str = "09:00";
const DEFAULT_SHIFT_END: &str = "18:00";
const DEFAULT_LUNCH_MINUTES: u32 = 60;
const ALL_WEEKDAY_CODES: [&str; 7] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

pub fn load_bootstrap_payload(connection: &Connection) -> Result<BootstrapPayload, AppError> {
    let provider_connections = load_provider_connections(connection)?;
    let app_preferences = preferences::load_app_preferences(connection)?;

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
            return Ok(empty_bootstrap_payload(actual_today));
        }
    };

    let alias = primary
        .username
        .clone()
        .unwrap_or_else(|| primary.display_name.clone());

    let actual_today = Local::now().date_naive();
    let last_synced_at = primary_last_synced_at(connection, primary.id)?;

    let mut profile = connection
        .query_row(
            "SELECT xp, level, streak_days, companion_state_json FROM gamification_profiles WHERE provider_account_id = ?1 LIMIT 1",
            [primary.id],
            |row| {
                let companion_state: String = row.get(3)?;
                let companion = serde_json::from_str::<serde_json::Value>(&companion_state)
                    .ok()
                    .and_then(|json| json.get("name").and_then(|value| value.as_str()).map(str::to_string))
                    .unwrap_or_else(|| DEFAULT_COMPANION.to_string());

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
            companion: DEFAULT_COMPANION.to_string(),
        });

    let streak = streak::build_streak_snapshot(connection, primary.id, actual_today)?;
    streak::persist_current_streak(connection, primary.id, streak.current_days)?;
    profile.streak_days = streak.current_days;

    let schedule = connection
        .query_row(
            "SELECT timezone, hours_per_day, workdays_json, shift_start, shift_end, lunch_minutes, week_start, weekday_schedule_json FROM schedule_profiles WHERE is_default = 1 LIMIT 1",
            [],
            |row| {
                let workdays_json: String = row.get(2)?;
                let shift_start: Option<String> = row.get(3)?;
                let shift_end: Option<String> = row.get(4)?;
                let lunch_minutes: Option<u32> = row.get(5)?;
                let weekday_schedule_json: Option<String> = row.get(7)?;
                let weekday_schedules = weekday_schedules_from_fields(
                    weekday_schedule_json.as_deref(),
                    Some(workdays_json.as_str()),
                    shift_start.as_deref(),
                    shift_end.as_deref(),
                    lunch_minutes,
                );
                let (hours_per_day, workdays, derived_shift_start, derived_shift_end, derived_lunch_minutes) =
                    derive_schedule_legacy_fields(&weekday_schedules);

                let stored_hours_per_day: f32 = row.get(1)?;

                Ok(ScheduleSnapshot {
                    hours_per_day: if hours_per_day > 0.0 {
                        hours_per_day
                    } else {
                        stored_hours_per_day
                    },
                    shift_start: derived_shift_start,
                    shift_end: derived_shift_end,
                    lunch_minutes: derived_lunch_minutes,
                    workdays: workdays.join(" - "),
                    timezone: row.get(0)?,
                    week_start: row.get(6)?,
                    weekday_schedules,
                })
            },
        )
        .optional()?
        .unwrap_or_else(default_schedule_snapshot);

    let week = load_week_overview(
        connection,
        primary.id,
        &actual_today,
        &schedule.weekday_schedules,
        week_start_to_index(schedule.week_start.as_deref(), &schedule.timezone),
        app_preferences.holiday_country_code.as_deref(),
    )?;

    // Find today in the week; if it's a weekend, create a non_workday entry
    let today = week
        .iter()
        .find(|d| d.is_today)
        .cloned()
        .unwrap_or_else(|| DayOverview {
            date: actual_today.format("%Y-%m-%d").to_string(),
            short_label: actual_today.format("%a").to_string(),
            date_label: actual_today.format("%a %d").to_string(),
            is_today: true,
            holiday_name: None,
            logged_hours: 0.0,
            target_hours: 0.0,
            focus_hours: 0.0,
            overflow_hours: 0.0,
            status: "non_workday".to_string(),
            top_issues: vec![],
        });

    let month = load_month_snapshot(
        connection,
        primary.id,
        &schedule.weekday_schedules,
        app_preferences.holiday_country_code.as_deref(),
    )?;
    let demo_mode = !has_sync_data(connection)?;
    let audit_flags = build_audit_flags(&week, demo_mode);

    // Only show real provider connections, not placeholder future providers
    let provider_status = provider_connections
        .iter()
        .map(build_provider_status)
        .collect();

    let assigned_issues = load_assigned_issue_snapshots(connection, primary.id)?;

    Ok(BootstrapPayload {
        app_name: DEFAULT_APP_NAME.to_string(),
        phase: DEFAULT_PHASE.to_string(),
        demo_mode,
        last_synced_at,
        profile,
        streak,
        provider_status,
        schedule,
        today,
        week,
        month,
        audit_flags,
        quests: vec![],
        assigned_issues,
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
    weekday_schedules: &[WeekdaySchedule],
    week_starts_on: u32,
    holiday_country_code: Option<&str>,
) -> Result<Vec<DayOverview>, AppError> {
    let week_start = start_of_week(*actual_today, week_starts_on);
    let mut days = Vec::with_capacity(7);

    for offset in 0..7 {
        let date = week_start + Duration::days(offset);
        let is_today = date == *actual_today;
        let is_past = date < *actual_today;
        let holiday = holidays::holiday_for_date(date, holiday_country_code);
        let default_target_seconds = if holiday.is_some() {
            0
        } else {
            target_seconds_for_date(date, weekday_schedules)
        };
        let is_non_workday = default_target_seconds == 0;

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

        let (logged_seconds, mut target_seconds, variance_seconds, mut status) =
            bucket.unwrap_or((0, default_target_seconds, 0, "empty".to_string()));

        if holiday.is_some() || is_non_workday {
            target_seconds = 0;
            if logged_seconds == 0 {
                status = "non_workday".to_string();
            }
        }

        // Past days that never reached target should be flagged
        if is_past
            && (status == "on_track" || (status == "met_target" && logged_seconds < target_seconds))
        {
            status = "under_target".to_string();
        }

        if holiday.is_some() && logged_seconds > 0 && status == "empty" {
            status = "over_target".to_string();
        }

        let top_issues = load_issue_breakdown(connection, provider_account_id, &date)?;
        let focus_hours = top_issues
            .iter()
            .take(2)
            .map(|issue| issue.hours)
            .sum::<f32>();

        days.push(DayOverview {
            date: date.format("%Y-%m-%d").to_string(),
            short_label: date.format("%a").to_string(),
            date_label: date.format("%a %d").to_string(),
            is_today,
            holiday_name: holiday.map(|record| record.name.to_string()),
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
                .and_then(parse_issue_tone)
                .unwrap_or_else(|| DEFAULT_PROVIDER_TONE.to_string());

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
    weekday_schedules: &[WeekdaySchedule],
    holiday_country_code: Option<&str>,
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

    let target_hours = target_hours_in_month(month_start, weekday_schedules, holiday_country_code);
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

fn next_month_start(date: NaiveDate) -> NaiveDate {
    let (year, month) = if date.month() == 12 {
        (date.year() + 1, 1)
    } else {
        (date.year(), date.month() + 1)
    };

    NaiveDate::from_ymd_opt(year, month, 1).expect("valid next month start")
}

pub fn default_weekday_schedules() -> Vec<WeekdaySchedule> {
    ALL_WEEKDAY_CODES
        .iter()
        .map(|day| WeekdaySchedule {
            day: (*day).to_string(),
            enabled: matches!(*day, "Mon" | "Tue" | "Wed" | "Thu" | "Fri"),
            shift_start: DEFAULT_SHIFT_START.to_string(),
            shift_end: DEFAULT_SHIFT_END.to_string(),
            lunch_minutes: DEFAULT_LUNCH_MINUTES,
        })
        .collect()
}

pub fn weekday_schedules_from_fields(
    weekday_schedule_json: Option<&str>,
    workdays_json: Option<&str>,
    shift_start: Option<&str>,
    shift_end: Option<&str>,
    lunch_minutes: Option<u32>,
) -> Vec<WeekdaySchedule> {
    let fallback_workdays = parse_workdays_json(workdays_json);
    let fallback_shift_start = shift_start.unwrap_or(DEFAULT_SHIFT_START);
    let fallback_shift_end = shift_end.unwrap_or(DEFAULT_SHIFT_END);
    let fallback_lunch_minutes = lunch_minutes.unwrap_or(DEFAULT_LUNCH_MINUTES);
    let mut schedules_by_day = std::collections::HashMap::new();

    if let Some(raw_json) = weekday_schedule_json {
        if let Ok(schedules) = serde_json::from_str::<Vec<WeekdaySchedule>>(raw_json) {
            for schedule in schedules {
                if ALL_WEEKDAY_CODES.contains(&schedule.day.as_str()) {
                    schedules_by_day.insert(schedule.day.clone(), schedule);
                }
            }
        }
    }

    ALL_WEEKDAY_CODES
        .iter()
        .map(|day| {
            schedules_by_day
                .remove(*day)
                .unwrap_or_else(|| WeekdaySchedule {
                    day: (*day).to_string(),
                    enabled: if fallback_workdays.is_empty() {
                        matches!(*day, "Mon" | "Tue" | "Wed" | "Thu" | "Fri")
                    } else {
                        fallback_workdays.iter().any(|workday| workday == day)
                    },
                    shift_start: fallback_shift_start.to_string(),
                    shift_end: fallback_shift_end.to_string(),
                    lunch_minutes: fallback_lunch_minutes,
                })
        })
        .collect()
}

pub fn normalize_weekday_schedules(weekday_schedules: &[WeekdaySchedule]) -> Vec<WeekdaySchedule> {
    let mut schedules_by_day = std::collections::HashMap::new();

    for schedule in weekday_schedules {
        if ALL_WEEKDAY_CODES.contains(&schedule.day.as_str()) {
            schedules_by_day.insert(schedule.day.clone(), schedule.clone());
        }
    }

    ALL_WEEKDAY_CODES
        .iter()
        .map(|day| {
            schedules_by_day
                .remove(*day)
                .unwrap_or_else(|| WeekdaySchedule {
                    day: (*day).to_string(),
                    enabled: matches!(*day, "Mon" | "Tue" | "Wed" | "Thu" | "Fri"),
                    shift_start: DEFAULT_SHIFT_START.to_string(),
                    shift_end: DEFAULT_SHIFT_END.to_string(),
                    lunch_minutes: DEFAULT_LUNCH_MINUTES,
                })
        })
        .collect()
}

pub fn derive_schedule_legacy_fields(
    weekday_schedules: &[WeekdaySchedule],
) -> (
    f32,
    Vec<String>,
    Option<String>,
    Option<String>,
    Option<u32>,
) {
    let enabled_schedules: Vec<&WeekdaySchedule> = weekday_schedules
        .iter()
        .filter(|schedule| schedule.enabled)
        .collect();
    let workdays = enabled_schedules
        .iter()
        .map(|schedule| schedule.day.clone())
        .collect::<Vec<_>>();

    if enabled_schedules.is_empty() {
        return (0.0, workdays, None, None, None);
    }

    let total_hours = enabled_schedules
        .iter()
        .map(|schedule| {
            compute_hours_per_day(
                Some(schedule.shift_start.as_str()),
                Some(schedule.shift_end.as_str()),
                Some(schedule.lunch_minutes),
            )
        })
        .sum::<f32>();
    let first = enabled_schedules[0];
    let uniform_shift = enabled_schedules.iter().all(|schedule| {
        schedule.shift_start == first.shift_start
            && schedule.shift_end == first.shift_end
            && schedule.lunch_minutes == first.lunch_minutes
    });

    (
        total_hours / enabled_schedules.len() as f32,
        workdays,
        uniform_shift.then(|| first.shift_start.clone()),
        uniform_shift.then(|| first.shift_end.clone()),
        uniform_shift.then_some(first.lunch_minutes),
    )
}

pub fn weekday_schedule_for_date(
    date: NaiveDate,
    weekday_schedules: &[WeekdaySchedule],
) -> Option<&WeekdaySchedule> {
    let short_name = date.format("%a").to_string();
    weekday_schedules
        .iter()
        .find(|schedule| schedule.day == short_name && schedule.enabled)
}

pub fn target_seconds_for_date(date: NaiveDate, weekday_schedules: &[WeekdaySchedule]) -> i64 {
    weekday_schedule_for_date(date, weekday_schedules)
        .map(|schedule| {
            (compute_hours_per_day(
                Some(schedule.shift_start.as_str()),
                Some(schedule.shift_end.as_str()),
                Some(schedule.lunch_minutes),
            ) * 3600.0) as i64
        })
        .unwrap_or(0)
}

fn target_hours_in_month(
    month_start: NaiveDate,
    weekday_schedules: &[WeekdaySchedule],
    holiday_country_code: Option<&str>,
) -> f32 {
    let month_end = next_month_start(month_start);
    let mut day = month_start;
    let mut total_target_seconds = 0_i64;

    while day < month_end {
        if holidays::holiday_for_date(day, holiday_country_code).is_none() {
            total_target_seconds += target_seconds_for_date(day, weekday_schedules);
        }
        day += Duration::days(1);
    }

    seconds_to_hours(total_target_seconds)
}

fn seconds_to_hours(value: i64) -> f32 {
    value as f32 / 3600.0
}

fn parse_workdays_json(workdays_json: Option<&str>) -> Vec<String> {
    workdays_json
        .and_then(|raw| serde_json::from_str::<Vec<String>>(raw).ok())
        .unwrap_or_default()
}

fn default_schedule_snapshot() -> ScheduleSnapshot {
    ScheduleSnapshot {
        hours_per_day: 8.0,
        shift_start: None,
        shift_end: None,
        lunch_minutes: None,
        workdays: DEFAULT_WORKDAYS.to_string(),
        timezone: DEFAULT_TIMEZONE.to_string(),
        week_start: Some("monday".to_string()),
        weekday_schedules: default_weekday_schedules(),
    }
}

fn empty_bootstrap_payload(actual_today: NaiveDate) -> BootstrapPayload {
    BootstrapPayload {
        app_name: DEFAULT_APP_NAME.to_string(),
        phase: DEFAULT_PHASE.to_string(),
        demo_mode: true,
        last_synced_at: None,
        profile: ProfileSnapshot {
            alias: "Pilot".to_string(),
            level: 1,
            xp: 0,
            streak_days: 0,
            companion: DEFAULT_COMPANION.to_string(),
        },
        streak: StreakSnapshot {
            current_days: 0,
            window: vec![],
        },
        provider_status: vec![],
        schedule: default_schedule_snapshot(),
        today: empty_day_overview(actual_today, "empty"),
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
        assigned_issues: vec![],
    }
}

fn load_assigned_issue_snapshots(
    connection: &Connection,
    provider_account_id: i64,
) -> Result<Vec<AssignedIssueSnapshot>, AppError> {
    let mut statement = connection.prepare(
        "SELECT provider_item_id, title, state, web_url, labels_json, milestone_title, iteration_title, iteration_start_date, iteration_due_date, issue_graphql_id
         FROM work_items
         WHERE provider_account_id = ?1 AND from_assigned_sync = 1 AND LOWER(state) = 'opened'
         ORDER BY updated_at DESC
         LIMIT 80",
    )?;

    let rows = statement.query_map([provider_account_id], |row| {
        let labels_json: Option<String> = row.get(4)?;
        let labels = labels_json
            .as_deref()
            .and_then(|raw| serde_json::from_str::<Vec<String>>(raw).ok())
            .unwrap_or_default();

        Ok(AssignedIssueSnapshot {
            key: row.get(0)?,
            title: row.get(1)?,
            state: row.get(2)?,
            web_url: row.get(3)?,
            labels,
            milestone_title: row.get(5)?,
            iteration_title: row.get(6)?,
            iteration_start_date: row.get(7)?,
            iteration_due_date: row.get(8)?,
            issue_graphql_id: row.get(9)?,
        })
    })?;

    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}

fn empty_day_overview(actual_today: NaiveDate, status: &str) -> DayOverview {
    DayOverview {
        date: actual_today.format("%Y-%m-%d").to_string(),
        short_label: actual_today.format("%a").to_string(),
        date_label: actual_today.format("%a %d").to_string(),
        is_today: true,
        holiday_name: None,
        logged_hours: 0.0,
        target_hours: 0.0,
        focus_hours: 0.0,
        overflow_hours: 0.0,
        status: status.to_string(),
        top_issues: vec![],
    }
}

fn build_provider_status(provider: &ProviderConnection) -> ProviderStatus {
    ProviderStatus {
        name: provider.provider.clone(),
        state: provider.state.clone(),
        host: provider.host.clone(),
        auth_mode: provider.auth_mode.clone(),
        note: provider.status_note.clone(),
    }
}

fn primary_last_synced_at(
    connection: &Connection,
    provider_account_id: i64,
) -> Result<Option<String>, AppError> {
    connection
        .query_row(
            "SELECT last_sync_at FROM provider_accounts WHERE id = ?1 LIMIT 1",
            [provider_account_id],
            |row| row.get(0),
        )
        .optional()
        .map(|value| value.flatten())
        .map_err(AppError::from)
}

fn parse_issue_tone(json: &str) -> Option<String> {
    serde_json::from_str::<Vec<String>>(json)
        .ok()?
        .into_iter()
        .find(|label| ["emerald", "amber", "cyan", "rose", "violet"].contains(&label.as_str()))
}

#[allow(clippy::too_many_arguments)]
pub fn upsert_schedule(
    connection: &Connection,
    provider_account_id: Option<i64>,
    weekday_schedules: &[WeekdaySchedule],
    timezone: &str,
    week_start: Option<&str>,
) -> Result<(), AppError> {
    let normalized_weekday_schedules = normalize_weekday_schedules(weekday_schedules);
    let weekday_schedule_json =
        serde_json::to_string(&normalized_weekday_schedules).unwrap_or_else(|_| "[]".to_string());
    let (hours_per_day, workdays, shift_start, shift_end, lunch_minutes) =
        derive_schedule_legacy_fields(&normalized_weekday_schedules);
    let workdays_json = serde_json::to_string(&workdays).unwrap_or_else(|_| "[]".to_string());

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
                "UPDATE schedule_profiles SET hours_per_day = ?1, workdays_json = ?2, timezone = ?3, provider_account_id = ?4, shift_start = ?5, shift_end = ?6, lunch_minutes = ?7, week_start = ?8, weekday_schedule_json = ?9 WHERE id = ?10",
                params![hours_per_day, workdays_json, timezone, provider_account_id, shift_start, shift_end, lunch_minutes, week_start, weekday_schedule_json, id],
            )?;
        }
        None => {
            connection.execute(
                "INSERT INTO schedule_profiles (provider_account_id, timezone, hours_per_day, workdays_json, shift_start, shift_end, lunch_minutes, week_start, weekday_schedule_json, is_default) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1)",
                params![provider_account_id, timezone, hours_per_day, workdays_json, shift_start, shift_end, lunch_minutes, week_start, weekday_schedule_json],
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
                    week_start TEXT,
                    weekday_schedule_json TEXT,
                    is_default INTEGER NOT NULL DEFAULT 0
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
                CREATE TABLE work_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider_account_id INTEGER NOT NULL,
                    provider_item_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    state TEXT NOT NULL,
                    web_url TEXT,
                    labels_json TEXT,
                    raw_json TEXT,
                    updated_at TEXT,
                    issue_graphql_id TEXT,
                    milestone_title TEXT,
                    iteration_title TEXT,
                    iteration_start_date TEXT,
                    iteration_due_date TEXT,
                    from_assigned_sync INTEGER NOT NULL DEFAULT 0
                );
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
                CREATE TABLE app_preferences (
                    key TEXT PRIMARY KEY,
                    value_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
        let target_hours = target_hours_in_month(month_start, &default_weekday_schedules(), None);
        assert!(target_hours >= 160.0);
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
    fn payload_exposes_last_synced_at_for_primary_connection() {
        let connection = setup_seeded_connection();
        let payload = load_bootstrap_payload(&connection).unwrap();

        assert_eq!(
            payload.last_synced_at.as_deref(),
            Some("2026-03-06T17:40:00Z")
        );
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

    #[test]
    fn week_overview_uses_configured_hours_for_missing_workday_bucket() {
        let connection = setup_empty_connection();
        let today = NaiveDate::from_ymd_opt(2026, 3, 4).unwrap();
        let weekday_schedules = ALL_WEEKDAY_CODES
            .iter()
            .map(|day| WeekdaySchedule {
                day: (*day).to_string(),
                enabled: matches!(*day, "Mon" | "Tue" | "Wed" | "Thu" | "Fri"),
                shift_start: "09:00".to_string(),
                shift_end: "19:00".to_string(),
                lunch_minutes: 60,
            })
            .collect::<Vec<_>>();
        let week = load_week_overview(&connection, 1, &today, &weekday_schedules, 1, None).unwrap();

        let current_day = week.into_iter().find(|day| day.is_today).unwrap();

        assert_eq!(current_day.target_hours, 9.0);
        assert_eq!(current_day.status, "empty");
    }
}
