# Vendored `mac-notification-sys` (0.6.12)

Upstream: [mac-notification-sys](https://github.com/h4llow3En/mac-notification-sys).

**Timely patch:** `NotificationCenterDelegate` implements `userNotificationCenter:shouldPresentNotification:` and returns `YES`, so macOS shows **banner alerts** (and respects “Temporary” style) even while Timely is the focused app. Without this, deliveries only appear in Notification Center.

Revert to crates.io by removing `[patch.crates-io]` in `src-tauri/Cargo.toml` after upstream adds the delegate method.
