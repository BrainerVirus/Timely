use std::{env, sync::Mutex};

use crate::{
    domain::models::AppPreferences,
    error::AppError,
    services::{preferences, shared},
    state::AppState,
};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    window::Color,
    App, AppHandle, Emitter, Manager, PhysicalPosition, Position, Size, Theme, WebviewUrl,
    WebviewWindowBuilder,
};

#[cfg(target_os = "macos")]
use tauri::window::{Effect, EffectState, EffectsBuilder};

const TRAY_PANEL_LABEL: &str = "tray-panel";
const TRAY_PANEL_WIDTH: f64 = 348.0;
const TRAY_PANEL_HEIGHT: f64 = 262.0;
#[cfg(target_os = "macos")]
const TRAY_PANEL_RADIUS: f64 = 20.0;
const TRAY_ICON_SIZE: u32 = 22;
const TRAY_MENU_OPEN_ID: &str = "tray-open";
const TRAY_MENU_SETTINGS_ID: &str = "tray-settings";
const TRAY_MENU_ABOUT_ID: &str = "tray-about";
const TRAY_MENU_QUIT_ID: &str = "tray-quit";
const OPEN_SETTINGS_EVENT: &str = "open-settings";
const OPEN_ABOUT_EVENT: &str = "open-about";

pub struct TrayState {
    pub icon: Mutex<Option<TrayIcon>>,
}

fn default_app_preferences() -> AppPreferences {
    AppPreferences {
        theme_mode: "system".to_string(),
        language: "auto".to_string(),
        holiday_country_mode: "auto".to_string(),
        holiday_country_code: None,
        time_format: "hm".to_string(),
        auto_sync_enabled: true,
        auto_sync_interval_minutes: 30,
        tray_enabled: true,
        close_to_tray: true,
        onboarding_completed: false,
    }
}

fn load_app_preferences(app: &AppHandle) -> AppPreferences {
    let state = app.state::<AppState>();
    shared::open_connection(&state)
        .ok()
        .and_then(|connection| preferences::load_app_preferences(&connection).ok())
        .unwrap_or_else(default_app_preferences)
}

fn render_tray_icon(theme: Option<Theme>) -> Option<Image<'static>> {
    #[cfg(target_os = "macos")]
    {
        let rgba = render_fox_icon(theme)?;
        return Some(Image::new_owned(rgba, TRAY_ICON_SIZE, TRAY_ICON_SIZE));
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = theme;
        None
    }
}

fn system_tray_icon(app: &AppHandle, theme: Option<Theme>) -> Option<Image<'static>> {
    if let Some(icon) = render_tray_icon(theme) {
        return Some(icon);
    }

    if let Some(icon) = app.default_window_icon() {
        return Some(icon.clone().to_owned());
    }

    None
}

fn set_tray_visibility(app: &AppHandle, visible: bool) -> Result<(), AppError> {
    if let Ok(guard) = app.state::<TrayState>().icon.lock() {
        if let Some(tray) = guard.as_ref() {
            tray.set_visible(visible)?;
        }
    }

    if !visible {
        hide_tray_window(app);
    }

    Ok(())
}

pub fn tray_available(app: &AppHandle) -> bool {
    app.state::<AppState>().tray_available()
}

fn should_close_to_tray(app: &AppHandle) -> bool {
    let preferences = load_app_preferences(app);
    preferences.tray_enabled && preferences.close_to_tray && tray_available(app)
}

pub fn apply_saved_tray_preferences(app: &AppHandle) -> Result<(), AppError> {
    let preferences = load_app_preferences(app);
    if !tray_available(app) {
        hide_tray_window(app);
        return Ok(());
    }

    set_tray_visibility(app, preferences.tray_enabled)
}

pub fn hide_tray_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(TRAY_PANEL_LABEL) {
        let _ = window.hide();
    }
}

pub fn show_main_window(app: &AppHandle) {
    #[cfg(target_os = "macos")]
    let _ = app.show();

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

pub fn open_settings(app: &AppHandle) {
    show_main_window(app);
    let _ = app.emit_to("main", OPEN_SETTINGS_EVENT, true);
}

pub fn open_about(app: &AppHandle) {
    show_main_window(app);
    let _ = app.emit_to("main", OPEN_ABOUT_EVENT, true);
}

pub fn request_app_exit(app: &AppHandle) {
    hide_tray_window(app);
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }

    if app.state::<AppState>().begin_shutdown() {
        app.exit(0);
    }
}

pub fn ensure_tray_window(app: &App) -> tauri::Result<()> {
    if app.get_webview_window(TRAY_PANEL_LABEL).is_some() {
        return Ok(());
    }

    let window_builder = WebviewWindowBuilder::new(
        app,
        TRAY_PANEL_LABEL,
        WebviewUrl::App("index.html?view=tray".into()),
    )
    .title("Timely Tray")
    .inner_size(TRAY_PANEL_WIDTH, TRAY_PANEL_HEIGHT)
    .resizable(false)
    .decorations(false)
    .transparent(true)
    .background_color(Color(0, 0, 0, 0))
    .shadow(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .visible(false)
    .accept_first_mouse(true);

    #[cfg(target_os = "macos")]
    let window_builder = window_builder.shadow(true).effects(
        EffectsBuilder::new()
            .effect(Effect::Popover)
            .state(EffectState::Active)
            .radius(TRAY_PANEL_RADIUS)
            .build(),
    );

    #[cfg(target_os = "windows")]
    let window_builder = window_builder.shadow(true);

    let window = window_builder.build()?;

    let app_handle = app.handle().clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::Focused(false) = event {
            if let Some(w) = app_handle.get_webview_window(TRAY_PANEL_LABEL) {
                let _ = w.hide();
            }
        }
    });

    Ok(())
}

