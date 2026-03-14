use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    domain::models::{
        ActivateQuestInput, ClaimQuestRewardInput, CompanionMood, EquipRewardInput,
        GamificationQuestSummary, PlaySnapshot, ProfileSnapshot, PurchaseRewardInput,
        RewardCatalogItem, RewardInventoryItem, StreakSnapshot, UnequipRewardInput,
    },
    error::AppError,
    services::{shared, streak},
    state::AppState,
};

const DEFAULT_COMPANION: &str = "Aurora fox";
const MAX_ACTIVE_DAILY_QUESTS: i64 = 3;
const MAX_ACTIVE_WEEKLY_QUESTS: i64 = 5;

pub fn load_play_snapshot(state: &AppState) -> Result<PlaySnapshot, AppError> {
    let connection = shared::open_connection(state)?;
    let primary = shared::load_primary_gitlab_connection(&connection)?;

    let mut profile = connection
        .query_row(
            "SELECT xp, level, streak_days, companion_state_json FROM gamification_profiles WHERE provider_account_id = ?1 LIMIT 1",
            [primary.id],
            |row| {
                let companion_state: String = row.get(3)?;
                let companion_json = serde_json::from_str::<serde_json::Value>(&companion_state).ok();

                Ok(ProfileSnapshot {
                    alias: primary.username.clone().unwrap_or_else(|| primary.display_name.clone()),
                    level: row.get(1)?,
                    xp: row.get(0)?,
                    streak_days: row.get(2)?,
                    companion: companion_json
                        .as_ref()
                        .and_then(|json| json.get("name").and_then(|value| value.as_str()))
                        .unwrap_or(DEFAULT_COMPANION)
                        .to_string(),
                })
            },
        )
        .optional()?
        .unwrap_or(ProfileSnapshot {
            alias: primary.display_name,
            level: 1,
            xp: 0,
            streak_days: 0,
            companion: DEFAULT_COMPANION.to_string(),
        });

    let streak_snapshot: StreakSnapshot =
        streak::build_streak_snapshot(&connection, primary.id, chrono::Local::now().date_naive())?;
    streak::persist_current_streak(&connection, primary.id, streak_snapshot.current_days)?;
    profile.streak_days = streak_snapshot.current_days;

    let quests = load_quests(&connection, primary.id)?;
    let inventory = load_inventory(&connection, primary.id)?;
    let store_catalog = load_store_catalog(&connection, primary.id)?;
    let tokens = load_token_balance(&connection, primary.id)?;
    let today = load_today_overview(&connection, primary.id)?;
    let equipped_companion_mood = derive_companion_mood(
        today.logged_hours,
        today.target_hours,
        today.status.as_deref(),
        profile.level,
        streak_snapshot.current_days,
    );

    Ok(PlaySnapshot {
        profile,
        streak: streak_snapshot,
        quests,
        tokens,
        equipped_companion_mood,
        store_catalog,
        inventory,
    })
}

pub fn activate_quest(
    state: &AppState,
    input: ActivateQuestInput,
) -> Result<PlaySnapshot, AppError> {
    let connection = shared::open_connection(state)?;
    let primary = shared::load_primary_gitlab_connection(&connection)?;
    let cadence = connection
        .query_row(
            "SELECT cadence FROM quest_definitions WHERE quest_key = ?1 AND active = 1 LIMIT 1",
            [&input.quest_key],
            |row| row.get::<_, String>(0),
        )
        .optional()?
        .ok_or_else(|| AppError::GitLabApi("Mission not found.".to_string()))?;

    if cadence == "achievement" {
        return Err(AppError::GitLabApi(
            "Achievements unlock automatically and cannot be activated manually.".to_string(),
        ));
    }

    let active_limit = if cadence == "daily" {
        MAX_ACTIVE_DAILY_QUESTS
    } else {
        MAX_ACTIVE_WEEKLY_QUESTS
    };

    let active_count: i64 = connection.query_row(
        "SELECT COUNT(*)
         FROM quest_progress qp
         JOIN quest_definitions qd ON qd.quest_key = qp.quest_key
         WHERE qp.provider_account_id = ?1 AND qp.is_active = 1 AND qd.cadence = ?2",
        params![primary.id, cadence],
        |row| row.get(0),
    )?;

    let already_active = connection
        .query_row(
            "SELECT is_active FROM quest_progress WHERE provider_account_id = ?1 AND quest_key = ?2 LIMIT 1",
            params![primary.id, input.quest_key],
            |row| row.get::<_, i64>(0),
        )
        .optional()?
        .unwrap_or(0)
        == 1;

    if !already_active && active_count >= active_limit {
        let label = if cadence == "daily" {
            "daily"
        } else {
            "weekly"
        };
        return Err(AppError::GitLabApi(format!(
            "You already have the maximum number of active {label} missions."
        )));
    }

    let existing_id = connection
        .query_row(
            "SELECT id FROM quest_progress WHERE provider_account_id = ?1 AND quest_key = ?2 LIMIT 1",
            params![primary.id, input.quest_key],
            |row| row.get::<_, i64>(0),
        )
        .optional()?;

    match existing_id {
        Some(id) => {
            connection.execute(
                "UPDATE quest_progress SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
                [id],
            )?;
        }
        None => {
            connection.execute(
                "INSERT INTO quest_progress (provider_account_id, quest_key, progress_value, is_active, updated_at)
                 VALUES (?1, ?2, 0, 1, CURRENT_TIMESTAMP)",
                params![primary.id, input.quest_key],
            )?;
        }
    }

    load_play_snapshot(state)
}

