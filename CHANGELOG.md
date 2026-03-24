# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- CHANGELOG now lists all three prereleases (beta.1, beta.2, beta.3) with Keep a Changelog format and GitHub link references.
- Localization rules in AGENTS.md and timely-release-manager skill: first-class es/pt (no English words), adapt-don't-translate, banned-term equivalents.
- Release-notes failsafes: pre-publish checklist in `notes-templates.md`, Step 8.5 in workflow, invariant #8 in skill to block internal labels and enforce localization.

### Changed
- Release highlights (beta.2, beta.3): Spanish and Portuguese now use proper equivalents (barra de desplazamiento/rolagem, bandeja del/do sistema, configuración, actualizador, versión) with no English loanwords.
- Release highlights (beta.3): removed internal jargon ("readonly/globalThis refactors") in favor of user-facing copy.

### Added
- Frontend architecture doc (`FRONTEND_ARCHITECTURE.md`) with import-boundary rules, violation baseline, measurable thresholds, and public module surfaces.
- Settings page refactor: extracted 10 section components (Connection, Schedule, Calendar, Appearance, WindowBehavior, Accessibility, Sync, About, Updates, DataManagement), `use-settings-page-controller` hook, and utils (`settings-update-helpers`, `settings-holiday-helpers`, `settings-summary-labels`); SettingsPage reduced from ~1800 to ~210 lines.
- Settings public API (`features/settings/public`) for cross-feature reuse: `GitLabAuthPanel`, `ProviderSyncCard`, and schedule-form exports consumed by setup wizard.
- Worklog date utils (`worklog-date-utils.ts`): pure helpers for `parseDateInputValue`, `toDateInputValue`, `shiftDate`, `startOfWeek`, `isSameWeek`, `shiftRange`, `getCurrentMonthRange`, `clampDateToRange`, `isSameDay`, `isCurrentMonthRange`, `differenceInDays`, and `PeriodRangeState`.
- `WorklogMode` type moved to `shared/types/dashboard.ts` for stable cross-layer typing.
- Code-splitting: layout moved under `core/layout/`, feature-level Vite manual chunks for worklog/settings/play/setup/onboarding/home/tray, test fixtures in `src/test/fixtures/` (mockBootstrap), oxlint `no-restricted-imports` for shared/ to prevent feature/layout imports.
- 52 co-located tests across core, features, shared, layout, and entry with folder-per-module convention; entry scripts restructured to `src/entry/app-entry/` and `src/entry/tray-entrypoint/` so each lives with its test.
- Flat-structure restructure: `tour-mock-data`, `date`, `control-styles`, `animations`, and `timezone-country-map` moved to folder-per-module with index re-exports so imports stay unchanged.
- Restructure and code-split: preferences and providers moved from `core/` to `features/settings/`; schedule-form, SchedulePreferencesCard, ScheduleSaveButton, GitLabAuthPanel, ProviderSyncCard now live under settings; folder-per-component for SetupRoutes and LoadingStates.
- Worklog code-split: shared components (PagerControl, SingleDayPicker, PeriodPicker, SummaryGrid), worklog domain components (WorklogToolbar, WorklogContent, DaySummaryPanel, NestedDayView, IssuesSection, IssueCard, WorklogStatusState), and hooks (use-day-summary-items, use-normalized-snapshot-error, use-snapshot-error-toast) and utils (worklog-snapshot, shared/utils/date).
- Play code-split: `play-i18n` utils (mood keys, translation helpers, shop filter labels) and `use-shop-filters` hook for shop tab/filter state and pagination.
- Test coverage: 22 new test files for shared utils (date), hooks (use-format-hours, use-notify), worklog hooks/utils/components (RangeSummarySection, MonthView, IssuesSection, DaySummaryPanel, NestedDayView, IssueCard, WorklogStatusState), play hooks/utils/components (QuestPanel, StreakDisplay), shared components (Button, PagerControl, Input, SectionHeading, SummaryGrid), LoadingStates, and preferences-cache.

