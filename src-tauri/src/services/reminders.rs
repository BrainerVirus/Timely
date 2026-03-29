//! Native workday reminder scheduling (deadline-based timer, recomputed on preference/schedule changes).

use std::{
    collections::HashSet,
    path::{Path, PathBuf},
    sync::{Mutex, OnceLock},
    time::Duration,
};

use chrono::{DateTime, Datelike, NaiveTime, TimeZone, Utc};
use chrono_tz::Tz;
use rusqlite::{params, Connection, OptionalExtension};
use tauri::{AppHandle, Manager};
use tauri_plugin_notification::{NotificationExt, PermissionState};

use crate::{
    db::bootstrap,
    domain::models::{NotificationDeliveryProfile, NotificationThresholdToggles},
    error::AppError,
    services::{diagnostics, preferences, reminder_messages, shared},
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
const DESKTOP_NOTIFICATION_TIMEOUT_MS: u32 = 10_000;
#[cfg(any(target_os = "linux", test))]
const LINUX_NOTIFICATION_WATCHDOG_GRACE_MS: u64 = 2_000;
const DEFAULT_LINUX_DESKTOP_ENTRY_NAME: &str = "Timely";
const DEFAULT_LINUX_ICON_NAME: &str = "timely";
const NOTIFICATION_SOUND_RESOURCE_NAME: &str = "fox-notification.wav";
#[cfg(windows)]
const WINDOWS_NOTIFICATION_SOUND_URI: &str = "ms-appx:///fox-notification.wav";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum DesktopNotificationUrgency {
    Normal,
    High,
    Critical,
}

#[cfg(any(target_os = "linux", test))]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum LinuxNotificationCloseReason {
    Expired,
    Dismissed,
    CloseAction,
    Other(u32),
}

#[cfg(any(target_os = "linux", test))]
#[derive(Debug, PartialEq, Eq)]
enum LinuxNotificationLifecycleOutcome {
    Closed(LinuxNotificationCloseReason),
    WatchdogExpired,
    ListenerFailed(String),
}

#[derive(Debug)]
struct DesktopNotificationDispatch {
    notification_reference: Option<String>,
    delivery_method: String,
    sound_reference: String,
}

#[cfg(any(target_os = "linux", test))]
#[derive(Debug, PartialEq, Eq)]
struct LinuxFreedesktopNotificationRequest {
    title: String,
    body: String,
    app_name: String,
    icon_name: String,
    desktop_entry: String,
    timeout_ms: u32,
    urgency: notify_rust::Urgency,
    sound_file: String,
}

#[cfg(any(windows, test))]
#[derive(Debug, PartialEq, Eq)]
struct WindowsToastRequest {
    xml: String,
    sound_uri: String,
    app_id: Option<String>,
}

#[cfg(any(target_os = "linux", test))]
impl From<u32> for LinuxNotificationCloseReason {
    fn from(raw_reason: u32) -> Self {
        match raw_reason {
            1 => Self::Expired,
            2 => Self::Dismissed,
            3 => Self::CloseAction,
            other => Self::Other(other),
        }
    }
}

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
    timezone: String,
    weekday_schedules: Vec<crate::domain::models::WeekdaySchedule>,
}