fn position_to_physical(pos: &Position) -> (f64, f64) {
    match pos {
        Position::Physical(p) => (p.x as f64, p.y as f64),
        Position::Logical(l) => (l.x, l.y),
    }
}

fn size_to_physical(size: &Size) -> (f64, f64) {
    match size {
        Size::Physical(p) => (p.width as f64, p.height as f64),
        Size::Logical(l) => (l.width, l.height),
    }
}

fn find_monitor_for_position(app: &AppHandle, phys_x: f64, phys_y: f64) -> Option<tauri::Monitor> {
    if let Ok(monitors) = app.available_monitors() {
        for m in &monitors {
            let mx = m.position().x as f64;
            let my = m.position().y as f64;
            let mw = m.size().width as f64;
            let mh = m.size().height as f64;
            if phys_x >= mx && phys_x < mx + mw && phys_y >= my && phys_y < my + mh {
                return Some(m.clone());
            }
        }
    }

    app.primary_monitor().ok().flatten()
}

fn tray_interaction_supported() -> bool {
    !cfg!(target_os = "linux")
}

fn toggle_tray_panel(app: &AppHandle, rect: &tauri::Rect) {
    if let Some(window) = app.get_webview_window(TRAY_PANEL_LABEL) {
        let visible = window.is_visible().unwrap_or(false);
        if visible {
            let _ = window.hide();
            return;
        }

        let (icon_x, icon_y) = position_to_physical(&rect.position);
        let (icon_w, icon_h) = size_to_physical(&rect.size);
        let monitor = find_monitor_for_position(app, icon_x, icon_y);
        let sf = monitor.as_ref().map(|m| m.scale_factor()).unwrap_or(1.0);
        let panel_w = TRAY_PANEL_WIDTH * sf;
        #[cfg(not(target_os = "macos"))]
        let panel_h = TRAY_PANEL_HEIGHT * sf;
        let mut x = icon_x + (icon_w / 2.0) - (panel_w / 2.0);
        let y;

        #[cfg(target_os = "macos")]
        {
            y = icon_y + icon_h + (4.0 * sf);
        }

        #[cfg(not(target_os = "macos"))]
        {
            if let Some(ref m) = monitor {
                let screen_h = m.size().height as f64;
                let screen_y = m.position().y as f64;
                if icon_y > screen_y + screen_h / 2.0 {
                    y = icon_y - panel_h - (4.0 * sf);
                } else {
                    y = icon_y + icon_h + (4.0 * sf);
                }
            } else {
                y = icon_y + icon_h + (4.0 * sf);
            }
        }

        if let Some(ref m) = monitor {
            let screen_x = m.position().x as f64;
            let screen_w = m.size().width as f64;
            let margin = 8.0 * sf;
            if x + panel_w > screen_x + screen_w {
                x = screen_x + screen_w - panel_w - margin;
            }
            if x < screen_x {
                x = screen_x + margin;
            }
        }

        let _ = window.set_position(PhysicalPosition::new(x as i32, y as i32));
        let _ = window.show();
        let _ = window.set_focus();
        let _ = app.emit_to(TRAY_PANEL_LABEL, "tray-panel-activated", true);
    }
}

fn set_tray_icon_for_theme(app: &AppHandle, theme: Option<Theme>) {
    let Some(icon) = system_tray_icon(app, theme) else {
        return;
    };

    if let Ok(guard) = app.state::<TrayState>().icon.lock() {
        if let Some(tray) = guard.as_ref() {
            let _ = tray.set_icon(Some(icon));
        }
    }
}

