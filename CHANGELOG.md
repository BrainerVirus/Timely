# Changelog

## [0.2.0] - 2026-03-08

### Added
- Fox mascot app icon (SVG source + all platform sizes: icns, ico, png)
- Bundle icon configuration in `tauri.conf.json`
- Error toast notifications when schedule save fails (setup wizard and settings)
- Schedule completion guard on setup done page — redirects to schedule step if skipped

### Fixed
- Schedule save FK constraint violation when no GitLab provider exists yet — `provider_account_id` now passes NULL instead of invalid `0`
- `updateSchedule` missing `isTauri()` guard — no longer crashes in browser-only dev mode
- Step order in `completeSetupStep` now matches actual route flow (welcome → schedule → provider → sync → done)
- Progress ring gradient used accent (blue) instead of secondary (warm orange)
- Accent (blue) color misuses in 7 locations: setup step dots, badge live tone, dialog close button, emerald tone in home page and issue borders, celebration ring on done page

### Changed
- Setup wizard is now mandatory — removed "Skip for now" button; users must complete the schedule step before accessing the main app
- `markSetupComplete` requires schedule step in `completedSteps` before allowing completion
- Full claymorphism audit across 30 UI files — consistent `border-2`, `rounded-xl`/`rounded-2xl`, clay shadow tokens, and active press states
- Color semantics enforced: `primary` (orange) for brand/active states, `accent` (blue) reserved for success/connected states only, `success` (green) for emerald categorical tone

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
