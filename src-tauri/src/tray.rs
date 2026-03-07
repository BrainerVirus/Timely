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
fn find_monitor_for_position(
    app: &AppHandle,
    phys_x: f64,
    phys_y: f64,
) -> Option<tauri::Monitor> {
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

/// Render text into a 44x44 RGBA bitmap for use as a tray icon.
/// Uses tiny-skia to draw black text on a transparent background.
/// Black-on-transparent is required for macOS template icon mode.
fn render_tray_text(text: &str) -> Vec<u8> {
    use tiny_skia::{Color, Paint, Pixmap};

    let size = 44u32;
    let mut pixmap = Pixmap::new(size, size).unwrap();

    let mut paint = Paint::default();
    paint.set_color(Color::BLACK);
    paint.anti_alias = true;

    let chars: Vec<char> = text.chars().collect();
    let num_chars = chars.len() as f64;

    let char_w = (size as f64 / num_chars.max(1.0)).min(18.0);
    let char_h = 28.0_f64;
    let start_x = (size as f64 - char_w * num_chars) / 2.0;
    let start_y = (size as f64 - char_h) / 2.0;

    for (i, ch) in chars.iter().enumerate() {
        let x = start_x + i as f64 * char_w;
        let y = start_y;
        draw_digit(&mut pixmap, &paint, *ch, x, y, char_w, char_h);
    }

    pixmap.data().to_vec()
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

/// Draw a single character as seven-segment display shapes.
fn draw_digit(
    pixmap: &mut tiny_skia::Pixmap,
    paint: &tiny_skia::Paint,
    ch: char,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
) {
    let t = 4.0_f64; // stroke thickness (thicker for legibility at small sizes)

    // Segment positions
    let top = y + 1.0;
    let mid = y + h / 2.0 - t / 2.0;
    let bot = y + h - t - 1.0;
    let left = x + 1.0;
    let right = x + w - t - 1.0;

    // Segment definitions: (rx, ry, rw, rh)
    let s_top = (left, top, w - 2.0, t);
    let s_tl = (left, top, t, h / 2.0);
    let s_tr = (right, top, t, h / 2.0);
    let s_mid = (left, mid, w - 2.0, t);
    let s_bl = (left, mid, t, h / 2.0);
    let s_br = (right, mid, t, h / 2.0);
    let s_bot = (left, bot, w - 2.0, t);

    let segments: &[(f64, f64, f64, f64)] = match ch {
        '0' => &[s_top, s_tl, s_tr, s_bl, s_br, s_bot],
        '1' => &[s_tr, s_br],
        '2' => &[s_top, s_tr, s_mid, s_bl, s_bot],
        '3' => &[s_top, s_tr, s_mid, s_br, s_bot],
        '4' => &[s_tl, s_tr, s_mid, s_br],
        '5' => &[s_top, s_tl, s_mid, s_br, s_bot],
        '6' => &[s_top, s_tl, s_mid, s_bl, s_br, s_bot],
        '7' => &[s_top, s_tr, s_br],
        '8' => &[s_top, s_tl, s_tr, s_mid, s_bl, s_br, s_bot],
        '9' => &[s_top, s_tl, s_tr, s_mid, s_br, s_bot],
        '.' => {
            let dot_size = t + 1.0;
            let cx = x + w / 2.0 - dot_size / 2.0;
            let cy = y + h - dot_size - 1.0;
            fill_rect(pixmap, paint, cx, cy, dot_size, dot_size);
            return;
        }
        'h' => &[s_tl, s_bl, s_mid, s_br],
        '-' | '\u{2014}' => &[s_mid],
        _ => return,
    };

    for &(rx, ry, rw, rh) in segments {
        fill_rect(pixmap, paint, rx, ry, rw, rh);
    }
}

/// Update the tray icon dynamically to show remaining hours.
#[tauri::command]
pub fn update_tray_icon(app: AppHandle, hours_remaining: f64) {
    let text = if hours_remaining < 0.0 {
        "\u{2014}".to_string()
    } else if hours_remaining == 0.0 {
        "0".to_string()
    } else if hours_remaining >= 10.0 {
        format!("{:.0}", hours_remaining)
    } else {
        format!("{:.1}", hours_remaining)
    };

    let rgba = render_tray_text(&text);
    let icon = Image::new_owned(rgba, 44, 44);
    let state = app.state::<TrayState>();
    let guard = state.icon.lock();
    if let Ok(g) = guard {
        if let Some(tray) = g.as_ref() {
            let _ = tray.set_icon(Some(icon));
            let _ = tray.set_tooltip(Some(&format!("Pulseboard \u{2014} {text}h left")));
        }
    }
}

pub fn setup_tray(app: &App) -> tauri::Result<()> {
    // Render initial icon with dash (not configured)
    let initial_rgba = render_tray_text("\u{2014}");
    let initial_icon = Image::new_owned(initial_rgba, 44, 44);

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

                    let monitor = find_monitor_for_position(&app, icon_x, icon_y);
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

                    let _ = window.set_position(PhysicalPosition::new(
                        x as i32,
                        y as i32,
                    ));
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = app.emit_to(
                        TRAY_PANEL_LABEL,
                        "tray-panel-activated",
                        true,
                    );
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
