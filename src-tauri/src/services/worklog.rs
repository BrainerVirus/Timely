use chrono::{Datelike, Duration, Local, NaiveDate};
use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    domain::models::{
        AuditFlag, DayOverview, IssueBreakdown, MonthSnapshot, WorklogQueryInput, WorklogRangeMeta,
        WorklogSnapshot,
    },
    error::AppError,
    services::{preferences, shared},
    state::AppState,
    support::holidays,
};

const DEFAULT_PROVIDER_TONE: &str = "cyan";

pub fn load_worklog_snapshot(
    state: &AppState,
    input: WorklogQueryInput,
) -> Result<WorklogSnapshot, AppError> {
    let connection = shared::open_connection(state)?;
    let primary = shared::load_primary_gitlab_connection(&connection)?;
    let app_preferences = preferences::load_app_preferences(&connection)?;
    let schedule = load_schedule_profile(&connection)?;
    let anchor = parse_date(&input.anchor_date)?;

    let (range_start, range_end, label) = match input.mode.as_str() {
        "day" => (anchor, anchor, anchor.format("%A, %b %d").to_string()),
        "week" => {
            let start = start_of_week(anchor);
            let end = start + Duration::days(6);
            (start, end, format!("Week of {}", start.format("%b %d")))
        }
        "month" => {
            let start = anchor.with_day(1).unwrap_or(anchor);
            let end = next_month_start(start) - Duration::days(1);
            (start, end, start.format("%B %Y").to_string())
        }
        "range" => {
            let end = input
                .end_date
                .as_deref()
                .map(parse_date)
                .transpose()?
                .unwrap_or(anchor);
            let start = if anchor <= end { anchor } else { end };
            let normalized_end = if anchor <= end { end } else { anchor };
            (
                start,
                normalized_end,
                format!(
                    "{} - {}",
                    start.format("%b %d"),
                    normalized_end.format("%b %d")
                ),
            )
        }
        _ => return Err(AppError::GitLabApi("Invalid worklog mode".to_string())),
    };

    let days = load_range_days(
        &connection,
        primary.id,
        range_start,
        range_end,
        schedule.hours_per_day,
        &schedule.workdays,
        app_preferences.holiday_country_code.as_deref(),
        app_preferences.holiday_region_code.as_deref(),
    )?;
    let selected_day = find_selected_day(&days, anchor).unwrap_or_else(|| empty_day(anchor));
    let month = build_range_month_snapshot(&days, schedule.hours_per_day, range_start, range_end);
    let audit_flags = build_review_flags(&days);

    Ok(WorklogSnapshot {
        mode: input.mode,
        range: WorklogRangeMeta {
            start_date: range_start.format("%Y-%m-%d").to_string(),
            end_date: range_end.format("%Y-%m-%d").to_string(),
            label,
        },
        selected_day,
        days,
        month,
        audit_flags,
    })
}

#[derive(Clone)]
struct ScheduleProfileData {
    hours_per_day: f32,
    workdays: Vec<String>,
}

fn load_schedule_profile(connection: &Connection) -> Result<ScheduleProfileData, AppError> {
    let schedule = connection
        .query_row(
            "SELECT hours_per_day, workdays_json FROM schedule_profiles WHERE is_default = 1 LIMIT 1",
            [],
            |row| {
                let workdays_json: String = row.get(1)?;
                Ok(ScheduleProfileData {
                    hours_per_day: row.get(0)?,
                    workdays: serde_json::from_str::<Vec<String>>(&workdays_json).unwrap_or_else(|_| {
                        vec![
                            "Mon".to_string(),
                            "Tue".to_string(),
                            "Wed".to_string(),
                            "Thu".to_string(),
                            "Fri".to_string(),
                        ]
                    }),
                })
            },
        )
        .optional()?;

    Ok(schedule.unwrap_or(ScheduleProfileData {
        hours_per_day: 8.0,
        workdays: vec![
            "Mon".to_string(),
            "Tue".to_string(),
            "Wed".to_string(),
            "Thu".to_string(),
            "Fri".to_string(),
        ],
    }))
}

#[allow(clippy::too_many_arguments)]
fn load_range_days(
    connection: &Connection,
    provider_account_id: i64,
    start: NaiveDate,
    end: NaiveDate,
    hours_per_day: f32,
    configured_workdays: &[String],
    holiday_country_code: Option<&str>,
    holiday_region_code: Option<&str>,
) -> Result<Vec<DayOverview>, AppError> {
    let mut days = Vec::new();
    let today = Local::now().date_naive();
    let mut current = start;

    while current <= end {
        days.push(load_day_overview(
            connection,
            provider_account_id,
            current,
            current == today,
            hours_per_day,
            configured_workdays,
            holiday_country_code,
            holiday_region_code,
        )?);
        current += Duration::days(1);
    }

    Ok(days)
}