fn load_schedule_reminders(connection: &Connection) -> Result<ScheduleForReminders, AppError> {
    let row = connection
        .query_row(
            "SELECT workdays_json, timezone, shift_start, shift_end, lunch_minutes, weekday_schedule_json FROM schedule_profiles WHERE is_default = 1 LIMIT 1",
            [],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<String>>(1)?.unwrap_or_else(|| "UTC".to_string()),
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, Option<u32>>(4)?,
                    row.get::<_, Option<String>>(5)?,
                ))
            },
        )
        .optional()?;

    let (workdays_json, timezone, shift_start, shift_end, lunch_minutes, weekday_schedule_json) =
        row.unwrap_or((
            serde_json::to_string(&vec![
                "Mon".to_string(),
                "Tue".to_string(),
                "Wed".to_string(),
                "Thu".to_string(),
                "Fri".to_string(),
            ])
            .unwrap_or_default(),
            "UTC".to_string(),
            None,
            None,
            None,
            None,
        ));
    let weekday_schedules = bootstrap::weekday_schedules_from_fields(
        weekday_schedule_json.as_deref(),
        Some(workdays_json.as_str()),
        shift_start.as_deref(),
        shift_end.as_deref(),
        lunch_minutes,
    );

    Ok(ScheduleForReminders {
        timezone,
        weekday_schedules,
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
    weekday_schedules: &[crate::domain::models::WeekdaySchedule],
    holiday_code: Option<&str>,
) -> Result<(f32, f32), AppError> {
    let holiday = holidays::holiday_for_date(date, holiday_code);
    let default_target_seconds = if holiday.is_some() {
        0_i64
    } else {
        bootstrap::target_seconds_for_date(date, weekday_schedules)
    };
    let is_non_workday = default_target_seconds == 0;

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
    let tz = parse_tz(&schedule.timezone);
    let now_tz: DateTime<Tz> = Utc::now().with_timezone(&tz);
    let today = now_tz.date_naive();
    let day_key = today.format("%Y-%m-%d").to_string();
    tracker.sync_day(&day_key);
    let today_schedule =
        match bootstrap::weekday_schedule_for_date(today, &schedule.weekday_schedules) {
            Some(schedule) => schedule,
            None => return Ok(None),
        };

    let (_logged, target) = today_target_and_logged(
        connection,
        primary.id,
        today,
        &schedule.weekday_schedules,
        app_prefs.holiday_country_code.as_deref(),
    )?;

    if target <= 0.01 {
        return Ok(None);
    }

    let end_dt = match end_of_shift_today(tz, today, today_schedule.shift_end.as_str()) {
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

fn show_workday_reminder(
    app: &AppHandle,
    title: &str,
    body: &str,
    source: &str,
    event: &str,
    urgency: DesktopNotificationUrgency,
) -> Result<(), AppError> {
    let (desktop_entry, icon_name) = linux_notification_identity(app);
    let product_name = app_product_name(app);
    let identifier = app.config().identifier.clone();
    let timeout_ms = linux_notification_timeout_ms();
    let sound_reference = notification_sound_diagnostic_reference(app)
        .unwrap_or_else(|_| NOTIFICATION_SOUND_RESOURCE_NAME.to_string());

    diagnostics::append_diagnostic_for_app(
        app,
        "notifications",
        "info",
        source,
        event,
        &format!(
            "sending notification: {title} (app={product_name}, identifier={identifier}, desktopEntry={desktop_entry}, iconName={icon_name}, timeoutMs={timeout_ms}, soundRef={sound_reference})"
        ),
    );

    let result = send_desktop_notification(app, title, body, source, event, urgency);

    match &result {
        Ok(dispatch) => {
            let mut detail = format!(
                "notification dispatched (delivery={}, soundRef={})",
                dispatch.delivery_method, dispatch.sound_reference
            );
            if let Some(notification_reference) = &dispatch.notification_reference {
                detail.push_str(&format!(" (notificationId={notification_reference})"));
            }
            diagnostics::append_diagnostic_for_app(
                app,
                "notifications",
                "info",
                source,
                event,
                &detail,
            );
        }
        Err(error) => diagnostics::append_diagnostic_for_app(
            app,
            "notifications",
            "error",
            source,
            event,
            &format!("notification dispatch failed: {error}"),
        ),
    }

    result.map(|_| ())
}

fn app_product_name(app: &AppHandle) -> String {
    app.config()
        .product_name
        .clone()
        .unwrap_or_else(|| "Timely".to_string())
}

fn notification_sound_path_from_resource_dir(resource_dir: &Path) -> PathBuf {
    resource_dir.join(NOTIFICATION_SOUND_RESOURCE_NAME)
}

fn notification_sound_resource_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    let path = notification_sound_path_from_resource_dir(&app.path().resource_dir()?);
    if path.is_file() {
        Ok(path)
    } else {
        Err(AppError::NotificationShow(format!(
            "notification sound resource missing: {}",
            path.display()
        )))
    }
}

#[cfg(any(target_os = "linux", test))]
fn linux_notification_sound_path(resource_dir: &Path) -> String {
    notification_sound_path_from_resource_dir(resource_dir)
        .to_string_lossy()
        .into_owned()
}

fn linux_notification_timeout_ms() -> u32 {
    DESKTOP_NOTIFICATION_TIMEOUT_MS
}

#[cfg(any(windows, test))]
fn windows_notification_sound_uri() -> String {
    #[cfg(windows)]
    {
        WINDOWS_NOTIFICATION_SOUND_URI.to_string()
    }
    #[cfg(not(windows))]
    {
        format!("ms-appx:///{NOTIFICATION_SOUND_RESOURCE_NAME}")
    }
}

#[cfg(any(windows, test))]
fn windows_toast_duration_label(timeout_ms: u32) -> &'static str {
    if timeout_ms >= 25_000 {
        "long"
    } else {
        "short"
    }
}

#[cfg(any(windows, test))]
fn escape_windows_toast_text(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

#[cfg(any(windows, test))]
fn build_windows_toast_xml(title: &str, body: &str, sound_uri: &str, timeout_ms: u32) -> String {
    let title = escape_windows_toast_text(title);
    let body = escape_windows_toast_text(body);
    let duration = windows_toast_duration_label(timeout_ms);
    format!(
        r#"<toast duration="{duration}"><visual><binding template="ToastGeneric"><text>{title}</text><text>{body}</text></binding></visual><audio src="{sound_uri}"/></toast>"#
    )
}

#[cfg(any(windows, test))]
fn build_windows_toast_request(
    title: &str,
    body: &str,
    timeout_ms: u32,
    app_id: Option<String>,
) -> WindowsToastRequest {
    let sound_uri = windows_notification_sound_uri();
    WindowsToastRequest {
        xml: build_windows_toast_xml(title, body, &sound_uri, timeout_ms),
        sound_uri,
        app_id,
    }
}

fn notification_sound_diagnostic_reference(app: &AppHandle) -> Result<String, AppError> {
    #[cfg(target_os = "linux")]
    {
        return Ok(linux_notification_sound_path(&app.path().resource_dir()?));
    }
    #[cfg(windows)]
    {
        return Ok(windows_notification_sound_uri());
    }
    #[cfg(target_os = "macos")]
    {
        let _ = notification_sound_resource_path(app)?;
        Ok(NOTIFICATION_SOUND_RESOURCE_NAME.to_string())
    }
    #[cfg(not(any(target_os = "linux", windows, target_os = "macos")))]
    {
        let _ = app;
        Ok(NOTIFICATION_SOUND_RESOURCE_NAME.to_string())
    }
}

#[cfg(any(target_os = "linux", test))]
fn sanitize_linux_notification_id_segment(input: &str) -> String {
    let mut sanitized = String::with_capacity(input.len());
    let mut previous_was_dash = false;

    for character in input.chars() {
        if character.is_ascii_alphanumeric() {
            sanitized.push(character.to_ascii_lowercase());
            previous_was_dash = false;
            continue;
        }

        if !previous_was_dash && !sanitized.is_empty() {
            sanitized.push('-');
            previous_was_dash = true;
        }
    }

    while sanitized.ends_with('-') {
        sanitized.pop();
    }

    if sanitized.is_empty() {
        "notification".to_string()
    } else {
        sanitized
    }
}

#[cfg(any(target_os = "linux", test))]
fn linux_notification_id(source: &str, event: &str) -> String {
    format!(
        "timely.{}.{}",
        sanitize_linux_notification_id_segment(source),
        sanitize_linux_notification_id_segment(event)
    )
}

#[cfg(any(target_os = "linux", test))]
fn linux_notification_watchdog_duration() -> Duration {
    Duration::from_millis(
        u64::from(DESKTOP_NOTIFICATION_TIMEOUT_MS) + LINUX_NOTIFICATION_WATCHDOG_GRACE_MS,
    )
}

#[cfg(any(target_os = "linux", test))]
fn linux_notification_close_reason_label(reason: LinuxNotificationCloseReason) -> String {
    match reason {
        LinuxNotificationCloseReason::Expired => "expired".to_string(),
        LinuxNotificationCloseReason::Dismissed => "dismissed".to_string(),
        LinuxNotificationCloseReason::CloseAction => "close_action".to_string(),
        LinuxNotificationCloseReason::Other(code) => format!("other:{code}"),
    }
}

#[cfg(any(target_os = "linux", test))]
async fn hold_linux_notification_until_closed<THandle, TWait, TWaitFactory>(
    notification_id: u32,
    handle: THandle,
    wait_for_close: TWaitFactory,
) -> (u32, LinuxNotificationLifecycleOutcome)
where
    THandle: Send + 'static,
    TWait:
        std::future::Future<Output = Result<Option<LinuxNotificationCloseReason>, String>> + Send,
    TWaitFactory: FnOnce(u32, Duration) -> TWait + Send + 'static,
{
    let retained_handle = handle;
    let outcome =
        match wait_for_close(notification_id, linux_notification_watchdog_duration()).await {
            Ok(Some(reason)) => LinuxNotificationLifecycleOutcome::Closed(reason),
            Ok(None) => LinuxNotificationLifecycleOutcome::WatchdogExpired,
            Err(error) => LinuxNotificationLifecycleOutcome::ListenerFailed(error),
        };
    drop(retained_handle);
    (notification_id, outcome)
}

#[cfg(target_os = "linux")]
async fn wait_for_linux_notification_close(
    notification_id: u32,
    timeout: Duration,
) -> Result<Option<LinuxNotificationCloseReason>, String> {
    use futures_lite::stream::StreamExt;
    use tokio::time::{timeout as timeout_after, Instant};
    use zbus::{fdo::DBusProxy, message::Type, Connection, MatchRule};

    let connection = Connection::session()
        .await
        .map_err(|error| format!("session connection failed: {error}"))?;
    let proxy = DBusProxy::new(&connection)
        .await
        .map_err(|error| format!("dbus proxy failed: {error}"))?;

    let action_signal_rule = MatchRule::builder()
        .msg_type(Type::Signal)
        .interface("org.freedesktop.Notifications")
        .map_err(|error| format!("action match interface failed: {error}"))?
        .member("ActionInvoked")
        .map_err(|error| format!("action match member failed: {error}"))?
        .build();
    proxy
        .add_match_rule(action_signal_rule)
        .await
        .map_err(|error| format!("action match registration failed: {error}"))?;

    let close_signal_rule = MatchRule::builder()
        .msg_type(Type::Signal)
        .interface("org.freedesktop.Notifications")
        .map_err(|error| format!("close match interface failed: {error}"))?
        .member("NotificationClosed")
        .map_err(|error| format!("close match member failed: {error}"))?
        .build();
    proxy
        .add_match_rule(close_signal_rule)
        .await
        .map_err(|error| format!("close match registration failed: {error}"))?;

    let deadline = Instant::now() + timeout;
    let mut stream = zbus::MessageStream::from(&connection);

    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return Ok(None);
        }

        let next_message = match timeout_after(remaining, stream.next()).await {
            Ok(Some(Ok(message))) => message,
            Ok(Some(Err(error))) => return Err(format!("message stream failed: {error}")),
            Ok(None) => return Err("message stream ended unexpectedly".to_string()),
            Err(_) => return Ok(None),
        };

        let header = next_message.header();
        if !matches!(header.message_type(), Type::Signal) {
            continue;
        }

        match header.member().map(|member| member.as_str()) {
            Some("NotificationClosed") => match next_message.body().deserialize::<(u32, u32)>() {
                Ok((nid, reason)) if nid == notification_id => {
                    return Ok(Some(LinuxNotificationCloseReason::from(reason)));
                }
                Ok(_) => {}
                Err(error) => return Err(format!("close body decode failed: {error}")),
            },
            Some("ActionInvoked") => {}
            _ => {}
        }
    }
}

