use std::env;

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
enum LogLevel {
    Off,
    Error,
    Info,
    Debug,
}

pub fn info(message: String) {
    if should_log(LogLevel::Info) {
        eprintln!("{message}");
    }
}

pub fn error(message: String) {
    if should_log(LogLevel::Error) {
        eprintln!("{message}");
    }
}

fn should_log(level: LogLevel) -> bool {
    configured_level() >= level
}

fn configured_level() -> LogLevel {
    parse_level(env::var("TIMELY_LOG_LEVEL").ok().as_deref()).unwrap_or(default_level())
}

fn parse_level(value: Option<&str>) -> Option<LogLevel> {
    let normalized = value?.trim().to_ascii_lowercase();

    match normalized.as_str() {
        "off" => Some(LogLevel::Off),
        "error" => Some(LogLevel::Error),
        "info" => Some(LogLevel::Info),
        "debug" => Some(LogLevel::Debug),
        _ => None,
    }
}

fn default_level() -> LogLevel {
    if cfg!(debug_assertions) {
        LogLevel::Info
    } else {
        LogLevel::Off
    }
}
