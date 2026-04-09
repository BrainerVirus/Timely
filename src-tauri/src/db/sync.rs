use chrono::{Datelike, Local, Months, NaiveDate};
use rusqlite::{params, params_from_iter, Connection, OptionalExtension, ToSql, Transaction};

use crate::{
    db::bootstrap,
    domain::models::{AssignedIssueRecord, CachedIterationRecord},
    error::AppError,
    support::time::utc_timestamp,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AssignedIssueBucket {
    Open,
    RecentClosed,
    ArchiveClosed,
}

impl AssignedIssueBucket {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Open => "open",
            Self::RecentClosed => "recent_closed",
            Self::ArchiveClosed => "archive_closed",
        }
    }
}

pub fn upsert_work_item(
    connection: &Connection,
    provider_account_id: i64,
    provider_item_id: &str,
    title: &str,
    state: &str,
    web_url: Option<&str>,
    labels_json: Option<&str>,
) -> Result<i64, AppError> {
    let existing_id: Option<i64> = connection
        .query_row(
            "SELECT id FROM work_items WHERE provider_account_id = ?1 AND provider_item_id = ?2 LIMIT 1",
            params![provider_account_id, provider_item_id],
            |row| row.get(0),
        )
        .optional()?;

    match existing_id {
        Some(id) => {
            connection.execute(
                "UPDATE work_items SET title = ?1, state = ?2, web_url = ?3, labels_json = ?4, updated_at = ?5 WHERE id = ?6",
                params![
                    title,
                    state,
                    web_url,
                    labels_json,
                    utc_timestamp(),
                    id,
                ],
            )?;
            Ok(id)
        }
        None => {
            connection.execute(
                "INSERT INTO work_items (provider_account_id, provider_item_id, title, state, web_url, labels_json, issue_graphql_id, milestone_title, iteration_title, from_assigned_sync, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, NULL, NULL, 0, ?7)",
                params![
                    provider_account_id,
                    provider_item_id,
                    title,
                    state,
                    web_url,
                    labels_json,
                    utc_timestamp(),
                ],
            )?;
            Ok(connection.last_insert_rowid())
        }
    }
}

pub fn upsert_assigned_issue(
    connection: &Connection,
    provider_account_id: i64,
    issue: &AssignedIssueRecord,
    bucket: AssignedIssueBucket,
) -> Result<i64, AppError> {
    let labels_json = serde_json::to_string(&issue.labels).unwrap_or_else(|_| "[]".to_string());
    let existing_id: Option<i64> = connection
        .query_row(
            "SELECT id FROM work_items WHERE provider_account_id = ?1 AND provider_item_id = ?2 LIMIT 1",
            params![provider_account_id, issue.provider_item_id.as_str()],
            |row| row.get(0),
        )
        .optional()?;

    match existing_id {
        Some(id) => {
            connection.execute(
                "UPDATE work_items SET title = ?1, state = ?2, closed_at = ?3, web_url = ?4, labels_json = ?5, issue_graphql_id = ?6, milestone_title = ?7, iteration_gitlab_id = ?8, iteration_group_id = ?9, iteration_cadence_id = ?10, iteration_cadence_title = ?11, iteration_title = ?12, iteration_start_date = ?13, iteration_due_date = ?14, from_assigned_sync = 1, assigned_bucket = ?15, updated_at = ?16 WHERE id = ?17",
                params![
                    issue.title.as_str(),
                    issue.state.as_str(),
                    issue.closed_at.as_deref(),
                    issue.web_url.as_deref(),
                    labels_json.as_str(),
                    issue.issue_graphql_id.as_str(),
                    issue.milestone_title.as_deref(),
                    issue.iteration_gitlab_id.as_deref(),
                    issue.iteration_group_id.as_deref(),
                    issue.iteration_cadence_id.as_deref(),
                    issue.iteration_cadence_title.as_deref(),
                    issue.iteration_title.as_deref(),
                    issue.iteration_start_date.as_deref(),
                    issue.iteration_due_date.as_deref(),
                    bucket.as_str(),
                    utc_timestamp(),
                    id,
                ],
            )?;
            Ok(id)
        }
        None => {
            connection.execute(
                "INSERT INTO work_items (provider_account_id, provider_item_id, title, state, closed_at, web_url, labels_json, issue_graphql_id, milestone_title, iteration_gitlab_id, iteration_group_id, iteration_cadence_id, iteration_cadence_title, iteration_title, iteration_start_date, iteration_due_date, from_assigned_sync, assigned_bucket, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, 1, ?17, ?18)",
                params![
                    provider_account_id,
                    issue.provider_item_id.as_str(),
                    issue.title.as_str(),
                    issue.state.as_str(),
                    issue.closed_at.as_deref(),
                    issue.web_url.as_deref(),
                    labels_json.as_str(),
                    issue.issue_graphql_id.as_str(),
                    issue.milestone_title.as_deref(),
                    issue.iteration_gitlab_id.as_deref(),
                    issue.iteration_group_id.as_deref(),
                    issue.iteration_cadence_id.as_deref(),
                    issue.iteration_cadence_title.as_deref(),
                    issue.iteration_title.as_deref(),
                    issue.iteration_start_date.as_deref(),
                    issue.iteration_due_date.as_deref(),
                    bucket.as_str(),
                    utc_timestamp(),
                ],
            )?;
            Ok(connection.last_insert_rowid())
        }
    }
}

