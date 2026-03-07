pub mod bootstrap;
pub mod connection;
pub mod oauth;
pub mod seed;

use std::{fs, path::PathBuf};

use chrono::Utc;
use rusqlite::Connection;
use tauri::{AppHandle, Manager};

use crate::error::AppError;

pub fn initialize(app: &AppHandle) -> Result<PathBuf, AppError> {
    let app_dir = app.path().app_data_dir()?;
    fs::create_dir_all(&app_dir)?;

    let db_path = app_dir.join("pulseboard.sqlite3");
    let connection = Connection::open(&db_path)?;
    migrate(&connection)?;
    seed::ensure_seed_data(&connection, &Utc::now().date_naive())?;

    Ok(db_path)
}

pub fn open(path: &PathBuf) -> Result<Connection, AppError> {
    Ok(Connection::open(path)?)
}

pub fn migrate(connection: &Connection) -> Result<(), AppError> {
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
        "#,
    )?;

    ensure_column(connection, "provider_accounts", "oauth_client_id", "TEXT")?;

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
