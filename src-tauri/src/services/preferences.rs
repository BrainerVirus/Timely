use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    domain::models::{AppPreferences, ScheduleRule, SetupState},
    error::AppError,
};

const DEFAULT_THEME_MODE: &str = "system";
const DEFAULT_LANGUAGE: &str = "auto";
const DEFAULT_UPDATE_CHANNEL: &str = "stable";
const DEFAULT_TIME_FORMAT: &str = "hm";
const DEFAULT_AUTO_SYNC_ENABLED: bool = true;
const DEFAULT_AUTO_SYNC_INTERVAL_MINUTES: u32 = 30;
const DEFAULT_TRAY_ENABLED: bool = true;
const DEFAULT_CLOSE_TO_TRAY: bool = true;
const DEFAULT_HOLIDAY_COUNTRY_MODE: &str = "auto";
const HOLIDAY_COUNTRY_KEY: &str = "holiday_country_code";
const HOLIDAY_COUNTRY_MODE_KEY: &str = "holiday_country_mode";
const LANGUAGE_KEY: &str = "language";
const UPDATE_CHANNEL_KEY: &str = "update_channel";
const THEME_MODE_KEY: &str = "theme_mode";
const TIME_FORMAT_KEY: &str = "time_format";
const AUTO_SYNC_ENABLED_KEY: &str = "auto_sync_enabled";
const AUTO_SYNC_INTERVAL_KEY: &str = "auto_sync_interval_minutes";
const TRAY_ENABLED_KEY: &str = "tray_enabled";
const CLOSE_TO_TRAY_KEY: &str = "close_to_tray";
const ONBOARDING_COMPLETED_KEY: &str = "onboarding_completed";

pub fn load_setup_state(connection: &Connection) -> Result<SetupState, AppError> {
    let state = connection
        .query_row(
            "SELECT current_step, completed_steps_json, is_complete FROM setup_state WHERE id = 1",
            [],
            |row| {
                let completed_steps_json: String = row.get(1)?;
                let completed_steps =
                    serde_json::from_str::<Vec<String>>(&completed_steps_json).unwrap_or_default();

                Ok(SetupState {
                    current_step: row.get(0)?,
                    is_complete: row.get::<_, i64>(2)? == 1,
                    completed_steps,
                })
            },
        )
        .optional()?;

    Ok(state.unwrap_or_else(default_setup_state))
}