pub fn clear_missing_assigned_issues_for_buckets(
    connection: &Connection,
    provider_account_id: i64,
    buckets: &[AssignedIssueBucket],
    seen_provider_item_ids: &[String],
) -> Result<(), AppError> {
    if buckets.is_empty() {
        return Ok(());
    }

    let bucket_placeholders = std::iter::repeat_n("?", buckets.len())
        .collect::<Vec<_>>()
        .join(", ");
    let seen_placeholders = std::iter::repeat_n("?", seen_provider_item_ids.len())
        .collect::<Vec<_>>()
        .join(", ");

    let sql = if seen_provider_item_ids.is_empty() {
        format!(
            "UPDATE work_items
             SET from_assigned_sync = 0, assigned_bucket = NULL
             WHERE provider_account_id = ?1
               AND from_assigned_sync = 1
               AND assigned_bucket IN ({bucket_placeholders})"
        )
    } else {
        format!(
            "UPDATE work_items
             SET from_assigned_sync = 0, assigned_bucket = NULL
             WHERE provider_account_id = ?1
               AND from_assigned_sync = 1
               AND assigned_bucket IN ({bucket_placeholders})
               AND provider_item_id NOT IN ({seen_placeholders})"
        )
    };

    let mut params = vec![&provider_account_id as &dyn ToSql];
    let bucket_values = buckets
        .iter()
        .map(|bucket| bucket.as_str())
        .collect::<Vec<_>>();
    for bucket in &bucket_values {
        params.push(bucket);
    }
    for seen in seen_provider_item_ids {
        params.push(seen);
    }

    connection.execute(sql.as_str(), params_from_iter(params))?;
    Ok(())
}

pub fn age_recent_closed_assigned_issues(
    connection: &Connection,
    provider_account_id: i64,
    cutoff_timestamp: &str,
) -> Result<(), AppError> {
    connection.execute(
        "UPDATE work_items
         SET assigned_bucket = ?1
         WHERE provider_account_id = ?2
           AND from_assigned_sync = 1
           AND assigned_bucket = ?3
           AND closed_at IS NOT NULL
           AND closed_at < ?4",
        params![
            AssignedIssueBucket::ArchiveClosed.as_str(),
            provider_account_id,
            AssignedIssueBucket::RecentClosed.as_str(),
            cutoff_timestamp,
        ],
    )?;
    Ok(())
}

pub fn upsert_iteration_catalog_entries(
    connection: &Connection,
    provider_account_id: i64,
    iterations: &[CachedIterationRecord],
) -> Result<(), AppError> {
    for iteration in iterations {
        let existing_id: Option<i64> = connection
            .query_row(
                "SELECT id FROM iteration_catalog
                 WHERE provider_account_id = ?1 AND iteration_gitlab_id = ?2
                 LIMIT 1",
                params![provider_account_id, iteration.iteration_gitlab_id.as_str()],
                |row| row.get(0),
            )
            .optional()?;

        match existing_id {
            Some(id) => {
                connection.execute(
                    "UPDATE iteration_catalog
                     SET cadence_id = ?1,
                         cadence_title = ?2,
                         title = ?3,
                         start_date = ?4,
                         due_date = ?5,
                         state = ?6,
                         web_url = ?7,
                         group_id = ?8,
                         updated_at = ?9
                     WHERE id = ?10",
                    params![
                        iteration.cadence_id.as_deref(),
                        iteration.cadence_title.as_deref(),
                        iteration.title.as_deref(),
                        iteration.start_date.as_deref(),
                        iteration.due_date.as_deref(),
                        iteration.state.as_deref(),
                        iteration.web_url.as_deref(),
                        iteration.group_id.as_deref(),
                        utc_timestamp(),
                        id,
                    ],
                )?;
            }
            None => {
                connection.execute(
                    "INSERT INTO iteration_catalog (
                        provider_account_id,
                        iteration_gitlab_id,
                        cadence_id,
                        cadence_title,
                        title,
                        start_date,
                        due_date,
                        state,
                        web_url,
                        group_id,
                        updated_at
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                    params![
                        provider_account_id,
                        iteration.iteration_gitlab_id.as_str(),
                        iteration.cadence_id.as_deref(),
                        iteration.cadence_title.as_deref(),
                        iteration.title.as_deref(),
                        iteration.start_date.as_deref(),
                        iteration.due_date.as_deref(),
                        iteration.state.as_deref(),
                        iteration.web_url.as_deref(),
                        iteration.group_id.as_deref(),
                        utc_timestamp(),
                    ],
                )?;
            }
        }
    }

    Ok(())
}

pub fn delete_iteration_catalog_group_missing(
    connection: &Connection,
    provider_account_id: i64,
    group_id: &str,
    seen_iteration_ids: &[String],
) -> Result<(), AppError> {
    let seen_placeholders = std::iter::repeat_n("?", seen_iteration_ids.len())
        .collect::<Vec<_>>()
        .join(", ");

    let sql = if seen_iteration_ids.is_empty() {
        "DELETE FROM iteration_catalog
         WHERE provider_account_id = ?1 AND group_id = ?2"
            .to_string()
    } else {
        format!(
            "DELETE FROM iteration_catalog
             WHERE provider_account_id = ?1
               AND group_id = ?2
               AND iteration_gitlab_id NOT IN ({seen_placeholders})"
        )
    };

    let mut params = vec![&provider_account_id as &dyn ToSql, &group_id as &dyn ToSql];
    for id in seen_iteration_ids {
        params.push(id);
    }

    connection.execute(sql.as_str(), params_from_iter(params))?;
    Ok(())
}

