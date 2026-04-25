# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- After you connect GitLab, sync now pulls **open issues assigned to you** into a local cache and shows them on **Home** and a new **Issues** screen (rail icon). Issues group into columns by milestone or iteration when GitLab provides them.
- From the Issues board you can **log spent time** and **post markdown comments** on an issue; both call GitLab directly. Run **Sync** afterward so your worklog matches GitLab.
- The full **Issue** page (`/issues/hub`) also supports **editing the long description** in markdown, **deleting** the issue from the app, and a growing **activity** list with **load more** for longer threads, while the board remains the best place to scan everything at once.
- On **Home**, the **assigned issues** strip can show a **larger set** of your issues using **paged rows** and a count badge, with animated transitions when the page of rows changes, so a busy week does not all need to open the full board to browse.

### Changed
- The **Issue** view is **provider-agnostic** in the UI: navigation and layout stay the same for future backends, with GitLab supplying today’s data and the actions that call GitLab today.
- The **Issues** screen lists assigned items in a **Worklog-style** row layout (no duplicate page title under the top bar), with filters for **team/iteration codes** (inferred from paths and labels), **two-week periods** (using GitLab iteration dates when sync provides them), and **workflow** (from labels). A full **Issue** page at `/issues/hub` still offers the Worklog-style **day picker** and **markdown** editor.
- **Issue** details and activity show **skeleton** placeholders while data is still loading, so the main column is not empty during fetch; linked issues can be **pre-fetched on hover** so the next open feels snappier.
- **Worklog** no longer shows a Sprint board shortcut; use **Issues** in the rail or the strip on **Home** to open the board.
- Home, Worklog, Settings, Play, tray, and onboarding now run on smaller, isolated frontend modules, which makes future UI updates safer to ship and easier to keep consistent across the app.
- Timely now enforces direct imports, colocated frontend tests, and stricter screen/module size limits in the codebase, helping new UI changes stay readable and less error-prone over time.
- **Assigned issues** now uses a single filter row with **Status**, **Iteration**, and **Year** controls beside a wider search field, keeping the board layout cleaner while preserving the same filtering options.
- The **Assigned issues** search now behaves like a proper autocomplete search box with keyboard navigation, a left search icon, and the same full-width layout the board had before the refactor.

### Fixed
- **Assigned issues** after sync now populate reliably: GitLab sometimes returns issue `iid` as a number in GraphQL (which previously broke parsing), and sync falls back to the REST issues list when GraphQL returns nothing or errors, so Home and Issues should match your open assignments again.
- Switching between **Open**, **Closed**, and **All** on **Assigned issues** no longer leaks stale results from another status while the board is refreshing.
- The **Assigned issues** search no longer revives an older query while you type a new one, and clearing the field now reliably keeps the empty search instead of restoring the previous term.

## [0.1.0-beta.11] - 2026-04-06

### Changed
- The guided first-time configuration flow now validates inputs more clearly, keeps layout and navigation steadier, and makes weekly hour rules plus schedule preferences easier to finish.
- Schedule setup in Settings now uses a weekly calendar editor with a focused day panel, a separate Schedule Preferences section, and tighter field sizing so working hours are easier to review and adjust.
- Saving schedule changes now shows short success or error messages in English, Spanish, and Portuguese, and those notices use clearer borders and contrast so they are easier to read.

### Fixed
- The weekly schedule editor now keeps its hour rail, header, scroll areas, and lunch-break markers aligned more cleanly, which makes the calendar view easier to scan while moving across days and times.

## [0.1.0-beta.10] - 2026-03-30

