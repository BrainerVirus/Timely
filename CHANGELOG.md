# Changelog

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
