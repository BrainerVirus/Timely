use std::{fs::OpenOptions, io::Write};

use chrono::{Datelike, Duration, Local, NaiveDate};
use rusqlite::{params, params_from_iter, Connection, OptionalExtension};
use serde_json::{json, Value};

use crate::{
    db::bootstrap,
    domain::models::{
        AuditFlag, DayOverview, IssueBreakdown, MonthSnapshot, WeekdaySchedule, WorklogQueryInput,
        WorklogRangeMeta, WorklogSnapshot,
    },
    error::AppError,
    services::{localization, preferences, shared},
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
    let provider_ids = shared::load_active_provider_connections(&connection)?
        .into_iter()
        .map(|connection| connection.id)
        .collect::<Vec<_>>();
    let app_preferences = preferences::load_app_preferences(&connection)?;
    let locale = localization::AppLocale::from_language_pref(&app_preferences.language);
    let schedule = load_schedule_profile(&connection)?;
    let anchor = parse_date(&input.anchor_date)?;

    let (range_start, range_end, label) = match input.mode.as_str() {
        "day" => (
            anchor,
            anchor,
            localization::format_day_heading(anchor, locale),
        ),
        "week" => {
            let start = start_of_week(
                anchor,
                week_start_to_index(schedule.week_start.as_deref(), &schedule.timezone),
            );
            let end = start + Duration::days(6);
            (start, end, localization::format_week_label(start, locale))
        }
        "month" => {
            let start = anchor.with_day(1).unwrap_or(anchor);
            let end = next_month_start(start) - Duration::days(1);
            (start, end, localization::format_month_label(start, locale))
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
                localization::format_range_label(start, normalized_end, locale),
            )
        }
        _ => return Err(AppError::ProviderApi("Invalid worklog mode".to_string())),
    };
    // #region agent log
    debug_log(
        "run2",
        "H6,H7,H9,H10",
        "src-tauri/src/services/worklog.rs:load_worklog_snapshot",
        "Worklog read selected provider account",
        json!({
            "selectedProviderAccountId": primary.id,
            "selectedProvider": primary.provider,
            "selectedHost": primary.host,
            "readProviderAccountIds": &provider_ids,
            "mode": input.mode.as_str(),
            "rangeStart": range_start.format("%Y-%m-%d").to_string(),
            "rangeEnd": range_end.format("%Y-%m-%d").to_string(),
            "timeEntriesByProvider": time_entries_debug_summary(&connection, range_start, range_end),
        }),
    );
    // #endregion

    let days = load_range_days(
        &connection,
        &provider_ids,
        range_start,
        range_end,
        &schedule.weekday_schedules,
        app_preferences.holiday_country_code.as_deref(),
        locale,
    )?;
    let selected_day =
        find_selected_day(&days, anchor).unwrap_or_else(|| empty_day(anchor, locale));
    let month = build_range_month_snapshot(&days, range_start, range_end);
    let audit_flags = build_review_flags(&days, locale);

    let snapshot = WorklogSnapshot {
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
    };
    // #region agent log
    debug_log(
        "post-fix",
        "H6,H7,H9,H10",
        "src-tauri/src/services/worklog.rs:load_worklog_snapshot",
        "Worklog snapshot returned issue keys",
        json!({
            "mode": snapshot.mode.as_str(),
            "rangeStart": snapshot.range.start_date.as_str(),
            "rangeEnd": snapshot.range.end_date.as_str(),
            "selectedDayLoggedHours": snapshot.selected_day.logged_hours,
            "selectedDayIssueKeys": snapshot.selected_day.top_issues.iter().map(|issue| issue.key.as_str()).collect::<Vec<_>>(),
            "rangeIssueKeys": snapshot.days.iter().flat_map(|day| day.top_issues.iter().map(|issue| issue.key.as_str())).take(20).collect::<Vec<_>>(),
        }),
    );
    // #endregion
    Ok(snapshot)
}

#[derive(Clone)]
struct ScheduleProfileData {
    weekday_schedules: Vec<WeekdaySchedule>,
    timezone: String,
    week_start: Option<String>,
}

fn load_schedule_profile(connection: &Connection) -> Result<ScheduleProfileData, AppError> {
    let schedule = connection
        .query_row(
            "SELECT workdays_json, timezone, week_start, shift_start, shift_end, lunch_minutes, weekday_schedule_json FROM schedule_profiles WHERE is_default = 1 LIMIT 1",
            [],
            |row| {
                let workdays_json: String = row.get(0)?;
                let shift_start: Option<String> = row.get(3)?;
                let shift_end: Option<String> = row.get(4)?;
                let lunch_minutes: Option<u32> = row.get(5)?;
                let weekday_schedule_json: Option<String> = row.get(6)?;
                let weekday_schedules = bootstrap::weekday_schedules_from_fields(
                    weekday_schedule_json.as_deref(),
                    Some(workdays_json.as_str()),
                    shift_start.as_deref(),
                    shift_end.as_deref(),
                    lunch_minutes,
                );
                Ok(ScheduleProfileData {
                    weekday_schedules,
                    timezone: row.get::<_, Option<String>>(1)?.unwrap_or_else(|| "UTC".to_string()),
                    week_start: row.get(2)?,
                })
            },
        )
        .optional()?;

    Ok(schedule.unwrap_or(ScheduleProfileData {
        weekday_schedules: bootstrap::default_weekday_schedules(),
        timezone: "UTC".to_string(),
        week_start: Some("monday".to_string()),
    }))
}