pub fn upsert_time_entry(
    connection: &Connection,
    provider_account_id: i64,
    provider_entry_id: &str,
    work_item_id: Option<i64>,
    spent_at: &str,
    uploaded_at: Option<&str>,
    seconds: i64,
) -> Result<(), AppError> {
    let existing_id: Option<i64> = connection
        .query_row(
            "SELECT id FROM time_entries WHERE provider_account_id = ?1 AND provider_entry_id = ?2 LIMIT 1",
            params![provider_account_id, provider_entry_id],
            |row| row.get(0),
        )
        .optional()?;

    match existing_id {
        Some(id) => {
            connection.execute(
                "UPDATE time_entries SET work_item_id = ?1, spent_at = ?2, uploaded_at = ?3, seconds = ?4 WHERE id = ?5",
                params![work_item_id, spent_at, uploaded_at, seconds, id],
            )?;
        }
        None => {
            connection.execute(
                "INSERT INTO time_entries (provider_account_id, provider_entry_id, work_item_id, spent_at, uploaded_at, seconds) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![provider_account_id, provider_entry_id, work_item_id, spent_at, uploaded_at, seconds],
            )?;
        }
    }

    Ok(())
}

pub fn upsert_project(
    connection: &Connection,
    provider_account_id: i64,
    provider_project_id: &str,
    name: &str,
    path: &str,
) -> Result<(), AppError> {
    let existing_id: Option<i64> = connection
        .query_row(
            "SELECT id FROM projects WHERE provider_account_id = ?1 AND provider_project_id = ?2 LIMIT 1",
            params![provider_account_id, provider_project_id],
            |row| row.get(0),
        )
        .optional()?;

    match existing_id {
        Some(id) => {
            connection.execute(
                "UPDATE projects SET name = ?1, path = ?2 WHERE id = ?3",
                params![name, path, id],
            )?;
        }
        None => {
            connection.execute(
                "INSERT INTO projects (provider_account_id, provider_project_id, name, path) VALUES (?1, ?2, ?3, ?4)",
                params![provider_account_id, provider_project_id, name, path],
            )?;
        }
    }

    Ok(())
}

pub fn delete_time_entries_in_range(
    connection: &Connection,
    provider_account_id: i64,
    start_date: &NaiveDate,
    end_date: &NaiveDate,
) -> Result<(), AppError> {
    connection.execute(
        "DELETE FROM time_entries WHERE provider_account_id = ?1 AND date(spent_at) >= ?2 AND date(spent_at) <= ?3",
        params![
            provider_account_id,
            start_date.format("%Y-%m-%d").to_string(),
            end_date.format("%Y-%m-%d").to_string(),
        ],
    )?;

    Ok(())
}

#[cfg(test)]
pub fn rebuild_daily_buckets(
    connection: &Connection,
    provider_account_id: i64,
    start_date: &NaiveDate,
    end_date: &NaiveDate,
) -> Result<(), AppError> {
    let tx = connection.unchecked_transaction()?;

    rebuild_daily_buckets_in_tx(&tx, provider_account_id, start_date, end_date)?;

    tx.commit()?;
    Ok(())
}

pub fn rebuild_daily_buckets_in_tx(
    tx: &Transaction<'_>,
    provider_account_id: i64,
    start_date: &NaiveDate,
    end_date: &NaiveDate,
) -> Result<(), AppError> {
    let start_str = start_date.format("%Y-%m-%d").to_string();
    let end_str = end_date.format("%Y-%m-%d").to_string();

    // Load schedule — error out clearly if missing
    let weekday_schedules = tx
        .query_row(
            "SELECT workdays_json, shift_start, shift_end, lunch_minutes, weekday_schedule_json FROM schedule_profiles WHERE is_default = 1 LIMIT 1",
            [],
            |row| {
                let workdays_json: String = row.get(0)?;
                let shift_start: Option<String> = row.get(1)?;
                let shift_end: Option<String> = row.get(2)?;
                let lunch_minutes: Option<u32> = row.get(3)?;
                let weekday_schedule_json: Option<String> = row.get(4)?;

                Ok(bootstrap::weekday_schedules_from_fields(
                    weekday_schedule_json.as_deref(),
                    Some(workdays_json.as_str()),
                    shift_start.as_deref(),
                    shift_end.as_deref(),
                    lunch_minutes,
                ))
            },
        )
        .map_err(|_| {
            AppError::GitLabApi(
                "no default schedule profile found; configure your work schedule first".to_string(),
            )
        })?;

    // Delete existing buckets in range
    tx.execute(
        "DELETE FROM daily_buckets WHERE provider_account_id = ?1 AND date >= ?2 AND date <= ?3",
        params![provider_account_id, start_str, end_str],
    )?;

    // Rebuild from time_entries
    let mut statement = tx.prepare(
        "SELECT date(spent_at) as day, SUM(seconds) as total
         FROM time_entries
         WHERE provider_account_id = ?1 AND date(spent_at) >= ?2 AND date(spent_at) <= ?3
         GROUP BY date(spent_at)
         ORDER BY day ASC",
    )?;

    let rows = statement.query_map(params![provider_account_id, start_str, end_str], |row| {
        let day: String = row.get(0)?;
        let logged: i64 = row.get(1)?;
        Ok((day, logged))
    })?;

    let collected: Vec<(String, i64)> = rows.collect::<Result<_, _>>()?;
    drop(statement);

    for (day, logged_seconds) in collected {
        let day_date = NaiveDate::parse_from_str(&day, "%Y-%m-%d").unwrap_or(*start_date);
        let effective_target_seconds =
            bootstrap::target_seconds_for_date(day_date, &weekday_schedules);
        let is_workday = effective_target_seconds > 0;
        let variance = logged_seconds - effective_target_seconds;
        let status = if logged_seconds == 0 && !is_workday {
            "non_workday"
        } else if logged_seconds == 0 {
            "empty"
        } else if variance > 1800 {
            "over_target"
        } else if variance >= -1800 {
            "met_target"
        } else if logged_seconds > 0 {
            "on_track"
        } else {
            "under_target"
        };

        tx.execute(
            "INSERT INTO daily_buckets (provider_account_id, date, target_seconds, logged_seconds, variance_seconds, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![provider_account_id, day, effective_target_seconds, logged_seconds, variance, status],
        )?;
    }

    Ok(())
}

