use crate::{domain::models::BootstrapPayload, error::AppError, services::shared, state::AppState};

pub fn build_bootstrap_payload(state: &AppState) -> Result<BootstrapPayload, AppError> {
    let connection = shared::open_connection(state)?;
    crate::db::bootstrap::load_bootstrap_payload(&connection)
}

#[cfg(test)]
mod tests {
    use std::{env, path::PathBuf};

    use chrono::NaiveDate;

    use crate::{db, state::AppState};

    use super::build_bootstrap_payload;

    #[test]
    fn builds_payload_from_seeded_database() {
        let mut path = env::temp_dir();
        path.push(format!("pulseboard-test-{}.sqlite3", std::process::id()));
        let _ = std::fs::remove_file(&path);

        let connection = rusqlite::Connection::open(&path).unwrap();
        db::migrate(&connection).unwrap();
        db::seed::ensure_seed_data(&connection, &NaiveDate::from_ymd_opt(2026, 3, 6).unwrap())
            .unwrap();
        drop(connection);

        let state = AppState::new(PathBuf::from(&path));
        let payload = build_bootstrap_payload(&state).unwrap();

        assert_eq!(payload.app_name, "Pulseboard");
        assert!(!payload.week.is_empty());

        let _ = std::fs::remove_file(path);
    }
}
