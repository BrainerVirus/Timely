use std::time::Instant;

use chrono::{DateTime, Days, Months, NaiveDate, Utc};

use crate::{
    db,
    db::sync::AssignedIssueBucket,
    domain::models::AssignedIssueRecord,
    domain::models::SyncResult,
    error::AppError,
    providers::{gitlab::GitLabClient, youtrack::YouTrackClient},
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
    match sync_assigned_issues(&connection, primary.id, &client, today, &now, on_progress) {
        Ok(summary) => {
            assigned_issues_synced = summary.assigned_issues_synced;
            on_progress(format!(
                "Assigned issues synced: {} in {}ms.",
                assigned_issues_synced,
                assigned_sync_started_at.elapsed().as_millis()
            ));

            let iteration_sync_started_at = Instant::now();
            let iteration_result = sync_iteration_catalog(
                &connection,
                primary.id,
                &client,
                &summary.active_group_ids,
                &summary.full_refresh_group_ids,
                &now,
                on_progress,
            );

            match iteration_result {
                Ok(result) => {
                    let (catalog_state, catalog_message) = merge_catalog_status(
                        result.catalog_state.as_str(),
                        result.catalog_message,
                        summary.warning,
                    );
                    let tx3 = connection.unchecked_transaction()?;
                    db::sync::update_sync_cursor(
                        &tx3,
                        primary.id,
                        "assigned_issues_catalog_status",
                        serde_json::json!({
                            "state": catalog_state,
                            "message": catalog_message,
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
                    let message = merge_warning_messages(
                        Some(format!("Iteration catalog sync failed: {err}")),
                        summary.warning,
                    );
                    let tx3 = connection.unchecked_transaction()?;
                    db::sync::update_sync_cursor(
                        &tx3,
                        primary.id,
                        "assigned_issues_catalog_status",
                        serde_json::json!({
                            "state": "error",
                            "message": message,
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

pub fn sync_providers(
    state: &AppState,
    on_progress: &mut dyn FnMut(String),
) -> Result<SyncResult, AppError> {
    let connection = shared::open_connection(state)?;
    let providers = db::connection::load_provider_connections(&connection)?;

    let mut totals = SyncResult {
        projects_synced: 0,
        entries_synced: 0,
        issues_synced: 0,
        assigned_issues_synced: 0,
    };

    let has_gitlab = has_active_provider_token(&providers, "gitlab");
    let has_youtrack = has_active_provider_token(&providers, "youtrack");

    if has_gitlab {
        on_progress(sync_start_message("GitLab"));
        let result = sync_gitlab(state, on_progress)?;
        totals.projects_synced += result.projects_synced;
        totals.entries_synced += result.entries_synced;
        totals.issues_synced += result.issues_synced;
        totals.assigned_issues_synced += result.assigned_issues_synced;
    }

    if has_youtrack {
        on_progress(sync_start_message("YouTrack"));
        let result = sync_youtrack(state, on_progress)?;
        totals.projects_synced += result.projects_synced;
        totals.entries_synced += result.entries_synced;
        totals.issues_synced += result.issues_synced;
        totals.assigned_issues_synced += result.assigned_issues_synced;
    }

    if !has_gitlab && !has_youtrack {
        return Err(AppError::GitLabApi(no_active_provider_error_message()));
    }

    Ok(totals)
}

fn has_active_provider_token(
    providers: &[crate::domain::models::ProviderConnection],
    provider: &str,
) -> bool {
    providers
        .iter()
        .any(|item| item.provider.eq_ignore_ascii_case(provider) && item.has_token)
}

fn no_active_provider_error_message() -> String {
    "No active provider connections with tokens.".to_string()
}

fn sync_start_message(provider_label: &str) -> String {
    format!("Starting {provider_label} sync...")
}

fn sync_youtrack(
    state: &AppState,
    on_progress: &mut dyn FnMut(String),
) -> Result<SyncResult, AppError> {
    const RECENT_CLOSED_DAYS: i64 = 180;
    let connection = shared::open_connection(state)?;
    let primary = shared::load_primary_connection(&connection, "youtrack")?;
    let token = db::connection::load_provider_token(&connection, "youtrack", &primary.host)?
        .ok_or_else(|| AppError::GitLabApi("No token found for primary YouTrack connection.".to_string()))?;
    let client = YouTrackClient::new(&primary.host, &token)?;

    let open_records = client.fetch_open_assigned_issues()?;
    let today = Utc::now().date_naive();
    let cutoff = today
        .checked_sub_days(Days::new(RECENT_CLOSED_DAYS as u64))
        .unwrap_or(today)
        .format("%Y-%m-%d")
        .to_string();
    let recent_closed_records = client.fetch_recent_closed_assigned_issues(&cutoff)?;
    let all_closed_records = client.fetch_all_closed_assigned_issues()?;
    on_progress(youtrack_issue_counts_message(
        open_records.len(),
        recent_closed_records.len(),
        all_closed_records.len(),
    ));

    let cutoff_timestamp = format!("{cutoff}T00:00:00Z");
    let merged_records = merge_youtrack_assigned_records(
        &open_records,
        &recent_closed_records,
        &all_closed_records,
        &cutoff_timestamp,
    );

    let tx = connection.unchecked_transaction()?;
    let mut count = 0u32;
    let mut entries_synced = 0u32;
    let mut issue_rows_synced = 0u32;
    for (record, bucket) in &merged_records {
        db::sync::upsert_assigned_issue(&tx, primary.id, record, *bucket)?;
        count += 1;
    }

    // Pull recent work items from issues we already have in assigned buckets.
    let mut seen_issue_ids = std::collections::HashSet::new();
    for record in open_records
        .iter()
        .chain(recent_closed_records.iter())
        .chain(all_closed_records.iter())
    {
        if !seen_issue_ids.insert(record.provider_item_id.clone()) {
            continue;
        }
        let labels_json = serde_json::to_string(&record.labels).unwrap_or_else(|_| "[]".to_string());
        let work_item_id = db::sync::upsert_work_item(
            &tx,
            primary.id,
            &record.provider_item_id,
            &record.title,
            &record.state,
            record.web_url.as_deref(),
            Some(labels_json.as_str()),
        )?;
        issue_rows_synced += 1;

        if let Ok(worklogs) = client.fetch_issue_work_items(&record.provider_item_id, 50) {
            for worklog in worklogs {
                let entry_id = format!("youtrack-{}", worklog.id);
                db::sync::upsert_time_entry(
                    &tx,
                    primary.id,
                    &entry_id,
                    Some(work_item_id),
                    &worklog.spent_at,
                    worklog.uploaded_at.as_deref(),
                    worklog.duration_minutes * 60,
                )?;
                entries_synced += 1;
            }
        }
    }
    db::sync::clear_missing_assigned_issues_for_buckets(
        &tx,
        primary.id,
        &[AssignedIssueBucket::Open, AssignedIssueBucket::RecentClosed, AssignedIssueBucket::ArchiveClosed],
        &merged_records
            .iter()
            .map(|(item, _)| item.provider_item_id.clone())
            .collect::<Vec<_>>(),
    )?;
    let synced_at = utc_timestamp();
    db::sync::update_provider_last_sync_at(&tx, primary.id, &synced_at)?;
    tx.commit()?;

    Ok(compose_youtrack_sync_result(
        count,
        issue_rows_synced,
        entries_synced,
    ))
}

fn merge_youtrack_assigned_records(
    open_records: &[AssignedIssueRecord],
    recent_closed_records: &[AssignedIssueRecord],
    all_closed_records: &[AssignedIssueRecord],
    cutoff_timestamp: &str,
) -> Vec<(AssignedIssueRecord, AssignedIssueBucket)> {
    let mut merged = std::collections::BTreeMap::<String, (AssignedIssueRecord, AssignedIssueBucket)>::new();

    for record in all_closed_records {
        let bucket = bucket_for_closed_issue(record, cutoff_timestamp);
        merged.insert(record.provider_item_id.clone(), (record.clone(), bucket));
    }
    for record in recent_closed_records {
        merged.insert(
            record.provider_item_id.clone(),
            (record.clone(), AssignedIssueBucket::RecentClosed),
        );
    }
    for record in open_records {
        merged.insert(
            record.provider_item_id.clone(),
            (record.clone(), AssignedIssueBucket::Open),
        );
    }

    merged.into_values().collect()
}

fn calc_youtrack_issues_synced(assigned_issue_upserts: u32, work_item_upserts: u32) -> u32 {
    assigned_issue_upserts.saturating_add(work_item_upserts)
}

fn compose_youtrack_sync_result(
    assigned_issue_upserts: u32,
    work_item_upserts: u32,
    entries_synced: u32,
) -> SyncResult {
    SyncResult {
        projects_synced: 0,
        entries_synced,
        issues_synced: calc_youtrack_issues_synced(assigned_issue_upserts, work_item_upserts),
        assigned_issues_synced: assigned_issue_upserts,
    }
}

fn youtrack_issue_counts_message(
    open_count: usize,
    recent_closed_count: usize,
    all_closed_count: usize,
) -> String {
    format!(
        "YouTrack: open {}, recent closed {}, all closed {}.",
        open_count, recent_closed_count, all_closed_count
    )
}

struct AssignedIssueSyncSummary {
    assigned_issues_synced: u32,
    active_group_ids: Vec<String>,
    full_refresh_group_ids: Vec<String>,
    warning: Option<String>,
}

fn sync_assigned_issues(
    connection: &rusqlite::Connection,
    provider_account_id: i64,
    client: &GitLabClient,
    today: NaiveDate,
    now: &str,
    on_progress: &mut dyn FnMut(String),
) -> Result<AssignedIssueSyncSummary, AppError> {
    const RECENT_CLOSED_DAYS: u64 = 180;

    let cutoff_date = today
        .checked_sub_days(Days::new(RECENT_CLOSED_DAYS))
        .unwrap_or(today);
    let cutoff_timestamp = format!("{}T00:00:00Z", cutoff_date.format("%Y-%m-%d"));

    let open_records = client.fetch_open_assigned_issues(on_progress)?;
    let recent_closed =
        client.fetch_recent_closed_assigned_issues(&cutoff_timestamp, on_progress)?;

    let tx = connection.unchecked_transaction()?;
    db::sync::age_recent_closed_assigned_issues(&tx, provider_account_id, &cutoff_timestamp)?;

    let mut assigned_issues_synced = 0u32;
    let mut active_seen = std::collections::HashSet::new();
    let mut open_groups = collect_iteration_group_ids(&open_records);
    let mut recent_groups = Vec::new();

    for record in &open_records {
        db::sync::upsert_assigned_issue(
            &tx,
            provider_account_id,
            record,
            AssignedIssueBucket::Open,
        )?;
        active_seen.insert(record.provider_item_id.clone());
        assigned_issues_synced += 1;
    }

    let mut full_refresh_group_ids = Vec::new();
    let mut warning = None;

    if recent_closed.used_fallback_full_scan {
        let closed_groups = collect_iteration_group_ids(&recent_closed.records);
        let closed_seen = sync_closed_issue_records(
            &tx,
            provider_account_id,
            &recent_closed.records,
            &cutoff_timestamp,
            &mut assigned_issues_synced,
        )?;
        db::sync::clear_missing_assigned_issues_for_buckets(
            &tx,
            provider_account_id,
            &[AssignedIssueBucket::Open],
            &open_records
                .iter()
                .map(|record| record.provider_item_id.clone())
                .collect::<Vec<_>>(),
        )?;
        db::sync::clear_missing_assigned_issues_for_buckets(
            &tx,
            provider_account_id,
            &[
                AssignedIssueBucket::RecentClosed,
                AssignedIssueBucket::ArchiveClosed,
            ],
            &closed_seen,
        )?;
        db::sync::update_sync_cursor(
            &tx,
            provider_account_id,
            "assigned_issues_archive_reconcile",
            now,
        )?;
        full_refresh_group_ids = closed_groups;
    } else {
        recent_groups = collect_iteration_group_ids(&recent_closed.records);
        for record in &recent_closed.records {
            db::sync::upsert_assigned_issue(
                &tx,
                provider_account_id,
                record,
                AssignedIssueBucket::RecentClosed,
            )?;
            active_seen.insert(record.provider_item_id.clone());
            assigned_issues_synced += 1;
        }
        db::sync::clear_missing_assigned_issues_for_buckets(
            &tx,
            provider_account_id,
            &[AssignedIssueBucket::Open, AssignedIssueBucket::RecentClosed],
            &active_seen.into_iter().collect::<Vec<_>>(),
        )?;

        if is_archive_reconcile_due(connection, provider_account_id, today)? {
            on_progress("Reconciling older closed assigned issues...".to_string());
            match client.fetch_all_closed_assigned_issues(on_progress) {
                Ok(closed_records) => {
                    let closed_groups = collect_iteration_group_ids(&closed_records);
                    let closed_seen = sync_closed_issue_records(
                        &tx,
                        provider_account_id,
                        &closed_records,
                        &cutoff_timestamp,
                        &mut assigned_issues_synced,
                    )?;
                    db::sync::clear_missing_assigned_issues_for_buckets(
                        &tx,
                        provider_account_id,
                        &[
                            AssignedIssueBucket::RecentClosed,
                            AssignedIssueBucket::ArchiveClosed,
                        ],
                        &closed_seen,
                    )?;
                    db::sync::update_sync_cursor(
                        &tx,
                        provider_account_id,
                        "assigned_issues_archive_reconcile",
                        now,
                    )?;
                    full_refresh_group_ids = closed_groups;
                }
                Err(error) => {
                    warning = Some(format!(
                        "Older closed assigned issues reconcile failed: {error}"
                    ));
                }
            }
        }
    }

    tx.commit()?;

    open_groups.extend(recent_groups);
    Ok(AssignedIssueSyncSummary {
        assigned_issues_synced,
        active_group_ids: dedupe_strings(open_groups),
        full_refresh_group_ids: dedupe_strings(full_refresh_group_ids),
        warning,
    })
}

fn sync_closed_issue_records(
    connection: &rusqlite::Connection,
    provider_account_id: i64,
    records: &[AssignedIssueRecord],
    cutoff_timestamp: &str,
    assigned_issues_synced: &mut u32,
) -> Result<Vec<String>, AppError> {
    let mut seen = Vec::with_capacity(records.len());

    for record in records {
        db::sync::upsert_assigned_issue(
            connection,
            provider_account_id,
            record,
            bucket_for_closed_issue(record, cutoff_timestamp),
        )?;
        seen.push(record.provider_item_id.clone());
        *assigned_issues_synced += 1;
    }

    Ok(seen)
}

fn bucket_for_closed_issue(
    record: &AssignedIssueRecord,
    cutoff_timestamp: &str,
) -> AssignedIssueBucket {
    match record.closed_at.as_deref() {
        Some(closed_at) if closed_at < cutoff_timestamp => AssignedIssueBucket::ArchiveClosed,
        _ => AssignedIssueBucket::RecentClosed,
    }
}

fn is_archive_reconcile_due(
    connection: &rusqlite::Connection,
    provider_account_id: i64,
    today: NaiveDate,
) -> Result<bool, AppError> {
    const ARCHIVE_RECONCILE_INTERVAL_DAYS: i64 = 7;

    let Some(last_synced_at) = db::sync::load_sync_cursor(
        connection,
        provider_account_id,
        "assigned_issues_archive_reconcile",
    )?
    else {
        return Ok(true);
    };

    let parsed = DateTime::parse_from_rfc3339(&last_synced_at)
        .map(|value| value.date_naive())
        .ok();

    Ok(parsed
        .map(|date| today.signed_duration_since(date).num_days() >= ARCHIVE_RECONCILE_INTERVAL_DAYS)
        .unwrap_or(true))
}

fn sync_iteration_catalog(
    connection: &rusqlite::Connection,
    provider_account_id: i64,
    client: &GitLabClient,
    active_group_ids: &[String],
    full_refresh_group_ids: &[String],
    now: &str,
    on_progress: &mut dyn FnMut(String),
) -> Result<crate::providers::gitlab::IterationCatalogSyncResult, AppError> {
    let mut group_ids = active_group_ids.to_vec();
    group_ids.extend(full_refresh_group_ids.iter().cloned());
    group_ids = dedupe_strings(group_ids);

    let full_refresh = full_refresh_group_ids
        .iter()
        .cloned()
        .collect::<std::collections::HashSet<_>>();

    let tx = connection.unchecked_transaction()?;
    let mut all_iterations = Vec::new();
    let mut pages_fetched = 0usize;
    let mut cadence_batches_resolved = 0usize;
    let mut catalog_state = "ready".to_string();
    let mut catalog_message = None;

    for group_id in &group_ids {
        let cursor_key = format!("iteration_catalog_group:{group_id}");
        let existing_cursor = db::sync::load_sync_cursor(&tx, provider_account_id, &cursor_key)?;
        let use_full_refresh = full_refresh.contains(group_id) || existing_cursor.is_none();
        let result = client.fetch_iteration_catalog_for_group(
            group_id,
            if use_full_refresh {
                None
            } else {
                existing_cursor.as_deref()
            },
            on_progress,
        )?;

        pages_fetched += result.pages_fetched;
        cadence_batches_resolved += result.cadence_batches_resolved;
        if result.catalog_state != "ready" {
            catalog_state = "partial".to_string();
            catalog_message = merge_warning_messages(catalog_message, result.catalog_message);
        }

        db::sync::upsert_iteration_catalog_entries(&tx, provider_account_id, &result.iterations)?;
        if use_full_refresh {
            let seen_ids = result
                .iterations
                .iter()
                .map(|iteration| iteration.iteration_gitlab_id.clone())
                .collect::<Vec<_>>();
            db::sync::delete_iteration_catalog_group_missing(
                &tx,
                provider_account_id,
                group_id,
                &seen_ids,
            )?;
        }
        db::sync::update_sync_cursor(&tx, provider_account_id, &cursor_key, now)?;
        all_iterations.extend(result.iterations);
    }

    tx.commit()?;

    Ok(crate::providers::gitlab::IterationCatalogSyncResult {
        iterations: all_iterations,
        groups_fetched: group_ids.len(),
        pages_fetched,
        cadence_batches_resolved,
        catalog_state,
        catalog_message,
    })
}

fn collect_iteration_group_ids(records: &[AssignedIssueRecord]) -> Vec<String> {
    dedupe_strings(
        records
            .iter()
            .filter_map(|record| record.iteration_group_id.clone())
            .collect::<Vec<_>>(),
    )
}

fn dedupe_strings(values: Vec<String>) -> Vec<String> {
    let mut values = values
        .into_iter()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>();
    values.sort();
    values.dedup();
    values
}

fn merge_catalog_status(
    base_state: &str,
    base_message: Option<String>,
    extra_warning: Option<String>,
) -> (String, Option<String>) {
    let message = merge_warning_messages(base_message, extra_warning);
    let state = if message.is_some() && base_state == "ready" {
        "partial".to_string()
    } else {
        base_state.to_string()
    };
    (state, message)
}

fn merge_warning_messages(left: Option<String>, right: Option<String>) -> Option<String> {
    match (left, right) {
        (Some(left), Some(right)) => Some(format!("{left} {right}")),
        (Some(left), None) => Some(left),
        (None, Some(right)) => Some(right),
        (None, None) => None,
    }
}

fn parse_date(date_str: &str) -> Option<NaiveDate> {
    let date_part = date_str.split('T').next()?;
    NaiveDate::parse_from_str(date_part, "%Y-%m-%d").ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_record(
        provider_item_id: &str,
        closed_at: Option<&str>,
        iteration_group_id: Option<&str>,
    ) -> AssignedIssueRecord {
        AssignedIssueRecord {
            issue_graphql_id: format!("gql-{provider_item_id}"),
            provider_item_id: provider_item_id.to_string(),
            title: format!("Issue {provider_item_id}"),
            state: "opened".to_string(),
            closed_at: closed_at.map(str::to_string),
            updated_at: None,
            web_url: None,
            labels: vec![],
            milestone_title: None,
            iteration_gitlab_id: None,
            iteration_group_id: iteration_group_id.map(str::to_string),
            iteration_cadence_id: None,
            iteration_cadence_title: None,
            iteration_title: None,
            iteration_start_date: None,
            iteration_due_date: None,
        }
    }

    #[test]
    fn bucket_for_closed_issue_marks_archive_before_cutoff() {
        let record = make_record("YT-1", Some("2025-01-01T00:00:00Z"), None);
        let bucket = bucket_for_closed_issue(&record, "2025-06-01T00:00:00Z");
        assert_eq!(bucket, AssignedIssueBucket::ArchiveClosed);
    }

    #[test]
    fn bucket_for_closed_issue_marks_recent_when_missing_or_after_cutoff() {
        let missing = make_record("YT-2", None, None);
        let recent = make_record("YT-3", Some("2025-07-01T00:00:00Z"), None);
        assert_eq!(
            bucket_for_closed_issue(&missing, "2025-06-01T00:00:00Z"),
            AssignedIssueBucket::RecentClosed
        );
        assert_eq!(
            bucket_for_closed_issue(&recent, "2025-06-01T00:00:00Z"),
            AssignedIssueBucket::RecentClosed
        );
    }

    #[test]
    fn dedupe_strings_trims_sorts_and_removes_empty_values() {
        let result = dedupe_strings(vec![
            "  z ".to_string(),
            "".to_string(),
            "a".to_string(),
            "z".to_string(),
            "  ".to_string(),
            "b".to_string(),
        ]);
        assert_eq!(result, vec!["a".to_string(), "b".to_string(), "z".to_string()]);
    }

    #[test]
    fn collect_iteration_group_ids_dedupes_groups() {
        let records = vec![
            make_record("YT-4", None, Some("group-2")),
            make_record("YT-5", None, Some("group-1")),
            make_record("YT-6", None, Some("group-2")),
            make_record("YT-7", None, None),
        ];
        let groups = collect_iteration_group_ids(&records);
        assert_eq!(groups, vec!["group-1".to_string(), "group-2".to_string()]);
    }

    #[test]
    fn merge_youtrack_assigned_records_prioritizes_open_over_closed() {
        let open = vec![make_record("YT-10", None, None)];
        let recent_closed = vec![make_record("YT-10", Some("2025-08-01T00:00:00Z"), None)];
        let all_closed = vec![make_record("YT-10", Some("2025-01-01T00:00:00Z"), None)];
        let merged =
            merge_youtrack_assigned_records(&open, &recent_closed, &all_closed, "2025-06-01T00:00:00Z");

        assert_eq!(merged.len(), 1);
        assert_eq!(merged[0].0.provider_item_id, "YT-10");
        assert_eq!(merged[0].1, AssignedIssueBucket::Open);
    }

    #[test]
    fn merge_youtrack_assigned_records_keeps_recent_when_not_open() {
        let open = vec![];
        let recent_closed = vec![make_record("YT-20", Some("2025-08-01T00:00:00Z"), None)];
        let all_closed = vec![make_record("YT-20", Some("2025-01-01T00:00:00Z"), None)];
        let merged =
            merge_youtrack_assigned_records(&open, &recent_closed, &all_closed, "2025-06-01T00:00:00Z");

        assert_eq!(merged.len(), 1);
        assert_eq!(merged[0].0.provider_item_id, "YT-20");
        assert_eq!(merged[0].1, AssignedIssueBucket::RecentClosed);
    }

    #[test]
    fn calc_youtrack_issues_synced_adds_assigned_and_work_item_rows() {
        assert_eq!(calc_youtrack_issues_synced(12, 7), 19);
    }

    #[test]
    fn calc_youtrack_issues_synced_saturates_on_overflow() {
        assert_eq!(calc_youtrack_issues_synced(u32::MAX, 2), u32::MAX);
    }

    #[test]
    fn compose_youtrack_sync_result_maps_fields_consistently() {
        let result = compose_youtrack_sync_result(8, 5, 13);
        assert_eq!(result.projects_synced, 0);
        assert_eq!(result.entries_synced, 13);
        assert_eq!(result.issues_synced, 13);
        assert_eq!(result.assigned_issues_synced, 8);
    }

    #[test]
    fn compose_youtrack_sync_result_keeps_issue_count_saturated() {
        let result = compose_youtrack_sync_result(u32::MAX, 10, 2);
        assert_eq!(result.issues_synced, u32::MAX);
        assert_eq!(result.assigned_issues_synced, u32::MAX);
        assert_eq!(result.entries_synced, 2);
    }

    #[test]
    fn has_active_provider_token_matches_case_insensitive_provider_name() {
        let providers = vec![crate::domain::models::ProviderConnection {
            id: 1,
            provider: "YouTrack".to_string(),
            display_name: "YT".to_string(),
            host: "yt.local".to_string(),
            username: None,
            client_id: None,
            has_token: true,
            state: "live".to_string(),
            auth_mode: "PAT".to_string(),
            preferred_scope: "api".to_string(),
            status_note: "".to_string(),
            oauth_ready: true,
            is_primary: true,
        }];
        assert!(has_active_provider_token(&providers, "youtrack"));
        assert!(!has_active_provider_token(&providers, "gitlab"));
    }

    #[test]
    fn no_active_provider_error_message_is_stable() {
        assert_eq!(
            no_active_provider_error_message(),
            "No active provider connections with tokens.".to_string()
        );
    }

    #[test]
    fn sync_start_message_is_stable() {
        assert_eq!(sync_start_message("GitLab"), "Starting GitLab sync...".to_string());
        assert_eq!(
            sync_start_message("YouTrack"),
            "Starting YouTrack sync...".to_string()
        );
    }

    #[test]
    fn youtrack_issue_counts_message_is_stable() {
        assert_eq!(
            youtrack_issue_counts_message(3, 2, 9),
            "YouTrack: open 3, recent closed 2, all closed 9.".to_string()
        );
    }
}