/// Recomputes `daily_buckets.target_seconds` (and related status) from the current schedule for
/// every date that has time entries or existing buckets, through today. Required after schedule
/// edits so worklog and dashboard targets match without a full GitLab sync.
pub fn rebuild_daily_buckets_after_schedule_change(
    connection: &Connection,
    provider_account_id: i64,
) -> Result<(), AppError> {
    let today = Local::now().date_naive();
    let fallback_start = today.checked_sub_months(Months::new(24)).unwrap_or(today);

    let min_entry: Option<String> = connection.query_row(
        "SELECT MIN(date(spent_at)) FROM time_entries WHERE provider_account_id = ?1",
        [provider_account_id],
        |row| row.get::<_, Option<String>>(0),
    )?;
    let max_entry: Option<String> = connection.query_row(
        "SELECT MAX(date(spent_at)) FROM time_entries WHERE provider_account_id = ?1",
        [provider_account_id],
        |row| row.get::<_, Option<String>>(0),
    )?;

    let min_bucket: Option<String> = connection.query_row(
        "SELECT MIN(date) FROM daily_buckets WHERE provider_account_id = ?1",
        [provider_account_id],
        |row| row.get::<_, Option<String>>(0),
    )?;
    let max_bucket: Option<String> = connection.query_row(
        "SELECT MAX(date) FROM daily_buckets WHERE provider_account_id = ?1",
        [provider_account_id],
        |row| row.get::<_, Option<String>>(0),
    )?;

    let mut start = fallback_start;
    let mut end = today;

    for raw in [min_entry.as_deref(), min_bucket.as_deref()] {
        if let Some(d) = raw.and_then(|v| NaiveDate::parse_from_str(v, "%Y-%m-%d").ok()) {
            start = start.min(d);
        }
    }
    for raw in [max_entry.as_deref(), max_bucket.as_deref()] {
        if let Some(d) = raw.and_then(|v| NaiveDate::parse_from_str(v, "%Y-%m-%d").ok()) {
            end = end.max(d);
        }
    }
    end = end.max(today);

    let tx = connection.unchecked_transaction()?;
    rebuild_daily_buckets_in_tx(&tx, provider_account_id, &start, &end)?;
    tx.commit()?;

    update_quest_progress_from_buckets(connection, provider_account_id)?;

    let streak_snapshot =
        crate::services::streak::build_streak_snapshot(connection, provider_account_id, today)?;
    crate::services::streak::persist_current_streak(
        connection,
        provider_account_id,
        streak_snapshot.current_days,
    )?;

    Ok(())
}

