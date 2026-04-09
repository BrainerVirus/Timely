use std::collections::HashMap;

use chrono::{Datelike, Duration, Local, NaiveDate};
use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    domain::models::{
        AssignedIssueSnapshot, AssignedIssueSuggestion, AssignedIssuesIterationOption,
        AssignedIssuesPage, AssignedIssuesQueryInput, AuditFlag, BootstrapPayload,
        CachedIterationRecord, DayOverview, IssueBreakdown, MonthSnapshot, ProfileSnapshot,
        ProviderConnection, ProviderStatus, ScheduleSnapshot, StreakSnapshot, WeekdaySchedule,
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
    let mut rows = load_all_assigned_issue_snapshots(connection, provider_account_id)?;
    rows.retain(|row| row.state.eq_ignore_ascii_case("opened"));
    rows.sort_by(|a, b| {
        b.iteration_start_date
            .cmp(&a.iteration_start_date)
            .then(a.title.cmp(&b.title))
    });
    rows.truncate(80);
    Ok(rows)
}

pub fn load_assigned_issues_page_from_cache(
    connection: &Connection,
    provider_account_id: i64,
    input: &AssignedIssuesQueryInput,
    today: NaiveDate,
) -> Result<AssignedIssuesPage, AppError> {
    if !matches!(input.status.as_str(), "opened" | "closed" | "all") {
        return Err(AppError::GitLabApi(
            "Assigned issues board supports only opened, closed, or all statuses.".to_string(),
        ));
    }

    let page_size = input.page_size.clamp(1, 100);
    let all_rows = load_all_assigned_issue_snapshots(connection, provider_account_id)?;
    let status_rows = all_rows
        .into_iter()
        .filter(|row| matches_assigned_issue_status(row, input.status.as_str()))
        .collect::<Vec<_>>();
    let base_iteration_catalog = load_iteration_catalog_rows(connection, provider_account_id)?;
    let iteration_catalog =
        enrich_iteration_catalog_from_issue_rows(base_iteration_catalog, &status_rows);
    let matched_rows = build_assigned_issue_matches(status_rows.clone(), &iteration_catalog, today);
    let years = collect_assigned_issue_years(&matched_rows);
    let iteration_options = collect_iteration_options(&matched_rows, today);
    let suggestions = collect_assigned_issue_suggestions(&status_rows, input.search.as_deref());
    let (catalog_state, catalog_message) = load_iteration_catalog_health(
        connection,
        provider_account_id,
        &status_rows,
        &iteration_catalog,
        &iteration_options,
    );

    let mut filtered = matched_rows
        .into_iter()
        .filter(|row| matches_assigned_issue_search(&row.snapshot, input.search.as_deref()))
        .filter(|row| matches_assigned_issue_filters(row, input))
        .map(|row| row.snapshot)
        .collect::<Vec<_>>();

    filtered.sort_by(|a, b| compare_assigned_issue_rows(a, b, today));

    let total_items = filtered.len();
    let total_pages = total_items.max(1).div_ceil(page_size);
    let page = input.page.max(1).min(total_pages);
    let offset = page.saturating_sub(1) * page_size;
    let items = filtered
        .into_iter()
        .skip(offset)
        .take(page_size)
        .collect::<Vec<_>>();

    let has_next_page = page < total_pages;

    Ok(AssignedIssuesPage {
        items,
        has_next_page,
        end_cursor: has_next_page.then(|| (page + 1).to_string()),
        suggestions,
        years,
        iteration_options,
        catalog_state,
        catalog_message,
        page,
        page_size,
        total_items,
        total_pages,
    })
}

fn load_all_assigned_issue_snapshots(
    connection: &Connection,
    provider_account_id: i64,
) -> Result<Vec<AssignedIssueSnapshot>, AppError> {
    let mut statement = connection.prepare(
        "SELECT provider_item_id, title, state, closed_at, web_url, labels_json, milestone_title, iteration_gitlab_id, iteration_group_id, iteration_cadence_id, iteration_cadence_title, iteration_title, iteration_start_date, iteration_due_date, issue_graphql_id, assigned_bucket
         FROM work_items
         WHERE provider_account_id = ?1 AND from_assigned_sync = 1",
    )?;

    let rows = statement.query_map([provider_account_id], |row| {
        let labels_json: Option<String> = row.get(5)?;
        let labels = labels_json
            .as_deref()
            .and_then(|raw| serde_json::from_str::<Vec<String>>(raw).ok())
            .unwrap_or_default();

        Ok(AssignedIssueSnapshot {
            provider: "gitlab".to_string(),
            issue_id: row.get(0)?,
            provider_issue_ref: row.get(14)?,
            key: row.get(0)?,
            title: row.get(1)?,
            state: row.get(2)?,
            closed_at: row.get(3)?,
            web_url: row.get(4)?,
            labels,
            milestone_title: row.get(6)?,
            iteration_gitlab_id: row.get(7)?,
            iteration_group_id: row.get(8)?,
            iteration_cadence_id: row.get(9)?,
            iteration_cadence_title: row.get(10)?,
            iteration_title: row.get(11)?,
            iteration_start_date: row.get(12)?,
            iteration_due_date: row.get(13)?,
            assigned_bucket: row.get(15)?,
        })
    })?;

    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}

