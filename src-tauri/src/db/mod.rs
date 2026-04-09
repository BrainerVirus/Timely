pub mod bootstrap;
pub mod connection;
pub mod oauth;
pub mod seed;
pub mod sync;

use std::{fs, path::PathBuf};

use rusqlite::{params, Connection};
use tauri::{AppHandle, Manager};

use crate::error::AppError;

pub struct RewardSeedDefinition {
    pub reward_key: &'static str,
    pub reward_name: &'static str,
    pub reward_type: &'static str,
    pub accessory_slot: &'static str,
    pub companion_variant: Option<&'static str>,
    pub environment_scene_key: Option<&'static str>,
    pub theme_tag: Option<&'static str>,
    pub cost_tokens: i64,
    pub featured: bool,
    pub rarity: &'static str,
    pub store_section: &'static str,
    pub unlock_rule: Option<&'static str>,
}

pub struct QuestSeedDefinition {
    pub quest_key: &'static str,
    pub title: &'static str,
    pub description: &'static str,
    pub reward_label: &'static str,
    pub target_value: i64,
    pub cadence: &'static str,
    pub category: &'static str,
    pub active: bool,
}

pub const DEFAULT_REWARD_DEFINITIONS: &[RewardSeedDefinition] = &[
    RewardSeedDefinition {
        reward_key: "aurora-evolution",
        reward_name: "Aurora Evolution",
        reward_type: "companion",
        accessory_slot: "companion",
        companion_variant: Some("arctic"),
        environment_scene_key: None,
        theme_tag: None,
        cost_tokens: 120,
        featured: true,
        rarity: "epic",
        store_section: "companions",
        unlock_rule: None,
    },
    RewardSeedDefinition {
        reward_key: "kitsune-lumen",
        reward_name: "Kitsune Lumen",
        reward_type: "companion",
        accessory_slot: "companion",
        companion_variant: Some("kitsune"),
        environment_scene_key: None,
        theme_tag: None,
        cost_tokens: 160,
        featured: true,
        rarity: "epic",
        store_section: "companions",
        unlock_rule: None,
    },
    RewardSeedDefinition {
        reward_key: "starlit-camp",
        reward_name: "Starlit Camp",
        reward_type: "habitat-scene",
        accessory_slot: "environment",
        companion_variant: None,
        environment_scene_key: Some("starlit-camp"),
        theme_tag: Some("focus"),
        cost_tokens: 140,
        featured: true,
        rarity: "epic",
        store_section: "featured",
        unlock_rule: None,
    },
    RewardSeedDefinition {
        reward_key: "sunlit-studio",
        reward_name: "Sunlit Studio",
        reward_type: "habitat-scene",
        accessory_slot: "environment",
        companion_variant: None,
        environment_scene_key: Some("sunlit-studio"),
        theme_tag: Some("craft"),
        cost_tokens: 110,
        featured: true,
        rarity: "rare",
        store_section: "featured",
        unlock_rule: None,
    },
    RewardSeedDefinition {
        reward_key: "rainy-retreat",
        reward_name: "Rainy Retreat",
        reward_type: "habitat-scene",
        accessory_slot: "environment",
        companion_variant: None,
        environment_scene_key: Some("rainy-retreat"),
        theme_tag: Some("recovery"),
        cost_tokens: 95,
        featured: true,
        rarity: "rare",
        store_section: "featured",
        unlock_rule: Some("recovery_day"),
    },
    RewardSeedDefinition {
        reward_key: "frame-signal",
        reward_name: "Signal Frame",
        reward_type: "avatar-frame",
        accessory_slot: "eyewear",
        companion_variant: None,
        environment_scene_key: None,
        theme_tag: None,
        cost_tokens: 80,
        featured: true,
        rarity: "rare",
        store_section: "featured",
        unlock_rule: None,
    },
    RewardSeedDefinition {
        reward_key: "desk-constellation",
        reward_name: "Desk Constellation",
        reward_type: "desk-item",
        accessory_slot: "charm",
        companion_variant: None,
        environment_scene_key: None,
        theme_tag: None,
        cost_tokens: 50,
        featured: false,
        rarity: "common",
        store_section: "accessories",
        unlock_rule: None,
    },
    RewardSeedDefinition {
        reward_key: "restful-tea-set",
        reward_name: "Restful Tea Set",
        reward_type: "desk-item",
        accessory_slot: "charm",
        companion_variant: None,
        environment_scene_key: None,
        theme_tag: Some("recovery"),
        cost_tokens: 40,
        featured: false,
        rarity: "common",
        store_section: "accessories",
        unlock_rule: Some("recovery_day"),
    },
    RewardSeedDefinition {
        reward_key: "weekend-pennant",
        reward_name: "Weekend Pennant",
        reward_type: "desk-item",
        accessory_slot: "charm",
        companion_variant: None,
        environment_scene_key: None,
        theme_tag: Some("recovery"),
        cost_tokens: 55,
        featured: false,
        rarity: "rare",
        store_section: "accessories",
        unlock_rule: Some("non_workday"),
    },
    RewardSeedDefinition {
        reward_key: "aurora-scarf",
        reward_name: "Aurora Scarf",
        reward_type: "neckwear",
        accessory_slot: "neckwear",
        companion_variant: None,
        environment_scene_key: None,
        theme_tag: None,
        cost_tokens: 65,
        featured: true,
        rarity: "rare",
        store_section: "featured",
        unlock_rule: None,
    },
    RewardSeedDefinition {
        reward_key: "comet-cap",
        reward_name: "Comet Cap",
        reward_type: "headwear",
        accessory_slot: "headwear",
        companion_variant: None,
        environment_scene_key: None,
        theme_tag: None,
        cost_tokens: 70,
        featured: false,
        rarity: "common",
        store_section: "accessories",
        unlock_rule: None,
    },
];