pub fn claim_quest_reward(
    state: &AppState,
    input: ClaimQuestRewardInput,
) -> Result<PlaySnapshot, AppError> {
    let connection = shared::open_connection(state)?;
    let primary = shared::load_primary_gitlab_connection(&connection)?;

    let (reward_label, target_value, progress_value, claimed_at) = connection
        .query_row(
            "SELECT qd.reward_label, qd.target_value, COALESCE(qp.progress_value, 0), qp.claimed_at
             FROM quest_definitions qd
             LEFT JOIN quest_progress qp
               ON qp.quest_key = qd.quest_key AND qp.provider_account_id = ?1
             WHERE qd.quest_key = ?2 AND qd.active = 1
             LIMIT 1",
            params![primary.id, input.quest_key],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, i64>(1)? as u32,
                    row.get::<_, i64>(2)? as u32,
                    row.get::<_, Option<String>>(3)?,
                ))
            },
        )
        .optional()?
        .ok_or_else(|| AppError::GitLabApi("Mission not found.".to_string()))?;

    if claimed_at.is_some() {
        return Err(AppError::GitLabApi(
            "This reward was already claimed.".to_string(),
        ));
    }

    if progress_value < target_value {
        return Err(AppError::GitLabApi(
            "This mission is not complete yet.".to_string(),
        ));
    }

    let token_reward = parse_token_reward(&reward_label);

    if token_reward > 0 {
        connection.execute(
            "UPDATE gamification_profiles
             SET token_balance = COALESCE(token_balance, 0) + ?1
             WHERE provider_account_id = ?2",
            params![token_reward, primary.id],
        )?;
    }

    connection.execute(
        "UPDATE quest_progress
         SET claimed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE provider_account_id = ?1 AND quest_key = ?2",
        params![primary.id, input.quest_key],
    )?;

    load_play_snapshot(state)
}

pub fn purchase_reward(
    state: &AppState,
    input: PurchaseRewardInput,
) -> Result<PlaySnapshot, AppError> {
    let connection = shared::open_connection(state)?;
    let primary = shared::load_primary_gitlab_connection(&connection)?;

    let (cost_tokens, owned) = connection
        .query_row(
            "SELECT cost_tokens, owned
             FROM reward_inventory
             WHERE provider_account_id = ?1 AND reward_key = ?2
             LIMIT 1",
            params![primary.id, input.reward_key],
            |row| Ok((row.get::<_, i64>(0)? as u32, row.get::<_, i64>(1)? == 1)),
        )
        .optional()?
        .ok_or_else(|| AppError::GitLabApi("Store item not found.".to_string()))?;

    if owned {
        return Err(AppError::GitLabApi(
            "That reward is already equipped or owned.".to_string(),
        ));
    }

    let token_balance = load_token_balance(&connection, primary.id)?;

    if token_balance < cost_tokens {
        return Err(AppError::GitLabApi(
            "You do not have enough tokens for that purchase.".to_string(),
        ));
    }

    connection.execute(
        "UPDATE gamification_profiles
         SET token_balance = COALESCE(token_balance, 0) - ?1
         WHERE provider_account_id = ?2",
        params![cost_tokens, primary.id],
    )?;

    connection.execute(
        "UPDATE reward_inventory
         SET owned = 1
         WHERE provider_account_id = ?1 AND reward_key = ?2",
        params![primary.id, input.reward_key],
    )?;

    load_play_snapshot(state)
}

