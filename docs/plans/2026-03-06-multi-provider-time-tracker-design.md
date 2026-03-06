# Multi-Provider Desktop Time Tracker Design And Implementation Plan

## Overview

Build a local-first cross-platform desktop app with Tauri v2, React, Tailwind CSS, and shadcn/ui that helps individual contributors audit and understand their logged work time.

The app is designed as a multi-provider platform from day one, with GitLab as the first implemented provider and future support planned for YouTrack, GitHub, and Bitbucket.

V1 is intentionally read-only. It focuses on syncing existing issue and time data, computing daily and weekly progress against a personal work schedule, surfacing anomalies, and presenting the result through a tray-first desktop experience with a playful, gamified interface.

## Approved Product Decisions

- Local-first desktop app.
- Personal-only dashboard for v1.
- Multi-provider architecture from day one.
- GitLab implemented first.
- GitLab.com optimized first.
- Self-managed GitLab supported with PAT fallback.
- Read-only scope for v1.
- OAuth PKCE preferred where available.
- Tray mini-panel plus full dashboard window.
- Modern frosted-glass visual system with light gamification.

## Goals

- Show how many hours the user has logged today, this week, and this month.
- Compare logged time against a configured work schedule.
- Flag underfilled and overfilled workdays.
- Show exactly which issues received hours for a selected day or period.
- Keep all user data local, with secure handling of tokens.
- Feel fast, modern, playful, and pleasant to use.
- Preserve a clean path for adding more providers later.

## Non-Goals For V1

- Writing or editing time entries in external providers.
- Shared team leaderboards or team-wide dashboards.
- Cross-device sync.
- Mobile support.
- Provider parity across GitLab, YouTrack, GitHub, and Bitbucket.

## Product Scope

### Core User Journey

1. Install and open the app.
2. Connect a GitLab account using OAuth or a personal access token.
3. Configure work hours per day, workdays per week, and timezone.
4. Let the app sync issues and time entries locally.
5. View progress from the tray mini-panel.
6. Open the dashboard for deeper day, week, month, and audit views.
7. Use the audit tools to identify missing hours or suspicious overages.

### Key Screens

- Onboarding
- Provider connection flow
- Today dashboard
- Week view
- Month view
- Audit view
- Settings
- Tray mini-panel

## High-Level Architecture

### Stack

- Shell: Tauri v2
- Frontend: React
- Styling: Tailwind CSS
- UI primitives: shadcn/ui
- Backend: Rust commands and background services
- Local persistence: SQLite
- Secret storage: Stronghold first, with optional native keychain integration later

### Architectural Principles

- The frontend never depends directly on provider APIs.
- All provider data is normalized into a shared local schema.
- The app remains useful offline by reading from local state.
- Secrets are separated from application data.
- Provider-specific code is isolated behind stable interfaces.

## Local-First Data Model

### Storage Split

- SQLite stores normalized provider data, app settings, sync cursors, computed summaries, and gamification state.
- Stronghold stores access tokens, refresh tokens, and PAT secrets.

### Why This Split

- SQLite is ideal for reporting, filtering, and incremental sync.
- Stronghold avoids keeping raw secrets in the database.
- This keeps the app portable across macOS, Windows, and Linux while still protecting credentials.

## Provider Abstraction

### Shared Domain Entities

- ProviderAccount
- WorkspaceProject
- WorkItem
- TimeEntry
- ScheduleProfile
- DailyBucket
- SyncCursor
- GamificationProfile

### Provider Capability Model

Each provider adapter must declare:

- supported auth methods
- ability to list work items
- ability to read detailed time entries
- host requirements
- sync limitations
- field mapping rules

This allows future providers to support partial functionality without forcing GitLab-specific assumptions into the rest of the app.

### Initial Provider Interface

- `authenticate(config)`
- `refresh_session(account)`
- `fetch_current_user(account)`
- `fetch_projects(account, cursor)`
- `fetch_work_items(account, filters, cursor)`
- `fetch_time_entries(account, window, cursor)`
- `normalize_*` mappers
- `provider_capabilities()`

## GitLab V1 Integration Strategy

### Supported GitLab Targets

- GitLab.com first-class support
- Self-managed GitLab with custom host support

### Auth Modes

- Preferred: OAuth PKCE through the system browser
- Fallback: Personal access token for self-managed or restricted environments

### Scope Strategy

- Start with `read_api`
- Add `read_user` only if useful for explicit profile access
- Avoid `api` until the app supports write operations

### Important GitLab Data Caveat

GitLab issue payloads expose aggregate `time_stats`, but daily auditing needs per-entry time data. V1 should assume:

- REST endpoints are useful for account, project, and issue metadata
- detailed timelog data may need GraphQL or dedicated time-entry endpoints
- sync logic must normalize both aggregate and entry-level sources into one local `time_entries` table

### Auth Callback Strategy