pub const DEFAULT_QUEST_DEFINITIONS: &[QuestSeedDefinition] = &[
    QuestSeedDefinition {
        quest_key: "balanced_day",
        title: "Balanced day",
        description: "Meet your target without overflow.",
        reward_label: "50 tokens",
        target_value: 1,
        cadence: "daily",
        category: "consistency",
        active: true,
    },
    QuestSeedDefinition {
        quest_key: "clean_week",
        title: "Clean week",
        description: "Finish the week with no under-target workdays.",
        reward_label: "75 tokens",
        target_value: 5,
        cadence: "weekly",
        category: "consistency",
        active: true,
    },
    QuestSeedDefinition {
        quest_key: "issue_sprinter",
        title: "Issue sprinter",
        description: "Close focused issues quickly and cleanly.",
        reward_label: "45 tokens",
        target_value: 3,
        cadence: "weekly",
        category: "focus",
        active: true,
    },
    QuestSeedDefinition {
        quest_key: "recovery_window",
        title: "Recovery window",
        description: "Take a true day off or keep activity intentionally light.",
        reward_label: "40 tokens",
        target_value: 1,
        cadence: "weekly",
        category: "consistency",
        active: true,
    },
    QuestSeedDefinition {
        quest_key: "weekend_wander",
        title: "Weekend wander",
        description: "Log a non-workday and keep it gentle.",
        reward_label: "35 tokens",
        target_value: 1,
        cadence: "daily",
        category: "focus",
        active: true,
    },
    QuestSeedDefinition {
        quest_key: "streak_keeper",
        title: "Streak keeper",
        description: "Protect a seven-day streak without breaking the chain.",
        reward_label: "Fox trail badge",
        target_value: 7,
        cadence: "achievement",
        category: "milestone",
        active: true,
    },
];

