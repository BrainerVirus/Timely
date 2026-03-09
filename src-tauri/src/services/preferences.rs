use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    domain::models::{AppPreferences, ScheduleRule, SetupState},
    error::AppError,
};

const DEFAULT_THEME_MODE: &str = "system";
const DEFAULT_LANGUAGE: &str = "en";
const DEFAULT_TIME_FORMAT: &str = "hm";
const HOLIDAY_COUNTRY_KEY: &str = "holiday_country_code";
const HOLIDAY_REGION_KEY: &str = "holiday_region_code";
const LANGUAGE_KEY: &str = "language";
const THEME_MODE_KEY: &str = "theme_mode";
const TIME_FORMAT_KEY: &str = "time_format";

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
    Ok(AppPreferences {
        theme_mode: read_pref(connection, THEME_MODE_KEY)?
            .unwrap_or_else(|| DEFAULT_THEME_MODE.to_string()),
        language: read_pref(connection, LANGUAGE_KEY)?
            .unwrap_or_else(|| DEFAULT_LANGUAGE.to_string()),
        holiday_country_code: read_pref(connection, HOLIDAY_COUNTRY_KEY)?,
        holiday_region_code: read_pref(connection, HOLIDAY_REGION_KEY)?,
        time_format: read_pref(connection, TIME_FORMAT_KEY)?
            .unwrap_or_else(|| DEFAULT_TIME_FORMAT.to_string()),
    })
}

pub fn save_app_preferences(
    connection: &Connection,
    preferences: &AppPreferences,
) -> Result<AppPreferences, AppError> {
    upsert_pref(connection, THEME_MODE_KEY, &preferences.theme_mode)?;
    upsert_pref(connection, LANGUAGE_KEY, &preferences.language)?;
    upsert_pref(connection, TIME_FORMAT_KEY, &preferences.time_format)?;

    match preferences.holiday_country_code.as_deref() {
        Some(value) if !value.trim().is_empty() => {
            upsert_pref(connection, HOLIDAY_COUNTRY_KEY, value)?
        }
        _ => delete_pref(connection, HOLIDAY_COUNTRY_KEY)?,
    }

    match preferences.holiday_region_code.as_deref() {
        Some(value) if !value.trim().is_empty() => {
            upsert_pref(connection, HOLIDAY_REGION_KEY, value)?
        }
        _ => delete_pref(connection, HOLIDAY_REGION_KEY)?,
    }

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
