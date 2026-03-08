use std::sync::Mutex;

use tauri::{
    image::Image,
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Emitter, Manager, PhysicalPosition, Position, Size, WebviewUrl,
    WebviewWindowBuilder,
};

const TRAY_PANEL_LABEL: &str = "tray-panel";
const TRAY_PANEL_WIDTH: f64 = 320.0;
const TRAY_PANEL_HEIGHT: f64 = 380.0;

// Store the tray icon handle so we can update it later
pub struct TrayState {
    pub icon: Mutex<Option<TrayIcon>>,
}

pub fn ensure_tray_window(app: &App) -> tauri::Result<()> {
    if app.get_webview_window(TRAY_PANEL_LABEL).is_some() {
        return Ok(());
    }

    let window = WebviewWindowBuilder::new(
        app,
        TRAY_PANEL_LABEL,
        WebviewUrl::App("index.html?view=tray".into()),
    )
    .title("Pulseboard Tray")
    .inner_size(TRAY_PANEL_WIDTH, TRAY_PANEL_HEIGHT)
    .resizable(false)
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .visible(false)
    .build()?;

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

/// Draw a filled rectangle on the pixmap.
fn fill_rect(
    pixmap: &mut tiny_skia::Pixmap,
    paint: &tiny_skia::Paint,
    rx: f64,
    ry: f64,
    rw: f64,
    rh: f64,
) {
    use tiny_skia::{FillRule, PathBuilder, Transform};

    let mut pb = PathBuilder::new();
    pb.move_to(rx as f32, ry as f32);
    pb.line_to((rx + rw) as f32, ry as f32);
    pb.line_to((rx + rw) as f32, (ry + rh) as f32);
    pb.line_to(rx as f32, (ry + rh) as f32);
    pb.close();
    if let Some(path) = pb.finish() {
        pixmap.fill_path(&path, paint, FillRule::Winding, Transform::identity(), None);
    }
}

/// Render a pie-slice progress indicator as a 22x22 RGBA bitmap.
/// `ratio` is clamped 0.0..=1.0. The arc starts at 12 o'clock and goes clockwise.
/// When ratio <= 0 or NaN, draws a horizontal dash.
/// Black on transparent for macOS template icon mode.
fn render_progress_icon(ratio: f64) -> Option<Vec<u8>> {
    use tiny_skia::{Color, FillRule, Paint, PathBuilder, Pixmap, Transform};

    let size = 22u32;
    let mut pixmap = Pixmap::new(size, size)?;

    let mut paint = Paint::default();
    paint.set_color(Color::BLACK);
    paint.anti_alias = true;

    if ratio <= 0.0 || ratio.is_nan() {
        // Draw a simple horizontal dash in the center
        let y = size as f64 / 2.0 - 1.5;
        let x = size as f64 * 0.25;
        let w = size as f64 * 0.5;
        fill_rect(&mut pixmap, &paint, x, y, w, 3.0);
        return Some(pixmap.data().to_vec());
    }

    let center = size as f32 / 2.0;
    let radius = center - 2.0;

    if ratio >= 1.0 {
        // Full circle — approximate with many line segments
        let mut pb = PathBuilder::new();
        let segments = 64;
        for i in 0..segments {
            let a = (i as f32 / segments as f32) * std::f32::consts::TAU;
            let px = center + radius * a.cos();
            let py = center + radius * a.sin();
            if i == 0 {
                pb.move_to(px, py);
            } else {
                pb.line_to(px, py);
            }
        }
        pb.close();
        if let Some(path) = pb.finish() {
            pixmap.fill_path(&path, &paint, FillRule::Winding, Transform::identity(), None);
        }
        return Some(pixmap.data().to_vec());
    }

    // Partial pie slice
    let angle = (ratio as f32) * std::f32::consts::TAU;
    let start_angle = -std::f32::consts::FRAC_PI_2; // 12 o'clock

    let mut pb = PathBuilder::new();
    pb.move_to(center, center);
    pb.line_to(center, center - radius); // line to 12 o'clock

    // Approximate the arc with line segments
    let segments = 64;
    let step = angle / segments as f32;
    for i in 1..=segments {
        let a = start_angle + step * i as f32;
        pb.line_to(center + radius * a.cos(), center + radius * a.sin());
    }
    pb.close();

    if let Some(path) = pb.finish() {
        pixmap.fill_path(&path, &paint, FillRule::Winding, Transform::identity(), None);
    }

    Some(pixmap.data().to_vec())
}

/// Update the tray icon dynamically to show a pie-slice progress indicator.
#[tauri::command]
pub fn update_tray_icon(app: AppHandle, logged: f64, target: f64) {
    let ratio = if target <= 0.0 {
        0.0
    } else {
        (logged / target).clamp(0.0, 1.0)
    };

    let rgba = match render_progress_icon(ratio) {
        Some(data) => data,
        None => return,
    };
    let icon = Image::new_owned(rgba, 22, 22);

    let remaining = (target - logged).max(0.0);
    let tooltip = if target <= 0.0 {
        "Pulseboard \u{2014} day off".to_string()
    } else {
        format!("Pulseboard \u{2014} {:.1}h left", remaining)
    };

    let state = app.state::<TrayState>();
    let guard = state.icon.lock();
    if let Ok(g) = guard {
        if let Some(tray) = g.as_ref() {
            let _ = tray.set_icon(Some(icon));
            let _ = tray.set_tooltip(Some(&tooltip));
        }
    }
}

pub fn setup_tray(app: &App) -> tauri::Result<()> {
    // Render initial icon with dash (not configured)
    let initial_rgba = render_progress_icon(0.0).unwrap_or_else(|| vec![0u8; 22 * 22 * 4]);
    let initial_icon = Image::new_owned(initial_rgba, 22, 22);

    let tray = TrayIconBuilder::new()
        .icon(initial_icon)
        .icon_as_template(true)
        .show_menu_on_left_click(false)
        .tooltip("Pulseboard")
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
                    let _ = app.emit_to(TRAY_PANEL_LABEL, "tray-panel-activated", true);
                }
            }
        })
        .build(app)?;

    // Store tray handle for dynamic updates
    app.manage(TrayState {
        icon: Mutex::new(Some(tray)),
    });

    Ok(())
}
