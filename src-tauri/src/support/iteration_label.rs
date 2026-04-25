//! Shared human-readable labels for GitLab iterations (matches Assigned issues board style).

use chrono::{Datelike, NaiveDate};

pub fn parse_ymd_date(value: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d").ok()
}

pub fn month_short_label(month: u32) -> &'static str {
    match month {
        1 => "Jan",
        2 => "Feb",
        3 => "Mar",
        4 => "Apr",
        5 => "May",
        6 => "Jun",
        7 => "Jul",
        8 => "Aug",
        9 => "Sep",
        10 => "Oct",
        11 => "Nov",
        _ => "Dec",
    }
}

pub fn format_iteration_range_label(start_date: &str, due_date: &str) -> Option<String> {
    let start = parse_ymd_date(start_date)?;
    let due = parse_ymd_date(due_date)?;
    let start_month = month_short_label(start.month());
    let due_month = month_short_label(due.month());

    if start.year() == due.year() {
        if start.month() == due.month() {
            return Some(format!(
                "{start_month} {} - {}, {}",
                start.day(),
                due.day(),
                start.year()
            ));
        }

        return Some(format!(
            "{start_month} {} - {due_month} {}, {}",
            start.day(),
            due.day(),
            start.year()
        ));
    }

    Some(format!(
        "{start_month} {}, {} - {due_month} {}, {}",
        start.day(),
        start.year(),
        due.day(),
        due.year()
    ))
}

/// Cadence (e.g. cadence title) plus human date range when possible, else title or a stable fallback.
pub fn iteration_display_label(
    iteration_title: Option<&str>,
    start_date: Option<&str>,
    due_date: Option<&str>,
    cadence_title: Option<&str>,
    fallback_id: &str,
) -> String {
    let range = match (start_date, due_date) {
        (Some(start), Some(end)) => format_iteration_range_label(start, end),
        _ => None,
    };

    if let Some(ref range_label) = range {
        if let Some(c) = cadence_title.filter(|s| !s.trim().is_empty()) {
            return format!("{c} · {range_label}");
        }
        return range_label.clone();
    }

    if let Some(t) = iteration_title.filter(|s| !s.trim().is_empty()) {
        return t.to_string();
    }

    format!("Iteration #{fallback_id}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn formats_same_month_same_year() {
        assert_eq!(
            format_iteration_range_label("2026-05-04", "2026-05-17").as_deref(),
            Some("May 4 - 17, 2026")
        );
    }

    #[test]
    fn iteration_display_label_prefers_cadence_and_range() {
        assert_eq!(
            iteration_display_label(
                Some(""),
                Some("2026-05-04"),
                Some("2026-05-17"),
                Some("WEB"),
                "gid://gitlab/Iteration/1"
            ),
            "WEB · May 4 - 17, 2026"
        );
    }
}