#[cfg(target_os = "linux")]
fn log_linux_notification_lifecycle(
    app: &AppHandle,
    notification_id: u32,
    outcome: LinuxNotificationLifecycleOutcome,
) {
    match outcome {
        LinuxNotificationLifecycleOutcome::Closed(reason) => diagnostics::append_diagnostic_for_app(
            app,
            "notifications",
            "info",
            "linux_delivery",
            "close",
            &format!(
                "notification closed (notificationId={notification_id}, reason={})",
                linux_notification_close_reason_label(reason)
            ),
        ),
        LinuxNotificationLifecycleOutcome::WatchdogExpired => diagnostics::append_diagnostic_for_app(
            app,
            "notifications",
            "warn",
            "linux_delivery",
            "watchdog",
            &format!(
                "notification handle released by watchdog (notificationId={notification_id}, waitedMs={})",
                linux_notification_watchdog_duration().as_millis()
            ),
        ),
        LinuxNotificationLifecycleOutcome::ListenerFailed(error) => diagnostics::append_diagnostic_for_app(
            app,
            "notifications",
            "warn",
            "linux_delivery",
            "listener_error",
            &format!(
                "notification close listener failed (notificationId={notification_id}, error={error})"
            ),
        ),
    }
}

#[cfg(target_os = "linux")]
fn spawn_linux_notification_lifecycle_monitor(
    app: AppHandle,
    handle: notify_rust::NotificationHandle,
) -> u32 {
    let notification_id = handle.id();
    tauri::async_runtime::spawn(async move {
        let (notification_id, outcome) = hold_linux_notification_until_closed(
            notification_id,
            handle,
            wait_for_linux_notification_close,
        )
        .await;
        log_linux_notification_lifecycle(&app, notification_id, outcome);
    });
    notification_id
}