pub fn update_quest_progress_from_buckets(
    connection: &Connection,
    provider_account_id: i64,
) -> Result<(), AppError> {
    crate::db::ensure_gamification_profile(connection, provider_account_id)?;

    ensure_reward_inventory_seeded(connection, provider_account_id)?;

    let week_starts_on = load_week_start_index(connection)?;
    let today = connection
        .query_row(
            "SELECT COALESCE(MAX(date), DATE('now', 'localtime')) FROM daily_buckets WHERE provider_account_id = ?1",
            [provider_account_id],
            |row| row.get::<_, String>(0),
        )
        .ok()
        .and_then(|value| NaiveDate::parse_from_str(&value, "%Y-%m-%d").ok())
        .unwrap_or_else(|| chrono::Local::now().date_naive());
    let week_start = start_of_week(today, week_starts_on)
        .format("%Y-%m-%d")
        .to_string();
    let week_end = (start_of_week(today, week_starts_on) + chrono::Duration::days(6))
        .format("%Y-%m-%d")
        .to_string();

    let balanced_days: i64 = connection.query_row(
        "SELECT COUNT(*)
         FROM daily_buckets
         WHERE provider_account_id = ?1 AND date = ?2 AND status = 'met_target'",
        params![provider_account_id, today.format("%Y-%m-%d").to_string()],
        |row| row.get(0),
    )?;
    let clean_week_days: i64 = connection.query_row(
        "SELECT COUNT(*)
         FROM daily_buckets
         WHERE provider_account_id = ?1
           AND date >= ?2
           AND date <= ?3
           AND target_seconds > 0
           AND status IN ('met_target', 'on_track')",
        params![provider_account_id, week_start, week_end],
        |row| row.get(0),
    )?;
    let recovery_window: i64 = connection.query_row(
        "SELECT COUNT(*)
         FROM daily_buckets
         WHERE provider_account_id = ?1
           AND date >= ?2
           AND date <= ?3
           AND ((status = 'non_workday' OR target_seconds <= 0) AND logged_seconds <= 7200)",
        params![provider_account_id, week_start, week_end],
        |row| row.get(0),
    )?;
    let weekend_wander: i64 = connection.query_row(
        "SELECT COUNT(*)
         FROM daily_buckets
         WHERE provider_account_id = ?1
           AND date >= ?2
           AND date <= ?3
           AND (status = 'non_workday' OR target_seconds <= 0)
           AND logged_seconds <= 7200",
        params![provider_account_id, week_start, week_end],
        |row| row.get(0),
    )?;
    let issue_sprinter: i64 = connection.query_row(
        "SELECT COUNT(DISTINCT work_item_id)
         FROM time_entries
         WHERE provider_account_id = ?1
           AND work_item_id IS NOT NULL
           AND date(spent_at) >= ?2
           AND date(spent_at) <= ?3",
        params![provider_account_id, week_start, week_end],
        |row| row.get(0),
    )?;
    let streak_keeper: i64 = connection
        .query_row(
            "SELECT COALESCE(streak_days, 0) FROM gamification_profiles WHERE provider_account_id = ?1 LIMIT 1",
            [provider_account_id],
            |row| row.get(0),
        )
        .optional()?
        .unwrap_or(0);

    upsert_quest_progress(
        connection,
        provider_account_id,
        "balanced_day",
        balanced_days,
    )?;
    upsert_quest_progress(
        connection,
        provider_account_id,
        "clean_week",
        clean_week_days,
    )?;
    upsert_quest_progress(
        connection,
        provider_account_id,
        "issue_sprinter",
        issue_sprinter,
    )?;
    upsert_quest_progress(
        connection,
        provider_account_id,
        "recovery_window",
        recovery_window,
    )?;
    upsert_quest_progress(
        connection,
        provider_account_id,
        "weekend_wander",
        weekend_wander,
    )?;
    upsert_quest_progress(
        connection,
        provider_account_id,
        "streak_keeper",
        streak_keeper,
    )?;

    Ok(())
}

fn load_week_start_index(connection: &Connection) -> Result<u32, AppError> {
    let (timezone, week_start): (String, Option<String>) = connection
        .query_row(
            "SELECT timezone, week_start FROM schedule_profiles WHERE is_default = 1 LIMIT 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()?
        .unwrap_or_else(|| ("UTC".to_string(), Some("monday".to_string())));

    Ok(match week_start.as_deref().unwrap_or("monday") {
        "sunday" => 0,
        "monday" => 1,
        "saturday" => 6,
        "auto" => {
            if timezone.starts_with("America/") {
                0
            } else {
                1
            }
        }
        _ => 1,
    })
}

fn start_of_week(today: NaiveDate, week_starts_on: u32) -> NaiveDate {
    let current = today.weekday().num_days_from_sunday();
    let delta = (current + 7 - week_starts_on) % 7;
    today - chrono::Duration::days(delta as i64)
}

fn ensure_reward_inventory_seeded(
    connection: &Connection,
    provider_account_id: i64,
) -> Result<(), AppError> {
    connection.execute(
        "INSERT INTO reward_inventory (
            provider_account_id,
            reward_key,
            reward_name,
            reward_type,
            accessory_slot,
            environment_scene_key,
            theme_tag,
            cost_tokens,
            owned,
            equipped
         )
         SELECT
            ?1,
            rc.reward_key,
            rc.reward_name,
            rc.reward_type,
            rc.accessory_slot,
            rc.environment_scene_key,
            rc.theme_tag,
            rc.cost_tokens,
            CASE WHEN rc.reward_key = 'aurora-evolution' THEN 1 ELSE 0 END,
            CASE WHEN rc.reward_key = 'aurora-evolution' THEN 1 ELSE 0 END
         FROM reward_catalog rc
         WHERE NOT EXISTS (
            SELECT 1
            FROM reward_inventory ri
            WHERE ri.provider_account_id = ?1 AND ri.reward_key = rc.reward_key
         )",
        [provider_account_id],
    )?;

    Ok(())
}

