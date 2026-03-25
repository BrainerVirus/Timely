//! Native workday reminder scheduling (deadline-based timer, recomputed on preference/schedule changes).

use std::{
    collections::HashSet,
    sync::{Mutex, OnceLock},
    time::Duration,
};

use chrono::{DateTime, Datelike, NaiveTime, TimeZone, Utc};
use chrono_tz::Tz;
use rusqlite::{params, Connection, OptionalExtension};
use tauri::{AppHandle, Manager};
use tauri_plugin_notification::{NotificationExt, PermissionState};

use crate::{
    domain::models::NotificationThresholdToggles,
    error::AppError,
    services::{preferences, reminder_messages, shared},
    state::AppState,
    support::holidays,
};

use reminder_messages::{
    effective_reminder_locale, pick_reminder_message, reminder_notification_title,
    resolve_urgency_tier,
};

const DEFAULT_COMPANION: &str = "Aurora fox";
const IDLE_RETRY: Duration = Duration::from_secs(30 * 60);
const FIRE_SLOP: chrono::Duration = chrono::Duration::seconds(90);

struct ReminderFireTracker {
    day_key: String,
    fired: HashSet<u32>,
}

impl ReminderFireTracker {
    fn new() -> Self {
        Self {
            day_key: String::new(),
            fired: HashSet::new(),
        }
    }

    fn sync_day(&mut self, day_key: &str) {
        if self.day_key != day_key {
            self.day_key = day_key.to_string();
            self.fired.clear();
        }
    }
}

static REMINDER_FIRES: OnceLock<Mutex<ReminderFireTracker>> = OnceLock::new();
static REMINDER_TASK: OnceLock<Mutex<Option<tauri::async_runtime::JoinHandle<()>>>> =
    OnceLock::new();

fn fire_tracker() -> &'static Mutex<ReminderFireTracker> {
    REMINDER_FIRES.get_or_init(|| Mutex::new(ReminderFireTracker::new()))
}

fn reminder_task_slot() -> &'static Mutex<Option<tauri::async_runtime::JoinHandle<()>>> {
    REMINDER_TASK.get_or_init(|| Mutex::new(None))
}

struct ScheduleForReminders {
    shift_end: Option<String>,
    timezone: String,
    workdays: Vec<String>,
    hours_per_day: f32,
}

fn load_schedule_reminders(connection: &Connection) -> Result<ScheduleForReminders, AppError> {
    let row = connection
        .query_row(
            "SELECT shift_end, hours_per_day, workdays_json, timezone FROM schedule_profiles WHERE is_default = 1 LIMIT 1",
            [],
            |row| {
                Ok((
                    row.get::<_, Option<String>>(0)?,
                    row.get::<_, f32>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, Option<String>>(3)?.unwrap_or_else(|| "UTC".to_string()),
                ))
            },
        )
        .optional()?;

    let (shift_end, hours_per_day, workdays_json, timezone) = row.unwrap_or((
        None,
        8.0_f32,
        serde_json::to_string(&vec![
            "Mon".to_string(),
            "Tue".to_string(),
            "Wed".to_string(),
            "Thu".to_string(),
            "Fri".to_string(),
        ])
        .unwrap_or_default(),
        "UTC".to_string(),
    ));

    let workdays: Vec<String> = serde_json::from_str(&workdays_json).unwrap_or_else(|_| {
        vec![
            "Mon".to_string(),
            "Tue".to_string(),
            "Wed".to_string(),
            "Thu".to_string(),
            "Fri".to_string(),
        ]
    });

    Ok(ScheduleForReminders {
        shift_end,
        timezone,
        workdays,
        hours_per_day,
    })
}

fn parse_tz(label: &str) -> Tz {
    label.parse::<Tz>().unwrap_or(chrono_tz::UTC)
}

fn shift_end_time(shift_end: &str) -> Option<NaiveTime> {
    NaiveTime::parse_from_str(shift_end.trim(), "%H:%M")
        .ok()
        .or_else(|| NaiveTime::parse_from_str(shift_end.trim(), "%H:%M:%S").ok())
}

fn today_target_and_logged(
    connection: &Connection,
    provider_id: i64,
    date: chrono::NaiveDate,
    hours_per_day: f32,
    workdays: &[String],
    holiday_code: Option<&str>,
) -> Result<(f32, f32), AppError> {
    let holiday = holidays::holiday_for_date(date, holiday_code);
    let is_non_workday = !workdays.iter().any(|d| d == &date.format("%a").to_string());
    let default_target_seconds = if is_non_workday || holiday.is_some() {
        0_i64
    } else {
        (hours_per_day * 3600.0) as i64
    };

    let bucket = connection
        .query_row(
            "SELECT logged_seconds, target_seconds FROM daily_buckets WHERE provider_account_id = ?1 AND date = ?2 LIMIT 1",
            params![provider_id, date.format("%Y-%m-%d").to_string()],
            |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?)),
        )
        .optional()?;

    let (logged_seconds, mut target_seconds) = bucket.unwrap_or((0, default_target_seconds));
    if is_non_workday || holiday.is_some() {
        target_seconds = 0;
    }

    Ok((
        logged_seconds as f32 / 3600.0,
        target_seconds as f32 / 3600.0,
    ))
}

