use std::process::Command;

use chrono::{Local, Utc};
use rusqlite::{params, Connection};
use tauri::{AppHandle, Manager};

use crate::{
    domain::models::DiagnosticLogEntry,
    error::AppError,
    services::{localization, preferences, shared},
    state::AppState,
};

const DIAGNOSTICS_KEEP_DAYS: i64 = 7;
const DIAGNOSTICS_MAX_PER_DAY: u32 = 250;
const DIAGNOSTICS_MAX_TOTAL: u32 = 1200;

fn platform_label() -> &'static str {
    #[cfg(target_os = "macos")]
    {
        "macos"
    }
    #[cfg(target_os = "linux")]
    {
        "linux"
    }
    #[cfg(target_os = "windows")]
    {
        "windows"
    }
    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    {
        "unknown"
    }
}

pub fn append_diagnostic(
    connection: &Connection,
    feature: &str,
    level: &str,
    source: &str,
    event: &str,
    message: &str,
) -> Result<(), AppError> {
    let now = Local::now();
    connection.execute(
        "INSERT INTO diagnostic_logs (timestamp, day_key, feature, level, source, event, platform, message)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            now.to_rfc3339(),
            now.format("%Y-%m-%d").to_string(),
            feature,
            level,
            source,
            event,
            platform_label(),
            message
        ],
    )?;
    prune_diagnostics(connection)?;
    Ok(())
}

pub fn append_diagnostic_for_app(
    app: &AppHandle,
    feature: &str,
    level: &str,
    source: &str,
    event: &str,
    message: &str,
) {
    let state = app.state::<AppState>();
    let result = shared::open_connection(&state).and_then(|connection| {
        append_diagnostic(&connection, feature, level, source, event, message)
    });

    if let Err(error) = result {
        crate::support::logging::info(format!(
            "[timely][diagnostics] failed to append diagnostic entry: {error}"
        ));
    }
}

pub fn prune_diagnostics(connection: &Connection) -> Result<(), AppError> {
    let cutoff_day = (Local::now().date_naive()
        - chrono::Duration::days(DIAGNOSTICS_KEEP_DAYS - 1))
    .format("%Y-%m-%d")
    .to_string();

    connection.execute(
        "DELETE FROM diagnostic_logs WHERE day_key < ?1",
        [cutoff_day],
    )?;

    connection.execute(
        "DELETE FROM diagnostic_logs
         WHERE id IN (
             SELECT id FROM diagnostic_logs
             WHERE day_key = ?1
             ORDER BY id DESC
             LIMIT -1 OFFSET ?2
         )",
        params![
            Local::now().format("%Y-%m-%d").to_string(),
            i64::from(DIAGNOSTICS_MAX_PER_DAY)
        ],
    )?;

    connection.execute(
        "DELETE FROM diagnostic_logs
         WHERE id NOT IN (
             SELECT id FROM diagnostic_logs
             ORDER BY id DESC
             LIMIT ?1
         )",
        [i64::from(DIAGNOSTICS_MAX_TOTAL)],
    )?;

    Ok(())
}

