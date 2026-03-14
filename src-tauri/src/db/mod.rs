pub mod bootstrap;
pub mod connection;
pub mod oauth;
pub mod seed;
pub mod sync;

use std::{fs, path::PathBuf};

use rusqlite::Connection;
use tauri::{AppHandle, Manager};

use crate::error::AppError;

pub fn initialize(app: &AppHandle) -> Result<PathBuf, AppError> {
    let app_dir = app.path().app_data_dir()?;
    fs::create_dir_all(&app_dir)?;

    let db_path = app_dir.join("timely.sqlite3");
    let connection = Connection::open(&db_path)?;
    migrate(&connection)?;

    Ok(db_path)
}

pub fn open(path: &PathBuf) -> Result<Connection, AppError> {
    Ok(Connection::open(path)?)
}

pub fn migrate(connection: &Connection) -> Result<(), AppError> {
    connection.pragma_update(None, "user_version", 1)?;
    connection.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS provider_accounts (
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

        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_account_id INTEGER NOT NULL,
            provider_project_id TEXT NOT NULL,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            metadata_json TEXT,
            FOREIGN KEY(provider_account_id) REFERENCES provider_accounts(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS work_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_account_id INTEGER NOT NULL,
            provider_item_id TEXT NOT NULL,
            title TEXT NOT NULL,
            state TEXT NOT NULL,
            web_url TEXT,
            labels_json TEXT,
            raw_json TEXT,
            updated_at TEXT,
            FOREIGN KEY(provider_account_id) REFERENCES provider_accounts(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS time_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_account_id INTEGER NOT NULL,
            provider_entry_id TEXT NOT NULL,
            work_item_id INTEGER,
            spent_at TEXT NOT NULL,
            seconds INTEGER NOT NULL,
            raw_json TEXT,
            FOREIGN KEY(provider_account_id) REFERENCES provider_accounts(id) ON DELETE CASCADE,
            FOREIGN KEY(work_item_id) REFERENCES work_items(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS schedule_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_account_id INTEGER,
            timezone TEXT NOT NULL,
            hours_per_day REAL NOT NULL,
            workdays_json TEXT NOT NULL,
            is_default INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY(provider_account_id) REFERENCES provider_accounts(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS daily_buckets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_account_id INTEGER,
            date TEXT NOT NULL,
            target_seconds INTEGER NOT NULL,
            logged_seconds INTEGER NOT NULL,
            variance_seconds INTEGER NOT NULL,
            status TEXT NOT NULL,
            FOREIGN KEY(provider_account_id) REFERENCES provider_accounts(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS sync_cursors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_account_id INTEGER,
            entity_type TEXT NOT NULL,
            cursor_value TEXT,
            synced_at TEXT NOT NULL,
            FOREIGN KEY(provider_account_id) REFERENCES provider_accounts(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS gamification_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_account_id INTEGER,
            xp INTEGER NOT NULL,
            level INTEGER NOT NULL,
            streak_days INTEGER NOT NULL,
            badges_json TEXT,
            companion_state_json TEXT,
            FOREIGN KEY(provider_account_id) REFERENCES provider_accounts(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS oauth_sessions (
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

        CREATE TABLE IF NOT EXISTS app_profile (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            alias TEXT NOT NULL DEFAULT 'Pilot',
            locale TEXT NOT NULL DEFAULT 'en',
            timezone TEXT NOT NULL DEFAULT 'UTC',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS app_preferences (
            key TEXT PRIMARY KEY,
            value_json TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS setup_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            current_step TEXT NOT NULL DEFAULT 'welcome',
            completed_steps_json TEXT NOT NULL DEFAULT '[]',
            is_complete INTEGER NOT NULL DEFAULT 0,
            completed_at TEXT,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS schedule_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_account_id INTEGER,
            rule_type TEXT NOT NULL,
            rule_value TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(provider_account_id) REFERENCES provider_accounts(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS quest_definitions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quest_key TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            reward_label TEXT NOT NULL,
            target_value INTEGER NOT NULL DEFAULT 1,
            cadence TEXT NOT NULL DEFAULT 'daily',
            category TEXT NOT NULL DEFAULT 'focus',
            active INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS quest_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_account_id INTEGER,
            quest_key TEXT NOT NULL,
            progress_value INTEGER NOT NULL DEFAULT 0,
            claimed_at TEXT,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(provider_account_id) REFERENCES provider_accounts(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS reward_inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_account_id INTEGER,
            reward_key TEXT NOT NULL,
            reward_name TEXT NOT NULL,
            reward_type TEXT NOT NULL,
            cost_tokens INTEGER NOT NULL DEFAULT 0,
            equipped INTEGER NOT NULL DEFAULT 0,
            unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(provider_account_id) REFERENCES provider_accounts(id) ON DELETE SET NULL
        );
        "#,
    )?;

    ensure_column(connection, "provider_accounts", "oauth_client_id", "TEXT")?;
    ensure_column(
        connection,
        "provider_accounts",
        "personal_access_token",
        "TEXT",
    )?;
    ensure_column(connection, "time_entries", "uploaded_at", "TEXT")?;
    ensure_column(connection, "schedule_profiles", "shift_start", "TEXT")?;
    ensure_column(connection, "schedule_profiles", "shift_end", "TEXT")?;
    ensure_column(connection, "schedule_profiles", "lunch_minutes", "INTEGER")?;
    ensure_column(connection, "schedule_profiles", "week_start", "TEXT")?;
    ensure_column(
        connection,
        "quest_definitions",
        "cadence",
        "TEXT NOT NULL DEFAULT 'daily'",
    )?;
    ensure_column(
        connection,
        "quest_definitions",
        "category",
        "TEXT NOT NULL DEFAULT 'focus'",
    )?;

    connection.execute(
        "INSERT OR IGNORE INTO app_profile (id, alias, locale, timezone) VALUES (1, 'Pilot', 'en', 'UTC')",
        [],
    )?;
    connection.execute(
        "INSERT OR IGNORE INTO setup_state (id, current_step, completed_steps_json, is_complete) VALUES (1, 'welcome', '[]', 0)",
        [],
    )?;
    connection.execute(
        "INSERT OR IGNORE INTO quest_definitions (quest_key, title, description, reward_label, target_value, cadence, category)
         VALUES
           ('balanced_day', 'Balanced day', 'Meet your target without overflow.', '50 tokens', 1, 'daily', 'consistency'),
           ('clean_week', 'Clean week', 'Finish the week with no under-target workdays.', 'Companion XP', 5, 'weekly', 'consistency'),
           ('issue_sprinter', 'Issue sprinter', 'Close focused issues quickly and cleanly.', 'Desk cosmetic', 3, 'weekly', 'focus'),
           ('streak_keeper', 'Streak keeper', 'Protect a seven-day streak without breaking the chain.', 'Fox trail badge', 7, 'achievement', 'milestone')",
        [],
    )?;

    Ok(())
}

fn ensure_column(
    connection: &Connection,
    table: &str,
    column: &str,
    definition: &str,
) -> Result<(), AppError> {
    let mut statement = connection.prepare(&format!("PRAGMA table_info({table})"))?;
    let columns = statement.query_map([], |row| row.get::<_, String>(1))?;
    let exists = columns.flatten().any(|name| name == column);

    if !exists {
        connection.execute(
            &format!("ALTER TABLE {table} ADD COLUMN {column} {definition}"),
            [],
        )?;
    }

    Ok(())
}