#[cfg(test)]
pub const TEST_QUEST_DEFINITIONS: &[QuestSeedDefinition] = &[
    QuestSeedDefinition {
        quest_key: "daily_extra",
        title: "Daily extra",
        description: "Another daily slot.",
        reward_label: "10 tokens",
        target_value: 1,
        cadence: "daily",
        category: "focus",
        active: true,
    },
    QuestSeedDefinition {
        quest_key: "daily_third",
        title: "Daily third",
        description: "Third daily slot.",
        reward_label: "10 tokens",
        target_value: 1,
        cadence: "daily",
        category: "focus",
        active: true,
    },
    QuestSeedDefinition {
        quest_key: "daily_fourth",
        title: "Daily fourth",
        description: "Fourth daily slot.",
        reward_label: "10 tokens",
        target_value: 1,
        cadence: "daily",
        category: "focus",
        active: true,
    },
];

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

        CREATE TABLE IF NOT EXISTS iteration_catalog (
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
            weekday_schedule_json TEXT,
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
            token_balance INTEGER NOT NULL DEFAULT 0,
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

        CREATE TABLE IF NOT EXISTS diagnostic_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            day_key TEXT NOT NULL,
            feature TEXT NOT NULL,
            level TEXT NOT NULL,
            source TEXT NOT NULL,
            event TEXT NOT NULL,
            platform TEXT NOT NULL,
            message TEXT NOT NULL
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
            is_active INTEGER NOT NULL DEFAULT 0,
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
            accessory_slot TEXT NOT NULL DEFAULT 'environment',
            environment_scene_key TEXT,
            theme_tag TEXT,
            cost_tokens INTEGER NOT NULL DEFAULT 0,
            owned INTEGER NOT NULL DEFAULT 0,
            equipped INTEGER NOT NULL DEFAULT 0,
            unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(provider_account_id) REFERENCES provider_accounts(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS reward_catalog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reward_key TEXT NOT NULL UNIQUE,
            reward_name TEXT NOT NULL,
            reward_type TEXT NOT NULL,
            accessory_slot TEXT NOT NULL DEFAULT 'environment',
            companion_variant TEXT,
            environment_scene_key TEXT,
            theme_tag TEXT,
            cost_tokens INTEGER NOT NULL DEFAULT 0,
            featured INTEGER NOT NULL DEFAULT 0,
            rarity TEXT NOT NULL DEFAULT 'common',
            store_section TEXT NOT NULL DEFAULT 'accessories'
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
        "schedule_profiles",
        "weekday_schedule_json",
        "TEXT",
    )?;
    ensure_column(
        connection,
        "gamification_profiles",
        "token_balance",
        "INTEGER NOT NULL DEFAULT 0",
    )?;
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
    ensure_column(
        connection,
        "quest_progress",
        "is_active",
        "INTEGER NOT NULL DEFAULT 0",
    )?;
    ensure_column(
        connection,
        "reward_inventory",
        "owned",
        "INTEGER NOT NULL DEFAULT 0",
    )?;
    ensure_column(
        connection,
        "reward_inventory",
        "accessory_slot",
        "TEXT NOT NULL DEFAULT 'environment'",
    )?;
    ensure_column(
        connection,
        "reward_catalog",
        "accessory_slot",
        "TEXT NOT NULL DEFAULT 'environment'",
    )?;
    ensure_column(connection, "reward_catalog", "companion_variant", "TEXT")?;
    ensure_column(
        connection,
        "reward_inventory",
        "environment_scene_key",
        "TEXT",
    )?;
    ensure_column(connection, "reward_inventory", "theme_tag", "TEXT")?;
    ensure_column(
        connection,
        "reward_catalog",
        "environment_scene_key",
        "TEXT",
    )?;
    ensure_column(connection, "reward_catalog", "theme_tag", "TEXT")?;
    ensure_column(
        connection,
        "reward_catalog",
        "featured",
        "INTEGER NOT NULL DEFAULT 0",
    )?;
    ensure_column(
        connection,
        "reward_catalog",
        "rarity",
        "TEXT NOT NULL DEFAULT 'common'",
    )?;
    ensure_column(
        connection,
        "reward_catalog",
        "store_section",
        "TEXT NOT NULL DEFAULT 'accessories'",
    )?;
    connection.execute(
        "INSERT OR IGNORE INTO app_profile (id, alias, locale, timezone) VALUES (1, 'Pilot', 'en', 'UTC')",
        [],
    )?;
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_diagnostic_logs_day_key
         ON diagnostic_logs(day_key)",
        [],
    )?;
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_diagnostic_logs_feature
         ON diagnostic_logs(feature)",
        [],
    )?;
    migrate_notification_diagnostics_to_generic_logs(connection)?;
    backfill_weekday_schedule_json(connection)?;
    connection.execute(
        "INSERT OR IGNORE INTO setup_state (id, current_step, completed_steps_json, is_complete) VALUES (1, 'welcome', '[]', 0)",
        [],
    )?;
    seed_quest_definitions(connection, DEFAULT_QUEST_DEFINITIONS)?;

    seed_reward_catalog(connection)?;

    connection.execute(
        "UPDATE reward_catalog
         SET environment_scene_key = CASE reward_key
             WHEN 'starlit-camp' THEN 'starlit-camp'
             WHEN 'sunlit-studio' THEN 'sunlit-studio'
             WHEN 'rainy-retreat' THEN 'rainy-retreat'
             ELSE environment_scene_key
         END,
         theme_tag = CASE reward_key
             WHEN 'starlit-camp' THEN 'focus'
             WHEN 'sunlit-studio' THEN 'craft'
             WHEN 'rainy-retreat' THEN 'recovery'
             ELSE theme_tag
         END
         WHERE reward_type = 'habitat-scene' AND (environment_scene_key IS NULL OR theme_tag IS NULL)",
        [],
    )?;

    connection.execute(
        "UPDATE reward_inventory
         SET environment_scene_key = CASE reward_key
             WHEN 'starlit-camp' THEN 'starlit-camp'
             WHEN 'sunlit-studio' THEN 'sunlit-studio'
             WHEN 'rainy-retreat' THEN 'rainy-retreat'
             ELSE environment_scene_key
         END,
         theme_tag = CASE reward_key
             WHEN 'starlit-camp' THEN 'focus'
             WHEN 'sunlit-studio' THEN 'craft'
             WHEN 'rainy-retreat' THEN 'recovery'
             ELSE theme_tag
         END
         WHERE reward_type = 'habitat-scene' AND (environment_scene_key IS NULL OR theme_tag IS NULL)",
        [],
    )?;

    dedupe_reward_inventory(connection)?;
    connection.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_reward_inventory_provider_reward_key
         ON reward_inventory(provider_account_id, reward_key)",
        [],
    )?;

    ensure_column(connection, "work_items", "issue_graphql_id", "TEXT")?;
    ensure_column(connection, "work_items", "milestone_title", "TEXT")?;
    ensure_column(connection, "work_items", "iteration_title", "TEXT")?;
    ensure_column(connection, "work_items", "iteration_start_date", "TEXT")?;
    ensure_column(connection, "work_items", "iteration_due_date", "TEXT")?;
    ensure_column(connection, "work_items", "iteration_gitlab_id", "TEXT")?;
    ensure_column(connection, "work_items", "iteration_group_id", "TEXT")?;
    ensure_column(connection, "work_items", "iteration_cadence_id", "TEXT")?;
    ensure_column(connection, "work_items", "iteration_cadence_title", "TEXT")?;
    ensure_column(
        connection,
        "work_items",
        "from_assigned_sync",
        "INTEGER NOT NULL DEFAULT 0",
    )?;
    connection.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_iteration_catalog_provider_iteration
         ON iteration_catalog(provider_account_id, iteration_gitlab_id)",
        [],
    )?;
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_iteration_catalog_provider_cadence
         ON iteration_catalog(provider_account_id, cadence_title)",
        [],
    )?;

    Ok(())
}

