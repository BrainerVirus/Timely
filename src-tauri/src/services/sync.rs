use chrono::{NaiveDate, Utc};

use crate::{
    db,
    domain::models::SyncResult,
    error::AppError,
    providers::gitlab::GitLabClient,
    state::AppState,
};

pub fn sync_gitlab(state: &AppState) -> Result<SyncResult, AppError> {
    let connection = db::open(&state.db_path)?;

    // Find primary GitLab connection
    let connections = db::connection::load_gitlab_connections(&connection)?;
    let primary = connections
        .into_iter()
        .find(|c| c.is_primary)
        .ok_or_else(|| AppError::GitLabApi("no primary GitLab connection found".to_string()))?;

    let token = db::connection::load_gitlab_token(&connection, &primary.host)?
        .ok_or_else(|| AppError::GitLabApi("no token found for primary connection".to_string()))?;

    let client = GitLabClient::new(&primary.host, &token);

    // Fetch and upsert projects
    let projects = client.fetch_projects()?;
    let mut projects_synced = 0u32;
    for project in &projects {
        db::sync::upsert_project(
            &connection,
            primary.id,
            &project.id.to_string(),
            &project.name,
            &project.path_with_namespace,
        )?;
        projects_synced += 1;
    }

    // Load sync cursor for timelogs
    let cursor = db::sync::load_sync_cursor(&connection, primary.id, "timelogs")?;

    let mut entries_synced = 0u32;
    let mut issues_synced = 0u32;
    let mut earliest_date: Option<NaiveDate> = None;
    let mut latest_date: Option<NaiveDate> = None;

    for project in &projects {
        let timelogs = client.fetch_timelogs(project.id, cursor.as_deref())?;

        for timelog in &timelogs {
            // Determine spent_at date
            let spent_at = timelog
                .spent_at
                .as_deref()
                .unwrap_or(&timelog.created_at);

            // Parse date for bucket rebuild range
            if let Some(date) = parse_date(spent_at) {
                earliest_date = Some(earliest_date.map_or(date, |e: NaiveDate| e.min(date)));
                latest_date = Some(latest_date.map_or(date, |l: NaiveDate| l.max(date)));
            }

            // Upsert associated issue if present
            let work_item_id = if let Some(issue) = &timelog.issue {
                let item_key = format!("{}#{}", project.path_with_namespace, issue.iid);
                let labels_json = issue
                    .labels
                    .as_ref()
                    .map(|l| serde_json::to_string(l).unwrap_or_else(|_| "[]".to_string()));

                let id = db::sync::upsert_work_item(
                    &connection,
                    primary.id,
                    &item_key,
                    &issue.title,
                    &issue.state,
                    issue.web_url.as_deref(),
                    labels_json.as_deref(),
                )?;
                issues_synced += 1;
                Some(id)
            } else {
                None
            };

            db::sync::upsert_time_entry(
                &connection,
                primary.id,
                &timelog.id.to_string(),
                work_item_id,
                spent_at,
                timelog.time_spent,
            )?;
            entries_synced += 1;
        }
    }

    // Rebuild daily buckets for affected date range
    if let (Some(start), Some(end)) = (earliest_date, latest_date) {
        db::sync::rebuild_daily_buckets(&connection, primary.id, &start, &end)?;
    }

    // Update sync cursor
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    db::sync::update_sync_cursor(&connection, primary.id, "timelogs", &now)?;

    Ok(SyncResult {
        projects_synced,
        entries_synced,
        issues_synced,
    })
}

fn parse_date(date_str: &str) -> Option<NaiveDate> {
    // Handle both "2026-03-07" and "2026-03-07T10:00:00Z" formats
    let date_part = date_str.split('T').next()?;
    NaiveDate::parse_from_str(date_part, "%Y-%m-%d").ok()
}