pub fn equip_reward(state: &AppState, input: EquipRewardInput) -> Result<PlaySnapshot, AppError> {
    let connection = shared::open_connection(state)?;
    let primary = shared::load_primary_gitlab_connection(&connection)?;

    let (accessory_slot, owned) = connection
        .query_row(
            "SELECT accessory_slot, owned
             FROM reward_inventory
             WHERE provider_account_id = ?1 AND reward_key = ?2
             LIMIT 1",
            params![primary.id, input.reward_key],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)? == 1)),
        )
        .optional()?
        .ok_or_else(|| AppError::GitLabApi("Reward not found.".to_string()))?;

    if !owned {
        return Err(AppError::GitLabApi(
            "You need to own this reward before equipping it.".to_string(),
        ));
    }

    connection.execute(
        "UPDATE reward_inventory
         SET equipped = 0
         WHERE provider_account_id = ?1 AND accessory_slot = ?2",
        params![primary.id, accessory_slot],
    )?;

    connection.execute(
        "UPDATE reward_inventory
         SET equipped = 1
         WHERE provider_account_id = ?1 AND reward_key = ?2",
        params![primary.id, input.reward_key],
    )?;

    load_play_snapshot(state)
}

pub fn unequip_reward(
    state: &AppState,
    input: UnequipRewardInput,
) -> Result<PlaySnapshot, AppError> {
    let connection = shared::open_connection(state)?;
    let primary = shared::load_primary_gitlab_connection(&connection)?;

    let equipped = connection
        .query_row(
            "SELECT equipped
             FROM reward_inventory
             WHERE provider_account_id = ?1 AND reward_key = ?2
             LIMIT 1",
            params![primary.id, input.reward_key],
            |row| row.get::<_, i64>(0),
        )
        .optional()?
        .ok_or_else(|| AppError::GitLabApi("Reward not found.".to_string()))?;

    if equipped == 0 {
        return Err(AppError::GitLabApi(
            "That reward is not currently equipped.".to_string(),
        ));
    }

    connection.execute(
        "UPDATE reward_inventory
         SET equipped = 0
         WHERE provider_account_id = ?1 AND reward_key = ?2",
        params![primary.id, input.reward_key],
    )?;

    load_play_snapshot(state)
}

struct TodayOverview {
    logged_hours: f32,
    target_hours: f32,
    status: Option<String>,
}

fn load_today_overview(
    connection: &Connection,
    provider_account_id: i64,
) -> Result<TodayOverview, AppError> {
    let today = chrono::Local::now()
        .date_naive()
        .format("%Y-%m-%d")
        .to_string();

    let overview = connection
        .query_row(
            "SELECT logged_seconds, target_seconds, status
             FROM daily_buckets
             WHERE provider_account_id = ?1 AND date = ?2
             LIMIT 1",
            params![provider_account_id, today],
            |row| {
                Ok(TodayOverview {
                    logged_hours: row.get::<_, i64>(0)? as f32 / 3600.0,
                    target_hours: row.get::<_, i64>(1)? as f32 / 3600.0,
                    status: row.get::<_, Option<String>>(2)?,
                })
            },
        )
        .optional()?;

    Ok(overview.unwrap_or(TodayOverview {
        logged_hours: 0.0,
        target_hours: 0.0,
        status: None,
    }))
}