pub fn notification_delivery_profile(app: &AppHandle) -> NotificationDeliveryProfile {
    let linux_desktop_entry = {
        #[cfg(target_os = "linux")]
        {
            linux_notification_identity(app).0
        }
        #[cfg(not(target_os = "linux"))]
        {
            resolve_linux_desktop_entry_name(
                None,
                app.config().main_binary_name.as_deref(),
                None,
                app.config().product_name.as_deref(),
            )
        }
    };
    let timeout_ms = {
        #[cfg(target_os = "linux")]
        {
            linux_notification_timeout_ms()
        }
        #[cfg(not(target_os = "linux"))]
        {
            DESKTOP_NOTIFICATION_TIMEOUT_MS
        }
    };

    NotificationDeliveryProfile {
        platform: std::env::consts::OS.to_string(),
        product_name: app_product_name(app),
        identifier: app.config().identifier.clone(),
        linux_desktop_entry,
        timeout_ms,
        windows_app_id_active: {
            #[cfg(windows)]
            {
                should_apply_windows_app_id_from_runtime()
            }
            #[cfg(not(windows))]
            {
                false
            }
        },
    }
}

fn slugify_linux_icon_name(input: &str) -> String {
    let mut slug = String::with_capacity(input.len());
    let mut previous_was_dash = false;

    for character in input.chars() {
        if character.is_ascii_alphanumeric() {
            slug.push(character.to_ascii_lowercase());
            previous_was_dash = false;
            continue;
        }

        if !previous_was_dash && !slug.is_empty() {
            slug.push('-');
            previous_was_dash = true;
        }
    }

    while slug.ends_with('-') {
        slug.pop();
    }

    if slug.is_empty() {
        DEFAULT_LINUX_ICON_NAME.to_string()
    } else {
        slug
    }
}

fn should_use_packaged_linux_desktop_entry(exe_dir: &str) -> bool {
    let normalized = exe_dir.replace('\\', "/");
    !normalized.ends_with("/target/debug")
        && !normalized.ends_with("/target/release")
        && !normalized.ends_with("/target/custom-profile")
}

fn resolve_linux_desktop_entry_name(
    current_exe_dir: Option<&str>,
    main_binary_name: Option<&str>,
    current_exe_stem: Option<&str>,
    product_name: Option<&str>,
) -> String {
    if current_exe_dir
        .map(should_use_packaged_linux_desktop_entry)
        .unwrap_or(false)
    {
        return product_name
            .filter(|value| !value.trim().is_empty())
            .or(main_binary_name.filter(|value| !value.trim().is_empty()))
            .or(current_exe_stem.filter(|value| !value.trim().is_empty()))
            .map(str::to_string)
            .unwrap_or_else(|| DEFAULT_LINUX_DESKTOP_ENTRY_NAME.to_string());
    }

    main_binary_name
        .filter(|value| !value.trim().is_empty())
        .or(current_exe_stem.filter(|value| !value.trim().is_empty()))
        .or(product_name.filter(|value| !value.trim().is_empty()))
        .map(slugify_linux_icon_name)
        .unwrap_or_else(|| DEFAULT_LINUX_ICON_NAME.to_string())
}