#[allow(clippy::too_many_arguments)]
fn load_range_days(
    connection: &Connection,
    provider_account_ids: &[i64],
    start: NaiveDate,
    end: NaiveDate,
    weekday_schedules: &[WeekdaySchedule],
    holiday_country_code: Option<&str>,
    locale: localization::AppLocale,
) -> Result<Vec<DayOverview>, AppError> {
    let mut days = Vec::new();
    let today = Local::now().date_naive();
    let mut current = start;

    while current <= end {
        days.push(load_day_overview(
            connection,
            provider_account_ids,
            current,
            current == today,
            weekday_schedules,
            holiday_country_code,
            locale,
        )?);
        current += Duration::days(1);
    }

    Ok(days)
}

#[allow(clippy::too_many_arguments)]
fn load_day_overview(
    connection: &Connection,
    provider_account_ids: &[i64],
    date: NaiveDate,
    is_today: bool,
    weekday_schedules: &[WeekdaySchedule],
    holiday_country_code: Option<&str>,
    locale: localization::AppLocale,
) -> Result<DayOverview, AppError> {
    let holiday = holidays::holiday_for_date(date, holiday_country_code);
    let default_target_seconds = if holiday.is_some() {
        0
    } else {
        bootstrap::target_seconds_for_date(date, weekday_schedules)
    };
    let is_non_workday = default_target_seconds == 0;

    let logged_seconds = load_logged_seconds_for_day(connection, provider_account_ids, date)?;
    let mut target_seconds = default_target_seconds;
    let variance_seconds = logged_seconds - target_seconds;
    let mut status = status_for_logged_seconds(logged_seconds, target_seconds);

    if is_non_workday || holiday.is_some() {
        target_seconds = 0;
        if logged_seconds == 0 {
            status = "non_workday".to_string();
        } else if holiday.is_some() {
            status = "over_target".to_string();
        }
    }

    // Past days that never reached target should be flagged
    if date < Local::now().date_naive()
        && (status == "on_track" || (status == "met_target" && logged_seconds < target_seconds))
    {
        status = "under_target".to_string();
    }

    let top_issues = load_issue_breakdown(connection, provider_account_ids, date)?;
    let focus_hours = top_issues
        .iter()
        .take(2)
        .map(|issue| issue.hours)
        .sum::<f32>();
    let date_label = localization::format_day_chip(date, locale);
    let holiday_name = holiday.map(|record| record.name.to_string());

    Ok(DayOverview {
        date: date.format("%Y-%m-%d").to_string(),
        short_label: localization::weekday_short(date, locale).to_string(),
        date_label,
        is_today,
        holiday_name,
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
    provider_account_ids: &[i64],
    date: NaiveDate,
) -> Result<Vec<IssueBreakdown>, AppError> {
    if provider_account_ids.is_empty() {
        return Ok(vec![]);
    }
    let placeholders = sql_placeholders(provider_account_ids.len());
    let sql = format!(
        "SELECT wi.provider_item_id, wi.title, wi.labels_json, SUM(te.seconds) AS total_seconds
         FROM time_entries te
         JOIN work_items wi ON wi.id = te.work_item_id
         WHERE te.provider_account_id IN ({placeholders}) AND date(te.spent_at) = ?
         GROUP BY wi.provider_item_id, wi.title, wi.labels_json
         ORDER BY total_seconds DESC, wi.provider_item_id ASC"
    );
    let mut statement = connection.prepare(&sql)?;
    let date_string = date.format("%Y-%m-%d").to_string();
    let mut query_params = provider_account_ids
        .iter()
        .map(|id| id.to_string())
        .collect::<Vec<_>>();
    query_params.push(date_string);

    let rows = statement.query_map(params_from_iter(query_params.iter()), |row| {
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
    })?;

    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

fn load_logged_seconds_for_day(
    connection: &Connection,
    provider_account_ids: &[i64],
    date: NaiveDate,
) -> Result<i64, AppError> {
    if provider_account_ids.is_empty() {
        return Ok(0);
    }
    let placeholders = sql_placeholders(provider_account_ids.len());
    let sql = format!(
        "SELECT COALESCE(SUM(logged_seconds), 0)
         FROM daily_buckets
         WHERE provider_account_id IN ({placeholders}) AND date = ?"
    );
    let mut query_params = provider_account_ids
        .iter()
        .map(|id| id.to_string())
        .collect::<Vec<_>>();
    query_params.push(date.format("%Y-%m-%d").to_string());
    connection
        .query_row(&sql, params_from_iter(query_params.iter()), |row| {
            row.get(0)
        })
        .map_err(AppError::from)
}

fn status_for_logged_seconds(logged_seconds: i64, target_seconds: i64) -> String {
    if logged_seconds <= 0 {
        "empty".to_string()
    } else if target_seconds <= 0 {
        "over_target".to_string()
    } else if logged_seconds < target_seconds {
        "under_target".to_string()
    } else if logged_seconds == target_seconds {
        "met_target".to_string()
    } else {
        "over_target".to_string()
    }
}

fn build_range_month_snapshot(
    days: &[DayOverview],
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
    let single_day_target_hours = days.first().map(|day| day.target_hours).unwrap_or(0.0);
    let consistency_score = if target_hours > 0.0 {
        ((logged_hours / target_hours).min(1.0) * 100.0).round() as u8
    } else if range_start == range_end && single_day_target_hours > 0.0 {
        ((logged_hours / single_day_target_hours).min(1.0) * 100.0).round() as u8
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

fn build_review_flags(days: &[DayOverview], locale: localization::AppLocale) -> Vec<AuditFlag> {
    let mut flags = Vec::new();

    for day in days {
        if day.status == "under_target" {
            flags.push(AuditFlag {
                title: localization::audit_under_target_title(locale, &day.date_label),
                severity: "high".to_string(),
                detail: localization::audit_under_target_detail(locale).to_string(),
            });
        }

        if day.status == "over_target" && day.target_hours == 0.0 {
            flags.push(AuditFlag {
                title: localization::audit_non_workday_title(locale, &day.date_label),
                severity: "medium".to_string(),
                detail: localization::audit_non_workday_detail(locale).to_string(),
            });
        } else if day.status == "over_target" {
            flags.push(AuditFlag {
                title: localization::audit_over_target_title(locale, &day.date_label),
                severity: "medium".to_string(),
                detail: localization::audit_over_target_detail(locale).to_string(),
            });
        }
    }

    flags
}

fn find_selected_day(days: &[DayOverview], anchor: NaiveDate) -> Option<DayOverview> {
    days.iter()
        .find(|day| day.date == anchor.format("%Y-%m-%d").to_string())
        .cloned()
        .or_else(|| days.iter().find(|day| day.is_today).cloned())
}

fn empty_day(date: NaiveDate, locale: localization::AppLocale) -> DayOverview {
    DayOverview {
        date: date.format("%Y-%m-%d").to_string(),
        short_label: localization::weekday_short(date, locale).to_string(),
        date_label: localization::format_day_chip(date, locale),
        is_today: false,
        holiday_name: None,
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
        .map_err(|_| AppError::ProviderApi(format!("Invalid date value: {value}")))
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

fn seconds_to_hours(value: i64) -> f32 {
    value as f32 / 3600.0
}

fn sql_placeholders(len: usize) -> String {
    std::iter::repeat_n("?", len).collect::<Vec<_>>().join(",")
}

fn time_entries_debug_summary(
    connection: &Connection,
    range_start: NaiveDate,
    range_end: NaiveDate,
) -> Value {
    let Ok(mut statement) = connection.prepare(
        "SELECT pa.id, pa.provider, COUNT(te.id), COALESCE(SUM(te.seconds), 0)
         FROM provider_accounts pa
         LEFT JOIN time_entries te
           ON te.provider_account_id = pa.id
          AND date(te.spent_at) >= ?1
          AND date(te.spent_at) <= ?2
         GROUP BY pa.id, pa.provider
         ORDER BY pa.id",
    ) else {
        return json!({ "error": "prepare-failed" });
    };
    let params = params![
        range_start.format("%Y-%m-%d").to_string(),
        range_end.format("%Y-%m-%d").to_string()
    ];
    let Ok(rows) = statement.query_map(params, |row| {
        Ok(json!({
            "providerAccountId": row.get::<_, i64>(0)?,
            "provider": row.get::<_, String>(1)?,
            "entries": row.get::<_, i64>(2)?,
            "seconds": row.get::<_, i64>(3)?,
        }))
    }) else {
        return json!({ "error": "query-failed" });
    };
    json!(rows.filter_map(Result::ok).collect::<Vec<_>>())
}

fn debug_log(run_id: &str, hypothesis_id: &str, location: &str, message: &str, data: Value) {
    let payload = json!({
        "sessionId": "2eafcf",
        "runId": run_id,
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": chrono::Utc::now().timestamp_millis(),
    });
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open("/Users/cristhoferpincetti/Documents/projects/personal/gitlab-time-tracker/.cursor/debug-2eafcf.log")
    {
        let _ = writeln!(file, "{payload}");
    }
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
            "timely-worklog-test-{}.sqlite3",
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
