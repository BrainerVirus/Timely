# Changelog

## [Unreleased]

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
- React Doctor now passes at `100/100` after extracting Worklog page state, simplifying holiday/sync state handling, and removing unused frontend dead code.
- Settings page internals were simplified for easier maintenance, the TypeScript config now relies on bundler-native path resolution without `baseUrl`, and minor mascot cleanup removed leftover unused state.
- Tray controls now keep the panel focused on a simple `Open` action while secondary actions live in the native tray menu, and the About dialog uses a cleaner sync-log-inspired layout with lighter hierarchy.
- Settings and About surfaces now use clearer localized copy in English, Spanish, and Portuguese, including natural tray/window wording and localized schedule save states.
- The shell now uses the fox mark in the NavRail, macOS keeps a template-friendly fox tray icon, and Windows/Linux use the same fox silhouette in Timely's brand primary color.
- The Updates panel now uses a cleaner build-details card, a stronger primary check button, and Sonner-based update status feedback while preserving the channel selector and install progress flow.
- The default updater channel now follows the installed build: prerelease builds default to `unstable`, stable builds default to `stable`, while saved user overrides still take precedence.
- Error-state copy is now aligned across Play and tray surfaces, and agent/project docs now explicitly ban runtime mock fallbacks in shared Tauri data flows.
- Home and Worklog now rely on page-local motion orchestration instead of a global route slide, while secondary preview mascots, empty states, and tray surfaces use static or reduced-motion variants to keep interaction polish without the extra idle churn.
- Accessibility language controls are now cleaner by removing the redundant inline language summary text, and Window & tray close-action copy no longer references Discord in localized strings.

### Tooling
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