### Changed
- Schedule setup and Settings now let you define working hours per weekday, copy one day's hours to other days, and keep weekly targets aligned with shorter days like Friday.
- Workday reminders now keep Timely's fox sound inside the native desktop notification on macOS, Windows, and Linux, so the alert and sound arrive together as one system notice.
- Reminder diagnostics now report the native delivery method and sound reference used for each reminder, making follow-up troubleshooting much more direct.
- Settings now follows a more natural progression through reminders, syncing, updates, appearance, accessibility, and window behavior, so related controls are easier to find in one pass.
- Timely now follows your operating system's reduced-motion preference automatically, and Settings no longer shows a separate motion control.
- Prerelease validation now passes Rust lint cleanly again before packaging, which keeps beta builds from stalling on the reminder service.

### Fixed
- Day-off rows in the schedule editor now stay visible in a disabled state, so it's easier to confirm which hours are excluded from your week before you save.
- Reminders no longer show a separate “Ask the system” action once Timely already knows your desktop notification status, which keeps that panel focused on testing notices and opening the relevant system settings.
- Accessibility and Sync now use the same field-label styling as the rest of Settings, so language and sync-interval controls are easier to scan.

## [0.1.0-beta.9] - 2026-03-27

### Changed
- Installed Linux reminders now keep their desktop notification connection alive until the notice closes or a short watchdog releases it, giving GNOME-style desktops more time to actually show the alert.
- Reminder diagnostics now record the Linux notification ID and whether the desktop closed the notice, the watchdog released it, or the close listener failed.
- Linux reminder close watching now runs in the background, which reduces the chance that a manual test notice leaves Timely feeling stuck while the desktop handles it.

### Fixed
- Packaged Linux reminder notices are less likely to disappear immediately after dispatch because Timely now retains the active Linux notification handle for the lifetime of the notice.
- Linux reminder reports no longer stop at a generic “notification dispatched” trace when the desktop closes or drops a notice right away.

## [0.1.0-beta.8] - 2026-03-27

### Changed
- Installed Linux packages now present reminder notifications with a steadier desktop identity, giving GNOME and similar desktops a better chance to show Timely alerts instead of dropping them immediately.
- Linux packaging now ships an explicit desktop file with notification support enabled, helping Timely present itself more consistently across Debian and RPM desktops.
- Reminder diagnostics now include the Linux desktop entry and icon name together, making notification failures much easier to inspect from a single trace.

### Fixed
- Linux reminder notices no longer reuse one identity for both the desktop entry and the icon, avoiding the mismatch that could make installed `.deb` notifications disappear before rendering.

## [0.1.0-beta.7] - 2026-03-26

### Changed
- Reminder notices now identify themselves more cleanly across desktop systems, improving how alerts show up on Linux and preserving the stronger banner behavior on macOS.
- The Diagnostics console now puts the affected feature first, separates time and severity more clearly, and uses more familiar info, warning, and error colors for faster scanning.
- Prerelease validation now passes cleanly through formatting, linting, frontend tests, Rust tests, and the production build before beta packaging.

### Fixed
- Timely no longer prints a stray Windows-only notification helper warning during `tauri dev` on macOS and Linux.
- Full app test runs no longer flake on the lazy Worklog and Play route checks during prerelease verification.

## [0.1.0-beta.6] - 2026-03-25

### Changed
- Settings now includes a dedicated Diagnostics area with a console-style viewer, quick actions (refresh, copy, export, clear), and smoother expand/collapse motion for the diagnostics panel.
- The diagnostics feature filter now uses the same combobox behavior and sizing rules as other Timely combobox fields, keeping trigger and popup widths visually aligned.
- Reminder notification permission messaging and styling in Settings now use clearer visual hierarchy, including explicit success/destructive tones for permission state.
- Timely's English, Spanish, and Portuguese copy has been rewritten across Home, Worklog, Settings, setup, tray, startup states, and in-app What's New notes so each language reads naturally instead of feeling translated from English.
- Backend-generated sync progress, worklog range labels, weekday chips, audit notes, and notification-settings messages now match Timely's playful product voice in the selected language.
- Prerelease verification is stricter around localized dialog copy and route flows, which helps catch TypeScript and CI-only regressions before a build ships.