fn backfill_weekday_schedule_json(connection: &Connection) -> Result<(), AppError> {
    let mut statement = connection.prepare(
        "SELECT id, weekday_schedule_json, workdays_json, shift_start, shift_end, lunch_minutes
         FROM schedule_profiles",
    )?;
    let rows = statement.query_map([], |row| {
        Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, Option<String>>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, Option<String>>(3)?,
            row.get::<_, Option<String>>(4)?,
            row.get::<_, Option<u32>>(5)?,
        ))
    })?;
    let profiles = rows.collect::<Result<Vec<_>, _>>()?;
    drop(statement);

    for (id, weekday_schedule_json, workdays_json, shift_start, shift_end, lunch_minutes) in
        profiles
    {
        let weekday_schedules = bootstrap::weekday_schedules_from_fields(
            weekday_schedule_json.as_deref(),
            Some(workdays_json.as_str()),
            shift_start.as_deref(),
            shift_end.as_deref(),
            lunch_minutes,
        );
        let normalized_json =
            serde_json::to_string(&weekday_schedules).unwrap_or_else(|_| "[]".to_string());

        if weekday_schedule_json.as_deref() == Some(normalized_json.as_str()) {
            continue;
        }

        connection.execute(
            "UPDATE schedule_profiles SET weekday_schedule_json = ?1 WHERE id = ?2",
            params![normalized_json, id],
        )?;
    }

    Ok(())
}

