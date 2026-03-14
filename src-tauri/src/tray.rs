use std::sync::Mutex;

use tauri::{
    image::Image,
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    window::Color,
    window::{Effect, EffectState, EffectsBuilder},
    App, AppHandle, Emitter, Manager, PhysicalPosition, Position, Size, Theme, WebviewUrl,
    WebviewWindowBuilder,
};

const TRAY_PANEL_LABEL: &str = "tray-panel";
const TRAY_PANEL_WIDTH: f64 = 348.0;
const TRAY_PANEL_HEIGHT: f64 = 262.0;
const TRAY_PANEL_RADIUS: f64 = 20.0;
const TRAY_ICON_SIZE: u32 = 22;

// Store the tray icon handle so we can update it later
pub struct TrayState {
    pub icon: Mutex<Option<TrayIcon>>,
}

pub fn ensure_tray_window(app: &App) -> tauri::Result<()> {
    if app.get_webview_window(TRAY_PANEL_LABEL).is_some() {
        return Ok(());
    }

    let mut window_builder = WebviewWindowBuilder::new(
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
    {
        window_builder = window_builder.shadow(true).effects(
            EffectsBuilder::new()
                .effect(Effect::Popover)
                .state(EffectState::Active)
                .radius(TRAY_PANEL_RADIUS)
                .build(),
        );
    }

    #[cfg(target_os = "windows")]
    {
        window_builder = window_builder.shadow(true);
    }

    let window = window_builder.build()?;

    // Auto-hide when the panel loses focus (click-away dismissal)
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

/// Extract position as (x, y) f64 in physical pixels.
fn position_to_physical(pos: &Position) -> (f64, f64) {
    match pos {
        Position::Physical(p) => (p.x as f64, p.y as f64),
        Position::Logical(l) => (l.x, l.y),
    }
}

/// Extract size as (w, h) f64 in physical pixels.
fn size_to_physical(size: &Size) -> (f64, f64) {
    match size {
        Size::Physical(p) => (p.width as f64, p.height as f64),
        Size::Logical(l) => (l.width, l.height),
    }
}

/// Find the monitor that contains the given physical (x, y) position.
/// All comparisons use physical pixel coordinates.
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
    // Fallback: primary monitor
    app.primary_monitor().ok().flatten()
}

fn set_tray_icon_for_theme(app: &AppHandle, theme: Option<Theme>) {
    let rgba = match render_fox_icon(theme) {
        Some(data) => data,
        None => return,
    };

    if let Ok(guard) = app.state::<TrayState>().icon.lock() {
        if let Some(tray) = guard.as_ref() {
            let _ = tray.set_icon(Some(Image::new_owned(rgba, TRAY_ICON_SIZE, TRAY_ICON_SIZE)));
        }
    }
}

fn render_fox_icon(theme: Option<Theme>) -> Option<Vec<u8>> {
    use tiny_skia::{Color, FillRule, Paint, PathBuilder, Pixmap, Transform};

    let mut pixmap = Pixmap::new(TRAY_ICON_SIZE, TRAY_ICON_SIZE)?;
    let mut paint = Paint::default();
    paint.anti_alias = true;
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

/// Update the tray icon dynamically so it follows the system theme.
#[tauri::command]
pub fn update_tray_icon(app: AppHandle, logged: f64, target: f64) {
    let theme = app
        .get_webview_window("main")
        .and_then(|window| window.theme().ok());
    set_tray_icon_for_theme(&app, theme);

    let remaining = (target - logged).max(0.0);
    let tooltip = if target <= 0.0 {
        "Timely \u{2014} day off".to_string()
    } else {
        format!("Timely \u{2014} {:.1}h left", remaining)
    };

    let state = app.state::<TrayState>();
    let guard = state.icon.lock();
    if let Ok(g) = guard {
        if let Some(tray) = g.as_ref() {
            let _ = tray.set_tooltip(Some(&tooltip));
        }
    }
}

pub fn setup_tray(app: &App) -> tauri::Result<()> {
    let initial_theme = app
        .get_webview_window("main")
        .and_then(|window| window.theme().ok());
    let initial_rgba = render_fox_icon(initial_theme)
        .unwrap_or_else(|| vec![0u8; (TRAY_ICON_SIZE * TRAY_ICON_SIZE * 4) as usize]);
    let initial_icon = Image::new_owned(initial_rgba, TRAY_ICON_SIZE, TRAY_ICON_SIZE);

    let tray = TrayIconBuilder::new()
        .icon(initial_icon)
        .icon_as_template(true)
        .show_menu_on_left_click(false)
        .tooltip("Timely")
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                rect,
                ..
            } = event
            {
                let app = tray.app_handle();

                if let Some(window) = app.get_webview_window(TRAY_PANEL_LABEL) {
                    let visible = window.is_visible().unwrap_or(false);
                    if visible {
                        let _ = window.hide();
                        return;
                    }

                    // All coordinates in PHYSICAL pixels
                    let (icon_x, icon_y) = position_to_physical(&rect.position);
                    let (icon_w, icon_h) = size_to_physical(&rect.size);

                    let monitor = find_monitor_for_position(app, icon_x, icon_y);
                    let sf = monitor.as_ref().map(|m| m.scale_factor()).unwrap_or(1.0);

                    // Scale panel dimensions to physical pixels
                    let panel_w = TRAY_PANEL_WIDTH * sf;
                    #[cfg(not(target_os = "macos"))]
                    let panel_h = TRAY_PANEL_HEIGHT * sf;

                    // Center panel horizontally on the icon
                    let mut x = icon_x + (icon_w / 2.0) - (panel_w / 2.0);
                    let y;

                    #[cfg(target_os = "macos")]
                    {
                        // macOS: menubar at top, position below icon
                        y = icon_y + icon_h + (4.0 * sf);
                    }

                    #[cfg(not(target_os = "macos"))]
                    {
                        // Windows/Linux: check if tray is at bottom
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

                    // Clamp to monitor bounds (physical pixels)
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
                    if let Ok(theme) = window.theme() {
                        if let Some(tray) = app
                            .state::<TrayState>()
                            .icon
                            .lock()
                            .ok()
                            .and_then(|guard| guard.as_ref().cloned())
                        {
                            if let Some(rgba) = render_fox_icon(Some(theme)) {
                                let _ = tray.set_icon(Some(Image::new_owned(
                                    rgba,
                                    TRAY_ICON_SIZE,
                                    TRAY_ICON_SIZE,
                                )));
                            }
                        }
                    }
                    let _ = app.emit_to(TRAY_PANEL_LABEL, "tray-panel-activated", true);
                }
            }
        })
        .build(app)?;

    // Store tray handle for dynamic updates
    app.manage(TrayState {
        icon: Mutex::new(Some(tray)),
    });

    if let Some(window) = app.get_webview_window("main") {
        let app_handle = app.handle().clone();
        window.on_window_event(move |event| {
            if let tauri::WindowEvent::ThemeChanged(theme) = event {
                set_tray_icon_for_theme(&app_handle, Some(theme.clone()));
            }
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