fn derive_companion_mood(
    logged_hours: f32,
    target_hours: f32,
    status: Option<&str>,
    level: u8,
    streak_days: u8,
) -> CompanionMood {
    let is_non_workday = matches!(status, Some("non_workday")) || target_hours <= 0.0;

    if is_non_workday {
        if logged_hours >= 2.0 {
            return CompanionMood::Playful;
        }
        if logged_hours > 0.0 {
            return CompanionMood::Curious;
        }
        return CompanionMood::Cozy;
    }

    if target_hours > 0.0 {
        let ratio = logged_hours / target_hours;

        if ratio >= 1.15 {
            return CompanionMood::Drained;
        }
        if ratio >= 1.0 {
            return if streak_days >= 5 || level >= 5 {
                CompanionMood::Excited
            } else {
                CompanionMood::Happy
            };
        }
        if ratio >= 0.7 {
            return CompanionMood::Focused;
        }
        if ratio >= 0.35 {
            return CompanionMood::Calm;
        }
        if ratio > 0.0 {
            return CompanionMood::Curious;
        }
    }

    if streak_days >= 5 {
        CompanionMood::Tired
    } else {
        CompanionMood::Calm
    }
}

fn load_token_balance(connection: &Connection, provider_account_id: i64) -> Result<u32, AppError> {
    let token_balance = connection
        .query_row(
            "SELECT COALESCE(token_balance, 0) FROM gamification_profiles WHERE provider_account_id = ?1 LIMIT 1",
            [provider_account_id],
            |row| row.get::<_, i64>(0),
        )
        .optional()?
        .unwrap_or(0);

    Ok(token_balance as u32)
}