fn load_iteration_catalog_rows(
    connection: &Connection,
    provider_account_id: i64,
) -> Result<Vec<CachedIterationRecord>, AppError> {
    let mut statement = connection.prepare(
        "SELECT iteration_gitlab_id, cadence_id, cadence_title, title, start_date, due_date, state, web_url, group_id
         FROM iteration_catalog
         WHERE provider_account_id = ?1",
    )?;

    let rows = statement.query_map([provider_account_id], |row| {
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

fn enrich_iteration_catalog_from_issue_rows(
    iteration_catalog: Vec<CachedIterationRecord>,
    rows: &[AssignedIssueSnapshot],
) -> Vec<CachedIterationRecord> {
    let mut by_id = iteration_catalog
        .into_iter()
        .map(|iteration| (iteration.iteration_gitlab_id.clone(), iteration))
        .collect::<HashMap<_, _>>();

    for row in rows {
        let Some(iteration_gitlab_id) = row.iteration_gitlab_id.clone() else {
            continue;
        };
        if let Some(existing) = by_id.get_mut(&iteration_gitlab_id) {
            if existing.cadence_id.is_none() {
                existing.cadence_id = row.iteration_cadence_id.clone();
            }
            if existing.cadence_title.is_none() {
                existing.cadence_title = row.iteration_cadence_title.clone();
            }
            if existing.title.is_none() {
                existing.title = row.iteration_title.clone();
            }
            if existing.start_date.is_none() {
                existing.start_date = row.iteration_start_date.clone();
            }
            if existing.due_date.is_none() {
                existing.due_date = row.iteration_due_date.clone();
            }
            if existing.group_id.is_none() {
                existing.group_id = row.iteration_group_id.clone();
            }
            continue;
        }

        by_id.insert(
            iteration_gitlab_id.clone(),
            CachedIterationRecord {
                iteration_gitlab_id,
                cadence_id: row.iteration_cadence_id.clone(),
                cadence_title: row.iteration_cadence_title.clone(),
                title: row.iteration_title.clone(),
                start_date: row.iteration_start_date.clone(),
                due_date: row.iteration_due_date.clone(),
                state: None,
                web_url: None,
                group_id: row.iteration_group_id.clone(),
            },
        );
    }

    by_id.into_values().collect()
}

fn load_iteration_catalog_health(
    connection: &Connection,
    provider_account_id: i64,
    rows: &[AssignedIssueSnapshot],
    iteration_catalog: &[CachedIterationRecord],
    iteration_options: &[AssignedIssuesIterationOption],
) -> (String, Option<String>) {
    let status = crate::db::sync::load_sync_cursor(
        connection,
        provider_account_id,
        "assigned_issues_catalog_status",
    )
    .ok()
    .flatten()
    .and_then(|raw| serde_json::from_str::<serde_json::Value>(&raw).ok());

    let mut state = status
        .as_ref()
        .and_then(|value| value.get("state"))
        .and_then(|value| value.as_str())
        .unwrap_or("ready")
        .to_string();
    let mut message = status
        .as_ref()
        .and_then(|value| value.get("message"))
        .and_then(|value| value.as_str())
        .map(str::to_string);

    let has_iteration_backed_rows = rows.iter().any(|row| {
        row.iteration_gitlab_id.is_some()
            || row.iteration_group_id.is_some()
            || row.iteration_start_date.is_some()
            || row.iteration_due_date.is_some()
    });
    let has_catalog_dates = iteration_catalog
        .iter()
        .any(|iteration| iteration.start_date.is_some() && iteration.due_date.is_some());
    if has_iteration_backed_rows && !has_catalog_dates && state == "ready" {
        state = "partial".to_string();
        message = Some(
            "Iteration data was synced, but no dated iteration catalog could be matched yet."
                .to_string(),
        );
    }
    if has_iteration_backed_rows
        && iteration_options.iter().all(|option| option.id == "none")
        && state == "ready"
    {
        state = "partial".to_string();
        message = Some(
            "Assigned issues were loaded, but cadence metadata is still unavailable for filters."
                .to_string(),
        );
    }

    (state, message)
}

#[derive(Clone, Debug)]
struct MatchedAssignedIssue {
    snapshot: AssignedIssueSnapshot,
    matched_iteration_id: Option<String>,
    matched_cadence_title: Option<String>,
    matched_year: Option<String>,
    matched_start_date: Option<String>,
    matched_due_date: Option<String>,
    matched_is_current: bool,
}

fn matches_assigned_issue_status(row: &AssignedIssueSnapshot, status: &str) -> bool {
    match status {
        "all" => true,
        "closed" => row.state.eq_ignore_ascii_case("closed"),
        "opened" => row.state.eq_ignore_ascii_case("opened"),
        _ => false,
    }
}

fn collect_iteration_options(
    rows: &[MatchedAssignedIssue],
    today: NaiveDate,
) -> Vec<AssignedIssuesIterationOption> {
    let group_order = collect_iteration_group_order(rows, today)
        .iter()
        .enumerate()
        .map(|(index, option)| (option.clone(), index))
        .collect::<HashMap<_, _>>();

    let mut grouped = HashMap::<String, AssignedIssuesIterationOption>::new();
    for row in rows {
        if is_unassigned_iteration_row(row) {
            grouped
                .entry("none".to_string())
                .and_modify(|option| {
                    option.issue_count += 1;
                })
                .or_insert_with(|| AssignedIssuesIterationOption {
                    id: "none".to_string(),
                    label: "No iteration".to_string(),
                    badge: None,
                    search_text: "no iteration".to_string(),
                    year: None,
                    start_date: None,
                    due_date: None,
                    is_current: false,
                    issue_count: 1,
                });
            continue;
        }

        let Some(iteration_id) = row.matched_iteration_id.clone() else {
            continue;
        };
        let Some(start_date) = row.matched_start_date.clone() else {
            continue;
        };
        let Some(due_date) = row.matched_due_date.clone() else {
            continue;
        };
        let Some(range_label) = format_iteration_range_label(&start_date, &due_date) else {
            continue;
        };
        let year =
            iteration_year_from_date(&start_date).or_else(|| iteration_year_from_date(&due_date));
        let is_current = row.matched_is_current
            || iteration_contains_today(Some(start_date.as_str()), Some(due_date.as_str()), today);
        let badge = row.matched_cadence_title.clone();
        let label = badge
            .as_ref()
            .map(|value| format!("{value} · {range_label}"))
            .unwrap_or_else(|| range_label.clone());

        grouped
            .entry(iteration_id.clone())
            .and_modify(|option| {
                option.issue_count += 1;
                option.is_current |= is_current;
            })
            .or_insert_with(|| AssignedIssuesIterationOption {
                id: iteration_id,
                label: label.clone(),
                badge: badge.clone(),
                search_text: build_iteration_option_search_text(
                    badge.as_deref(),
                    row.snapshot.iteration_title.as_deref(),
                    &label,
                    &start_date,
                    &due_date,
                    is_current,
                ),
                year,
                start_date: Some(start_date),
                due_date: Some(due_date),
                is_current,
                issue_count: 1,
            });
    }

    let mut iterations = grouped.into_values().collect::<Vec<_>>();
    iterations.sort_by(|left, right| compare_iteration_options(left, right, &group_order));
    iterations
}

fn compare_iteration_options(
    left: &AssignedIssuesIterationOption,
    right: &AssignedIssuesIterationOption,
    group_order: &HashMap<String, usize>,
) -> std::cmp::Ordering {
    group_order
        .get(left.badge.as_deref().unwrap_or(""))
        .unwrap_or(&usize::MAX)
        .cmp(
            group_order
                .get(right.badge.as_deref().unwrap_or(""))
                .unwrap_or(&usize::MAX),
        )
        .then_with(|| right.is_current.cmp(&left.is_current))
        .then_with(|| compare_optional_dates_desc(&left.start_date, &right.start_date))
        .then_with(|| compare_optional_dates_desc(&left.due_date, &right.due_date))
        .then_with(|| left.label.cmp(&right.label))
}

fn collect_iteration_group_order(rows: &[MatchedAssignedIssue], today: NaiveDate) -> Vec<String> {
    let mut grouped = HashMap::<String, (bool, u32)>::new();

    for row in rows {
        let Some(label) = row.matched_cadence_title.clone() else {
            continue;
        };
        let is_current = row.matched_is_current
            || iteration_contains_today(
                row.matched_start_date.as_deref(),
                row.matched_due_date.as_deref(),
                today,
            );

        grouped
            .entry(label)
            .and_modify(|stats| {
                stats.0 |= is_current;
                stats.1 += 1;
            })
            .or_insert((is_current, 1));
    }

    let mut labels = grouped.into_iter().collect::<Vec<_>>();
    labels.sort_by(|left, right| {
        right
            .1
             .0
            .cmp(&left.1 .0)
            .then_with(|| right.1 .1.cmp(&left.1 .1))
            .then_with(|| left.0.cmp(&right.0))
    });
    labels.into_iter().map(|(label, _)| label).collect()
}

fn is_unassigned_iteration_row(row: &MatchedAssignedIssue) -> bool {
    row.matched_iteration_id.is_none()
        && row.matched_cadence_title.is_none()
        && row.matched_start_date.is_none()
        && row.matched_due_date.is_none()
        && row.snapshot.iteration_title.is_none()
}

fn build_iteration_option_search_text(
    badge: Option<&str>,
    title: Option<&str>,
    label: &str,
    start_date: &str,
    due_date: &str,
    is_current: bool,
) -> String {
    let mut parts = vec![label.to_lowercase()];
    if let Some(badge) = badge {
        parts.push(badge.to_lowercase());
    }
    if let Some(title) = title {
        parts.push(title.to_lowercase());
    }
    if let Some(token) = format_iteration_search_token(start_date) {
        parts.push(token);
    }
    if let Some(token) = format_iteration_search_token(due_date) {
        parts.push(token);
    }
    parts.push(start_date.to_lowercase());
    parts.push(due_date.to_lowercase());
    if is_current {
        parts.push("current".to_string());
    }
    parts.join(" ")
}

fn format_iteration_search_token(value: &str) -> Option<String> {
    let date = parse_ymd_date(value)?;
    Some(format!(
        "{} {}",
        month_short_label(date.month()).to_lowercase(),
        date.day()
    ))
}

fn compare_assigned_issue_rows(
    left: &AssignedIssueSnapshot,
    right: &AssignedIssueSnapshot,
    today: NaiveDate,
) -> std::cmp::Ordering {
    let left_current = iteration_contains_today(
        left.iteration_start_date.as_deref(),
        left.iteration_due_date.as_deref(),
        today,
    );
    let right_current = iteration_contains_today(
        right.iteration_start_date.as_deref(),
        right.iteration_due_date.as_deref(),
        today,
    );

    right_current
        .cmp(&left_current)
        .then_with(|| right.iteration_start_date.cmp(&left.iteration_start_date))
        .then_with(|| left.title.cmp(&right.title))
        .then_with(|| left.key.cmp(&right.key))
}

fn matches_assigned_issue_search(row: &AssignedIssueSnapshot, search: Option<&str>) -> bool {
    let Some(search) = normalize_assigned_issue_search(search) else {
        return true;
    };
    let search = search.to_lowercase();
    [
        row.title.as_str(),
        row.key.as_str(),
        row.iteration_title.as_deref().unwrap_or_default(),
        row.milestone_title.as_deref().unwrap_or_default(),
    ]
    .into_iter()
    .any(|value| value.to_lowercase().contains(&search))
}

fn matches_assigned_issue_filters(
    row: &MatchedAssignedIssue,
    input: &AssignedIssuesQueryInput,
) -> bool {
    let iteration_filter = normalized_filter_value(input.iteration_id.as_deref());
    let year_filter = normalized_filter_value(input.year.as_deref());
    if iteration_filter.is_none() && year_filter.is_none() {
        return true;
    }

    if let Some(iteration_filter) = iteration_filter {
        if iteration_filter == "none" {
            if !is_unassigned_iteration_row(row) {
                return false;
            }
        } else {
            let Some(matched_iteration_id) = row.matched_iteration_id.as_deref() else {
                return false;
            };
            if matched_iteration_id != iteration_filter {
                return false;
            }
        }
    }

    if let Some(year_filter) = year_filter {
        let Some(matched_year) = row.matched_year.as_deref() else {
            return false;
        };
        if matched_year != year_filter {
            return false;
        }
    }
    true
}

fn collect_assigned_issue_suggestions(
    rows: &[AssignedIssueSnapshot],
    search: Option<&str>,
) -> Vec<AssignedIssueSuggestion> {
    let Some(search) = normalize_assigned_issue_search(search).map(str::to_lowercase) else {
        return vec![];
    };

    let mut suggestions: Vec<AssignedIssueSuggestion> = vec![];

    for row in rows {
        for candidate in [
            Some(row.title.as_str()),
            Some(row.key.as_str()),
            row.iteration_title.as_deref(),
            row.milestone_title.as_deref(),
        ]
        .into_iter()
        .flatten()
        {
            let lower = candidate.to_lowercase();
            if !lower.contains(&search) || suggestions.iter().any(|item| item.value == candidate) {
                continue;
            }
            suggestions.push(AssignedIssueSuggestion {
                value: candidate.to_string(),
                label: candidate.to_string(),
            });
            if suggestions.len() >= 8 {
                return suggestions;
            }
        }
    }

    suggestions
}

fn normalize_assigned_issue_search(search: Option<&str>) -> Option<&str> {
    search.map(str::trim).filter(|value| !value.is_empty())
}

fn normalized_filter_value(value: Option<&str>) -> Option<&str> {
    value
        .map(str::trim)
        .filter(|candidate| !candidate.is_empty() && *candidate != "all")
}

fn collect_assigned_issue_years(rows: &[MatchedAssignedIssue]) -> Vec<String> {
    let mut years = rows
        .iter()
        .filter_map(|row| row.matched_year.clone())
        .collect::<Vec<_>>();
    years.sort_by(|a, b| b.cmp(a));
    years.dedup();
    years
}

fn iteration_year_from_date(value: &str) -> Option<String> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .ok()
        .map(|date| date.year().to_string())
}

fn iteration_contains_today(
    start_date: Option<&str>,
    due_date: Option<&str>,
    today: NaiveDate,
) -> bool {
    let Some(start_date) = start_date.and_then(parse_ymd_date) else {
        return false;
    };
    let Some(due_date) = due_date.and_then(parse_ymd_date) else {
        return false;
    };
    start_date <= today && due_date >= today
}

fn parse_ymd_date(value: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d").ok()
}

fn compare_optional_dates_desc(
    left: &Option<String>,
    right: &Option<String>,
) -> std::cmp::Ordering {
    match (left, right) {
        (Some(left), Some(right)) => right.cmp(left),
        (Some(_), None) => std::cmp::Ordering::Less,
        (None, Some(_)) => std::cmp::Ordering::Greater,
        (None, None) => std::cmp::Ordering::Equal,
    }
}

fn build_assigned_issue_matches(
    rows: Vec<AssignedIssueSnapshot>,
    iteration_catalog: &[CachedIterationRecord],
    today: NaiveDate,
) -> Vec<MatchedAssignedIssue> {
    rows.into_iter()
        .map(|snapshot| {
            let matched_iteration = find_matching_iteration(&snapshot, iteration_catalog);
            let matched_cadence_title = snapshot.iteration_cadence_title.clone().or_else(|| {
                matched_iteration.and_then(|iteration| iteration.cadence_title.clone())
            });
            let matched_start_date = snapshot
                .iteration_start_date
                .clone()
                .or_else(|| matched_iteration.and_then(|iteration| iteration.start_date.clone()));
            let matched_due_date = snapshot
                .iteration_due_date
                .clone()
                .or_else(|| matched_iteration.and_then(|iteration| iteration.due_date.clone()));
            let matched_iteration_id = derive_matched_iteration_id(
                &snapshot,
                matched_iteration,
                matched_cadence_title.as_deref(),
                matched_start_date.as_deref(),
                matched_due_date.as_deref(),
            );
            let matched_year = matched_start_date
                .as_deref()
                .and_then(iteration_year_from_date)
                .or_else(|| {
                    matched_due_date
                        .as_deref()
                        .and_then(iteration_year_from_date)
                });
            let matched_is_current = iteration_contains_today(
                matched_start_date.as_deref(),
                matched_due_date.as_deref(),
                today,
            );

            MatchedAssignedIssue {
                snapshot,
                matched_iteration_id,
                matched_cadence_title,
                matched_year,
                matched_start_date,
                matched_due_date,
                matched_is_current,
            }
        })
        .collect()
}

fn derive_matched_iteration_id(
    snapshot: &AssignedIssueSnapshot,
    matched_iteration: Option<&CachedIterationRecord>,
    matched_cadence_title: Option<&str>,
    matched_start_date: Option<&str>,
    matched_due_date: Option<&str>,
) -> Option<String> {
    snapshot
        .iteration_gitlab_id
        .clone()
        .or_else(|| matched_iteration.map(|iteration| iteration.iteration_gitlab_id.clone()))
        .or_else(|| {
            build_synthetic_iteration_id(
                matched_cadence_title,
                snapshot.iteration_title.as_deref(),
                matched_start_date,
                matched_due_date,
            )
        })
}

fn build_synthetic_iteration_id(
    cadence_title: Option<&str>,
    iteration_title: Option<&str>,
    start_date: Option<&str>,
    due_date: Option<&str>,
) -> Option<String> {
    let (Some(start_date), Some(due_date)) = (start_date, due_date) else {
        return None;
    };
    let descriptor = cadence_title
        .or(iteration_title)
        .unwrap_or("iteration")
        .to_lowercase()
        .replace(' ', "-");
    Some(format!("synthetic:{descriptor}:{start_date}:{due_date}"))
}

fn find_matching_iteration<'a>(
    row: &AssignedIssueSnapshot,
    iteration_catalog: &'a [CachedIterationRecord],
) -> Option<&'a CachedIterationRecord> {
    if let Some(iteration_gitlab_id) = row.iteration_gitlab_id.as_deref() {
        return iteration_catalog
            .iter()
            .find(|iteration| iteration.iteration_gitlab_id == iteration_gitlab_id);
    }

    iteration_catalog.iter().find(|iteration| {
        row.iteration_title == iteration.title
            && row.iteration_start_date == iteration.start_date
            && row.iteration_due_date == iteration.due_date
            && (row.iteration_title.is_some()
                || row.iteration_start_date.is_some()
                || row.iteration_due_date.is_some())
    })
}

