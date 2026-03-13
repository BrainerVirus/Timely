use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    domain::models::{
        GamificationQuestSummary, PlaySnapshot, ProfileSnapshot, RewardInventoryItem,
        StreakSnapshot,
    },
    error::AppError,
    services::{shared, streak},
    state::AppState,
};

const DEFAULT_COMPANION: &str = "Aurora fox";

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

    let equipped_companion_mood = connection
        .query_row(
            "SELECT companion_state_json FROM gamification_profiles WHERE provider_account_id = ?1 LIMIT 1",
            [primary.id],
            |row| row.get::<_, String>(0),
        )
        .optional()?
        .and_then(|json| serde_json::from_str::<serde_json::Value>(&json).ok())
        .and_then(|json| json.get("mood").and_then(|value| value.as_str()).map(str::to_string))
        .unwrap_or_else(|| "calm".to_string());

    let quests = load_quests(&connection, primary.id)?;
    let inventory = load_inventory(&connection, primary.id)?;
    let tokens =
        (profile.level as u32 * 20) + quests.iter().map(|quest| quest.progress_value).sum::<u32>();

    Ok(PlaySnapshot {
        profile,
        streak: streak_snapshot,
        quests,
        tokens,
        equipped_companion_mood,
        inventory,
    })
}

fn load_quests(
    connection: &Connection,
    provider_account_id: i64,
) -> Result<Vec<GamificationQuestSummary>, AppError> {
    let mut statement = connection.prepare(
        "SELECT qd.quest_key, qd.title, qd.description, qd.reward_label, qd.target_value,
                COALESCE(qp.progress_value, 0)
         FROM quest_definitions qd
         LEFT JOIN quest_progress qp
           ON qp.quest_key = qd.quest_key AND qp.provider_account_id = ?1
         WHERE qd.active = 1
         ORDER BY qd.id ASC",
    )?;

    let rows = statement.query_map(params![provider_account_id], |row| {
        Ok(GamificationQuestSummary {
            quest_key: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            reward_label: row.get(3)?,
            target_value: row.get::<_, i64>(4)? as u32,
            progress_value: row.get::<_, i64>(5)? as u32,
        })
    })?;

    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

fn load_inventory(
    connection: &Connection,
    provider_account_id: i64,
) -> Result<Vec<RewardInventoryItem>, AppError> {
    let mut statement = connection.prepare(
        "SELECT reward_key, reward_name, reward_type, cost_tokens, equipped
         FROM reward_inventory
         WHERE provider_account_id = ?1
         ORDER BY unlocked_at ASC",
    )?;

    let rows = statement.query_map(params![provider_account_id], |row| {
        Ok(RewardInventoryItem {
            reward_key: row.get(0)?,
            reward_name: row.get(1)?,
            reward_type: row.get(2)?,
            cost_tokens: row.get::<_, i64>(3)? as u32,
            equipped: row.get::<_, i64>(4)? == 1,
        })
    })?;

    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}