fn dedupe_reward_inventory(connection: &Connection) -> Result<(), AppError> {
    connection.execute_batch(
        r#"
        DROP TABLE IF EXISTS reward_inventory_dedup;

        CREATE TEMP TABLE reward_inventory_dedup AS
        SELECT
            MIN(ri.id) AS id,
            ri.provider_account_id,
            ri.reward_key,
            COALESCE(rc.reward_name, MIN(ri.reward_name)) AS reward_name,
            COALESCE(rc.reward_type, MIN(ri.reward_type)) AS reward_type,
            COALESCE(rc.accessory_slot, MIN(ri.accessory_slot)) AS accessory_slot,
            COALESCE(rc.environment_scene_key, MIN(ri.environment_scene_key)) AS environment_scene_key,
            COALESCE(rc.theme_tag, MIN(ri.theme_tag)) AS theme_tag,
            COALESCE(rc.cost_tokens, MIN(ri.cost_tokens)) AS cost_tokens,
            MAX(ri.owned) AS owned,
            MAX(ri.equipped) AS equipped,
            MIN(ri.unlocked_at) AS unlocked_at
        FROM reward_inventory ri
        LEFT JOIN reward_catalog rc ON rc.reward_key = ri.reward_key
        GROUP BY ri.provider_account_id, ri.reward_key;

        DELETE FROM reward_inventory;

        INSERT INTO reward_inventory (
            id,
            provider_account_id,
            reward_key,
            reward_name,
            reward_type,
            accessory_slot,
            environment_scene_key,
            theme_tag,
            cost_tokens,
            owned,
            equipped,
            unlocked_at
        )
        SELECT
            id,
            provider_account_id,
            reward_key,
            reward_name,
            reward_type,
            accessory_slot,
            environment_scene_key,
            theme_tag,
            cost_tokens,
            owned,
            equipped,
            unlocked_at
        FROM reward_inventory_dedup;

        UPDATE reward_inventory
        SET reward_name = COALESCE(
                (SELECT rc.reward_name FROM reward_catalog rc WHERE rc.reward_key = reward_inventory.reward_key),
                reward_name
            ),
            reward_type = COALESCE(
                (SELECT rc.reward_type FROM reward_catalog rc WHERE rc.reward_key = reward_inventory.reward_key),
                reward_type
            ),
            accessory_slot = COALESCE(
                (SELECT rc.accessory_slot FROM reward_catalog rc WHERE rc.reward_key = reward_inventory.reward_key),
                accessory_slot
            ),
            environment_scene_key = COALESCE(
                (SELECT rc.environment_scene_key FROM reward_catalog rc WHERE rc.reward_key = reward_inventory.reward_key),
                environment_scene_key
            ),
            theme_tag = COALESCE(
                (SELECT rc.theme_tag FROM reward_catalog rc WHERE rc.reward_key = reward_inventory.reward_key),
                theme_tag
            ),
            cost_tokens = COALESCE(
                (SELECT rc.cost_tokens FROM reward_catalog rc WHERE rc.reward_key = reward_inventory.reward_key),
                cost_tokens
            ),
            owned = COALESCE((
                SELECT MAX(ri2.owned)
                FROM reward_inventory ri2
                WHERE ri2.provider_account_id IS reward_inventory.provider_account_id
                  AND ri2.reward_key = reward_inventory.reward_key
            ), owned),
            equipped = COALESCE((
                SELECT MAX(ri2.equipped)
                FROM reward_inventory ri2
                WHERE ri2.provider_account_id IS reward_inventory.provider_account_id
                  AND ri2.reward_key = reward_inventory.reward_key
            ), equipped),
            unlocked_at = COALESCE((
                SELECT MIN(ri2.unlocked_at)
                FROM reward_inventory ri2
                WHERE ri2.provider_account_id IS reward_inventory.provider_account_id
                  AND ri2.reward_key = reward_inventory.reward_key
            ), unlocked_at);

        DROP TABLE reward_inventory_dedup;
        "#,
    )?;

    Ok(())
}