Because desktop redirect support details can vary by GitLab environment, auth must be implemented behind an internal callback abstraction.

Recommended order:

1. Validate whether GitLab.com accepts the planned desktop redirect URI style.
2. If custom-scheme deep links are accepted, use Tauri deep-link plugin plus single-instance handling.
3. If redirect limitations appear, switch to loopback callback on an ephemeral localhost port.
4. If self-managed OAuth is not practical, PAT remains the fallback.

## Sync Engine

### Sync Flow

1. Resolve provider account and auth state.
2. Refresh token if needed.
3. Pull current user profile.
4. Pull projects and relevant work items.
5. Pull time-entry data for the configured sync window.
6. Normalize and upsert into SQLite.
7. Recompute summaries and daily buckets.
8. Refresh tray snapshot.

### Sync Strategy

- Use incremental cursors where provider support exists.
- Keep raw provider payloads for debugging and future remapping.
- Recompute only affected dates when new time entries arrive.
- Allow manual resync from settings.

### Initial Sync Window

Recommended default:

- current month
- previous month
- current week summary refresh on every tray-triggered update

This balances responsiveness and usefulness without over-fetching large histories.

## Schedule And Bucket Logic

### User Configuration

- hours per day
- workdays per week
- timezone
- optional start-of-week setting

### Bucket Rules

- For completed workdays, compare logged time against the full-day target.
- For the current day, compare logged time against current total progress and current status.
- Non-working days are excluded from underfill alerts.
- Logged time above target is marked as overflow and highlighted for audit.

### Daily Status Values

- `empty`
- `under_target`
- `on_track`
- `met_target`
- `over_target`
- `non_workday`

## Audit Features

### Main Audit Use Cases

- Find missing hours after a day has passed.
- Find overfilled days caused by duplicate or mistaken logging.
- Inspect exactly which issues received time on a selected date.
- Compare totals across day, week, and month.

### Audit View Features

- date picker and date range filters
- grouped entries by day
- grouped entries by issue
- day-level summary cards
- overflow and underfill callouts
- suspicious-pattern badges

### Suspicious Patterns To Detect In V1

- past workday under target
- day over target
- weekend time logged
- unusually large single entry
- repeated entries on one issue in a short period

## Tray And Window UX

### Tray Behavior

- Tray icon is always available after setup.
- Icon click opens a compact mini-panel where supported.
- Linux fallback can open a standard window or menu-based panel if tray events are limited.

### Mini-Panel Content

- today progress ring
- logged hours vs target
- remaining or overflow value
- top issues for today
- quick actions: open dashboard, sync now, settings

### Main Window Tabs

- Today
- Week
- Month
- Audit
- Settings
- Connection

## Gamification Strategy

### Design Principle

Gamification must reward consistency and accuracy, not overwork.

### V1 Mechanics

- XP for completing target days
- streaks for consecutive healthy workdays
- badges for clean weeks and balanced months
- a small companion or desk-pet state driven by consistency

### Avoid In V1

- social pressure loops
- public competition
- overtime rewards
- noisy animations that distract from the data

## Design System Direction

### Visual Style

- frosted glass surfaces
- blurred atmospheric background layers
- strong contrast for text and metrics
- playful dashboard accents inspired by lightweight game HUDs
- clean spacing and deliberate typography

### Motion Principles

- tray panel reveal should feel soft and quick
- number changes should animate subtly
- milestone rewards should feel satisfying but brief
- reduced-motion mode must be supported

### Accessibility

- high-contrast content inside translucent surfaces
- keyboard navigation for primary flows
- screen-reader-friendly labels for counters and progress indicators
- no information conveyed only through color

## Suggested Repository Structure

```text
docs/
  plans/
src/
  app/
  components/
  features/
    dashboard/
    onboarding/
    providers/
    settings/
    tray/
  hooks/
  lib/
  styles/
src-tauri/
  capabilities/
  src/
    auth/
    commands/
    db/
    domain/
    gamification/
    providers/
      gitlab/
    services/
    sync/
    tray/
    windows/
```

## Suggested Rust Module Boundaries

- `auth`: OAuth session state, PAT handling, callback validation
- `commands`: Tauri command handlers exposed to the frontend
- `db`: SQLite connection, migrations, repositories
- `domain`: core types shared across modules
- `providers`: provider trait plus concrete adapters
- `sync`: incremental synchronization flows
- `services`: summaries, bucket evaluation, audit calculations
- `tray`: tray icon state and mini-panel snapshot generation
- `windows`: window creation, positioning, and visibility control
- `gamification`: XP, streaks, badges, companion state

## Suggested Frontend Feature Areas

- `onboarding`: provider setup and schedule setup
- `providers`: connection status, host settings, resync controls
- `dashboard`: today, week, month overview surfaces
- `audit`: date filters and issue/day drilldowns
- `tray`: mini-panel UI and compact status cards
- `settings`: theme, motion, schedule, debug options