fn resolve_linux_notification_icon_name(
    main_binary_name: Option<&str>,
    current_exe_stem: Option<&str>,
    product_name: Option<&str>,
) -> String {
    main_binary_name
        .filter(|value| !value.trim().is_empty())
        .or(current_exe_stem.filter(|value| !value.trim().is_empty()))
        .or(product_name.filter(|value| !value.trim().is_empty()))
        .map(slugify_linux_icon_name)
        .unwrap_or_else(|| DEFAULT_LINUX_ICON_NAME.to_string())
}

fn linux_notification_identity(app: &AppHandle) -> (String, String) {
    let current_exe = std::env::current_exe().ok();
    let current_exe_dir = current_exe
        .as_ref()
        .and_then(|path| path.parent())
        .map(|dir| dir.display().to_string());
    let current_exe_stem = current_exe.as_ref().and_then(|path| {
        path.file_stem()
            .and_then(|stem| stem.to_str())
            .map(str::to_string)
    });

    let desktop_entry = resolve_linux_desktop_entry_name(
        current_exe_dir.as_deref(),
        app.config().main_binary_name.as_deref(),
        current_exe_stem.as_deref(),
        app.config().product_name.as_deref(),
    );
    let icon_name = resolve_linux_notification_icon_name(
        app.config().main_binary_name.as_deref(),
        current_exe_stem.as_deref(),
        app.config().product_name.as_deref(),
    );

    (desktop_entry, icon_name)
}

#[cfg(any(windows, test))]
fn should_apply_packaged_windows_app_id(exe_dir: &str) -> bool {
    let normalized = exe_dir.replace('\\', "/");
    !normalized.ends_with("/target/debug")
        && !normalized.ends_with("/target/release")
        && !normalized.ends_with("/target/custom-profile")
}

#[cfg(windows)]
fn should_apply_windows_app_id_from_runtime() -> bool {
    let exe_dir = match tauri::utils::platform::current_exe() {
        Ok(exe) => exe.parent().map(|dir| dir.display().to_string()),
        Err(_) => None,
    };

    exe_dir
        .as_deref()
        .map(should_apply_packaged_windows_app_id)
        .unwrap_or(false)
}

#[cfg(any(target_os = "linux", test))]
fn linux_notification_urgency(urgency: DesktopNotificationUrgency) -> notify_rust::Urgency {
    match urgency {
        DesktopNotificationUrgency::Normal => notify_rust::Urgency::Normal,
        DesktopNotificationUrgency::High | DesktopNotificationUrgency::Critical => {
            notify_rust::Urgency::Critical
        }
    }
}

#[cfg(any(target_os = "linux", test))]
fn build_linux_freedesktop_notification_request_with_sound(
    title: &str,
    body: &str,
    app_name: &str,
    icon_name: &str,
    desktop_entry: &str,
    urgency: DesktopNotificationUrgency,
    sound_file: String,
) -> LinuxFreedesktopNotificationRequest {
    LinuxFreedesktopNotificationRequest {
        title: title.to_string(),
        body: body.to_string(),
        app_name: app_name.to_string(),
        icon_name: icon_name.to_string(),
        desktop_entry: desktop_entry.to_string(),
        timeout_ms: linux_notification_timeout_ms(),
        urgency: linux_notification_urgency(urgency),
        sound_file,
    }
}

#[cfg_attr(not(target_os = "linux"), allow(dead_code))]
#[cfg(any(target_os = "linux", test))]
fn build_linux_freedesktop_notification_request(
    app: &AppHandle,
    title: &str,
    body: &str,
    icon_name: &str,
    desktop_entry: &str,
    urgency: DesktopNotificationUrgency,
) -> Result<LinuxFreedesktopNotificationRequest, AppError> {
    Ok(build_linux_freedesktop_notification_request_with_sound(
        title,
        body,
        &app_product_name(app),
        icon_name,
        desktop_entry,
        urgency,
        notification_sound_resource_path(app)?
            .to_string_lossy()
            .into_owned(),
    ))
}

#[cfg(target_os = "linux")]
fn send_linux_freedesktop_notification(
    app: &AppHandle,
    title: &str,
    body: &str,
    icon_name: &str,
    desktop_entry: &str,
    urgency: DesktopNotificationUrgency,
) -> Result<DesktopNotificationDispatch, AppError> {
    let request = build_linux_freedesktop_notification_request(
        app,
        title,
        body,
        icon_name,
        desktop_entry,
        urgency,
    )?;
    let mut notification = notify_rust::Notification::new();

    notification
        .summary(&request.title)
        .body(&request.body)
        .appname(&request.app_name)
        .icon(&request.icon_name)
        .hint(notify_rust::Hint::DesktopEntry(
            request.desktop_entry.clone(),
        ))
        .hint(notify_rust::Hint::SoundFile(request.sound_file.clone()))
        .timeout(notify_rust::Timeout::Milliseconds(request.timeout_ms))
        .urgency(request.urgency);

    let handle = notification
        .show()
        .map_err(|error| AppError::NotificationShow(error.to_string()))?;
    let notification_id = spawn_linux_notification_lifecycle_monitor(app.clone(), handle);

    Ok(DesktopNotificationDispatch {
        notification_reference: Some(notification_id.to_string()),
        delivery_method: "freedesktop".to_string(),
        sound_reference: request.sound_file,
    })
}