pub fn seed_reward_catalog(connection: &Connection) -> Result<(), AppError> {
    let mut statement = connection.prepare(
        "INSERT OR IGNORE INTO reward_catalog (reward_key, reward_name, reward_type, accessory_slot, companion_variant, environment_scene_key, theme_tag, cost_tokens, featured, rarity, store_section)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
    )?;

    for reward in DEFAULT_REWARD_DEFINITIONS {
        statement.execute(rusqlite::params![
            reward.reward_key,
            reward.reward_name,
            reward.reward_type,
            reward.accessory_slot,
            reward.companion_variant,
            reward.environment_scene_key,
            reward.theme_tag,
            reward.cost_tokens,
            if reward.featured { 1 } else { 0 },
            reward.rarity,
            reward.store_section,
        ])?;
    }

    Ok(())
}

pub fn seed_quest_definitions(
    connection: &Connection,
    definitions: &[QuestSeedDefinition],
) -> Result<(), AppError> {
    let mut statement = connection.prepare(
        "INSERT OR IGNORE INTO quest_definitions (quest_key, title, description, reward_label, target_value, cadence, category, active)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
    )?;

    for quest in definitions {
        statement.execute(rusqlite::params![
            quest.quest_key,
            quest.title,
            quest.description,
            quest.reward_label,
            quest.target_value,
            quest.cadence,
            quest.category,
            if quest.active { 1 } else { 0 },
        ])?;
    }

    Ok(())
}