fn parse_token_reward(reward_label: &str) -> u32 {
    reward_label
        .split_whitespace()
        .find_map(|token| token.trim_start_matches('+').parse::<u32>().ok())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use rusqlite::params;

    use super::{
        activate_quest, claim_quest_reward, derive_companion_mood, equip_reward,
        load_play_snapshot, purchase_reward, unequip_reward,
    };
    use crate::domain::models::CompanionMood;
    use crate::{
        db,
        domain::models::{
            ActivateQuestInput, ClaimQuestRewardInput, EquipRewardInput, PurchaseRewardInput,
            UnequipRewardInput,
        },
        state::AppState,
    };

    #[test]
    fn derives_cozy_for_true_day_off() {
        assert!(matches!(
            derive_companion_mood(0.0, 0.0, Some("non_workday"), 3, 4),
            CompanionMood::Cozy
        ));
    }

    #[test]
    fn derives_playful_for_active_day_off() {
        assert!(matches!(
            derive_companion_mood(2.5, 0.0, Some("non_workday"), 3, 4),
            CompanionMood::Playful
        ));
    }

    #[test]
    fn derives_excited_when_target_hit_with_good_streak() {
        assert!(matches!(
            derive_companion_mood(8.0, 8.0, Some("met_target"), 6, 7),
            CompanionMood::Excited
        ));
    }

    #[test]
    fn derives_drained_when_way_over_target() {
        assert!(matches!(
            derive_companion_mood(10.0, 8.0, Some("over_target"), 6, 7),
            CompanionMood::Drained
        ));
    }

    fn setup_activation_state() -> AppState {
        let db_path = std::env::temp_dir().join(format!(
            "timely-play-activation-{}.sqlite",
            rand::random::<u64>()
        ));
        let connection = db::open(&db_path).unwrap();
        db::migrate(&connection).unwrap();

        connection
            .execute(
                "INSERT INTO provider_accounts (provider, host, display_name, auth_mode, preferred_scope, status_note, oauth_ready, is_primary, created_at)
                 VALUES ('GitLab', 'gitlab.com', 'Pilot', 'pat', 'read_api', 'ok', 1, 1, '2026-03-14T09:00:00Z')",
                [],
            )
            .unwrap();

        let provider_id = connection.last_insert_rowid();

        connection
            .execute(
                "INSERT INTO gamification_profiles (provider_account_id, xp, level, streak_days, token_balance, badges_json, companion_state_json)
                 VALUES (?1, 0, 1, 0, 125, '[]', '{}')",
                [provider_id],
            )
            .unwrap();

        connection
            .execute(
                "INSERT INTO daily_buckets (provider_account_id, date, target_seconds, logged_seconds, variance_seconds, status)
                 VALUES (?1, '2026-03-14', 28800, 0, 0, 'empty')",
                [provider_id],
            )
            .unwrap();

        let mut catalog_statement = connection
            .prepare(
                "INSERT OR REPLACE INTO reward_catalog (reward_key, reward_name, reward_type, accessory_slot, companion_variant, environment_scene_key, theme_tag, cost_tokens, featured, rarity, store_section)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            )
            .unwrap();
        for reward in db::DEFAULT_REWARD_DEFINITIONS {
            catalog_statement
                .execute(params![
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
                ])
                .unwrap();
        }

        db::seed_quest_definitions(&connection, db::TEST_QUEST_DEFINITIONS).unwrap();

        connection
            .execute(
                "INSERT INTO quest_progress (provider_account_id, quest_key, progress_value, is_active)
                 VALUES (?1, 'balanced_day', 0, 1), (?1, 'daily_extra', 0, 1), (?1, 'daily_third', 0, 1)",
                [provider_id],
            )
            .unwrap();

        let mut inventory_statement = connection
            .prepare(
                "INSERT INTO reward_inventory (provider_account_id, reward_key, reward_name, reward_type, accessory_slot, environment_scene_key, theme_tag, cost_tokens, owned, equipped)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, 0)",
            )
            .unwrap();
        for reward in db::DEFAULT_REWARD_DEFINITIONS {
            if reward.reward_type == "companion" {
                continue;
            }

            inventory_statement
                .execute(params![
                    provider_id,
                    reward.reward_key,
                    reward.reward_name,
                    reward.reward_type,
                    reward.accessory_slot,
                    reward.environment_scene_key,
                    reward.theme_tag,
                    reward.cost_tokens,
                ])
                .unwrap();
        }

        AppState::new(db_path)
    }

    #[test]
    fn prevents_activating_more_than_three_daily_quests() {
        let state = setup_activation_state();
        let result = activate_quest(
            &state,
            ActivateQuestInput {
                quest_key: "daily_fourth".to_string(),
            },
        );

        assert!(result.is_err());
        let message = result.err().unwrap().to_string();
        assert!(message.contains("maximum number of active daily missions"));
    }

    #[test]
    fn claims_completed_token_reward_and_updates_balance() {
        let state = setup_activation_state();
        let connection = db::open(&state.db_path).unwrap();
        let provider_id: i64 = connection
            .query_row(
                "SELECT id FROM provider_accounts WHERE is_primary = 1 LIMIT 1",
                [],
                |row| row.get(0),
            )
            .unwrap();

        connection
            .execute(
                "INSERT INTO quest_progress (provider_account_id, quest_key, progress_value, is_active)
                 VALUES (?1, 'clean_week', 5, 1)",
                [provider_id],
            )
            .unwrap();

        let snapshot = claim_quest_reward(
            &state,
            ClaimQuestRewardInput {
                quest_key: "clean_week".to_string(),
            },
        )
        .unwrap();

        assert_eq!(snapshot.tokens, 125);
        let claimed = snapshot
            .quests
            .iter()
            .find(|quest| quest.quest_key == "clean_week")
            .unwrap();
        assert!(claimed.is_claimed);
    }

    #[test]
    fn claims_daily_token_reward_and_increases_balance() {
        let state = setup_activation_state();
        let connection = db::open(&state.db_path).unwrap();
        let provider_id: i64 = connection
            .query_row(
                "SELECT id FROM provider_accounts WHERE is_primary = 1 LIMIT 1",
                [],
                |row| row.get(0),
            )
            .unwrap();

        connection
            .execute(
                "UPDATE quest_progress
                 SET progress_value = 1, is_active = 1, claimed_at = NULL
                 WHERE provider_account_id = ?1 AND quest_key = 'balanced_day'",
                [provider_id],
            )
            .unwrap();

        let snapshot = claim_quest_reward(
            &state,
            ClaimQuestRewardInput {
                quest_key: "balanced_day".to_string(),
            },
        )
        .unwrap();

        assert_eq!(snapshot.tokens, 175);
        let claimed = snapshot
            .quests
            .iter()
            .find(|quest| quest.quest_key == "balanced_day")
            .unwrap();
        assert!(claimed.is_claimed);
    }

    #[test]
    fn purchases_store_reward_and_reduces_balance() {
        let state = setup_activation_state();

        let snapshot = purchase_reward(
            &state,
            PurchaseRewardInput {
                reward_key: "frame-signal".to_string(),
            },
        )
        .unwrap();

        assert_eq!(snapshot.tokens, 45);
        let purchased = snapshot
            .inventory
            .iter()
            .find(|reward| reward.reward_key == "frame-signal")
            .unwrap();
        assert!(purchased.owned);
        assert!(!purchased.equipped);
    }

    #[test]
    fn equips_owned_reward_and_clears_previous_same_type() {
        let state = setup_activation_state();
        let connection = db::open(&state.db_path).unwrap();
        let provider_id: i64 = connection
            .query_row(
                "SELECT id FROM provider_accounts WHERE is_primary = 1 LIMIT 1",
                [],
                |row| row.get(0),
            )
            .unwrap();

        connection
            .execute(
                "UPDATE reward_inventory SET owned = 1 WHERE provider_account_id = ?1 AND reward_key = 'frame-signal'",
                [provider_id],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO reward_inventory (provider_account_id, reward_key, reward_name, reward_type, accessory_slot, cost_tokens, owned, equipped)
                 VALUES (?1, 'frame-night', 'Night Frame', 'avatar-frame', 'eyewear', 60, 1, 1)",
                [provider_id],
            )
            .unwrap();

        let snapshot = equip_reward(
            &state,
            EquipRewardInput {
                reward_key: "frame-signal".to_string(),
            },
        )
        .unwrap();

        let signal = snapshot
            .inventory
            .iter()
            .find(|reward| reward.reward_key == "frame-signal")
            .unwrap();
        let night = snapshot
            .inventory
            .iter()
            .find(|reward| reward.reward_key == "frame-night")
            .unwrap();

        assert!(signal.equipped);
        assert!(!night.equipped);
    }

    #[test]
    fn unequips_active_reward() {
        let state = setup_activation_state();
        let connection = db::open(&state.db_path).unwrap();
        let provider_id: i64 = connection
            .query_row(
                "SELECT id FROM provider_accounts WHERE is_primary = 1 LIMIT 1",
                [],
                |row| row.get(0),
            )
            .unwrap();

        connection
            .execute(
                "UPDATE reward_inventory
                 SET owned = 1, equipped = 1
                 WHERE provider_account_id = ?1 AND reward_key = 'frame-signal'",
                [provider_id],
            )
            .unwrap();

        let snapshot = unequip_reward(
            &state,
            UnequipRewardInput {
                reward_key: "frame-signal".to_string(),
            },
        )
        .unwrap();

        let signal = snapshot
            .inventory
            .iter()
            .find(|reward| reward.reward_key == "frame-signal")
            .unwrap();

        assert!(signal.owned);
        assert!(!signal.equipped);
    }

    #[test]
    fn equips_environment_reward_and_clears_previous_environment() {
        let state = setup_activation_state();
        let connection = db::open(&state.db_path).unwrap();
        let provider_id: i64 = connection
            .query_row(
                "SELECT id FROM provider_accounts WHERE is_primary = 1 LIMIT 1",
                [],
                |row| row.get(0),
            )
            .unwrap();

        connection
            .execute(
                "UPDATE reward_inventory SET owned = 1 WHERE provider_account_id = ?1 AND reward_key = 'starlit-camp'",
                [provider_id],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO reward_inventory (provider_account_id, reward_key, reward_name, reward_type, accessory_slot, cost_tokens, owned, equipped)
                 VALUES (?1, 'forest-nook', 'Forest Nook', 'habitat-scene', 'environment', 90, 1, 1)",
                [provider_id],
            )
            .unwrap();

        let snapshot = equip_reward(
            &state,
            EquipRewardInput {
                reward_key: "starlit-camp".to_string(),
            },
        )
        .unwrap();

        let starlit = snapshot
            .inventory
            .iter()
            .find(|reward| reward.reward_key == "starlit-camp")
            .unwrap();
        let previous = snapshot
            .inventory
            .iter()
            .find(|reward| reward.reward_key == "forest-nook")
            .unwrap();

        assert!(starlit.equipped);
        assert!(!previous.equipped);
    }

    #[test]
    fn load_play_snapshot_returns_seeded_environment_metadata() {
        let state = setup_activation_state();

        let snapshot = load_play_snapshot(&state).unwrap();

        let starlit = snapshot
            .store_catalog
            .iter()
            .find(|reward| reward.reward_key == "starlit-camp")
            .unwrap();
        let rainy = snapshot
            .inventory
            .iter()
            .find(|reward| reward.reward_key == "rainy-retreat")
            .unwrap();

        assert_eq!(
            starlit.environment_scene_key.as_deref(),
            Some("starlit-camp")
        );
        assert_eq!(starlit.theme_tag.as_deref(), Some("focus"));
        assert_eq!(
            rainy.environment_scene_key.as_deref(),
            Some("rainy-retreat")
        );
        assert_eq!(rainy.theme_tag.as_deref(), Some("recovery"));
    }
}

fn load_quests(
    connection: &Connection,
    provider_account_id: i64,
) -> Result<Vec<GamificationQuestSummary>, AppError> {
    let mut statement = connection.prepare(
        "SELECT qd.quest_key, qd.title, qd.description, qd.reward_label, qd.target_value,
                qd.cadence, qd.category,
                COALESCE(qp.progress_value, 0), COALESCE(qp.is_active, 0), qp.claimed_at
         FROM quest_definitions qd
         LEFT JOIN quest_progress qp
           ON qp.quest_key = qd.quest_key AND qp.provider_account_id = ?1
         WHERE qd.active = 1
         ORDER BY CASE qd.cadence
                    WHEN 'daily' THEN 1
                    WHEN 'weekly' THEN 2
                    ELSE 3
                  END,
                  qd.id ASC",
    )?;

    let rows = statement.query_map(params![provider_account_id], |row| {
        Ok(GamificationQuestSummary {
            quest_key: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            reward_label: row.get(3)?,
            target_value: row.get::<_, i64>(4)? as u32,
            cadence: row.get(5)?,
            category: row.get(6)?,
            progress_value: row.get::<_, i64>(7)? as u32,
            is_active: row.get::<_, i64>(8)? == 1,
            is_claimed: row.get::<_, Option<String>>(9)?.is_some(),
        })
    })?;

    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

fn load_inventory(
    connection: &Connection,
    provider_account_id: i64,
) -> Result<Vec<RewardInventoryItem>, AppError> {
    let mut statement = connection.prepare(
        "SELECT reward_key, reward_name, reward_type, accessory_slot, environment_scene_key, theme_tag, cost_tokens, owned, equipped
         FROM reward_inventory
         WHERE provider_account_id = ?1
         ORDER BY unlocked_at ASC",
    )?;

    let rows = statement.query_map(params![provider_account_id], |row| {
        Ok(RewardInventoryItem {
            reward_key: row.get(0)?,
            reward_name: row.get(1)?,
            reward_type: row.get(2)?,
            accessory_slot: row.get(3)?,
            environment_scene_key: row.get(4)?,
            theme_tag: row.get(5)?,
            cost_tokens: row.get::<_, i64>(6)? as u32,
            owned: row.get::<_, i64>(7)? == 1,
            equipped: row.get::<_, i64>(8)? == 1,
        })
    })?;

    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

fn load_store_catalog(
    connection: &Connection,
    provider_account_id: i64,
) -> Result<Vec<RewardCatalogItem>, AppError> {
    let mut statement = connection.prepare(
        "SELECT rc.reward_key, rc.reward_name, rc.reward_type, rc.accessory_slot, rc.companion_variant,
                rc.environment_scene_key, rc.theme_tag, rc.cost_tokens,
                COALESCE(ri.owned, 0), COALESCE(ri.equipped, 0), rc.featured, rc.rarity, rc.store_section
         FROM reward_catalog rc
         LEFT JOIN reward_inventory ri
            ON ri.reward_key = rc.reward_key AND ri.provider_account_id = ?1
         ORDER BY rc.featured DESC, rc.cost_tokens ASC, rc.reward_name ASC",
    )?;

    let rows = statement.query_map(params![provider_account_id], |row| {
        Ok(RewardCatalogItem {
            reward_key: row.get(0)?,
            reward_name: row.get(1)?,
            reward_type: row.get(2)?,
            accessory_slot: row.get(3)?,
            companion_variant: row.get(4)?,
            environment_scene_key: row.get(5)?,
            theme_tag: row.get(6)?,
            cost_tokens: row.get::<_, i64>(7)? as u32,
            owned: row.get::<_, i64>(8)? == 1,
            equipped: row.get::<_, i64>(9)? == 1,
            featured: row.get::<_, i64>(10)? == 1,
            rarity: row.get(11)?,
            store_section: row.get(12)?,
        })
    })?;

    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}