### Fixed
- The Diagnostics filter `All` option now correctly loads entries across every feature instead of showing an empty result set until a specific feature is selected.
- Spanish and Portuguese no longer fall back to English in several runtime paths, including startup payload text, tray loading states, shared controls, backend sync messages, and release highlights.
- Production builds and test coverage now stay green after the localization overhaul, reducing failed prerelease jobs caused by missed typed-copy wiring.

## [0.1.0-beta.5] - 2026-03-25

### Added
- Workday reminders now ship localized copy in English, Spanish, and Portuguese, including localized reminder titles and urgency-tier message pools.
- When language is set to `auto`, reminder notifications now follow your operating system preferred language (with fallback to English).

### Changed
- The in-app What's New dialog for beta.5 uses punchier, fox-forward copy again—closer to beta.4's playful tone while still covering reminder localization.
- Spanish and Portuguese What's New lines for beta.5 were rewritten for natural, locale-first phrasing (Latin American neutral Spanish).
- Contributor documentation now includes clearer localization and release guidance, including expanded release-checklist references and architecture boundary notes.

### Fixed
- macOS reminder notices can now present as banners even while Timely is focused, so end-of-shift nudges are easier to spot in real time.
- CI prerelease packaging now sets DMG bundling flags consistently, reducing failed macOS prerelease artifact builds.

## [0.1.0-beta.4] - 2026-03-24

### Added
- Optional workday reminders as system notices before your shift ends: companion copy scales from cozy to “biscuit-jar emergency” as time runs out; choose 45 / 30 / 15 / 5 minutes ahead.
- A Reminders section in Settings with a master switch, those lead times, plain-language permission hints, and an action to fire a check notice on demand.
- Reminder timing refreshes when you save your work hours or after a successful GitLab sync.
- Settings is organized into clearer sections (including Reminders) with smaller panels instead of one endless screen; the setup path reuses the same GitLab and schedule pieces.
- Worklog date moves (day, week, period) share one set of helpers so hopping ranges feels steadier; the tray window uses the same compact pager as the main interface.

### Changed
- Calendars, dialogs, sheets, and tabs receive motion and language preferences from the screen that hosts them, so reduced motion and your locale line up wherever that pattern appears.

### Fixed
- Fewer rough edges on first open across setup, Worklog, Play, and the tray when timing and state edge cases stacked up.

## [0.1.0-beta.3] - 2026-03-23

### Added
- Home now includes weekday state variants for the week strip, and shared UI surfaces can use a reusable `DetailsCard` primitive for metadata-heavy layouts.

### Fixed
- Worklog period error fallback now preserves period-mode state before cross-mode cache fallback, so period summaries keep the correct expected-hours note and recoverable error coverage stays stable.
- Shell scrollbar reservation no longer exposes a mismatched chrome gutter strip; top bar and page surfaces now keep stable alignment without visible background gaps when overflow appears.

### Changed
- Frontend UI styling is now more consistent after broad Tailwind v4 class normalization (border/shadow/control-height syntax), plus readonly prop and `globalThis` refactors across shared components and setup/worklog/tray surfaces.
- Settings page internals were simplified for easier maintenance, the TypeScript config now relies on bundler-native path resolution without `baseUrl`, and minor mascot cleanup removed leftover unused state.

## [0.1.0-beta.2] - 2026-03-20

### Added
- Settings now includes a dedicated Updates section with a channel selector, explicit updater error handling, install/restart flows, and channel-aware Tauri commands for `stable` and `unstable` releases.
- Timely now shows a localized post-update highlights dialog once per installed version, using handcrafted release notes for English, Spanish, and Portuguese.
- Settings now includes an Accessibility section with `system` / `reduced` / `full` motion preferences, and desktop surfaces can respect that preference consistently.

