# Changelog

## [Unreleased]

### Added
- Guided GitLab auth with PAT-first flow, OAuth validation polish, editable schedules, shift times, lunch break controls, and GraphQL-based sync with live progress logging
- Auto-sync preferences persisted in SQLite, `syncVersion`-driven re-fetching, manual-sync-aware toasts, and a reusable sync log dialog in Settings
- Escape-proof multi-page onboarding with mock payload injection, Zustand app lifecycle/sync state, fresh-workspace bootstrap without seed data, and expanded frontend test coverage
- Timely claymorphism redesign work across the shell, tray, settings, play page, empty states, fox mascot/icon assets, and the new Home overview/launchpad with quick Worklog entry points
- Worklog upgrades including stat-card day summaries, issue pagination, period mode, route-backed nested day detail from week/period views, and holiday-aware day metadata for summary cards
- Tooling and release metadata: dev-mode scripts, project `AGENTS.md`, release process docs, GitHub Actions CI/release workflow, and an MIT license

### Fixed
- GitLab auth and sync reliability issues: stronger error handling, PAT validation polish, GraphQL sync progress, and Worklog snapshots reloading after successful sync
- Schedule saving without a provider no longer violates FK constraints, and setup completion now follows the real route order with required schedule completion
- Calendar and overlay polish: fixed popover backgrounds, improved calendar nav layout, toned down bounce, corrected sheet close/header spacing, and removed root/page view-transition flashes
- Past partially logged `met_target` days are now reclassified as `under_target`, and Worklog issue/audit presentation is cleaner with the orange global focus ring applied consistently
- Week and period cards now fill their grid columns correctly, only the real current day gets the current-day treatment, and holidays render with dedicated styling plus their name badge
- Accordion summary alignment and related shell polish issues were cleaned up across Settings and Worklog

### Changed
- Timely is now the product name throughout the app, docs, and automation metadata, replacing older Pulseboard naming
- The shell, setup flow, tray, Home, Settings, Play, and Worklog surfaces now share the claymorphism language: stronger borders, softer shadows, warmer color semantics, and fewer nested containers
- Setup is now mandatory, tied to the real route flow, and guarded all the way to the completion screen
- Time display formatting can switch between `hm` and decimal output across the full UI
- React architecture now leans on LazyMotion, Zustand state, route-backed nested Worklog state, and React Doctor-guided cleanup instead of effect-heavy or context-heavy flows
- Release documentation now reflects direct-to-main CI checks plus release-triggered installer builds for macOS, Windows, and Linux

## [0.1.0] - 2026-03-07

### Added
- Tauri v2 desktop app scaffold with React 19, Tailwind CSS v4, TanStack Router
- Dashboard with Today, Week, Month, and Audit views
- System tray icon with seven-segment display showing hours remaining
- Tray panel overlay with progress ring, issues list, streak display
- GitLab OAuth PKCE + PAT authentication flow
- SQLite database with connection, session, and bootstrap management
- Gamification: pilot card, quest panel, streak display
- Settings view with provider connection management

### Fixed
- GitLab OAuth window now opens correctly (added `gitlab-auth` to capabilities)
- Tray icon positioning uses physical pixels consistently (Retina-correct)
- Tray icon renders as macOS template icon (crisp, adapts to light/dark menu bar)
- Tray panel auto-hides on blur (click-away dismissal)

### Changed
- Consolidated 3 broken theme variants into single OKLCH dark theme
- Replaced all hardcoded hex colors with semantic design tokens
- Removed glass-morphism orbs, parallax effects, scanline overlays
- Fixed text hierarchy: replaced all `text-[10px]` with proper `text-xs`+
- Cleaned up font stack to Space Grotesk, DM Sans, JetBrains Mono
- Flattened card-in-card nesting throughout all views
- Removed unused dependencies (gsap, 5 unused font packages)