#[allow(clippy::too_many_arguments)]
fn load_day_overview(
    connection: &Connection,
    provider_account_id: i64,
    date: NaiveDate,
    is_today: bool,
    hours_per_day: f32,
    configured_workdays: &[String],
    holiday_country_code: Option<&str>,
    holiday_region_code: Option<&str>,
) -> Result<DayOverview, AppError> {
    let holiday = holidays::holiday_for_date(date, holiday_country_code, holiday_region_code);
    let is_non_workday = !configured_workdays
        .iter()
        .any(|day| day == &date.format("%a").to_string());
    let default_target_seconds = if is_non_workday || holiday.is_some() {
        0
    } else {
        (hours_per_day * 3600.0) as i64
    };

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

    if is_non_workday || holiday.is_some() {
        target_seconds = 0;
        if logged_seconds == 0 {
            status = "non_workday".to_string();
        } else if holiday.is_some() {
            status = "over_target".to_string();
        }
    }

    if date < Local::now().date_naive() && status == "on_track" {
        status = "under_target".to_string();
    }

    let top_issues = load_issue_breakdown(connection, provider_account_id, date)?;
    let focus_hours = top_issues
        .iter()
        .take(2)
        .map(|issue| issue.hours)
        .sum::<f32>();
    let date_label = if let Some(holiday) = holiday {
        format!(
            "{} {} · {}",
            date.format("%a"),
            date.format("%d"),
            holiday.name
        )
    } else {
        date.format("%a %d").to_string()
    };

    Ok(DayOverview {
        short_label: date.format("%a").to_string(),
        date_label,
        is_today,
        logged_hours: seconds_to_hours(logged_seconds),
        target_hours: seconds_to_hours(target_seconds),
        focus_hours,
        overflow_hours: seconds_to_hours(variance_seconds.max(0)),
        status,
        top_issues,
    })
}

fn load_issue_breakdown(
    connection: &Connection,
    provider_account_id: i64,
    date: NaiveDate,
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

fn build_range_month_snapshot(
    days: &[DayOverview],
    hours_per_day: f32,
    range_start: NaiveDate,
    range_end: NaiveDate,
) -> MonthSnapshot {
    let logged_hours = days.iter().map(|day| day.logged_hours).sum::<f32>();
    let target_hours = days.iter().map(|day| day.target_hours).sum::<f32>();
    let clean_days = days
        .iter()
        .filter(|day| matches!(day.status.as_str(), "met_target" | "on_track"))
        .count() as u8;
    let overflow_days = days
        .iter()
        .filter(|day| day.status == "over_target")
        .count() as u8;
    let consistency_score = if target_hours > 0.0 {
        ((logged_hours / target_hours).min(1.0) * 100.0).round() as u8
    } else if range_start == range_end {
        ((logged_hours / hours_per_day.max(1.0)).min(1.0) * 100.0).round() as u8
    } else {
        0
    };

    MonthSnapshot {
        logged_hours,
        target_hours,
        consistency_score,
        clean_days,
        overflow_days,
    }
}

fn build_review_flags(days: &[DayOverview]) -> Vec<AuditFlag> {
    let mut flags = Vec::new();

    for day in days {
        if day.status == "under_target" {
            flags.push(AuditFlag {
                title: format!("{} closed under target", day.date_label),
                severity: "high".to_string(),
                detail: "This day ended below the configured target hours.".to_string(),
            });
        }

        if day.status == "over_target" && day.target_hours == 0.0 {
            flags.push(AuditFlag {
                title: format!("{} logged time on a holiday or non-workday", day.date_label),
                severity: "medium".to_string(),
                detail: "Review entries posted on weekends or configured holidays.".to_string(),
            });
        } else if day.status == "over_target" {
            flags.push(AuditFlag {
                title: format!("{} exceeded target", day.date_label),
                severity: "medium".to_string(),
                detail: "Check for overflow, duplicates, or unusually long entries.".to_string(),
            });
        }
    }

    flags
}

fn find_selected_day(days: &[DayOverview], anchor: NaiveDate) -> Option<DayOverview> {
    let anchor_label = anchor.format("%a %d").to_string();
    days.iter()
        .find(|day| day.date_label.starts_with(&anchor_label))
        .cloned()
        .or_else(|| days.iter().find(|day| day.is_today).cloned())
}

fn empty_day(date: NaiveDate) -> DayOverview {
    DayOverview {
        short_label: date.format("%a").to_string(),
        date_label: date.format("%a %d").to_string(),
        is_today: false,
        logged_hours: 0.0,
        target_hours: 0.0,
        focus_hours: 0.0,
        overflow_hours: 0.0,
        status: "empty".to_string(),
        top_issues: vec![],
    }
}

fn parse_issue_tone(json: &str) -> Option<String> {
    serde_json::from_str::<Vec<String>>(json)
        .ok()?
        .into_iter()
        .find(|label| ["emerald", "amber", "cyan", "rose", "violet"].contains(&label.as_str()))
}

fn parse_date(value: &str) -> Result<NaiveDate, AppError> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map_err(|_| AppError::GitLabApi(format!("Invalid date value: {value}")))
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

fn seconds_to_hours(value: i64) -> f32 {
    value as f32 / 3600.0
}

#[cfg(test)]
mod tests {
    use std::{env, path::PathBuf};

    use chrono::NaiveDate;

    use crate::{db, domain::models::WorklogQueryInput, state::AppState};

    use super::load_worklog_snapshot;

    #[test]
    fn loads_week_worklog_snapshot() {
        let mut path = env::temp_dir();
        path.push(format!(
            "pulseboard-worklog-test-{}.sqlite3",
            std::process::id()
        ));
        let _ = std::fs::remove_file(&path);

        let connection = rusqlite::Connection::open(&path).unwrap();
        db::migrate(&connection).unwrap();
        db::seed::ensure_seed_data(&connection, &NaiveDate::from_ymd_opt(2026, 3, 6).unwrap())
            .unwrap();
        drop(connection);

        let state = AppState::new(PathBuf::from(&path));
        let snapshot = load_worklog_snapshot(
            &state,
            WorklogQueryInput {
                mode: "week".to_string(),
                anchor_date: "2026-03-06".to_string(),
                end_date: None,
            },
        )
        .unwrap();

        assert_eq!(snapshot.mode, "week");
        assert!(!snapshot.days.is_empty());

        let _ = std::fs::remove_file(path);
    }
}