### Fixed
- GitLab sync now persists the latest successful sync timestamp and runs the full import inside a single transaction, which keeps the top bar's last-sync value accurate after restart and prevents partial writes when the sync refreshes daily buckets.
- Tailwind CSS now compiles again under Vite 8 by using the official `@tailwindcss/vite` integration instead of relying on a removed PostCSS path, which restores utility-driven layout, sizing, and icon styling across the app.
- Theme preference handling now always resolves `system` to the active light/dark scheme, keeps `data-theme` in sync with OS changes, and lets selector-based Tailwind dark variants work correctly with manual overrides.
- Dialog centering now stays correct in full-motion mode by keeping the scale animation from overriding the dialog's static translate-based positioning.
- Play shop secondary filters now reset back to `all` when the current sub-filter no longer matches the selected category, and onboarding preferences fall back to a valid default state during setup.
- Desktop tray lifecycle is now stable across macOS, Windows, and Linux, with persisted tray/close preferences, safer restore flows, native tray menu actions, and fallback behavior when tray support is unavailable.
- The top bar now restores the real persisted "Last synced" timestamp after relaunch instead of falling back to `Never` until the next sync.
- App-level tests are stable again after tightening the Settings route assertion used by the continue-setup flow.
- App route tests now create fresh memory-history routers per test, which removes the CI-only flake around Worklog and Play route navigation.
- Play route tests now preload their lazy route modules before rendering, which removes the remaining CI race around shop content assertions.
- Release highlights now stay hidden on clean resets, wait until onboarding is finished on real upgrades, and no longer conflict with the onboarding tour during Worklog -> Settings transitions.
- Core desktop data flows no longer mask runtime failures with synthesized fallback payloads; Worklog, Play, tray refreshes, and desktop listener setup now surface controlled error states instead of fake data.
- Worklog navigation now preserves the page shell while fixing calendar month browsing, restoring route-level enter motion, and keeping day/week/period refresh animations scoped to the summary cards and issue content with synchronized pacing across day, week, and period changes.
- Decorative idle work is lower across desktop surfaces: mascot/streak animations can pause or render statically, tray updates skip redundant work, and worklog day/week/period transitions now animate with smoother synchronized pacing.
- Light mode no longer repaints the document theme when entering Settings, which fixes the Home -> Settings flicker/jump that only appeared on bright surfaces.
- Reduced-motion behavior now stays consistent across shared UI primitives, Home, Worklog, dialogs, popovers, and empty states, with regression coverage guarding the app-level motion preference and static fallback rendering.
- Worklog animations now stay synchronized across day empty states, week/period range changes, and window minimize/restore, so the no-issues fox placeholder no longer lags behind summary cards and week grids replay only on real range changes.
- Worklog recoverable period-load failures now keep the full period shell visible with a localized empty placeholder, period navigation labels stay stable while changing ranges, and repeat range failures emit scoped toasts instead of forcing a hard error screen.

### Changed
- Tray controls now keep the panel focused on a simple `Open` action while secondary actions live in the native tray menu, and the About dialog uses a cleaner sync-log-inspired layout with lighter hierarchy.
- Settings and About surfaces now use clearer localized copy in English, Spanish, and Portuguese, including natural tray/window wording and localized schedule save states.
- The shell now uses the fox mark in the NavRail, macOS keeps a template-friendly fox tray icon, and Windows/Linux use the same fox silhouette in Timely's brand primary color.
- The Updates panel now uses a cleaner build-details card, a stronger primary check button, and Sonner-based update status feedback while preserving the channel selector and install progress flow.
- The default updater channel now follows the installed build: prerelease builds default to `unstable`, stable builds default to `stable`, while saved user overrides still take precedence.
- Error-state copy is now aligned across Play and tray surfaces, and agent/project docs now explicitly ban runtime mock fallbacks in shared Tauri data flows.
- Home and Worklog now rely on page-local motion orchestration instead of a global route slide, while secondary preview mascots, empty states, and tray surfaces use static or reduced-motion variants to keep interaction polish without the extra idle churn.
- Accessibility language controls are now cleaner by removing the redundant inline language summary text, and Window & tray close-action copy no longer references Discord in localized strings.
- Upgraded the frontend toolchain to Vite 8 with aligned React/Vitest/Tauri package versions, updated Node compatibility guidance, refreshed CI/release workflows to Node 24 and GitHub Actions v6, and a Vite 8-compatible PostCSS/Tailwind setup.
- Tailwind v4 now uses the official Vite plugin pipeline, replacing the broken half-migrated PostCSS setup and matching the current Tailwind docs for Vite projects.
- Production builds now group stable third-party dependencies into cacheable vendor chunks so route bundles stay smaller and repeat loads reuse more shared code.
- Enabled React Compiler in the Vite pipeline with the required Rolldown/Babel integration and aligned the documented/supported Node engines to Node 22.12+ and 24.x.
- Release automation now publishes updater manifests from the GitHub release asset instead of assuming a local CI path, includes a dry-run mode for the publisher script, and rotates to the latest updater signing key.
- GitHub Actions now runs frontend lint/tests and Rust lint/tests as separate parallel quality jobs, so backend failures are visible directly in CI instead of being skipped.

