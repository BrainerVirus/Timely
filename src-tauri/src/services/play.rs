use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    domain::models::{
        CompanionMood, GamificationQuestSummary, PlaySnapshot, ProfileSnapshot,
        RewardInventoryItem, StreakSnapshot,
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

    let quests = load_quests(&connection, primary.id)?;
    let inventory = load_inventory(&connection, primary.id)?;
    let tokens =
        (profile.level as u32 * 20) + quests.iter().map(|quest| quest.progress_value).sum::<u32>();
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
        inventory,
    })
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

#[cfg(test)]
mod tests {
    use super::derive_companion_mood;
    use crate::domain::models::CompanionMood;

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