pub fn list_diagnostics(
    connection: &Connection,
    feature: Option<&str>,
    limit: u32,
) -> Result<Vec<DiagnosticLogEntry>, AppError> {
    let applied_limit = i64::from(limit.min(1000));

    if let Some(feature_name) = feature {
        let mut statement = connection.prepare(
            "SELECT id, timestamp, day_key, level, feature, source, event, platform, message
             FROM diagnostic_logs
             WHERE feature = ?1
             ORDER BY id DESC
             LIMIT ?2",
        )?;
        let rows = statement
            .query_map(params![feature_name, applied_limit], |row| {
                Ok(DiagnosticLogEntry {
                    id: row.get(0)?,
                    timestamp: row.get(1)?,
                    day_key: row.get(2)?,
                    level: row.get(3)?,
                    feature: row.get(4)?,
                    source: row.get(5)?,
                    event: row.get(6)?,
                    platform: row.get(7)?,
                    message: row.get(8)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        return Ok(rows);
    }

    let mut statement = connection.prepare(
        "SELECT id, timestamp, day_key, level, feature, source, event, platform, message
         FROM diagnostic_logs
         ORDER BY id DESC
         LIMIT ?1",
    )?;
    let rows = statement
        .query_map([applied_limit], |row| {
            Ok(DiagnosticLogEntry {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                day_key: row.get(2)?,
                level: row.get(3)?,
                feature: row.get(4)?,
                source: row.get(5)?,
                event: row.get(6)?,
                platform: row.get(7)?,
                message: row.get(8)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(rows)
}

pub fn list_diagnostics_for_app(
    app: &AppHandle,
    feature: Option<&str>,
    limit: u32,
) -> Result<Vec<DiagnosticLogEntry>, AppError> {
    let state = app.state::<AppState>();
    let connection = shared::open_connection(&state)?;
    list_diagnostics(&connection, feature, limit)
}

pub fn clear_diagnostics(connection: &Connection, feature: Option<&str>) -> Result<(), AppError> {
    match feature {
        Some(feature_name) => {
            connection.execute(
                "DELETE FROM diagnostic_logs WHERE feature = ?1",
                [feature_name],
            )?;
        }
        None => {
            connection.execute("DELETE FROM diagnostic_logs", [])?;
        }
    }

    Ok(())
}

pub fn export_diagnostics_for_app(
    app: &AppHandle,
    feature: Option<&str>,
    limit: u32,
) -> Result<String, AppError> {
    let entries = list_diagnostics_for_app(app, feature, limit)?;
    let mut lines = vec![
        "# Timely diagnostics".to_string(),
        format!("generated_at: {}", Utc::now().to_rfc3339()),
        format!("platform: {}", platform_label()),
        format!("feature_filter: {}", feature.unwrap_or("all")),
        format!("entries: {}", entries.len()),
        String::new(),
    ];

    for entry in entries {
        lines.push(format!(
            "{} [{}] [{}] [{}:{}] {}",
            entry.timestamp, entry.level, entry.feature, entry.source, entry.event, entry.message
        ));
    }

    Ok(lines.join("\n"))
}

pub fn open_system_notification_settings(locale: localization::AppLocale) -> Result<(), AppError> {
    #[cfg(target_os = "macos")]
    {
        let urls = [
            "x-apple.systempreferences:com.apple.Notifications-Settings.extension",
            "x-apple.systempreferences:com.apple.preference.notifications",
        ];

        for url in urls {
            if Command::new("open")
                .arg(url)
                .status()
                .is_ok_and(|status| status.success())
            {
                return Ok(());
            }
        }

        Err(AppError::NotificationShow(
            localization::diagnostics_open_settings_error(locale, "macos"),
        ))
    }

    #[cfg(target_os = "windows")]
    {
        let status = Command::new("cmd")
            .args(["/C", "start", "", "ms-settings:notifications"])
            .status()?;

        if status.success() {
            return Ok(());
        }

        Err(AppError::NotificationShow(
            localization::diagnostics_open_settings_error(locale, "windows"),
        ))
    }

    #[cfg(target_os = "linux")]
    {
        let candidates: [(&str, &[&str]); 5] = [
            ("gnome-control-center", &["notifications"]),
            ("kcmshell6", &["kcm_notifications"]),
            ("kcmshell5", &["kcm_notifications"]),
            ("systemsettings5", &["kcm_notifications"]),
            ("systemsettings", &["kcm_notifications"]),
        ];

        for (command, args) in candidates {
            if Command::new(command)
                .args(args)
                .status()
                .is_ok_and(|status| status.success())
            {
                return Ok(());
            }
        }

        Err(AppError::NotificationShow(
            localization::diagnostics_open_settings_error(locale, "linux"),
        ))
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        Err(AppError::NotificationShow(
            localization::diagnostics_open_settings_error(locale, "other"),
        ))
    }
}

pub fn locale_for_app(app: &AppHandle) -> localization::AppLocale {
    let state = app.state::<AppState>();
    let locale = shared::open_connection(&state)
        .and_then(|connection| preferences::load_app_preferences(&connection))
        .map(|preferences| localization::AppLocale::from_language_pref(&preferences.language));

    locale.unwrap_or(localization::AppLocale::En)
}
