use tauri::{ipc::Channel, AppHandle, State};
use tauri_plugin_updater::UpdaterExt;
use url::Url;

use crate::{
    domain::models::{AppUpdateDownloadEvent, AppUpdateInfo},
    error::AppError,
    state::{AppState, PendingAppUpdate},
};

const STABLE_UPDATE_ENDPOINT: &str =
    "https://raw.githubusercontent.com/BrainerVirus/Timely/updater-manifests/stable/latest.json";
const UNSTABLE_UPDATE_ENDPOINT: &str =
    "https://raw.githubusercontent.com/BrainerVirus/Timely/updater-manifests/unstable/latest.json";

fn normalize_update_channel(channel: &str) -> Result<&'static str, AppError> {
    match channel {
        "stable" => Ok("stable"),
        "unstable" => Ok("unstable"),
        other => Err(AppError::UnsupportedUpdateChannel(other.to_string())),
    }
}

fn updater_endpoint_for_channel(channel: &str) -> Result<&'static str, AppError> {
    match normalize_update_channel(channel)? {
        "stable" => Ok(STABLE_UPDATE_ENDPOINT),
        "unstable" => Ok(UNSTABLE_UPDATE_ENDPOINT),
        _ => unreachable!(),
    }
}

fn updater_urls_for_channel(channel: &str) -> Result<Vec<Url>, AppError> {
    Ok(vec![Url::parse(updater_endpoint_for_channel(channel)?)?])
}

fn to_app_update_info(update: tauri_plugin_updater::Update, channel: &str) -> AppUpdateInfo {
    AppUpdateInfo {
        current_version: update.current_version,
        version: update.version,
        channel: channel.to_string(),
        date: update.date.map(|value| value.to_string()),
        body: update.body,
    }
}

#[tauri::command]
pub async fn check_for_app_update(
    state: State<'_, AppState>,
    app: AppHandle,
    channel: String,
) -> Result<Option<AppUpdateInfo>, AppError> {
    let normalized_channel = normalize_update_channel(&channel)?;
    let update = app
        .updater_builder()
        .endpoints(updater_urls_for_channel(normalized_channel)?)?
        .build()?
        .check()
        .await?;

    state.replace_pending_app_update(update.clone().map(|update| PendingAppUpdate {
        channel: normalized_channel.to_string(),
        update,
    }));

    Ok(update.map(|update| to_app_update_info(update, normalized_channel)))
}

#[tauri::command]
pub async fn install_app_update(
    state: State<'_, AppState>,
    channel: String,
    on_event: Channel<AppUpdateDownloadEvent>,
) -> Result<(), AppError> {
    let normalized_channel = normalize_update_channel(&channel)?;
    let pending = state
        .take_pending_app_update()
        .ok_or(AppError::NoPendingAppUpdate)?;

    if pending.channel != normalized_channel {
        state.replace_pending_app_update(Some(pending));
        return Err(AppError::NoPendingAppUpdate);
    }

    let mut started = false;
    pending
        .update
        .download_and_install(
            |chunk_length, content_length| {
                if !started {
                    let _ = on_event.send(AppUpdateDownloadEvent::Started { content_length });
                    started = true;
                }

                let _ = on_event.send(AppUpdateDownloadEvent::Progress { chunk_length });
            },
            || {
                let _ = on_event.send(AppUpdateDownloadEvent::Finished);
            },
        )
        .await?;

    Ok(())
}

#[tauri::command]
pub fn restart_app(app: AppHandle) {
    app.request_restart();
}