pub fn ensure_gamification_profile(
    connection: &Connection,
    provider_account_id: i64,
) -> Result<(), AppError> {
    connection.execute(
        "INSERT INTO gamification_profiles (provider_account_id, xp, level, streak_days, token_balance, badges_json, companion_state_json)
         SELECT ?1, 0, 1, 0, 0, '[]', '{}'
         WHERE NOT EXISTS (
             SELECT 1 FROM gamification_profiles WHERE provider_account_id = ?1
         )",
        [provider_account_id],
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

fn table_exists(connection: &Connection, table: &str) -> Result<bool, AppError> {
    let exists = connection.query_row(
        "SELECT EXISTS(
            SELECT 1
            FROM sqlite_master
            WHERE type = 'table' AND name = ?1
        )",
        [table],
        |row| row.get::<_, i64>(0),
    )?;

    Ok(exists == 1)
}

fn migrate_notification_diagnostics_to_generic_logs(
    connection: &Connection,
) -> Result<(), AppError> {
    if !table_exists(connection, "notification_diagnostics")? {
        return Ok(());
    }

    connection.execute_batch(
        "INSERT INTO diagnostic_logs (id, timestamp, day_key, feature, level, source, event, platform, message)
         SELECT id, timestamp, day_key, 'notifications', level, source, event, platform, message
         FROM notification_diagnostics;
         DROP TABLE notification_diagnostics;",
    )?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use rusqlite::Connection;

    use super::migrate;

    #[test]
    fn migrate_backfills_environment_metadata_for_existing_rewards() {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute_batch(
                r#"
                CREATE TABLE reward_catalog (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    reward_key TEXT NOT NULL UNIQUE,
                    reward_name TEXT NOT NULL,
                    reward_type TEXT NOT NULL,
                    accessory_slot TEXT NOT NULL DEFAULT 'environment',
                    companion_variant TEXT,
                    cost_tokens INTEGER NOT NULL DEFAULT 0,
                    featured INTEGER NOT NULL DEFAULT 0,
                    rarity TEXT NOT NULL DEFAULT 'common',
                    store_section TEXT NOT NULL DEFAULT 'accessories'
                );
                CREATE TABLE reward_inventory (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider_account_id INTEGER,
                    reward_key TEXT NOT NULL,
                    reward_name TEXT NOT NULL,
                    reward_type TEXT NOT NULL,
                    accessory_slot TEXT NOT NULL DEFAULT 'environment',
                    cost_tokens INTEGER NOT NULL DEFAULT 0,
                    owned INTEGER NOT NULL DEFAULT 0,
                    equipped INTEGER NOT NULL DEFAULT 0,
                    unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                INSERT INTO reward_catalog (reward_key, reward_name, reward_type, accessory_slot, cost_tokens, featured, rarity, store_section)
                VALUES ('starlit-camp', 'Starlit Camp', 'habitat-scene', 'environment', 140, 1, 'epic', 'featured');
                INSERT INTO reward_inventory (provider_account_id, reward_key, reward_name, reward_type, accessory_slot, cost_tokens, owned, equipped)
                VALUES (1, 'starlit-camp', 'Starlit Camp', 'habitat-scene', 'environment', 140, 1, 0);
                "#,
            )
            .unwrap();

        migrate(&connection).unwrap();

        let catalog_row: (Option<String>, Option<String>) = connection
            .query_row(
                "SELECT environment_scene_key, theme_tag FROM reward_catalog WHERE reward_key = 'starlit-camp'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        let inventory_row: (Option<String>, Option<String>) = connection
            .query_row(
                "SELECT environment_scene_key, theme_tag FROM reward_inventory WHERE reward_key = 'starlit-camp'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();

        assert_eq!(catalog_row.0.as_deref(), Some("starlit-camp"));
        assert_eq!(catalog_row.1.as_deref(), Some("focus"));
        assert_eq!(inventory_row.0.as_deref(), Some("starlit-camp"));
        assert_eq!(inventory_row.1.as_deref(), Some("focus"));
    }

    #[test]
    fn seed_quest_definitions_inserts_canonical_quest_rows() {
        let connection = Connection::open_in_memory().unwrap();
        migrate(&connection).unwrap();

        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM quest_definitions", [], |row| {
                row.get(0)
            })
            .unwrap();
        let cadence: String = connection
            .query_row(
                "SELECT cadence FROM quest_definitions WHERE quest_key = 'streak_keeper'",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(count, crate::db::DEFAULT_QUEST_DEFINITIONS.len() as i64);
        assert_eq!(cadence, "achievement");
    }

    #[test]
    fn migrate_dedupes_reward_inventory_rows_before_unique_index() {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute_batch(
                r#"
                CREATE TABLE reward_catalog (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    reward_key TEXT NOT NULL UNIQUE,
                    reward_name TEXT NOT NULL,
                    reward_type TEXT NOT NULL,
                    accessory_slot TEXT NOT NULL DEFAULT 'environment',
                    companion_variant TEXT,
                    environment_scene_key TEXT,
                    theme_tag TEXT,
                    cost_tokens INTEGER NOT NULL DEFAULT 0,
                    featured INTEGER NOT NULL DEFAULT 0,
                    rarity TEXT NOT NULL DEFAULT 'common',
                    store_section TEXT NOT NULL DEFAULT 'accessories'
                );
                CREATE TABLE reward_inventory (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider_account_id INTEGER,
                    reward_key TEXT NOT NULL,
                    reward_name TEXT NOT NULL,
                    reward_type TEXT NOT NULL,
                    accessory_slot TEXT NOT NULL DEFAULT 'environment',
                    environment_scene_key TEXT,
                    theme_tag TEXT,
                    cost_tokens INTEGER NOT NULL DEFAULT 0,
                    owned INTEGER NOT NULL DEFAULT 0,
                    equipped INTEGER NOT NULL DEFAULT 0,
                    unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                INSERT INTO reward_catalog (reward_key, reward_name, reward_type, accessory_slot, cost_tokens, featured, rarity, store_section)
                VALUES ('frame-signal', 'Signal Frame', 'avatar-frame', 'eyewear', 80, 1, 'rare', 'featured');
                INSERT INTO reward_inventory (provider_account_id, reward_key, reward_name, reward_type, accessory_slot, cost_tokens, owned, equipped, unlocked_at)
                VALUES
                  (1, 'frame-signal', 'Signal Frame', 'avatar-frame', 'eyewear', 80, 0, 0, '2026-03-12T10:00:00Z'),
                  (1, 'frame-signal', 'Signal Frame', 'avatar-frame', 'eyewear', 80, 1, 1, '2026-03-13T10:00:00Z');
                "#,
            )
            .unwrap();

        migrate(&connection).unwrap();

        let rows: (i64, i64, i64) = connection
            .query_row(
                "SELECT COUNT(*), MAX(owned), MAX(equipped) FROM reward_inventory WHERE provider_account_id = 1 AND reward_key = 'frame-signal'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .unwrap();

        assert_eq!(rows.0, 1);
        assert_eq!(rows.1, 1);
        assert_eq!(rows.2, 1);
    }
}