fn format_iteration_range_label(start_date: &str, due_date: &str) -> Option<String> {
    let start = parse_ymd_date(start_date)?;
    let due = parse_ymd_date(due_date)?;
    let start_month = month_short_label(start.month());
    let due_month = month_short_label(due.month());

    if start.year() == due.year() {
        if start.month() == due.month() {
            return Some(format!(
                "{start_month} {} - {}, {}",
                start.day(),
                due.day(),
                start.year()
            ));
        }

        return Some(format!(
            "{start_month} {} - {due_month} {}, {}",
            start.day(),
            due.day(),
            start.year()
        ));
    }

    Some(format!(
        "{start_month} {}, {} - {due_month} {}, {}",
        start.day(),
        start.year(),
        due.day(),
        due.year()
    ))
}

fn month_short_label(month: u32) -> &'static str {
    match month {
        1 => "Jan",
        2 => "Feb",
        3 => "Mar",
        4 => "Apr",
        5 => "May",
        6 => "Jun",
        7 => "Jul",
        8 => "Aug",
        9 => "Sep",
        10 => "Oct",
        11 => "Nov",
        _ => "Dec",
    }
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
    use crate::domain::models::AssignedIssuesQueryInput;

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
                    closed_at TEXT,
                    web_url TEXT,
                    labels_json TEXT,
                    raw_json TEXT,
                    updated_at TEXT,
                    issue_graphql_id TEXT,
                    milestone_title TEXT,
                    iteration_gitlab_id TEXT,
                    iteration_group_id TEXT,
                    iteration_cadence_id TEXT,
                    iteration_cadence_title TEXT,
                    iteration_title TEXT,
                    iteration_start_date TEXT,
                    iteration_due_date TEXT,
                    assigned_bucket TEXT,
                    from_assigned_sync INTEGER NOT NULL DEFAULT 0
                );
                CREATE TABLE iteration_catalog (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider_account_id INTEGER NOT NULL,
                    iteration_gitlab_id TEXT NOT NULL,
                    cadence_id TEXT,
                    cadence_title TEXT,
                    title TEXT,
                    start_date TEXT,
                    due_date TEXT,
                    state TEXT,
                    web_url TEXT,
                    group_id TEXT,
                    updated_at TEXT
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

    fn insert_assigned_issue(
        connection: &Connection,
        provider_item_id: &str,
        title: &str,
        state: &str,
        iteration_gitlab_id: Option<&str>,
        iteration_cadence_title: Option<&str>,
        iteration_title: Option<&str>,
        iteration_start_date: Option<&str>,
        iteration_due_date: Option<&str>,
        milestone_title: Option<&str>,
        from_assigned_sync: i64,
    ) {
        connection
            .execute(
                "INSERT INTO work_items (
                    provider_account_id,
                    provider_item_id,
                    title,
                    state,
                    closed_at,
                    web_url,
                    labels_json,
                    raw_json,
                    updated_at,
                    issue_graphql_id,
                    milestone_title,
                    iteration_gitlab_id,
                    iteration_group_id,
                    iteration_cadence_id,
                    iteration_cadence_title,
                    iteration_title,
                    iteration_start_date,
                    iteration_due_date,
                    assigned_bucket,
                    from_assigned_sync
                ) VALUES (?1, ?2, ?3, ?4, NULL, NULL, '[]', NULL, '2026-04-08T12:00:00Z', ?5, ?6, ?7, NULL, NULL, ?8, ?9, ?10, ?11, NULL, ?12)",
                params![
                    1_i64,
                    provider_item_id,
                    title,
                    state,
                    format!("gid://gitlab/Issue/{provider_item_id}"),
                    milestone_title,
                    iteration_gitlab_id,
                    iteration_cadence_title,
                    iteration_title,
                    iteration_start_date,
                    iteration_due_date,
                    from_assigned_sync,
                ],
            )
            .unwrap();
    }

    fn insert_iteration_catalog(
        connection: &Connection,
        iteration_gitlab_id: &str,
        cadence_title: Option<&str>,
        title: Option<&str>,
        start_date: Option<&str>,
        due_date: Option<&str>,
    ) {
        connection
            .execute(
                "INSERT INTO iteration_catalog (
                    provider_account_id,
                    iteration_gitlab_id,
                    cadence_id,
                    cadence_title,
                    title,
                    start_date,
                    due_date,
                    state,
                    web_url,
                    group_id,
                    updated_at
                ) VALUES (?1, ?2, NULL, ?3, ?4, ?5, ?6, 'opened', NULL, NULL, '2026-04-08T12:00:00Z')",
                params![1_i64, iteration_gitlab_id, cadence_title, title, start_date, due_date],
            )
            .unwrap();
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

    #[test]
    fn assigned_issues_cache_query_filters_open_closed_and_all_statuses() {
        let connection = setup_empty_connection();
        insert_iteration_catalog(
            &connection,
            "iter-web-current",
            Some("WEB"),
            None,
            Some("2026-04-06"),
            Some("2026-04-19"),
        );
        insert_assigned_issue(
            &connection,
            "group/project#1",
            "Open issue",
            "opened",
            Some("iter-web-current"),
            Some("WEB"),
            Some("WEB Current"),
            Some("2026-04-06"),
            Some("2026-04-19"),
            None,
            1,
        );
        insert_assigned_issue(
            &connection,
            "group/project#2",
            "Closed issue",
            "closed",
            Some("iter-web-current"),
            Some("WEB"),
            Some("WEB Current"),
            Some("2026-04-06"),
            Some("2026-04-19"),
            None,
            1,
        );

        let open_page = load_assigned_issues_page_from_cache(
            &connection,
            1,
            &AssignedIssuesQueryInput {
                cursor: None,
                page: 1,
                page_size: 20,
                status: "opened".to_string(),
                year: None,
                iteration_id: None,
                search: None,
            },
            NaiveDate::from_ymd_opt(2026, 4, 8).unwrap(),
        )
        .unwrap();
        assert_eq!(open_page.items.len(), 1);
        assert_eq!(open_page.items[0].title, "Open issue");

        let closed_page = load_assigned_issues_page_from_cache(
            &connection,
            1,
            &AssignedIssuesQueryInput {
                cursor: None,
                page: 1,
                page_size: 20,
                status: "closed".to_string(),
                year: None,
                iteration_id: None,
                search: None,
            },
            NaiveDate::from_ymd_opt(2026, 4, 8).unwrap(),
        )
        .unwrap();
        assert_eq!(closed_page.items.len(), 1);
        assert_eq!(closed_page.items[0].title, "Closed issue");

        let all_page = load_assigned_issues_page_from_cache(
            &connection,
            1,
            &AssignedIssuesQueryInput {
                cursor: None,
                page: 1,
                page_size: 20,
                status: "all".to_string(),
                year: None,
                iteration_id: None,
                search: None,
            },
            NaiveDate::from_ymd_opt(2026, 4, 8).unwrap(),
        )
        .unwrap();
        assert_eq!(all_page.items.len(), 2);
    }

    #[test]
    fn assigned_issues_cache_query_filters_and_builds_catalogs() {
        let connection = setup_empty_connection();
        insert_iteration_catalog(
            &connection,
            "iter-web-current",
            Some("WEB"),
            None,
            Some("2026-04-06"),
            Some("2026-04-19"),
        );
        insert_iteration_catalog(
            &connection,
            "iter-web-older",
            Some("WEB"),
            None,
            Some("2025-03-10"),
            Some("2025-03-23"),
        );
        insert_assigned_issue(
            &connection,
            "group/project#1",
            "Current iteration issue",
            "opened",
            Some("iter-web-current"),
            Some("WEB"),
            Some("WEB Current"),
            Some("2026-04-06"),
            Some("2026-04-19"),
            Some("Milestone A"),
            1,
        );
        insert_assigned_issue(
            &connection,
            "group/project#2",
            "Older iteration issue",
            "opened",
            Some("iter-web-older"),
            Some("WEB"),
            Some("WEB Older"),
            Some("2025-03-10"),
            Some("2025-03-23"),
            None,
            1,
        );
        insert_assigned_issue(
            &connection,
            "group/project#3",
            "Closed issue",
            "closed",
            Some("iter-web-closed"),
            Some("WEB"),
            Some("WEB Closed"),
            Some("2026-01-01"),
            Some("2026-01-14"),
            None,
            1,
        );
        insert_assigned_issue(
            &connection,
            "group/project#4",
            "Unassigned issue",
            "opened",
            Some("iter-web-hidden"),
            Some("WEB"),
            Some("WEB Hidden"),
            Some("2026-01-01"),
            Some("2026-01-14"),
            None,
            0,
        );

        let page = load_assigned_issues_page_from_cache(
            &connection,
            1,
            &AssignedIssuesQueryInput {
                cursor: None,
                page: 1,
                page_size: 20,
                status: "opened".to_string(),
                year: None,
                iteration_id: None,
                search: None,
            },
            NaiveDate::from_ymd_opt(2026, 4, 8).unwrap(),
        )
        .unwrap();

        assert_eq!(page.items.len(), 2);
        assert_eq!(page.years, vec!["2026".to_string(), "2025".to_string()]);
        assert_eq!(page.iteration_options.len(), 2);
        assert_eq!(page.iteration_options[0].badge.as_deref(), Some("WEB"));
        assert_eq!(page.iteration_options[0].label, "WEB · Apr 6 - 19, 2026");
        assert_eq!(page.iteration_options[0].year.as_deref(), Some("2026"));
        assert!(page.iteration_options[0].is_current);
        assert_eq!(page.page, 1);
        assert_eq!(page.page_size, 20);
        assert_eq!(page.total_items, 2);
        assert_eq!(page.total_pages, 1);
    }

    #[test]
    fn assigned_issues_cache_query_supports_year_iteration_search_and_pagination() {
        let connection = setup_empty_connection();
        insert_iteration_catalog(
            &connection,
            "iter-web-current",
            Some("WEB"),
            None,
            Some("2026-04-06"),
            Some("2026-04-19"),
        );
        insert_iteration_catalog(
            &connection,
            "iter-web-older",
            Some("WEB"),
            None,
            Some("2025-03-10"),
            Some("2025-03-23"),
        );
        insert_assigned_issue(
            &connection,
            "group/project#1",
            "Alpha current",
            "opened",
            Some("iter-web-current"),
            Some("WEB"),
            Some("WEB Current"),
            Some("2026-04-06"),
            Some("2026-04-19"),
            Some("Milestone A"),
            1,
        );
        insert_assigned_issue(
            &connection,
            "group/project#2",
            "Beta current",
            "opened",
            Some("iter-web-current"),
            Some("WEB"),
            Some("WEB Current"),
            Some("2026-04-06"),
            Some("2026-04-19"),
            Some("Milestone B"),
            1,
        );
        insert_assigned_issue(
            &connection,
            "group/project#3",
            "Gamma older",
            "opened",
            Some("iter-web-older"),
            Some("WEB"),
            Some("WEB Older"),
            Some("2025-03-10"),
            Some("2025-03-23"),
            Some("Milestone C"),
            1,
        );

        let search_page = load_assigned_issues_page_from_cache(
            &connection,
            1,
            &AssignedIssuesQueryInput {
                cursor: None,
                page: 1,
                page_size: 20,
                status: "opened".to_string(),
                year: None,
                iteration_id: None,
                search: Some("Milestone B".to_string()),
            },
            NaiveDate::from_ymd_opt(2026, 4, 8).unwrap(),
        )
        .unwrap();
        assert_eq!(search_page.items.len(), 1);
        assert_eq!(search_page.items[0].title, "Beta current");

        let year_page = load_assigned_issues_page_from_cache(
            &connection,
            1,
            &AssignedIssuesQueryInput {
                cursor: None,
                page: 1,
                page_size: 20,
                status: "opened".to_string(),
                year: Some("2025".to_string()),
                iteration_id: None,
                search: None,
            },
            NaiveDate::from_ymd_opt(2026, 4, 8).unwrap(),
        )
        .unwrap();
        assert_eq!(year_page.items.len(), 1);
        assert_eq!(year_page.items[0].title, "Gamma older");

        let first_page = load_assigned_issues_page_from_cache(
            &connection,
            1,
            &AssignedIssuesQueryInput {
                cursor: None,
                page: 1,
                page_size: 1,
                status: "opened".to_string(),
                year: None,
                iteration_id: Some("iter-web-current".to_string()),
                search: None,
            },
            NaiveDate::from_ymd_opt(2026, 4, 8).unwrap(),
        )
        .unwrap();
        assert_eq!(first_page.items.len(), 1);
        assert_eq!(first_page.page, 1);
        assert_eq!(first_page.page_size, 1);
        assert_eq!(first_page.total_items, 2);
        assert_eq!(first_page.total_pages, 2);

        let second_page = load_assigned_issues_page_from_cache(
            &connection,
            1,
            &AssignedIssuesQueryInput {
                cursor: None,
                page: 2,
                page_size: 1,
                status: "opened".to_string(),
                year: None,
                iteration_id: Some("iter-web-current".to_string()),
                search: None,
            },
            NaiveDate::from_ymd_opt(2026, 4, 8).unwrap(),
        )
        .unwrap();
        assert_eq!(second_page.items.len(), 1);
        assert_eq!(second_page.page, 2);
    }

    #[test]
    fn assigned_issues_cache_query_uses_due_date_year_fallback_and_keeps_partial_iterations() {
        let connection = setup_empty_connection();
        insert_iteration_catalog(
            &connection,
            "iter-release-2025",
            Some("WEB"),
            Some("Release Train"),
            None,
            Some("2025-08-10"),
        );
        insert_assigned_issue(
            &connection,
            "group/project#1",
            "Due date fallback year",
            "opened",
            Some("iter-release-2025"),
            Some("WEB"),
            Some("Release Train"),
            None,
            Some("2025-08-10"),
            None,
            1,
        );
        insert_assigned_issue(
            &connection,
            "group/project#2",
            "Undated iteration",
            "opened",
            None,
            None,
            Some("Backlog Sweep"),
            None,
            None,
            None,
            1,
        );

        let all_page = load_assigned_issues_page_from_cache(
            &connection,
            1,
            &AssignedIssuesQueryInput {
                cursor: None,
                page: 1,
                page_size: 20,
                status: "opened".to_string(),
                year: None,
                iteration_id: None,
                search: None,
            },
            NaiveDate::from_ymd_opt(2026, 4, 8).unwrap(),
        )
        .unwrap();

        assert_eq!(all_page.years, vec!["2025".to_string()]);
        assert_eq!(all_page.iteration_options.len(), 0);
        assert_eq!(all_page.items.len(), 2);

        let filtered_page = load_assigned_issues_page_from_cache(
            &connection,
            1,
            &AssignedIssuesQueryInput {
                cursor: None,
                page: 1,
                page_size: 20,
                status: "opened".to_string(),
                year: Some("2025".to_string()),
                iteration_id: None,
                search: None,
            },
            NaiveDate::from_ymd_opt(2026, 4, 8).unwrap(),
        )
        .unwrap();

        assert_eq!(filtered_page.items.len(), 1);
        assert_eq!(filtered_page.items[0].title, "Due date fallback year");
    }

    #[test]
    fn assigned_issues_cache_query_builds_iteration_options_from_dates_when_title_is_missing() {
        let connection = setup_empty_connection();
        insert_iteration_catalog(
            &connection,
            "iter-web-current",
            Some("WEB"),
            None,
            Some("2026-04-06"),
            Some("2026-04-19"),
        );
        insert_assigned_issue(
            &connection,
            "sixbell/componentes/web/frontend#42",
            "Dated iteration without title",
            "opened",
            Some("iter-web-current"),
            Some("WEB"),
            None,
            Some("2026-04-06"),
            Some("2026-04-19"),
            None,
            1,
        );

        let page = load_assigned_issues_page_from_cache(
            &connection,
            1,
            &AssignedIssuesQueryInput {
                cursor: None,
                page: 1,
                page_size: 20,
                status: "opened".to_string(),
                year: None,
                iteration_id: None,
                search: None,
            },
            NaiveDate::from_ymd_opt(2026, 4, 8).unwrap(),
        )
        .unwrap();

        assert_eq!(page.iteration_options.len(), 1);
        assert_eq!(page.iteration_options[0].badge.as_deref(), Some("WEB"));
        assert_eq!(page.iteration_options[0].label, "WEB · Apr 6 - 19, 2026");
        assert_eq!(page.iteration_options[0].year.as_deref(), Some("2026"));
    }

    #[test]
    fn assigned_issues_cache_query_uses_issue_iteration_metadata_when_catalog_cadence_is_missing() {
        let connection = setup_empty_connection();
        insert_iteration_catalog(
            &connection,
            "iter-web-current",
            None,
            None,
            Some("2026-04-06"),
            Some("2026-04-19"),
        );
        insert_iteration_catalog(
            &connection,
            "iter-web-next",
            None,
            None,
            Some("2026-04-20"),
            Some("2026-05-03"),
        );
        insert_assigned_issue(
            &connection,
            "sixbell/componentes/web/frontend#42",
            "WEB current",
            "opened",
            Some("iter-web-current"),
            Some("WEB"),
            None,
            Some("2026-04-06"),
            Some("2026-04-19"),
            None,
            1,
        );
        insert_assigned_issue(
            &connection,
            "sixbell/componentes/web/frontend#43",
            "WEB next",
            "opened",
            Some("iter-web-next"),
            Some("WEB"),
            None,
            Some("2026-04-20"),
            Some("2026-05-03"),
            None,
            1,
        );

        let page = load_assigned_issues_page_from_cache(
            &connection,
            1,
            &AssignedIssuesQueryInput {
                cursor: None,
                page: 1,
                page_size: 20,
                status: "opened".to_string(),
                year: None,
                iteration_id: None,
                search: None,
            },
            NaiveDate::from_ymd_opt(2026, 4, 8).unwrap(),
        )
        .unwrap();

        assert_eq!(page.iteration_options.len(), 2);
        assert!(page
            .iteration_options
            .iter()
            .all(|option| option.badge.as_deref() == Some("WEB")));
        assert_eq!(page.items.len(), 2);
    }

    #[test]
    fn assigned_issues_cache_query_builds_code_catalog_and_grouped_weeks() {
        let connection = setup_empty_connection();
        insert_iteration_catalog(
            &connection,
            "iter-web-current",
            Some("WEB"),
            None,
            Some("2026-04-06"),
            Some("2026-04-19"),
        );
        insert_iteration_catalog(
            &connection,
            "iter-web-next",
            Some("WEB"),
            None,
            Some("2026-04-20"),
            Some("2026-05-03"),
        );
        insert_iteration_catalog(
            &connection,
            "iter-ccp-current",
            Some("CCP"),
            None,
            Some("2026-04-06"),
            Some("2026-04-19"),
        );
        insert_assigned_issue(
            &connection,
            "sixbell/componentes/web/frontend#42",
            "WEB current",
            "opened",
            Some("iter-web-current"),
            Some("WEB"),
            Some("WEB current iteration"),
            Some("2026-04-06"),
            Some("2026-04-19"),
            None,
            1,
        );
        insert_assigned_issue(
            &connection,
            "sixbell/componentes/web/frontend#43",
            "WEB next",
            "opened",
            Some("iter-web-next"),
            Some("WEB"),
            Some("WEB next iteration"),
            Some("2026-04-20"),
            Some("2026-05-03"),
            None,
            1,
        );
        insert_assigned_issue(
            &connection,
            "sixbell/componentes/ccp/frontend#15",
            "CCP current",
            "opened",
            Some("iter-ccp-current"),
            Some("CCP"),
            None,
            Some("2026-04-06"),
            Some("2026-04-19"),
            None,
            1,
        );

        let page = load_assigned_issues_page_from_cache(
            &connection,
            1,
            &AssignedIssuesQueryInput {
                cursor: None,
                page: 1,
                page_size: 20,
                status: "opened".to_string(),
                year: None,
                iteration_id: None,
                search: None,
            },
            NaiveDate::from_ymd_opt(2026, 4, 8).unwrap(),
        )
        .unwrap();

        assert_eq!(page.iteration_options.len(), 3);
        assert_eq!(page.iteration_options[0].badge.as_deref(), Some("WEB"));
        assert_eq!(page.iteration_options[1].badge.as_deref(), Some("WEB"));
        assert_eq!(page.iteration_options[2].badge.as_deref(), Some("CCP"));
    }

    #[test]
    fn assigned_issues_cache_query_filters_by_iteration_id() {
        let connection = setup_empty_connection();
        insert_iteration_catalog(
            &connection,
            "iter-web-current",
            Some("WEB"),
            None,
            Some("2026-04-06"),
            Some("2026-04-19"),
        );
        insert_iteration_catalog(
            &connection,
            "iter-ccp-current",
            Some("CCP"),
            None,
            Some("2026-04-06"),
            Some("2026-04-19"),
        );
        insert_assigned_issue(
            &connection,
            "sixbell/componentes/web/frontend#42",
            "WEB dated",
            "opened",
            Some("iter-web-current"),
            Some("WEB"),
            Some("WEB current iteration"),
            Some("2026-04-06"),
            Some("2026-04-19"),
            None,
            1,
        );
        insert_assigned_issue(
            &connection,
            "sixbell/componentes/web/frontend#43",
            "WEB undated",
            "opened",
            None,
            None,
            None,
            None,
            None,
            None,
            1,
        );
        insert_assigned_issue(
            &connection,
            "sixbell/componentes/ccp/frontend#15",
            "CCP dated",
            "opened",
            Some("iter-ccp-current"),
            Some("CCP"),
            None,
            Some("2026-04-06"),
            Some("2026-04-19"),
            None,
            1,
        );

        let page = load_assigned_issues_page_from_cache(
            &connection,
            1,
            &AssignedIssuesQueryInput {
                cursor: None,
                page: 1,
                page_size: 20,
                status: "opened".to_string(),
                year: None,
                iteration_id: Some("iter-web-current".to_string()),
                search: None,
            },
            NaiveDate::from_ymd_opt(2026, 4, 8).unwrap(),
        )
        .unwrap();

        assert_eq!(page.items.len(), 1);
        assert!(page.items.iter().all(|item| item.key.contains("/web/")));
        assert_eq!(page.iteration_options.len(), 3);
    }

    #[test]
    fn assigned_issues_cache_query_uses_real_cadence_not_project_path_tokens() {
        let connection = setup_empty_connection();
        insert_iteration_catalog(
            &connection,
            "iter-web-current",
            Some("WEB"),
            None,
            Some("2026-04-06"),
            Some("2026-04-19"),
        );
        insert_assigned_issue(
            &connection,
            "sixbell/productos/irp/web/integration#15",
            "IRP path but WEB cadence",
            "opened",
            Some("iter-web-current"),
            Some("WEB"),
            None,
            Some("2026-04-06"),
            Some("2026-04-19"),
            None,
            1,
        );

        let page = load_assigned_issues_page_from_cache(
            &connection,
            1,
            &AssignedIssuesQueryInput {
                cursor: None,
                page: 1,
                page_size: 20,
                status: "opened".to_string(),
                year: None,
                iteration_id: None,
                search: None,
            },
            NaiveDate::from_ymd_opt(2026, 4, 8).unwrap(),
        )
        .unwrap();

        assert_eq!(page.items.len(), 1);
        assert!(page
            .iteration_options
            .iter()
            .all(|option| option.badge.as_deref() != Some("IRP")));
        assert_eq!(page.iteration_options[0].badge.as_deref(), Some("WEB"));
    }

    #[test]
    fn assigned_issues_cache_query_builds_grouped_iteration_options_with_search_text() {
        let connection = setup_empty_connection();
        insert_iteration_catalog(
            &connection,
            "iter-web-current",
            Some("WEB"),
            Some("WEB current iteration"),
            Some("2026-04-07"),
            Some("2026-04-20"),
        );
        insert_iteration_catalog(
            &connection,
            "iter-ccp-current",
            Some("CCP"),
            Some("CCP current iteration"),
            Some("2026-04-07"),
            Some("2026-04-20"),
        );
        insert_assigned_issue(
            &connection,
            "group/project#1",
            "WEB current issue",
            "opened",
            Some("iter-web-current"),
            Some("WEB"),
            Some("WEB current iteration"),
            Some("2026-04-07"),
            Some("2026-04-20"),
            None,
            1,
        );
        insert_assigned_issue(
            &connection,
            "group/project#2",
            "CCP current issue",
            "opened",
            Some("iter-ccp-current"),
            Some("CCP"),
            Some("CCP current iteration"),
            Some("2026-04-07"),
            Some("2026-04-20"),
            None,
            1,
        );

        let page = load_assigned_issues_page_from_cache(
            &connection,
            1,
            &AssignedIssuesQueryInput {
                cursor: None,
                page: 1,
                page_size: 20,
                status: "opened".to_string(),
                year: None,
                iteration_id: None,
                search: None,
            },
            NaiveDate::from_ymd_opt(2026, 4, 8).unwrap(),
        )
        .unwrap();

        assert_eq!(page.iteration_options.len(), 2);
        let web_option = page
            .iteration_options
            .iter()
            .find(|option| option.badge.as_deref() == Some("WEB"))
            .unwrap();
        assert_eq!(web_option.label, "WEB · Apr 7 - 20, 2026");
        assert!(web_option.search_text.contains("web"));
        assert!(web_option.search_text.contains("apr 7"));
        assert!(web_option.search_text.contains("2026-04-07"));
        assert!(web_option.search_text.contains("current"));
        assert!(page
            .iteration_options
            .iter()
            .all(|option| option.is_current));
    }

    #[test]
    fn assigned_issues_cache_query_adds_no_iteration_option_only_when_needed() {
        let connection = setup_empty_connection();
        insert_assigned_issue(
            &connection,
            "group/project#1",
            "No iteration issue",
            "opened",
            None,
            None,
            None,
            None,
            None,
            None,
            1,
        );

        let page = load_assigned_issues_page_from_cache(
            &connection,
            1,
            &AssignedIssuesQueryInput {
                cursor: None,
                page: 1,
                page_size: 20,
                status: "opened".to_string(),
                year: None,
                iteration_id: None,
                search: None,
            },
            NaiveDate::from_ymd_opt(2026, 4, 8).unwrap(),
        )
        .unwrap();

        assert_eq!(page.iteration_options.len(), 1);
        assert_eq!(page.iteration_options[0].id, "none");
        assert_eq!(page.iteration_options[0].label, "No iteration");
        assert!(page.iteration_options[0]
            .search_text
            .contains("no iteration"));
    }
}