fn load_companion_name(connection: &Connection, provider_id: i64) -> String {
    connection
        .query_row(
            "SELECT companion_state_json FROM gamification_profiles WHERE provider_account_id = ?1 LIMIT 1",
            [provider_id],
            |row| {
                let json: String = row.get(0)?;
                Ok(
                    serde_json::from_str::<serde_json::Value>(&json)
                        .ok()
                        .and_then(|v| v.get("name").and_then(|n| n.as_str()).map(str::to_string))
                        .unwrap_or_else(|| DEFAULT_COMPANION.to_string()),
                )
            },
        )
        .optional()
        .ok()
        .flatten()
        .unwrap_or_else(|| DEFAULT_COMPANION.to_string())
}

fn end_of_shift_today(tz: Tz, date: chrono::NaiveDate, shift_end: &str) -> Option<DateTime<Tz>> {
    let end_time = shift_end_time(shift_end)?;
    let naive = date.and_time(end_time);
    match tz.from_local_datetime(&naive) {
        chrono::LocalResult::Single(dt) => Some(dt),
        chrono::LocalResult::Ambiguous(a, _b) => Some(a),
        chrono::LocalResult::None => None,
    }
}

struct NextReminder {
    sleep: Duration,
    threshold_minutes: u32,
}

fn threshold_pairs(prefs: &NotificationThresholdToggles) -> [(u32, bool); 4] {
    [
        (45, prefs.minutes_45),
        (30, prefs.minutes_30),
        (15, prefs.minutes_15),
        (5, prefs.minutes_5),
    ]
}

/// Computes sleep until the next reminder firing instant (if any).
fn compute_next_reminder(
    connection: &Connection,
    app_prefs: &crate::domain::models::AppPreferences,
    tracker: &mut ReminderFireTracker,
) -> Result<Option<NextReminder>, AppError> {
    if !app_prefs.notifications_enabled {
        return Ok(None);
    }

    let primary = match shared::load_primary_gitlab_connection(connection) {
        Ok(p) => p,
        Err(_) => return Ok(None),
    };

    let schedule = load_schedule_reminders(connection)?;
    let shift_end_str = match schedule.shift_end.as_deref() {
        Some(s) if !s.trim().is_empty() => s,
        _ => return Ok(None),
    };

    let tz = parse_tz(&schedule.timezone);
    let now_tz: DateTime<Tz> = Utc::now().with_timezone(&tz);
    let today = now_tz.date_naive();
    let day_key = today.format("%Y-%m-%d").to_string();
    tracker.sync_day(&day_key);

    let (_logged, target) = today_target_and_logged(
        connection,
        primary.id,
        today,
        schedule.hours_per_day,
        &schedule.workdays,
        app_prefs.holiday_country_code.as_deref(),
    )?;

    if target <= 0.01 {
        return Ok(None);
    }

    let end_dt = match end_of_shift_today(tz, today, shift_end_str) {
        Some(dt) => dt,
        None => return Ok(None),
    };

    if now_tz >= end_dt {
        return Ok(None);
    }

    let mut best: Option<(chrono::DateTime<Tz>, u32)> = None;

    for (minutes, enabled) in threshold_pairs(&app_prefs.notification_thresholds) {
        if !enabled || tracker.fired.contains(&minutes) {
            continue;
        }
        let fire_at = end_dt - chrono::Duration::minutes(i64::from(minutes));
        if fire_at <= now_tz {
            continue;
        }
        match best {
            None => best = Some((fire_at, minutes)),
            Some((t, _)) if fire_at < t => best = Some((fire_at, minutes)),
            _ => {}
        }
    }

    let Some((fire_at, threshold_minutes)) = best else {
        return Ok(None);
    };

    let until = (fire_at - now_tz)
        .to_std()
        .unwrap_or_else(|_| Duration::from_secs(1));

    Ok(Some(NextReminder {
        sleep: until,
        threshold_minutes,
    }))
}

fn show_workday_reminder(app: &AppHandle, title: &str, body: &str) -> Result<(), AppError> {
    app.notification()
        .builder()
        .title(title.to_string())
        .body(body.to_string())
        .show()
        .map_err(|e| AppError::NotificationShow(e.to_string()))?;
    Ok(())
}

/// Kick or restart the reminder worker (call after prefs/schedule/sync).
pub fn kick_reminder_scheduler(app: &AppHandle) {
    let mut guard = match reminder_task_slot().lock() {
        Ok(g) => g,
        Err(p) => p.into_inner(),
    };
    if let Some(h) = guard.take() {
        h.abort();
    }
    let app_clone = app.clone();
    *guard = Some(tauri::async_runtime::spawn(async move {
        reminder_worker(app_clone).await;
    }));
}