#[cfg(windows)]
fn send_windows_native_notification(
    app: &AppHandle,
    title: &str,
    body: &str,
) -> Result<DesktopNotificationDispatch, AppError> {
    use windows::{
        core::HSTRING,
        Data::Xml::Dom::XmlDocument,
        UI::Notifications::{ToastNotification, ToastNotificationManager},
    };

    let app_id =
        should_apply_windows_app_id_from_runtime().then(|| app.config().identifier.clone());
    let request = build_windows_toast_request(title, body, DESKTOP_NOTIFICATION_TIMEOUT_MS, app_id);
    let xml = XmlDocument::new().map_err(|error| AppError::NotificationShow(error.to_string()))?;
    xml.LoadXml(&HSTRING::from(&request.xml))
        .map_err(|error| AppError::NotificationShow(error.to_string()))?;
    let toast = ToastNotification::CreateToastNotification(&xml)
        .map_err(|error| AppError::NotificationShow(error.to_string()))?;
    let notifier = match request.app_id.as_ref() {
        Some(app_id) => ToastNotificationManager::CreateToastNotifierWithId(&HSTRING::from(app_id)),
        None => ToastNotificationManager::CreateToastNotifier(),
    }
    .map_err(|error| AppError::NotificationShow(error.to_string()))?;
    notifier
        .Show(&toast)
        .map_err(|error| AppError::NotificationShow(error.to_string()))?;

    Ok(DesktopNotificationDispatch {
        notification_reference: None,
        delivery_method: "windows-toast-xml".to_string(),
        sound_reference: request.sound_uri,
    })
}

#[cfg(target_os = "macos")]
fn send_macos_native_notification(
    app: &AppHandle,
    title: &str,
    body: &str,
) -> Result<DesktopNotificationDispatch, AppError> {
    let sound_name = notification_sound_diagnostic_reference(app)?;
    let mut notification = notify_rust::Notification::new();
    let product_name = app_product_name(app);

    notification
        .summary(title)
        .body(body)
        .appname(&product_name)
        .sound_name(&sound_name);

    let bundle_identifier = if tauri::is_dev() {
        "com.apple.Terminal"
    } else {
        &app.config().identifier
    };
    let _ = notify_rust::set_application(bundle_identifier);

    notification
        .show()
        .map_err(|error| AppError::NotificationShow(error.to_string()))?;

    Ok(DesktopNotificationDispatch {
        notification_reference: None,
        delivery_method: "macos-user-notification".to_string(),
        sound_reference: sound_name,
    })
}

fn send_desktop_notification(
    app: &AppHandle,
    title: &str,
    body: &str,
    #[allow(unused_variables)] source: &str,
    #[allow(unused_variables)] event: &str,
    #[allow(unused_variables)] urgency: DesktopNotificationUrgency,
) -> Result<DesktopNotificationDispatch, AppError> {
    #[cfg(target_os = "linux")]
    {
        let (desktop_entry, icon_name) = linux_notification_identity(app);
        let notification_reference = linux_notification_id(source, event);
        let mut dispatch = send_linux_freedesktop_notification(
            app,
            title,
            body,
            &icon_name,
            &desktop_entry,
            urgency,
        )?;
        dispatch.notification_reference = Some(notification_reference);
        return Ok(dispatch);
    }

    #[cfg(target_os = "macos")]
    {
        send_macos_native_notification(app, title, body)
    }

    #[cfg(windows)]
    {
        return send_windows_native_notification(app, title, body);
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos", windows)))]
    {
        app.notification()
            .builder()
            .title(title.to_string())
            .body(body.to_string())
            .sound(NOTIFICATION_SOUND_RESOURCE_NAME)
            .show()
            .map_err(|error| AppError::NotificationShow(error.to_string()))?;
        Ok(DesktopNotificationDispatch {
            notification_reference: None,
            delivery_method: "tauri-plugin-notification".to_string(),
            sound_reference: NOTIFICATION_SOUND_RESOURCE_NAME.to_string(),
        })
    }
}

/// Kick or restart the reminder worker (call after prefs/schedule/sync).
pub fn kick_reminder_scheduler(app: &AppHandle) {
    diagnostics::append_diagnostic_for_app(
        app,
        "notifications",
        "info",
        "scheduler",
        "kick",
        "reminder scheduler restarted",
    );

    let state = app.state::<AppState>();
    if let Ok(connection) = shared::open_connection(&state) {
        let _ = diagnostics::prune_diagnostics(&connection);
    }

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

    let tz = parse_tz(&schedule.timezone);
    let now_tz: DateTime<Tz> = Utc::now().with_timezone(&tz);
    let today = now_tz.date_naive();
    let day_key = today.format("%Y-%m-%d").to_string();
    let today_schedule = bootstrap::weekday_schedule_for_date(today, &schedule.weekday_schedules)
        .ok_or_else(|| AppError::NotificationShow("No shift end".to_string()))?;

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
        &schedule.weekday_schedules,
        app_prefs.holiday_country_code.as_deref(),
    )?;

    if target <= 0.01 {
        return Ok(());
    }

    let end_dt = end_of_shift_today(tz, today, today_schedule.shift_end.as_str())
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
    let urgency = match tier {
        reminder_messages::UrgencyTier::Calm | reminder_messages::UrgencyTier::Warming => {
            DesktopNotificationUrgency::Normal
        }
        reminder_messages::UrgencyTier::Urgent => DesktopNotificationUrgency::High,
        reminder_messages::UrgencyTier::Critical => DesktopNotificationUrgency::Critical,
    };

    show_workday_reminder(
        app,
        &title,
        &body,
        "scheduler",
        &format!("threshold_{expected_threshold}"),
        urgency,
    )?;
    tracker.fired.insert(expected_threshold);
    Ok(())
}

