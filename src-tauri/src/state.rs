use std::{
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
};

#[derive(Clone)]
pub struct AppState {
    pub db_path: PathBuf,
    exit_requested: Arc<AtomicBool>,
    tray_available: Arc<AtomicBool>,
}

impl AppState {
    pub fn new(db_path: PathBuf) -> Self {
        Self {
            db_path,
            exit_requested: Arc::new(AtomicBool::new(false)),
            tray_available: Arc::new(AtomicBool::new(false)),
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
}