fn render_fox_icon(theme: Option<Theme>) -> Option<Vec<u8>> {
    use tiny_skia::{Color, FillRule, Paint, PathBuilder, Pixmap, Transform};

    let mut pixmap = Pixmap::new(TRAY_ICON_SIZE, TRAY_ICON_SIZE)?;
    let mut paint = Paint {
        anti_alias: true,
        ..Paint::default()
    };
    paint.set_color(match theme {
        Some(Theme::Dark) => Color::WHITE,
        _ => Color::from_rgba8(24, 20, 16, 255),
    });

    let mut pb = PathBuilder::new();
    pb.move_to(11.0, 4.0);
    pb.line_to(7.2, 2.8);
    pb.line_to(5.3, 7.4);
    pb.cubic_to(3.4, 9.0, 3.1, 13.4, 5.1, 15.9);
    pb.cubic_to(6.8, 18.1, 9.0, 19.3, 11.0, 19.7);
    pb.cubic_to(13.0, 19.3, 15.2, 18.1, 16.9, 15.9);
    pb.cubic_to(18.9, 13.4, 18.6, 9.0, 16.7, 7.4);
    pb.line_to(14.8, 2.8);
    pb.line_to(11.0, 4.0);
    pb.close();

    pb.move_to(8.5, 10.9);
    pb.cubic_to(8.9, 10.3, 10.0, 10.0, 11.0, 10.0);
    pb.cubic_to(12.0, 10.0, 13.1, 10.3, 13.5, 10.9);
    pb.cubic_to(12.7, 11.8, 11.9, 12.3, 11.0, 12.4);
    pb.cubic_to(10.1, 12.3, 9.3, 11.8, 8.5, 10.9);
    pb.close();

    pb.move_to(7.4, 13.3);
    pb.cubic_to(8.4, 14.7, 9.6, 15.4, 11.0, 15.5);
    pb.cubic_to(12.4, 15.4, 13.6, 14.7, 14.6, 13.3);
    pb.cubic_to(13.5, 16.5, 12.3, 17.8, 11.0, 18.1);
    pb.cubic_to(9.7, 17.8, 8.5, 16.5, 7.4, 13.3);
    pb.close();

    let path = pb.finish()?;
    pixmap.fill_path(
        &path,
        &paint,
        FillRule::Winding,
        Transform::identity(),
        None,
    );
    Some(pixmap.data().to_vec())
}

#[tauri::command]
pub fn update_tray_icon(app: AppHandle, logged: f64, target: f64) {
    if !tray_available(&app) {
        return;
    }

    let theme = app
        .get_webview_window("main")
        .and_then(|window| window.theme().ok());
    set_tray_icon_for_theme(&app, theme);

    let remaining = (target - logged).max(0.0);
    let tooltip = if target <= 0.0 {
        "Timely - day off".to_string()
    } else {
        format!("Timely - {:.1}h left", remaining)
    };

    let state = app.state::<TrayState>();
    if let Ok(g) = state.icon.lock() {
        if let Some(tray) = g.as_ref() {
            let _ = tray.set_tooltip(Some(&tooltip));
        }
    };
}

pub fn setup_tray(app: &App) -> tauri::Result<()> {
    let app_handle = app.handle();
    let initial_theme = app
        .get_webview_window("main")
        .and_then(|window| window.theme().ok());
    let initial_icon = system_tray_icon(&app_handle, initial_theme)
        .or_else(|| app.default_window_icon().cloned())
        .ok_or_else(|| tauri::Error::AssetNotFound("default tray icon".into()))?;

    let open_item = MenuItem::with_id(app, TRAY_MENU_OPEN_ID, "Open Timely", true, None::<&str>)?;
    let settings_item =
        MenuItem::with_id(app, TRAY_MENU_SETTINGS_ID, "Settings", true, None::<&str>)?;
    let about_item = MenuItem::with_id(app, TRAY_MENU_ABOUT_ID, "About", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, TRAY_MENU_QUIT_ID, "Quit Timely", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(
        app,
        &[
            &open_item,
            &settings_item,
            &about_item,
            &separator,
            &quit_item,
        ],
    )?;

    let temp_dir = env::temp_dir().join("timely-tray");
    let mut builder = TrayIconBuilder::new()
        .icon(initial_icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("Timely")
        .temp_dir_path(&temp_dir)
        .on_menu_event(|app, event| match event.id().as_ref() {
            TRAY_MENU_OPEN_ID => show_main_window(app),
            TRAY_MENU_SETTINGS_ID => open_settings(app),
            TRAY_MENU_ABOUT_ID => open_about(app),
            TRAY_MENU_QUIT_ID => request_app_exit(app),
            _ => {}
        });

    #[cfg(target_os = "macos")]
    {
        builder = builder.icon_as_template(true);
    }

    if tray_interaction_supported() {
        builder = builder.on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                rect,
                ..
            } = event
            {
                toggle_tray_panel(tray.app_handle(), &rect);
            }
        });
    }

    let tray = builder.build(app)?;

    app.manage(TrayState {
        icon: Mutex::new(Some(tray)),
    });
    app.state::<AppState>().set_tray_available(true);
    let _ = apply_saved_tray_preferences(&app_handle);

    if let Some(window) = app.get_webview_window("main") {
        let app_handle = app.handle().clone();
        window.on_window_event(move |event| match event {
            tauri::WindowEvent::ThemeChanged(theme) => {
                set_tray_icon_for_theme(&app_handle, Some(*theme));
            }
            tauri::WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                if should_close_to_tray(&app_handle) {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.hide();
                    }
                    hide_tray_window(&app_handle);
                } else {
                    request_app_exit(&app_handle);
                }
            }
            _ => {}
        });
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{render_fox_icon, TRAY_ICON_SIZE};

    #[test]
    fn renders_fox_icon_bitmap() {
        let rgba = render_fox_icon(None).expect("tray fox icon should render");
        assert_eq!(rgba.len(), (TRAY_ICON_SIZE * TRAY_ICON_SIZE * 4) as usize);
        assert!(rgba.iter().any(|channel| *channel > 0));
    }
}