/// Send a test notification (Settings).
pub fn send_test_notification(
    app: &AppHandle,
    title: String,
    body: String,
) -> Result<(), AppError> {
    show_workday_reminder(
        app,
        &title,
        &body,
        "settings",
        "manual_test",
        DesktopNotificationUrgency::Normal,
    )
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
    let previous = notification_permission_label(app);
    app.notification()
        .request_permission()
        .map_err(|e| AppError::NotificationShow(e.to_string()))?;
    let next = notification_permission_label(app);
    let level = if previous == next { "warn" } else { "info" };
    diagnostics::append_diagnostic_for_app(
        app,
        "notifications",
        level,
        "settings",
        "permission_request",
        &format!("permission state {previous} -> {next}"),
    );
    Ok(next)
}

pub fn notification_permission_capability() -> String {
    #[cfg(target_os = "macos")]
    {
        "interactive".to_string()
    }
    #[cfg(not(target_os = "macos"))]
    {
        "system-settings".to_string()
    }
}

#[cfg(test)]
mod tests {
    use std::path::Path;
    use std::sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    };

    use super::{
        build_linux_freedesktop_notification_request_with_sound, build_windows_toast_request,
        hold_linux_notification_until_closed, linux_notification_close_reason_label,
        linux_notification_id, linux_notification_sound_path, linux_notification_timeout_ms,
        linux_notification_urgency, linux_notification_watchdog_duration,
        resolve_linux_desktop_entry_name, resolve_linux_notification_icon_name,
        should_apply_packaged_windows_app_id, should_use_packaged_linux_desktop_entry,
        slugify_linux_icon_name, windows_notification_sound_uri, DesktopNotificationUrgency,
        LinuxNotificationCloseReason, LinuxNotificationLifecycleOutcome,
        DESKTOP_NOTIFICATION_TIMEOUT_MS,
    };

    struct TestLease {
        drops: Arc<AtomicUsize>,
    }

    impl Drop for TestLease {
        fn drop(&mut self) {
            self.drops.fetch_add(1, Ordering::SeqCst);
        }
    }

    fn block_on<F: std::future::Future>(future: F) -> F::Output {
        tokio::runtime::Builder::new_current_thread()
            .enable_time()
            .build()
            .expect("tokio runtime")
            .block_on(future)
    }

    #[test]
    fn slugifies_linux_icon_names() {
        assert_eq!(slugify_linux_icon_name("Timely"), "timely");
        assert_eq!(slugify_linux_icon_name("Timely Desktop"), "timely-desktop");
        assert_eq!(slugify_linux_icon_name("  !!!  "), "timely");
    }

    #[test]
    fn builds_linux_sound_file_path_in_resource_dir() {
        let resource_dir = Path::new("/tmp/timely-resources");
        assert_eq!(
            linux_notification_sound_path(resource_dir),
            "/tmp/timely-resources/fox-notification.wav"
        );
    }

    #[test]
    fn builds_stable_linux_notification_ids() {
        assert_eq!(
            linux_notification_id("settings", "manual_test"),
            "timely.settings.manual-test"
        );
        assert_eq!(
            linux_notification_id("scheduler", "threshold_45"),
            "timely.scheduler.threshold-45"
        );
    }

    #[test]
    fn uses_product_name_for_packaged_linux_desktop_entry() {
        let resolved = resolve_linux_desktop_entry_name(
            Some("/usr/bin"),
            Some("timely"),
            Some("timely"),
            Some("Timely"),
        );

        assert_eq!(resolved, "Timely");
    }

    #[test]
    fn falls_back_to_binary_identity_for_dev_linux_desktop_entry() {
        assert_eq!(
            resolve_linux_desktop_entry_name(
                Some("/work/timely/src-tauri/target/debug"),
                Some("timely"),
                Some("Timely Beta"),
                Some("Timely"),
            ),
            "timely"
        );
        assert_eq!(
            resolve_linux_desktop_entry_name(
                Some("/work/timely/src-tauri/target/debug"),
                None,
                Some("Timely Beta"),
                Some("Timely"),
            ),
            "timely-beta"
        );
        assert_eq!(
            resolve_linux_desktop_entry_name(
                Some("/work/timely/src-tauri/target/debug"),
                None,
                None,
                Some("Timely Desktop"),
            ),
            "timely-desktop"
        );
    }

    #[test]
    fn uses_binary_slug_for_linux_notification_icon_name() {
        assert_eq!(
            resolve_linux_notification_icon_name(Some("timely"), Some("Timely"), Some("Timely")),
            "timely"
        );
        assert_eq!(
            resolve_linux_notification_icon_name(None, Some("Timely Beta"), Some("Timely")),
            "timely-beta"
        );
    }

    #[test]
    fn only_uses_packaged_linux_desktop_entry_outside_target_dirs() {
        assert!(!should_use_packaged_linux_desktop_entry(
            "/work/timely/src-tauri/target/debug"
        ));
        assert!(!should_use_packaged_linux_desktop_entry(
            "/work/timely/src-tauri/target/release"
        ));
        assert!(should_use_packaged_linux_desktop_entry("/usr/bin"));
    }

    #[test]
    fn only_uses_windows_app_id_for_packaged_paths() {
        assert!(!should_apply_packaged_windows_app_id(
            "C:/work/timely/src-tauri/target/debug"
        ));
        assert!(!should_apply_packaged_windows_app_id(
            "C:/work/timely/src-tauri/target/release"
        ));
        assert!(!should_apply_packaged_windows_app_id(
            "C:/work/timely/src-tauri/target/custom-profile"
        ));
        assert!(should_apply_packaged_windows_app_id(
            "C:/Program Files/Timely"
        ));
    }

    #[test]
    fn keeps_desktop_notification_defaults_stable() {
        assert_eq!(DESKTOP_NOTIFICATION_TIMEOUT_MS, 10_000);
        assert_eq!(linux_notification_timeout_ms(), 10_000);
        assert_eq!(
            DesktopNotificationUrgency::Normal,
            DesktopNotificationUrgency::Normal
        );
    }

    #[test]
    fn builds_windows_toast_request_with_custom_audio_uri() {
        let request = build_windows_toast_request(
            "Timely & co",
            "Body <fox>",
            DESKTOP_NOTIFICATION_TIMEOUT_MS,
            Some("com.opencraft.timely".to_string()),
        );

        assert_eq!(request.sound_uri, windows_notification_sound_uri());
        assert!(request
            .xml
            .contains(r#"<audio src="ms-appx:///fox-notification.wav"/>"#));
        assert!(request.xml.contains("Timely &amp; co"));
        assert!(request.xml.contains("Body &lt;fox&gt;"));
        assert_eq!(request.app_id.as_deref(), Some("com.opencraft.timely"));
    }

    #[test]
    fn linux_notification_request_uses_custom_sound_file_and_timeout() {
        let request = build_linux_freedesktop_notification_request_with_sound(
            "Title",
            "Body",
            "Timely",
            "timely",
            "Timely",
            DesktopNotificationUrgency::High,
            "/tmp/timely/fox-notification.wav".to_string(),
        );

        assert_eq!(request.desktop_entry, "Timely");
        assert_eq!(request.app_name, "Timely");
        assert_eq!(request.icon_name, "timely");
        assert_eq!(request.timeout_ms, DESKTOP_NOTIFICATION_TIMEOUT_MS);
        assert_eq!(
            request.urgency,
            linux_notification_urgency(DesktopNotificationUrgency::High)
        );
        assert_eq!(request.sound_file, "/tmp/timely/fox-notification.wav");
    }

    #[test]
    fn linux_watchdog_duration_stays_above_notification_timeout() {
        assert!(
            linux_notification_watchdog_duration().as_millis()
                > u128::from(DESKTOP_NOTIFICATION_TIMEOUT_MS)
        );
    }

    #[test]
    fn linux_close_reason_labels_match_diagnostic_copy() {
        assert_eq!(
            linux_notification_close_reason_label(LinuxNotificationCloseReason::Expired),
            "expired"
        );
        assert_eq!(
            linux_notification_close_reason_label(LinuxNotificationCloseReason::Dismissed),
            "dismissed"
        );
        assert_eq!(
            linux_notification_close_reason_label(LinuxNotificationCloseReason::CloseAction),
            "close_action"
        );
        assert_eq!(
            linux_notification_close_reason_label(LinuxNotificationCloseReason::Other(9)),
            "other:9"
        );
    }

    #[test]
    fn lifecycle_helper_releases_handle_after_close_reason() {
        let drops = Arc::new(AtomicUsize::new(0));
        let lease = TestLease {
            drops: drops.clone(),
        };

        let (notification_id, outcome) = block_on(hold_linux_notification_until_closed(
            23,
            lease,
            |_id, _timeout| async { Ok(Some(LinuxNotificationCloseReason::Dismissed)) },
        ));

        assert_eq!(notification_id, 23);
        assert_eq!(
            outcome,
            LinuxNotificationLifecycleOutcome::Closed(LinuxNotificationCloseReason::Dismissed)
        );
        assert_eq!(drops.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn lifecycle_helper_releases_handle_after_watchdog() {
        let drops = Arc::new(AtomicUsize::new(0));
        let lease = TestLease {
            drops: drops.clone(),
        };

        let (notification_id, outcome) = block_on(hold_linux_notification_until_closed(
            42,
            lease,
            |_id, _timeout| async { Ok(None) },
        ));

        assert_eq!(notification_id, 42);
        assert_eq!(outcome, LinuxNotificationLifecycleOutcome::WatchdogExpired);
        assert_eq!(drops.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn lifecycle_helper_releases_handle_after_listener_error() {
        let drops = Arc::new(AtomicUsize::new(0));
        let lease = TestLease {
            drops: drops.clone(),
        };

        let (notification_id, outcome) = block_on(hold_linux_notification_until_closed(
            99,
            lease,
            |_id, _timeout| async { Err("listener boom".to_string()) },
        ));

        assert_eq!(notification_id, 99);
        assert_eq!(
            outcome,
            LinuxNotificationLifecycleOutcome::ListenerFailed("listener boom".to_string())
        );
        assert_eq!(drops.load(Ordering::SeqCst), 1);
    }
}