pub fn save_setup_state(
    connection: &Connection,
    state: &SetupState,
) -> Result<SetupState, AppError> {
    let completed_steps_json =
        serde_json::to_string(&state.completed_steps).unwrap_or_else(|_| "[]".to_string());
    connection.execute(
        "INSERT INTO setup_state (id, current_step, completed_steps_json, is_complete, completed_at, updated_at)
         VALUES (1, ?1, ?2, ?3, CASE WHEN ?3 = 1 THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
           current_step = excluded.current_step,
           completed_steps_json = excluded.completed_steps_json,
           is_complete = excluded.is_complete,
           completed_at = CASE WHEN excluded.is_complete = 1 THEN CURRENT_TIMESTAMP ELSE setup_state.completed_at END,
           updated_at = CURRENT_TIMESTAMP",
        params![
            state.current_step,
            completed_steps_json,
            if state.is_complete { 1 } else { 0 }
        ],
    )?;

    load_setup_state(connection)
}

pub fn load_app_preferences(connection: &Connection) -> Result<AppPreferences, AppError> {
    let auto_sync_enabled = read_pref(connection, AUTO_SYNC_ENABLED_KEY)?
        .map(|v| v == "true")
        .unwrap_or(DEFAULT_AUTO_SYNC_ENABLED);
    let auto_sync_interval_minutes = read_pref(connection, AUTO_SYNC_INTERVAL_KEY)?
        .and_then(|v| v.parse::<u32>().ok())
        .unwrap_or(DEFAULT_AUTO_SYNC_INTERVAL_MINUTES);

    Ok(AppPreferences {
        theme_mode: read_pref(connection, THEME_MODE_KEY)?
            .unwrap_or_else(|| DEFAULT_THEME_MODE.to_string()),
        language: normalize_language_pref(read_pref(connection, LANGUAGE_KEY)?.as_deref())
            .to_string(),
        update_channel: normalize_update_channel_pref(
            read_pref(connection, UPDATE_CHANNEL_KEY)?.as_deref(),
        )
        .to_string(),
        holiday_country_mode: read_pref(connection, HOLIDAY_COUNTRY_MODE_KEY)?
            .unwrap_or_else(|| DEFAULT_HOLIDAY_COUNTRY_MODE.to_string()),
        holiday_country_code: read_pref(connection, HOLIDAY_COUNTRY_KEY)?,
        time_format: read_pref(connection, TIME_FORMAT_KEY)?
            .unwrap_or_else(|| DEFAULT_TIME_FORMAT.to_string()),
        auto_sync_enabled,
        auto_sync_interval_minutes,
        tray_enabled: read_pref(connection, TRAY_ENABLED_KEY)?
            .map(|v| v == "true")
            .unwrap_or(DEFAULT_TRAY_ENABLED),
        close_to_tray: read_pref(connection, CLOSE_TO_TRAY_KEY)?
            .map(|v| v == "true")
            .unwrap_or(DEFAULT_CLOSE_TO_TRAY),
        onboarding_completed: read_pref(connection, ONBOARDING_COMPLETED_KEY)?
            .map(|v| v == "true")
            .unwrap_or(false),
    })
}

pub fn save_app_preferences(
    connection: &Connection,
    preferences: &AppPreferences,
) -> Result<AppPreferences, AppError> {
    upsert_pref(connection, THEME_MODE_KEY, &preferences.theme_mode)?;
    upsert_pref(
        connection,
        LANGUAGE_KEY,
        normalize_language_pref(Some(&preferences.language)),
    )?;
    upsert_pref(
        connection,
        UPDATE_CHANNEL_KEY,
        normalize_update_channel_pref(Some(&preferences.update_channel)),
    )?;
    upsert_pref(connection, TIME_FORMAT_KEY, &preferences.time_format)?;
    upsert_pref(
        connection,
        AUTO_SYNC_ENABLED_KEY,
        if preferences.auto_sync_enabled {
            "true"
        } else {
            "false"
        },
    )?;
    upsert_pref(
        connection,
        AUTO_SYNC_INTERVAL_KEY,
        &preferences.auto_sync_interval_minutes.to_string(),
    )?;
    upsert_pref(
        connection,
        TRAY_ENABLED_KEY,
        if preferences.tray_enabled {
            "true"
        } else {
            "false"
        },
    )?;
    upsert_pref(
        connection,
        CLOSE_TO_TRAY_KEY,
        if preferences.close_to_tray {
            "true"
        } else {
            "false"
        },
    )?;
    upsert_pref(
        connection,
        ONBOARDING_COMPLETED_KEY,
        if preferences.onboarding_completed {
            "true"
        } else {
            "false"
        },
    )?;
    upsert_pref(
        connection,
        HOLIDAY_COUNTRY_MODE_KEY,
        &preferences.holiday_country_mode,
    )?;

    match preferences.holiday_country_code.as_deref() {
        Some(value) if !value.trim().is_empty() => {
            upsert_pref(connection, HOLIDAY_COUNTRY_KEY, value)?
        }
        _ => delete_pref(connection, HOLIDAY_COUNTRY_KEY)?,
    }

    delete_pref(connection, "holiday_region_code")?;

    load_app_preferences(connection)
}

pub fn load_schedule_rules(connection: &Connection) -> Result<Vec<ScheduleRule>, AppError> {
    let mut statement =
        connection.prepare("SELECT rule_type, rule_value FROM schedule_rules ORDER BY id ASC")?;

    let rows = statement.query_map([], |row| {
        Ok(ScheduleRule {
            rule_type: row.get(0)?,
            rule_value: row.get(1)?,
        })
    })?;

    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

fn upsert_pref(connection: &Connection, key: &str, value: &str) -> Result<(), AppError> {
    let value_json = serde_json::to_string(value).unwrap_or_else(|_| format!("\"{value}\""));
    connection.execute(
        "INSERT INTO app_preferences (key, value_json, updated_at)
         VALUES (?1, ?2, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP",
        params![key, value_json],
    )?;

    Ok(())
}

fn delete_pref(connection: &Connection, key: &str) -> Result<(), AppError> {
    connection.execute("DELETE FROM app_preferences WHERE key = ?1", [key])?;
    Ok(())
}

fn read_pref(connection: &Connection, key: &str) -> Result<Option<String>, AppError> {
    let value = connection
        .query_row(
            "SELECT value_json FROM app_preferences WHERE key = ?1",
            [key],
            |row| row.get::<_, String>(0),
        )
        .optional()?;

    Ok(value.and_then(|raw| serde_json::from_str::<String>(&raw).ok()))
}

fn default_setup_state() -> SetupState {
    SetupState {
        current_step: "welcome".to_string(),
        is_complete: false,
        completed_steps: vec![],
    }
}

fn normalize_language_pref(value: Option<&str>) -> &str {
    match value.unwrap_or(DEFAULT_LANGUAGE) {
        "auto" | "en" | "es" | "pt" => value.unwrap_or(DEFAULT_LANGUAGE),
        _ => DEFAULT_LANGUAGE,
    }
}

fn normalize_update_channel_pref(value: Option<&str>) -> &str {
    match value.unwrap_or(DEFAULT_UPDATE_CHANNEL) {
        "stable" | "unstable" => value.unwrap_or(DEFAULT_UPDATE_CHANNEL),
        _ => DEFAULT_UPDATE_CHANNEL,
    }
}
