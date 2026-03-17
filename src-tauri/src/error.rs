use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("tauri error: {0}")]
    Tauri(#[from] tauri::Error),
    #[error("url parse error: {0}")]
    Url(#[from] url::ParseError),
    #[error("http error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("updater error: {0}")]
    Updater(#[from] tauri_plugin_updater::Error),
    #[error("gitlab api error: {0}")]
    GitLabApi(String),
    #[error("operation timed out: {0}")]
    Timeout(String),
    #[error("invalid auth configuration: {0}")]
    InvalidAuthConfiguration(String),
    #[error("invalid auth callback: {0}")]
    InvalidAuthCallback(String),
    #[error("unsupported app update channel: {0}")]
    UnsupportedUpdateChannel(String),
    #[error("no pending app update available for installation")]
    NoPendingAppUpdate,
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