fn upsert_quest_progress(
    connection: &Connection,
    provider_account_id: i64,
    quest_key: &str,
    progress_value: i64,
) -> Result<(), AppError> {
    let existing_id: Option<i64> = connection
        .query_row(
            "SELECT id FROM quest_progress WHERE provider_account_id = ?1 AND quest_key = ?2 LIMIT 1",
            params![provider_account_id, quest_key],
            |row| row.get(0),
        )
        .optional()?;

    match existing_id {
        Some(id) => {
            connection.execute(
                "UPDATE quest_progress SET progress_value = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                params![progress_value, id],
            )?;
        }
        None => {
            connection.execute(
                "INSERT INTO quest_progress (provider_account_id, quest_key, progress_value, is_active, updated_at)
                 VALUES (?1, ?2, ?3, 0, CURRENT_TIMESTAMP)",
                params![provider_account_id, quest_key, progress_value],
            )?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use chrono::NaiveDate;
    use rusqlite::params;
    use rusqlite::Connection;

    use super::{
        age_recent_closed_assigned_issues, clear_missing_assigned_issues_for_buckets,
        delete_iteration_catalog_group_missing, delete_time_entries_in_range,
        rebuild_daily_buckets, rebuild_daily_buckets_in_tx, update_provider_last_sync_at,
        update_quest_progress_from_buckets, upsert_assigned_issue,
        upsert_iteration_catalog_entries, upsert_time_entry, AssignedIssueBucket,
    };
    use crate::db;
    use crate::domain::models::{AssignedIssueRecord, CachedIterationRecord};

    fn setup_connection() -> Connection {
        let connection = Connection::open_in_memory().unwrap();
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
                 VALUES (?1, 0, 1, 4, 50, '[]', '{}')",
                [provider_id],
            )
            .unwrap();
        connection
            .execute(
                "UPDATE schedule_profiles SET week_start = 'monday', timezone = 'UTC' WHERE is_default = 1",
                [],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO schedule_profiles (provider_account_id, timezone, hours_per_day, workdays_json, shift_start, shift_end, lunch_minutes, is_default)
                 SELECT ?1, 'UTC', 9.0, '[\"Mon\",\"Tue\",\"Wed\",\"Thu\",\"Fri\"]', '09:00', '19:00', 60, 1
                 WHERE NOT EXISTS (SELECT 1 FROM schedule_profiles WHERE is_default = 1)",
                [provider_id],
            )
            .unwrap();

        for reward in db::DEFAULT_REWARD_DEFINITIONS {
            connection
                .execute(
                    "INSERT OR IGNORE INTO reward_catalog (reward_key, reward_name, reward_type, accessory_slot, companion_variant, environment_scene_key, theme_tag, cost_tokens, featured, rarity, store_section)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                    params![
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
                    ],
                )
                .unwrap();
        }

        connection
    }

    fn primary_provider_id(connection: &Connection) -> i64 {
        connection
            .query_row(
                "SELECT id FROM provider_accounts WHERE is_primary = 1 LIMIT 1",
                [],
                |row| row.get(0),
            )
            .unwrap()
    }

    fn assigned_issue(
        provider_item_id: &str,
        state: &str,
        closed_at: Option<&str>,
    ) -> AssignedIssueRecord {
        AssignedIssueRecord {
            issue_graphql_id: format!("gid://gitlab/Issue/{provider_item_id}"),
            provider_item_id: provider_item_id.to_string(),
            title: format!("Issue {provider_item_id}"),
            state: state.to_string(),
            closed_at: closed_at.map(str::to_string),
            web_url: None,
            labels: vec![],
            milestone_title: None,
            iteration_gitlab_id: None,
            iteration_group_id: None,
            iteration_cadence_id: None,
            iteration_cadence_title: None,
            iteration_title: None,
            iteration_start_date: None,
            iteration_due_date: None,
        }
    }

    #[test]
    fn update_provider_last_sync_at_persists_timestamp() {
        let connection = setup_connection();
        let provider_id = primary_provider_id(&connection);

        update_provider_last_sync_at(&connection, provider_id, "2026-03-22T09:30:00Z").unwrap();

        let synced_at: Option<String> = connection
            .query_row(
                "SELECT last_sync_at FROM provider_accounts WHERE id = ?1 LIMIT 1",
                [provider_id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(synced_at.as_deref(), Some("2026-03-22T09:30:00Z"));
    }

    #[test]
    fn rebuild_daily_buckets_populates_range_from_time_entries() {
        let connection = setup_connection();
        let provider_id = primary_provider_id(&connection);

        upsert_time_entry(
            &connection,
            provider_id,
            "gql-buckets-1",
            None,
            "2026-03-10T10:00:00Z",
            Some("2026-03-10T10:10:00Z"),
            10800,
        )
        .unwrap();

        rebuild_daily_buckets(
            &connection,
            provider_id,
            &NaiveDate::from_ymd_opt(2026, 3, 10).unwrap(),
            &NaiveDate::from_ymd_opt(2026, 3, 10).unwrap(),
        )
        .unwrap();

        let (logged_seconds, target_seconds): (i64, i64) = connection
            .query_row(
                "SELECT logged_seconds, target_seconds FROM daily_buckets WHERE provider_account_id = ?1 AND date = '2026-03-10' LIMIT 1",
                [provider_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();

        assert_eq!(logged_seconds, 10800);
        assert_eq!(target_seconds, 32400);
    }

    #[test]
    fn rebuild_daily_buckets_in_tx_runs_inside_existing_transaction() {
        let connection = setup_connection();
        let provider_id = primary_provider_id(&connection);

        upsert_time_entry(
            &connection,
            provider_id,
            "gql-buckets-tx",
            None,
            "2026-03-11T10:00:00Z",
            Some("2026-03-11T10:15:00Z"),
            7200,
        )
        .unwrap();

        let tx = connection.unchecked_transaction().unwrap();
        rebuild_daily_buckets_in_tx(
            &tx,
            provider_id,
            &NaiveDate::from_ymd_opt(2026, 3, 11).unwrap(),
            &NaiveDate::from_ymd_opt(2026, 3, 11).unwrap(),
        )
        .unwrap();
        tx.commit().unwrap();

        let count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM daily_buckets WHERE provider_account_id = ?1 AND date = '2026-03-11'",
                [provider_id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(count, 1);
    }

    #[test]
    fn upsert_time_entry_replaces_existing_row_when_key_matches() {
        let connection = setup_connection();

        upsert_time_entry(
            &connection,
            1,
            "gql-same-id",
            None,
            "2026-03-13T10:00:00Z",
            Some("2026-03-13T11:00:00Z"),
            3600,
        )
        .unwrap();

        upsert_time_entry(
            &connection,
            1,
            "gql-same-id",
            None,
            "2026-03-13T10:00:00Z",
            Some("2026-03-13T11:30:00Z"),
            7200,
        )
        .unwrap();

        let (count, seconds): (i64, i64) = connection
            .query_row(
                "SELECT COUNT(*), COALESCE(SUM(seconds), 0) FROM time_entries WHERE provider_account_id = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();

        assert_eq!(count, 1);
        assert_eq!(seconds, 7200);
    }

    #[test]
    fn delete_time_entries_in_range_clears_previous_import_before_refresh() {
        let connection = setup_connection();

        upsert_time_entry(
            &connection,
            1,
            "gql-a",
            None,
            "2026-03-10T10:00:00Z",
            Some("2026-03-10T12:00:00Z"),
            3600,
        )
        .unwrap();
        upsert_time_entry(
            &connection,
            1,
            "gql-b",
            None,
            "2026-03-11T10:00:00Z",
            Some("2026-03-11T12:00:00Z"),
            3600,
        )
        .unwrap();
        upsert_time_entry(
            &connection,
            1,
            "gql-c",
            None,
            "2026-01-20T10:00:00Z",
            Some("2026-01-20T12:00:00Z"),
            3600,
        )
        .unwrap();

        delete_time_entries_in_range(
            &connection,
            1,
            &NaiveDate::from_ymd_opt(2026, 3, 1).unwrap(),
            &NaiveDate::from_ymd_opt(2026, 3, 31).unwrap(),
        )
        .unwrap();

        let remaining: Vec<String> = connection
            .prepare("SELECT provider_entry_id FROM time_entries ORDER BY provider_entry_id ASC")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert_eq!(remaining, vec!["gql-c".to_string()]);
    }

    #[test]
    fn update_quest_progress_bootstraps_missing_gamification_profile() {
        let connection = Connection::open_in_memory().unwrap();
        crate::db::migrate(&connection).unwrap();

        connection
            .execute(
                "INSERT INTO provider_accounts (provider, host, display_name, auth_mode, preferred_scope, status_note, oauth_ready, is_primary, created_at)
                 VALUES ('GitLab', 'gitlab.com', 'Pilot', 'PAT', 'read_api', 'ok', 1, 1, '2026-03-14T09:00:00Z')",
                [],
            )
            .unwrap();

        let provider_id = connection.last_insert_rowid();

        update_quest_progress_from_buckets(&connection, provider_id).unwrap();

        let count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM gamification_profiles WHERE provider_account_id = ?1",
                [provider_id],
                |row| row.get(0),
            )
            .unwrap();
        let streak_days: i64 = connection
            .query_row(
                "SELECT streak_days FROM gamification_profiles WHERE provider_account_id = ?1 LIMIT 1",
                [provider_id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(count, 1);
        assert_eq!(streak_days, 0);
    }

    #[test]
    fn update_quest_progress_is_idempotent_for_reward_inventory() {
        let connection = setup_connection();
        let provider_id = primary_provider_id(&connection);

        connection
            .execute(
                "INSERT INTO daily_buckets (provider_account_id, date, target_seconds, logged_seconds, variance_seconds, status)
                 VALUES (?1, '2026-03-10', 28800, 28800, 0, 'met_target')",
                [provider_id],
            )
            .unwrap();

        update_quest_progress_from_buckets(&connection, provider_id).unwrap();
        update_quest_progress_from_buckets(&connection, provider_id).unwrap();

        let duplicate_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM reward_inventory WHERE provider_account_id = ?1 AND reward_key = 'frame-signal'",
                [provider_id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(duplicate_count, 1);
    }

    #[test]
    fn update_quest_progress_uses_calendar_week_recovery_patterns() {
        let connection = setup_connection();
        let provider_id = primary_provider_id(&connection);

        connection
            .execute_batch(
                r#"
                INSERT INTO daily_buckets (provider_account_id, date, target_seconds, logged_seconds, variance_seconds, status)
                VALUES
                  (1, '2026-03-09', 28800, 28800, 0, 'met_target'),
                  (1, '2026-03-10', 28800, 25200, -3600, 'on_track'),
                  (1, '2026-03-11', 28800, 28800, 0, 'met_target'),
                  (1, '2026-03-12', 0, 3600, 3600, 'non_workday'),
                  (1, '2026-03-13', 0, 5400, 5400, 'non_workday'),
                  (1, '2026-03-14', 0, 3600, 3600, 'non_workday');
                "#,
            )
            .unwrap();

        update_quest_progress_from_buckets(&connection, provider_id).unwrap();

        let values: Vec<(String, i64)> = connection
            .prepare(
                "SELECT quest_key, progress_value FROM quest_progress WHERE provider_account_id = ?1 AND quest_key IN ('balanced_day', 'clean_week', 'recovery_window', 'weekend_wander') ORDER BY quest_key ASC",
            )
            .unwrap()
            .query_map([provider_id], |row| Ok((row.get(0)?, row.get(1)?)))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert_eq!(
            values,
            vec![
                ("balanced_day".to_string(), 0),
                ("clean_week".to_string(), 3),
                ("recovery_window".to_string(), 3),
                ("weekend_wander".to_string(), 3),
            ]
        );
    }

    #[test]
    fn clear_missing_assigned_issues_for_buckets_keeps_seen_and_clears_missing() {
        let connection = setup_connection();
        let provider_id = primary_provider_id(&connection);

        upsert_assigned_issue(
            &connection,
            provider_id,
            &assigned_issue("group/project#1", "opened", None),
            AssignedIssueBucket::Open,
        )
        .unwrap();
        upsert_assigned_issue(
            &connection,
            provider_id,
            &assigned_issue("group/project#2", "closed", Some("2026-04-01T00:00:00Z")),
            AssignedIssueBucket::RecentClosed,
        )
        .unwrap();

        clear_missing_assigned_issues_for_buckets(
            &connection,
            provider_id,
            &[AssignedIssueBucket::Open, AssignedIssueBucket::RecentClosed],
            &["group/project#2".to_string()],
        )
        .unwrap();

        let rows = connection
            .prepare(
                "SELECT provider_item_id, from_assigned_sync, assigned_bucket
                 FROM work_items
                 WHERE provider_account_id = ?1
                 ORDER BY provider_item_id ASC",
            )
            .unwrap()
            .query_map([provider_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, Option<String>>(2)?,
                ))
            })
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert_eq!(
            rows,
            vec![
                ("group/project#1".to_string(), 0, None),
                (
                    "group/project#2".to_string(),
                    1,
                    Some(AssignedIssueBucket::RecentClosed.as_str().to_string()),
                ),
            ]
        );
    }

    #[test]
    fn age_recent_closed_assigned_issues_moves_old_rows_to_archive_bucket() {
        let connection = setup_connection();
        let provider_id = primary_provider_id(&connection);

        upsert_assigned_issue(
            &connection,
            provider_id,
            &assigned_issue("group/project#9", "closed", Some("2025-09-01T00:00:00Z")),
            AssignedIssueBucket::RecentClosed,
        )
        .unwrap();

        age_recent_closed_assigned_issues(&connection, provider_id, "2025-10-11T00:00:00Z")
            .unwrap();

        let bucket: Option<String> = connection
            .query_row(
                "SELECT assigned_bucket FROM work_items WHERE provider_account_id = ?1 AND provider_item_id = 'group/project#9'",
                [provider_id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(
            bucket.as_deref(),
            Some(AssignedIssueBucket::ArchiveClosed.as_str())
        );
    }

    #[test]
    fn iteration_catalog_group_upsert_and_missing_delete_support_full_reconcile() {
        let connection = setup_connection();
        let provider_id = primary_provider_id(&connection);

        upsert_iteration_catalog_entries(
            &connection,
            provider_id,
            &[CachedIterationRecord {
                iteration_gitlab_id: "100".to_string(),
                cadence_id: None,
                cadence_title: Some("WEB".to_string()),
                title: None,
                start_date: Some("2026-04-01".to_string()),
                due_date: Some("2026-04-14".to_string()),
                state: Some("opened".to_string()),
                web_url: None,
                group_id: Some("55".to_string()),
            }],
        )
        .unwrap();
        upsert_iteration_catalog_entries(
            &connection,
            provider_id,
            &[CachedIterationRecord {
                iteration_gitlab_id: "101".to_string(),
                cadence_id: None,
                cadence_title: Some("WEB".to_string()),
                title: None,
                start_date: Some("2026-04-15".to_string()),
                due_date: Some("2026-04-28".to_string()),
                state: Some("opened".to_string()),
                web_url: None,
                group_id: Some("55".to_string()),
            }],
        )
        .unwrap();

        delete_iteration_catalog_group_missing(
            &connection,
            provider_id,
            "55",
            &["101".to_string()],
        )
        .unwrap();

        let ids = connection
            .prepare(
                "SELECT iteration_gitlab_id
                 FROM iteration_catalog
                 WHERE provider_account_id = ?1
                 ORDER BY iteration_gitlab_id ASC",
            )
            .unwrap()
            .query_map([provider_id], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert_eq!(ids, vec!["101".to_string()]);
    }
}

#[allow(dead_code)]
pub fn load_sync_cursor(
    connection: &Connection,
    provider_account_id: i64,
    entity_type: &str,
) -> Result<Option<String>, AppError> {
    let cursor = connection
        .query_row(
            "SELECT cursor_value FROM sync_cursors WHERE provider_account_id = ?1 AND entity_type = ?2 LIMIT 1",
            params![provider_account_id, entity_type],
            |row| row.get::<_, Option<String>>(0),
        )
        .optional()?;

    Ok(cursor.flatten())
}

pub fn update_sync_cursor(
    connection: &Connection,
    provider_account_id: i64,
    entity_type: &str,
    cursor_value: &str,
) -> Result<(), AppError> {
    let now = utc_timestamp();

    let existing: Option<i64> = connection
        .query_row(
            "SELECT id FROM sync_cursors WHERE provider_account_id = ?1 AND entity_type = ?2 LIMIT 1",
            params![provider_account_id, entity_type],
            |row| row.get(0),
        )
        .optional()?;

    match existing {
        Some(id) => {
            connection.execute(
                "UPDATE sync_cursors SET cursor_value = ?1, synced_at = ?2 WHERE id = ?3",
                params![cursor_value, now, id],
            )?;
        }
        None => {
            connection.execute(
                "INSERT INTO sync_cursors (provider_account_id, entity_type, cursor_value, synced_at) VALUES (?1, ?2, ?3, ?4)",
                params![provider_account_id, entity_type, cursor_value, now],
            )?;
        }
    }

    Ok(())
}

pub fn update_provider_last_sync_at(
    connection: &Connection,
    provider_account_id: i64,
    synced_at: &str,
) -> Result<(), AppError> {
    connection.execute(
        "UPDATE provider_accounts SET last_sync_at = ?1 WHERE id = ?2",
        params![synced_at, provider_account_id],
    )?;

    Ok(())
}
