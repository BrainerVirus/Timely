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

use tauri::{App, AppHandle, Emitter, Manager, RunEvent};
use tauri_plugin_deep_link::DeepLinkExt;

use crate::{
    commands::{
        auth::{
            begin_gitlab_oauth, list_gitlab_connections, resolve_gitlab_oauth_callback,
            save_gitlab_connection, save_gitlab_pat, validate_gitlab_token,
        },
        dashboard::{
            activate_quest, bootstrap_dashboard, claim_quest_reward, equip_reward,
            load_app_preferences, load_holiday_countries, load_holiday_year, load_play_snapshot,
            load_schedule_rules, load_setup_state, load_worklog_snapshot, purchase_reward,
            reset_all_data, save_app_preferences, save_setup_state, sync_gitlab, unequip_reward,
            update_schedule,
        },
    },
    domain::models::OAuthCallbackResolution,
    state::AppState,
};

const OAUTH_CALLBACK_EVENT: &str = "gitlab-oauth-callback";
const OAUTH_CALLBACK_ERROR_EVENT: &str = "gitlab-oauth-callback-error";
const OPEN_SETTINGS_EVENT: &str = "open-settings";
const OPEN_ABOUT_EVENT: &str = "open-about";

#[tauri::command]
fn show_main_window(app: AppHandle) {
    tray::show_main_window(&app);
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    tray::request_app_exit(&app);
}

#[tauri::command]
fn open_settings(app: AppHandle) {
    tray::show_main_window(&app);
    let _ = app.emit_to("main", OPEN_SETTINGS_EVENT, true);
}

#[tauri::command]
fn open_about(app: AppHandle) {
    tray::show_main_window(&app);
    let _ = app.emit_to("main", OPEN_ABOUT_EVENT, true);
}

pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            tray::show_main_window(app);
        }));
    }

    let app = builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app: &mut App| -> Result<(), Box<dyn std::error::Error>> {
            let db_path = db::initialize(app.handle())?;
            app.manage(AppState::new(db_path));

            tray::ensure_tray_window(app)?;
            if let Err(error) = tray::setup_tray(app) {
                app.state::<AppState>().set_tray_available(false);
                eprintln!("[timely] tray setup unavailable: {error}");
            }

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
            }

            #[cfg(any(target_os = "linux", windows))]
            app.deep_link().register_all()?;

            if let Some(urls) = app.deep_link().get_current()? {
                handle_deep_link_urls(app.handle(), &urls);
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
            activate_quest,
            claim_quest_reward,
            equip_reward,
            unequip_reward,
            purchase_reward,
            save_app_preferences,
            load_worklog_snapshot,
            load_schedule_rules,
            load_play_snapshot,
            load_holiday_countries,
            load_holiday_year,
            reset_all_data,
            tray::update_tray_icon,
            show_main_window,
            quit_app,
            open_settings,
            open_about
        ])
        .build(tauri::generate_context!());

    match app {
        Ok(app) => app.run(|app_handle, event| match event {
            #[cfg(target_os = "macos")]
            RunEvent::Reopen {
                has_visible_windows,
                ..
            } => {
                if !has_visible_windows {
                    tray::show_main_window(app_handle);
                }
            }
            _ => {}
        }),
        Err(error) => {
            eprintln!("[timely] failed while running app: {error}");
        }
    }
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
                if url_string.starts_with("timely://auth/gitlab") {
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
    tray::show_main_window(app);
}