### Fixed
- TypeScript: SetupRoutes test lifecycle type, preferences-cache test holidayCountryMode, ProviderSyncCard/SetupSyncPage SyncState types, IssuesSection JSX namespace, use-worklog-page-state test options, play-snapshot-cache StreakSnapshot shape, PlayRoutePages i18n and use-shop-filters types.
- Entry module load tests: increased timeout and Vitest 4 `it()` options syntax.
- TrayLayout test no longer triggers React act() warnings when testing Suspense loading state.

### Changed
- Shared components no longer import from core; Accordion, EmptyState, FoxMascot, PageTransition, SummaryGrid, and Tabs now receive motion props (`allowDecorativeAnimation`, `windowVisibility`, `motionSettings`), and Calendar, PeriodPicker, SearchCombobox, Dialog, and Sheet receive i18n props (`locale`, `labels`, `closeButtonAriaLabel`, `searchPlaceholder`, `noResultsLabel`) passed from features and core.
- `use-format-hours`, `use-theme`, and `use-notify` moved from `shared/hooks` to `core/hooks` to fix shared→core boundary violations; features and core now import from `@/core/hooks/`; all blocking hook violations resolved.
- Setup wizard and SetupRoutes now import from `features/settings/public` instead of deep settings paths.
- `use-worklog-page-state` now uses shared `worklog-date-utils` for date logic; `worklog-snapshot` imports `PeriodRangeState` from utils.
- AGENTS.md now reflects current architecture: core/layout/, shared/components, test/fixtures; IPC at core/services/TauriService/tauri.ts; cn() and types paths updated.
- WorklogPage reduced from ~830 to ~200 lines by extracting shared and domain components, hooks, and utils.
- TrayPanel now uses shared PagerControl (compact mode) instead of inline TrayPagerControl.
- Onboarding moved from `core/onboarding/` to `features/onboarding/` with folder-per-component (OnboardingFlow, SetupConnectionGuide).
- MainLayout extracted from App.tsx into `layout/MainLayout/MainLayout.tsx` (shell, SyncLogDialog, helpers).
- File naming convention now enforced by `unicorn/filename-case`: PascalCase for React components, kebab-case for utilities (see AGENTS.md).
- Shared components restructured to folder-per-component (e.g. `Button/Button.tsx`, `EmptyState/EmptyState.tsx`); hooks moved to `shared/hooks/use-format-hours/`, etc.
- Features restructured to pages/components/hooks/services: HomePage, WorklogPage, SettingsPage, SetupWelcomePage, etc. in `pages/`; MonthView, QuestPanel, TrayPanel, etc. in `components/`; `use-worklog-page-state`, `play-provider-state` in `hooks/`; `play-snapshot-cache`, `setup-flow` in `services/`.
- Layout and core restructured to folder-per-component: `MainLayout/components/NavRail/`, `TopBar/`, `SetupShell/`, `TrayLayout.tsx`; `core/runtime/` split into `core/services/<Name>/` (TauriService, I18nService, BuildInfo, etc.) and `core/stores/AppStore/`.
- Folder structure refactored for maintainability: UI primitives and shared components moved to `src/shared/ui/` and `src/shared/components/`, utils and animations to `src/shared/utils/`, About/ReleaseHighlights dialogs relocated to `src/features/settings/components/`, layout extraction to `src/layout/MainLayout/`, `src/layout/SetupLayout/`, and `src/layout/TrayLayout/`, core extraction (store, app, router, runtime, providers, preferences, onboarding) to `src/core/`, and feature normalization: dashboard merged into worklog, gamification merged into play.
- React Doctor now passes at `100/100` after extracting Worklog page state, simplifying holiday/sync state handling, and removing unused frontend dead code.

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

[Unreleased]: https://github.com/BrainerVirus/Timely/compare/v0.1.0-beta.3...HEAD
[0.1.0-beta.3]: https://github.com/BrainerVirus/Timely/compare/v0.1.0-beta.2...v0.1.0-beta.3
[0.1.0-beta.2]: https://github.com/BrainerVirus/Timely/compare/v0.1.0-beta.1...v0.1.0-beta.2
[0.1.0-beta.1]: https://github.com/BrainerVirus/Timely/releases/tag/v0.1.0-beta.1