## [0.1.0-beta.1] - 2026-03-17

### Added
- Tauri v2 desktop app scaffold with React 19, Tailwind CSS v4, TanStack Router
- Dashboard with Today, Week, Month, and Audit views
- System tray icon with seven-segment display showing hours remaining
- Tray panel overlay with progress ring, issues list, streak display
- SQLite database with connection, session, and bootstrap management
- Gamification: pilot card, quest panel, streak display
- Settings view with provider connection management
- Guided GitLab auth with PAT-first flow, OAuth validation polish, editable schedules, shift times, lunch break controls, and GraphQL-based sync with live progress logging
- Auto-sync preferences persisted in SQLite, `syncVersion`-driven re-fetching, manual-sync-aware toasts, and a reusable sync log dialog in Settings
- Escape-proof multi-page onboarding, Zustand app lifecycle/sync state, fresh-workspace bootstrap without seed data, and expanded frontend test coverage
- Timely claymorphism redesign work across the shell, tray, settings, play page, empty states, fox mascot/icon assets, and the new Home overview/launchpad with quick Worklog entry points
- Worklog upgrades including stat-card day summaries, issue pagination, period mode, route-backed nested day detail from week/period views, and holiday-aware day metadata for summary cards
- Tooling and release metadata: dev-mode scripts, project `AGENTS.md`, release process docs, GitHub Actions CI/release workflow, and an MIT license

### Fixed
- GitLab OAuth window now opens correctly (added `gitlab-auth` to capabilities)
- Tray icon positioning uses physical pixels consistently (Retina-correct)
- Tray icon renders as macOS template icon (crisp, adapts to light/dark menu bar)
- Tray panel auto-hides on blur (click-away dismissal)
- GitLab auth and sync reliability issues: stronger error handling, PAT validation polish, GraphQL sync progress, and Worklog snapshots reloading after successful sync
- Schedule saving without a provider no longer violates FK constraints, and setup completion now follows the real route order with required schedule completion
- Initial onboarding completion now persists through Tauri-backed SQLite app preferences, survives prerelease app relaunches, and no longer depends on browser storage or runtime mock payloads
- Calendar and overlay polish: fixed popover backgrounds, improved calendar nav layout, toned down bounce, corrected sheet close/header spacing, and removed root/page view-transition flashes
- Past partially logged `met_target` days are now reclassified as `under_target`, and Worklog issue/audit presentation is cleaner with the orange global focus ring applied consistently
- Week and period cards now fill their grid columns correctly, only the real current day gets the current-day treatment, and holidays render with dedicated styling plus their name badge
- Accordion summary alignment and related shell polish issues were cleaned up across Settings and Worklog
- Worklog date controls now share one compact calendar trigger across day, week, and period, the period label is no longer duplicated in the trigger, and the frontend lint warning backlog was cleared
- Worklog day cards now use canonical date identity across frontend and Rust snapshots, period queries are anchored to the selected range, and the week/period ripple animation replays consistently when ranges or layouts change
- Worklog tabs now reset their controls per mode, and the period picker now supports clean draft-based range selection with native range visuals, cross-month navigation, and same-day single-date ranges
- Shared combobox fields now clip hover/focus surfaces correctly, so timezone and holiday pickers no longer bleed past rounded edges or leave the chevron side partially unfilled
- Tabs, nav rail actions, and shell chrome now use corrected active/hover treatments so the active pill stays aligned and the light theme regains clear contrast around headers and borders

