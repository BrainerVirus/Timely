mod auth;
mod commands;
mod db;
mod domain;
mod error;
mod providers;
mod services;
mod state;
mod support;
mod tray;

use tauri::{App, AppHandle, Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;

use crate::{
    commands::{
        auth::{
            begin_gitlab_oauth, list_gitlab_connections, resolve_gitlab_oauth_callback,
            save_gitlab_connection, save_gitlab_pat, validate_gitlab_token,
        },
        dashboard::{
            bootstrap_dashboard, load_app_preferences, load_holiday_countries,
            load_holiday_preview, load_holiday_regions, load_play_snapshot, load_schedule_rules,
            load_setup_state, load_worklog_snapshot, reset_all_data, save_app_preferences,
            save_setup_state, sync_gitlab, update_schedule,
        },
    },
    domain::models::OAuthCallbackResolution,
    state::AppState,
};

const OAUTH_CALLBACK_EVENT: &str = "gitlab-oauth-callback";
const OAUTH_CALLBACK_ERROR_EVENT: &str = "gitlab-oauth-callback-error";

pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app: &mut App| -> Result<(), Box<dyn std::error::Error>> {
            let db_path = db::initialize(&app.handle())?;
            app.manage(AppState::new(db_path));

            tray::setup_tray(app)?;
            tray::ensure_tray_window(app)?;

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
            }

            #[cfg(any(target_os = "linux", windows))]
            app.deep_link().register_all()?;

            if let Some(urls) = app.deep_link().get_current()? {
                handle_deep_link_urls(&app.handle(), &urls);
            }

            let app_handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                handle_deep_link_urls(&app_handle, &event.urls());
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            bootstrap_dashboard,
            list_gitlab_connections,
            save_gitlab_connection,
            save_gitlab_pat,
            validate_gitlab_token,
            begin_gitlab_oauth,
            resolve_gitlab_oauth_callback,
            sync_gitlab,
            update_schedule,
            load_setup_state,
            save_setup_state,
            load_app_preferences,
            save_app_preferences,
            load_worklog_snapshot,
            load_schedule_rules,
            load_play_snapshot,
            load_holiday_countries,
            load_holiday_regions,
            load_holiday_preview,
            reset_all_data,
            tray::update_tray_icon
        ])
        .run(tauri::generate_context!())
        .expect("error while running Pulseboard");
}

fn handle_deep_link_urls(app: &AppHandle, urls: &[url::Url]) {
    for url in urls {
        let url_string = url.as_str().to_string();

        match services::auth::resolve_gitlab_oauth_callback_url(
            &app.state::<AppState>(),
            &url_string,
        ) {
            Ok(resolution) => emit_callback_success(app, resolution),
            Err(error) => {
                if url_string.starts_with("pulseboard://auth/gitlab") {
                    let _ = app.emit(OAUTH_CALLBACK_ERROR_EVENT, error.to_string());
                    focus_main_window(app);
                }
            }
        }
    }
}

fn emit_callback_success(app: &AppHandle, resolution: OAuthCallbackResolution) {
    let _ = app.emit(OAUTH_CALLBACK_EVENT, resolution);
    if let Some(window) = app.get_webview_window("gitlab-auth") {
        let _ = window.close();
    }
    focus_main_window(app);
}

fn focus_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}
