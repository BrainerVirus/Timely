//! Urgency tiers and reminder copy for workday notifications (deterministic for tests).

use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum UrgencyTier {
    Calm,
    Warming,
    Urgent,
    Critical,
}

/// Maps minutes before shift end and progress vs target into an urgency tier.
pub fn resolve_urgency_tier(
    minutes_before_shift_end: u32,
    logged_hours: f32,
    target_hours: f32,
) -> UrgencyTier {
    if target_hours <= 0.01 {
        return UrgencyTier::Calm;
    }

    let behind = (target_hours - logged_hours).max(0.0);
    let pct_behind = behind / target_hours;

    // Highest: almost no time left and essentially nothing logged.
    if minutes_before_shift_end <= 5 && logged_hours < 0.05 && target_hours > 0.1 {
        return UrgencyTier::Critical;
    }

    if minutes_before_shift_end <= 5 || (minutes_before_shift_end <= 15 && pct_behind > 0.5) {
        return UrgencyTier::Urgent;
    }

    if minutes_before_shift_end <= 30 || pct_behind > 0.2 {
        return UrgencyTier::Warming;
    }

    UrgencyTier::Calm
}

/// Stable message pick from pools using companion + tier + salt (e.g. date + threshold).
pub fn pick_reminder_message(tier: UrgencyTier, companion: &str, salt: u64) -> String {
    let pools: [&[&str]; 4] = [
        // Calm
        &[
            "{c} is curled up with a spreadsheet. Gentle nudge to log a bit more.",
            "{c} has snacks ready if you close a few entries.",
            "{c} says the board is quiet—perfect time for a tidy worklog.",
            "{c} is napping but left a sticky: check your issues?",
        ],
        // Warming
        &[
            "{c} is pacing by the door. You still have time to update your issues.",
            "{c} side-eyes the clock. Maybe one more GitLab pass?",
            "{c} is doing gentle aerobics. Shift end is getting closer.",
            "{c} whispers: a quick log now saves dinner-time panic.",
        ],
        // Urgent
        &[
            "{c} turned the biscuit jar upside down. The worklog needs love!",
            "{c} is on emergency biscuit rations. Please rescue the task board.",
            "{c} squeaks: the deadline lane is closing—log what you can!",
            "{c} has the alarm blaring (politely). Touch the worklog?",
        ],
        // Critical
        &[
            "{c} is sliding toward DEFCON cute. Zero hours logged—tap GitLab now!",
            "{c} deploys maximum tail fluff. Log something before the bell!",
            "{c} is hiding under the desk until the worklog moves.",
            "{c} sends one last boop: type the time—you still have minutes!",
        ],
    ];

    let pool_idx = match tier {
        UrgencyTier::Calm => 0,
        UrgencyTier::Warming => 1,
        UrgencyTier::Urgent => 2,
        UrgencyTier::Critical => 3,
    };

    let pool = pools[pool_idx];
    let mut hasher = DefaultHasher::new();
    companion.hash(&mut hasher);
    salt.hash(&mut hasher);
    let idx = (hasher.finish() as usize) % pool.len();
    pool[idx].replace("{c}", companion)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn critical_when_five_min_left_and_no_time_logged() {
        assert_eq!(resolve_urgency_tier(5, 0.0, 8.0), UrgencyTier::Critical);
    }

    #[test]
    fn calm_when_far_from_end_and_on_track() {
        assert_eq!(resolve_urgency_tier(60, 7.5, 8.0), UrgencyTier::Calm);
    }

    #[test]
    fn warming_when_within_thirty_minutes() {
        assert_eq!(resolve_urgency_tier(25, 6.0, 8.0), UrgencyTier::Warming);
    }

    #[test]
    fn message_same_salt_is_deterministic() {
        let a = pick_reminder_message(UrgencyTier::Calm, "Aurora", 42);
        let b = pick_reminder_message(UrgencyTier::Calm, "Aurora", 42);
        assert_eq!(a, b);
        assert!(a.contains("Aurora"));
    }
}