### Changed
- Consolidated 3 broken theme variants into single OKLCH dark theme
- Replaced all hardcoded hex colors with semantic design tokens
- Removed glass-morphism orbs, parallax effects, scanline overlays
- Fixed text hierarchy by replacing `text-[10px]` sizing with proper `text-xs` and larger steps
- Cleaned up the font stack to Space Grotesk, DM Sans, and JetBrains Mono
- Flattened card-in-card nesting throughout the app
- Removed unused dependencies, including GSAP and unused font packages
- Timely is now the product name throughout the app, docs, and automation metadata, replacing older Pulseboard naming
- The shell, setup flow, tray, Home, Settings, Play, and Worklog surfaces now share the claymorphism language: stronger borders, softer shadows, warmer color semantics, and fewer nested containers
- Setup is now mandatory, tied to the real route flow, and guarded all the way to the completion screen
- Time display formatting can switch between `hm` and decimal output across the full UI
- React architecture now leans on LazyMotion, Zustand state, route-backed nested Worklog state, and React Doctor-guided cleanup instead of effect-heavy or context-heavy flows
- Release documentation now reflects direct-to-main CI checks plus release-triggered installer builds for macOS, Windows, and Linux, with Linux quality jobs installing the GTK/WebKit packages needed for Rust linting in CI
- Prerelease release builds now align feature flags with the intended beta channel: onboarding stays enabled, while Play remains disabled in shipped installers
- Light-theme shell tokens now separate app frame, nav rail, page header, tray, panel, field, and popover surfaces so the same semantic layering works consistently across Home, Worklog, Settings, Setup, tray, and onboarding

[Unreleased]: https://github.com/BrainerVirus/Timely/compare/v0.1.0-beta.11...HEAD
[0.1.0-beta.11]: https://github.com/BrainerVirus/Timely/compare/v0.1.0-beta.10...v0.1.0-beta.11
[0.1.0-beta.10]: https://github.com/BrainerVirus/Timely/compare/v0.1.0-beta.9...v0.1.0-beta.10
[0.1.0-beta.9]: https://github.com/BrainerVirus/Timely/compare/v0.1.0-beta.8...v0.1.0-beta.9
[0.1.0-beta.8]: https://github.com/BrainerVirus/Timely/compare/v0.1.0-beta.7...v0.1.0-beta.8
[0.1.0-beta.7]: https://github.com/BrainerVirus/Timely/compare/v0.1.0-beta.6...v0.1.0-beta.7
[0.1.0-beta.6]: https://github.com/BrainerVirus/Timely/compare/v0.1.0-beta.5...v0.1.0-beta.6
[0.1.0-beta.5]: https://github.com/BrainerVirus/Timely/compare/v0.1.0-beta.4...v0.1.0-beta.5
[0.1.0-beta.4]: https://github.com/BrainerVirus/Timely/compare/v0.1.0-beta.3...v0.1.0-beta.4
[0.1.0-beta.3]: https://github.com/BrainerVirus/Timely/compare/v0.1.0-beta.2...v0.1.0-beta.3
[0.1.0-beta.2]: https://github.com/BrainerVirus/Timely/compare/v0.1.0-beta.1...v0.1.0-beta.2
[0.1.0-beta.1]: https://github.com/BrainerVirus/Timely/releases/tag/v0.1.0-beta.1