## Initial SQLite Schema Draft

### `provider_accounts`

- id
- provider
- host
- display_name
- username
- auth_mode
- external_user_id
- created_at
- last_sync_at

### `projects`

- id
- provider_account_id
- provider_project_id
- name
- path
- metadata_json

### `work_items`

- id
- provider_account_id
- project_id
- provider_item_id
- title
- state
- web_url
- labels_json
- raw_json
- updated_at

### `time_entries`

- id
- provider_account_id
- work_item_id
- provider_entry_id
- spent_at
- seconds
- source_type
- source_user_id
- raw_json

### `schedule_profiles`

- id
- provider_account_id
- timezone
- hours_per_day
- workdays_json
- is_default

### `daily_buckets`

- id
- provider_account_id
- date
- target_seconds
- logged_seconds
- variance_seconds
- status

### `sync_cursors`

- id
- provider_account_id
- entity_type
- cursor_value
- synced_at

### `gamification_profiles`

- id
- provider_account_id
- xp
- level
- streak_days
- badges_json
- companion_state_json

### `app_settings`

- id
- first_day_of_week
- tray_behavior
- motion_level
- theme_mode
- debug_flags_json

## Tauri-Specific Implementation Notes

### Tray

- Use Tauri tray icon support with a dedicated mini-panel window.
- Use a window-positioning approach that can anchor the panel near the tray where supported.
- Keep a Linux fallback path that uses a normal window if tray click events are not reliable.

### Windows

- `main`: full dashboard
- `tray-panel`: small floating panel
- `auth-callback`: optional hidden or temporary auth flow helper if needed

### Security

- Use external browser only for OAuth.
- Enforce state validation on callback.
- Treat provider host as trusted configuration only after explicit user approval.
- Never write tokens to logs, raw JSON dumps, or SQLite.

## Cross-Platform Risk Register

### Linux Secret Storage

Native keychain behavior varies by environment. Stronghold provides a more predictable baseline, but Linux packaging and desktop environment testing must happen early.

### Linux Tray Behavior

Some Linux environments do not expose tray click behavior consistently. The UI must degrade gracefully.

### OAuth Callback Differences

GitLab.com and self-managed instances may not behave identically for desktop redirect styles. A validation spike is required before locking the callback implementation.

### Provider Expansion Risk

GitHub and Bitbucket may not have time-tracking data models that map cleanly to GitLab. The capability matrix should allow provider-specific limitations without weakening the core UX.

## Milestones

### Milestone 1: Project Foundation

- Scaffold Tauri v2, React, Tailwind CSS, and shadcn/ui.
- Create Rust module layout.
- Add SQLite and migration setup.
- Define provider trait and shared domain types.
- Create main window and tray shell.

### Milestone 2: Auth And Account Setup

- Build onboarding flow.
- Add GitLab.com OAuth PKCE path.
- Add self-managed PAT path.
- Add secure secret storage.
- Persist provider account metadata.

### Milestone 3: GitLab Sync Engine

- Pull current user data.
- Pull projects and issues.
- Pull time-entry data.
- Normalize and upsert into local tables.
- Add manual and scheduled sync triggers.

### Milestone 4: Tracking And Audit

- Implement schedule setup.
- Compute daily buckets.
- Build today, week, and month summaries.
- Build audit drilldown by day and issue.
- Add anomaly detection flags.

### Milestone 5: Tray Experience

- Build tray icon state model.
- Build tray mini-panel UI.
- Add sync-now and open-dashboard actions.
- Add platform fallback logic.

### Milestone 6: Gamification And Polish

- Add XP, streaks, and badges.
- Add companion state system.
- Add motion and glass visual layer.
- Add reduced-motion support.

### Milestone 7: Provider Expansion Prep

- Freeze adapter contracts.
- Document capability matrix.
- Prepare YouTrack adapter as the next provider.

## Acceptance Criteria For V1

- User can connect GitLab.com with OAuth PKCE.
- User can connect self-managed GitLab with a PAT.
- App stores normalized work data locally.
- App stores secrets outside SQLite.
- App computes daily, weekly, and monthly totals.
- App compares totals against a configured schedule.
- App flags under-target and over-target workdays.
- App shows issue-level hour breakdown for a selected day.
- Tray experience works well on macOS and Windows and degrades gracefully on Linux.
- UI feels polished, playful, and readable.

## Implementation Order Recommendation

Build in this order:

1. foundation and schema
2. auth and provider account storage
3. GitLab sync
4. bucket computation
5. dashboard views
6. tray mini-panel
7. gamification layer
8. provider expansion work

## Immediate Next Actions

1. Scaffold the Tauri v2 + React app.
2. Set up Tailwind and shadcn/ui.
3. Create the Rust provider trait and domain types.
4. Add SQLite migrations and repositories.
5. Build the onboarding and provider connection shell.
6. Run a GitLab auth spike to validate callback style on GitLab.com.
