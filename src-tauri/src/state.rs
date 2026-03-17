use std::{
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
};

#[cfg(any(target_os = "macos", windows, target_os = "linux"))]
use tauri_plugin_updater::Update;

#[cfg(any(target_os = "macos", windows, target_os = "linux"))]
#[derive(Clone)]
pub struct PendingAppUpdate {
    pub channel: String,
    pub update: Update,
}

#[derive(Clone)]
pub struct AppState {
    pub db_path: PathBuf,
    exit_requested: Arc<AtomicBool>,
    tray_available: Arc<AtomicBool>,
    #[cfg(any(target_os = "macos", windows, target_os = "linux"))]
    pending_app_update: Arc<Mutex<Option<PendingAppUpdate>>>,
}

impl AppState {
    pub fn new(db_path: PathBuf) -> Self {
        Self {
            db_path,
            exit_requested: Arc::new(AtomicBool::new(false)),
            tray_available: Arc::new(AtomicBool::new(false)),
            #[cfg(any(target_os = "macos", windows, target_os = "linux"))]
            pending_app_update: Arc::new(Mutex::new(None)),
        }
    }

    pub fn begin_shutdown(&self) -> bool {
        !self.exit_requested.swap(true, Ordering::SeqCst)
    }

    pub fn set_tray_available(&self, available: bool) {
        self.tray_available.store(available, Ordering::SeqCst);
    }

    pub fn tray_available(&self) -> bool {
        self.tray_available.load(Ordering::SeqCst)
    }

    #[cfg(any(target_os = "macos", windows, target_os = "linux"))]
    pub fn replace_pending_app_update(&self, next: Option<PendingAppUpdate>) {
        if let Ok(mut pending) = self.pending_app_update.lock() {
            *pending = next;
        }
    }

    #[cfg(any(target_os = "macos", windows, target_os = "linux"))]
    pub fn take_pending_app_update(&self) -> Option<PendingAppUpdate> {
        self.pending_app_update.lock().ok()?.take()
    }
}