async fn reminder_worker(app: AppHandle) {
    loop {
        let app_clone = app.clone();
        let decision = tokio::task::spawn_blocking(move || {
            let state = app_clone.state::<AppState>();
            let connection = shared::open_connection(&state)?;
            let app_prefs = preferences::load_app_preferences(&connection)?;
            let mut tracker = match fire_tracker().lock() {
                Ok(g) => g,
                Err(p) => p.into_inner(),
            };
            compute_next_reminder(&connection, &app_prefs, &mut tracker)
        })
        .await;

        let next = match decision {
            Ok(Ok(n)) => n,
            Ok(Err(e)) => {
                crate::support::logging::info(format!("[timely][reminders] compute error: {e}"));
                None
            }
            Err(e) => {
                crate::support::logging::info(format!("[timely][reminders] join error: {e}"));
                None
            }
        };

        let Some(step) = next else {
            tokio::time::sleep(IDLE_RETRY).await;
            continue;
        };

        tokio::time::sleep(step.sleep).await;

        // Re-check and fire
        let fire_result = tokio::task::spawn_blocking({
            let app = app.clone();
            let threshold = step.threshold_minutes;
            move || try_fire_reminder(&app, threshold)
        })
        .await;

        match fire_result {
            Ok(Ok(())) => {}
            Ok(Err(e)) => crate::support::logging::info(format!(
                "[timely][reminders] fire skipped or failed: {e}"
            )),
            Err(e) => crate::support::logging::info(format!("[timely][reminders] fire join: {e}")),
        }
    }
}

fn try_fire_reminder(app: &AppHandle, expected_threshold: u32) -> Result<(), AppError> {
    let state = app.state::<AppState>();
    let connection = shared::open_connection(&state)?;
    let app_prefs = preferences::load_app_preferences(&connection)?;
    if !app_prefs.notifications_enabled {
        return Ok(());
    }

    let primary = shared::load_primary_gitlab_connection(&connection)?;
    let schedule = load_schedule_reminders(&connection)?;
    let shift_end_str = schedule
        .shift_end
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .ok_or_else(|| AppError::NotificationShow("No shift end".to_string()))?;

    let tz = parse_tz(&schedule.timezone);
    let now_tz: DateTime<Tz> = Utc::now().with_timezone(&tz);
    let today = now_tz.date_naive();
    let day_key = today.format("%Y-%m-%d").to_string();

    let mut tracker = match fire_tracker().lock() {
        Ok(g) => g,
        Err(p) => p.into_inner(),
    };
    tracker.sync_day(&day_key);

    if tracker.fired.contains(&expected_threshold) {
        return Ok(());
    }

    let (logged, target) = today_target_and_logged(
        &connection,
        primary.id,
        today,
        schedule.hours_per_day,
        &schedule.workdays,
        app_prefs.holiday_country_code.as_deref(),
    )?;

    if target <= 0.01 {
        return Ok(());
    }

    let end_dt = end_of_shift_today(tz, today, shift_end_str)
        .ok_or_else(|| AppError::NotificationShow("Invalid shift end".to_string()))?;
    let fire_at = end_dt - chrono::Duration::minutes(i64::from(expected_threshold));

    if now_tz < fire_at - FIRE_SLOP || now_tz > fire_at + FIRE_SLOP {
        return Ok(());
    }

    if !threshold_pairs(&app_prefs.notification_thresholds)
        .iter()
        .any(|(m, en)| *m == expected_threshold && *en)
    {
        return Ok(());
    }

    let companion = load_companion_name(&connection, primary.id);
    let tier = resolve_urgency_tier(expected_threshold, logged, target);
    let salt = (today.num_days_from_ce() as u64)
        .wrapping_shl(8)
        .wrapping_add(u64::from(expected_threshold));
    let locale = effective_reminder_locale(&app_prefs.language);
    let body = pick_reminder_message(tier, &companion, salt, locale);
    let title = reminder_notification_title(expected_threshold, locale);

    show_workday_reminder(app, &title, &body)?;
    tracker.fired.insert(expected_threshold);
    Ok(())
}

/// Send a test notification (Settings).
pub fn send_test_notification(
    app: &AppHandle,
    title: String,
    body: String,
) -> Result<(), AppError> {
    show_workday_reminder(app, &title, &body)
}

/// Maps OS permission to a string for the frontend (`unknown` when the backend does not surface state).
pub fn notification_permission_label(app: &AppHandle) -> String {
    match app.notification().permission_state() {
        Ok(PermissionState::Granted) => "granted".to_string(),
        Ok(PermissionState::Denied) => "denied".to_string(),
        Ok(PermissionState::Prompt) => "prompt".to_string(),
        Ok(PermissionState::PromptWithRationale) => "prompt-with-rationale".to_string(),
        Err(_) => "unknown".to_string(),
    }
}

/// Request notification permission (no-op on most desktop targets).
pub fn notification_request_permission(app: &AppHandle) -> Result<String, AppError> {
    app.notification()
        .request_permission()
        .map_err(|e| AppError::NotificationShow(e.to_string()))?;
    Ok(notification_permission_label(app))
}
