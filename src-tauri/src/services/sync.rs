use std::time::Instant;

use chrono::{Months, NaiveDate, Utc};

use crate::{
    db,
    domain::models::SyncResult,
    error::AppError,
    providers::gitlab::GitLabClient,
    services::{localization, preferences, shared},
    state::AppState,
    support::time::utc_timestamp,
};

pub fn sync_gitlab(
    state: &AppState,
    on_progress: &mut dyn FnMut(String),
) -> Result<SyncResult, AppError> {
    let connection = shared::open_connection(state)?;
    let app_preferences = preferences::load_app_preferences(&connection)?;
    let locale = localization::AppLocale::from_language_pref(&app_preferences.language);

    on_progress(localization::sync_lookup_connection(locale).to_string());
    let primary = shared::load_primary_gitlab_connection(&connection)?;
    db::ensure_gamification_profile(&connection, primary.id)?;

    let token = db::connection::load_gitlab_token(&connection, &primary.host)?
        .ok_or_else(|| AppError::GitLabApi("No token found for primary connection.".to_string()))?;

    on_progress(localization::sync_connecting(locale, &primary.host));
    let client = GitLabClient::new(&primary.host, &token)?;

    // Determine date range: 2 months back to today
    let today = Utc::now().date_naive();
    let start_date = today.checked_sub_months(Months::new(2)).unwrap_or(today);
    let end_date = today;

    let start_str = start_date.format("%Y-%m-%d").to_string();
    let end_str = end_date.format("%Y-%m-%d").to_string();

    on_progress(localization::sync_range(locale, &start_str, &end_str));

    // Fetch all timelogs via GraphQL (single query, no per-project iteration)
    let timelogs = client.fetch_user_timelogs(&start_str, &end_str, on_progress)?;

    let tx = connection.unchecked_transaction()?;

    on_progress(localization::sync_refreshing_entries(locale).to_string());
    db::sync::delete_time_entries_in_range(&tx, primary.id, &start_date, &end_date)?;

    // Upsert timelogs into DB
    on_progress(localization::sync_saving_timelogs(locale).to_string());
    let mut entries_synced = 0u32;
    let mut issues_synced = 0u32;
    let mut projects_seen = std::collections::HashSet::new();
    let mut earliest_date: Option<NaiveDate> = None;
    let mut latest_date: Option<NaiveDate> = None;

    for (i, timelog) in timelogs.iter().enumerate() {
        // Track unique projects
        if let Some(path) = &timelog.project_path {
            if projects_seen.insert(path.clone()) {
                if let Some(name) = &timelog.project_name {
                    db::sync::upsert_project(&tx, primary.id, path, name, path)?;
                }
            }
        }

        // Parse date for bucket rebuild range
        if let Some(date) = parse_date(&timelog.spent_at) {
            earliest_date = Some(earliest_date.map_or(date, |e: NaiveDate| e.min(date)));
            latest_date = Some(latest_date.map_or(date, |l: NaiveDate| l.max(date)));
        }

        // Upsert work item (issue or MR) if present
        let work_item_id = if let (Some(key), Some(title), Some(state)) =
            (&timelog.item_key, &timelog.item_title, &timelog.item_state)
        {
            let labels_json = timelog
                .item_labels
                .as_ref()
                .map(|l| serde_json::to_string(l).unwrap_or_else(|_| "[]".to_string()));

            let id = db::sync::upsert_work_item(
                &tx,
                primary.id,
                key,
                title,
                state,
                timelog.item_web_url.as_deref(),
                labels_json.as_deref(),
            )?;
            issues_synced += 1;
            Some(id)
        } else {
            None
        };

        // Stable entry ID from timelog data
        let entry_id = format!("gql-{}", timelog.id);

        db::sync::upsert_time_entry(
            &tx,
            primary.id,
            &entry_id,
            work_item_id,
            &timelog.spent_at,
            timelog.uploaded_at.as_deref(),
            timelog.time_spent,
        )?;
        entries_synced += 1;

        if (i + 1) % 25 == 0 {
            on_progress(localization::sync_saved_progress(
                locale,
                i + 1,
                timelogs.len(),
            ));
        }
    }

    let projects_synced = projects_seen.len() as u32;
    on_progress(localization::sync_saved_summary(
        locale,
        entries_synced,
        issues_synced,
        projects_synced,
    ));

    // Rebuild daily buckets for affected date range
    if let (Some(start), Some(end)) = (earliest_date, latest_date) {
        on_progress(localization::sync_rebuilding_buckets(
            locale,
            &start.format("%Y-%m-%d").to_string(),
            &end.format("%Y-%m-%d").to_string(),
        ));
        db::sync::rebuild_daily_buckets_in_tx(&tx, primary.id, &start, &end)?;
        db::sync::update_quest_progress_from_buckets(&tx, primary.id)?;
    }

    let streak_snapshot = crate::services::streak::build_streak_snapshot(&tx, primary.id, today)?;
    crate::services::streak::persist_current_streak(&tx, primary.id, streak_snapshot.current_days)?;

    // Update sync cursor
    let now = utc_timestamp();
    db::sync::update_sync_cursor(&tx, primary.id, "timelogs", &now)?;
    db::sync::update_provider_last_sync_at(&tx, primary.id, &now)?;

    tx.commit()?;

    let mut assigned_issues_synced = 0u32;
    on_progress("Fetching issues assigned to you...".to_string());
    let assigned_sync_started_at = Instant::now();
    match client.fetch_current_assigned_issues(on_progress) {
        Ok(records) => {
            let group_ids = records
                .iter()
                .filter_map(|record| record.iteration_group_id.as_deref())
                .map(str::to_string)
                .collect::<Vec<_>>();
            let tx2 = connection.unchecked_transaction()?;
            db::sync::reset_assigned_sync_flags(&tx2, primary.id)?;
            for rec in records {
                db::sync::upsert_assigned_issue(&tx2, primary.id, &rec)?;
                assigned_issues_synced += 1;
            }
            tx2.commit()?;
            on_progress(format!(
                "Assigned issues synced: {} in {}ms.",
                assigned_issues_synced,
                assigned_sync_started_at.elapsed().as_millis()
            ));

            let iteration_sync_started_at = Instant::now();
            match client.fetch_iteration_catalog_for_groups(&group_ids, on_progress) {
                Ok(result) => {
                    let tx3 = connection.unchecked_transaction()?;
                    db::sync::replace_iteration_catalog(&tx3, primary.id, &result.iterations)?;
                    for group_id in &group_ids {
                        db::sync::update_sync_cursor(
                            &tx3,
                            primary.id,
                            format!("iteration_catalog_group:{group_id}").as_str(),
                            &now,
                        )?;
                    }
                    db::sync::update_sync_cursor(
                        &tx3,
                        primary.id,
                        "assigned_issues_catalog_status",
                        serde_json::json!({
                            "state": result.catalog_state,
                            "message": result.catalog_message,
                            "groupsFetched": result.groups_fetched,
                            "pagesFetched": result.pages_fetched,
                            "iterationsCached": result.iterations.len(),
                            "cadenceBatchesResolved": result.cadence_batches_resolved,
                            "durationMs": iteration_sync_started_at.elapsed().as_millis(),
                        })
                        .to_string()
                        .as_str(),
                    )?;
                    tx3.commit()?;
                    on_progress(format!(
                        "Iteration catalog synced: {} groups, {} iterations, {} cadence batches in {}ms.",
                        result.groups_fetched,
                        result.iterations.len(),
                        result.cadence_batches_resolved,
                        iteration_sync_started_at.elapsed().as_millis()
                    ));
                }
                Err(err) => {
                    let tx3 = connection.unchecked_transaction()?;
                    db::sync::update_sync_cursor(
                        &tx3,
                        primary.id,
                        "assigned_issues_catalog_status",
                        serde_json::json!({
                            "state": "error",
                            "message": format!("Iteration catalog sync failed: {err}"),
                            "groupsFetched": 0,
                            "pagesFetched": 0,
                            "iterationsCached": 0,
                            "cadenceBatchesResolved": 0,
                            "durationMs": iteration_sync_started_at.elapsed().as_millis(),
                        })
                        .to_string()
                        .as_str(),
                    )?;
                    tx3.commit()?;
                    on_progress(format!("WARN: could not sync iteration catalog: {err}"));
                }
            }
        }
        Err(err) => {
            let tx2 = connection.unchecked_transaction()?;
            db::sync::update_sync_cursor(
                &tx2,
                primary.id,
                "assigned_issues_catalog_status",
                serde_json::json!({
                    "state": "error",
                    "message": format!("Assigned issues sync failed: {err}"),
                    "groupsFetched": 0,
                    "pagesFetched": 0,
                    "iterationsCached": 0,
                    "cadenceBatchesResolved": 0,
                    "durationMs": assigned_sync_started_at.elapsed().as_millis(),
                })
                .to_string()
                .as_str(),
            )?;
            tx2.commit()?;
            on_progress(format!("WARN: could not sync assigned issues: {err}"));
        }
    }

    on_progress(localization::sync_complete(locale).to_string());

    Ok(SyncResult {
        projects_synced,
        entries_synced,
        issues_synced,
        assigned_issues_synced,
    })
}

fn parse_date(date_str: &str) -> Option<NaiveDate> {
    let date_part = date_str.split('T').next()?;
    NaiveDate::parse_from_str(date_part, "%Y-%m-%d").ok()
}
