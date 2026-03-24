# Frontend Architecture

Defines allowed import directions, boundary rules, and maintainability thresholds for the `src/` frontend.

## Layers

- **`core`** — Application kernel: routing, layouts, global store, platform services, bootstrapping, app-specific hooks (use-format-hours, use-theme, use-notify).
- **`features`** — Vertical slices by domain (home, worklog, settings, setup, play, onboarding, tray).
- **`shared`** — Reusable UI primitives, generic hooks/utils, shared types (no domain logic, no core dependency).

## Allowed Import Directions

```text
core     → shared, features (composition only: routes, layouts, prefetch registration)
features → shared, core (services, store, i18n)
shared   → shared only (no core, no features)
```

### Examples (Allowed)

- `features/settings/pages/SettingsPage.tsx` → `@/core/services/PreferencesCache`, `@/shared/components/Button`
- `core/app/App.tsx` → `@/features/home/pages/HomePage` (route composition), `@/shared/components/Button`
- `shared/components/Dialog.tsx` → `@/shared/utils/utils` (cn)

### Examples (Disallowed)

- `shared/components/EmptyState.tsx` → `@/core/services/MotionService` (shared must not depend on core)

## Violation Baseline (by Severity)

### Blocking (shared → core) — Resolved (Phase 6)

All shared components now receive motion/i18n via **props injection**. No shared→core imports remain:

| Component | Props for motion/i18n |
|-----------|----------------------|
| Accordion, EmptyState, FoxMascot, PageTransition, SummaryGrid, Tabs | `allowDecorativeAnimation`, `windowVisibility` (FoxMascot: `motionSettings`) |
| Calendar, PeriodPicker, SearchCombobox, Dialog, Sheet | `locale`, `labels`, `closeButtonAriaLabel`, `searchPlaceholder`, `noResultsLabel` |

### Warning (core → features deep coupling)

Acceptable for shell/router composition; prefer stable entry points:

| File | Imports | Note |
|------|---------|------|
| `core/app/App.tsx` | `HomePage`, prefetch from play/worklog, `WorklogMode` type | Route composition + prefetch |
| `core/layout/MainLayout.tsx` | `AboutDialog`, `ReleaseHighlightsDialog`, `getSetupStepPath` | Shell chrome |
| `core/layout/TrayLayout.tsx` | `TrayPanel` | Tray composition |
| `core/router/SetupRoutes.tsx` | setup pages, `schedule-form`, `prefetchPlaySnapshot` | Wizard routing |

### Acceptable (cross-feature)

Explicit, documented reuse via public surfaces:

| From | To | Note |
|------|----|------|
| `features/setup` | `features/settings/public` | Setup imports `GitLabAuthPanel`, `ProviderSyncCard`, schedule-form via public barrel |
| `core/router/SetupRoutes` | `features/settings/public` | Schedule form state/reducer for wizard |
| `features/home` | `features/play` (`play-snapshot-cache`) | Home shows play snapshot data |
| `features/worklog` | `features/onboarding` (`tourPayload` in tests) | Test fixture only |

## Measurable Thresholds

1. **File size**
   - Page/controller files: target max **400 lines** (split when approaching 600).
   - Component files: target max **300 lines**.
   - Hooks: target max **250 lines** (extract pure logic to utils).

2. **New cross-layer imports**
   - Any new `shared` → `core` import requires justification and a Phase 3 remediation plan.
   - New cross-feature imports must be documented and use a public module surface.

3. **Pure helpers**
   - Extract pure functions from React files when:
     - Reused in 2+ places, or
     - Complexity exceeds ~30 lines or multiple branches.

## Public Module Surfaces

- **`features/settings/public`** — `GitLabAuthPanel`, `ProviderSyncCard`, schedule-form exports. Setup and core should import from `@/features/settings/public`.
- **`features/play`** — `prefetchPlaySnapshot`, `resetPlaySnapshotCache` via `play-snapshot-cache`.
- **`features/worklog`** — `prefetchWorklogSnapshots`, `resetWorklogSnapshotCache` via hook; `WorklogMode` in `shared/types/dashboard`.

## Test Conventions (Post-Refactor)

- **Colocate** tests with components/hooks/utils: `Component.test.tsx`, `use-foo.test.ts`, `bar-utils.test.ts`.
- **Page-level** integration tests: smoke and critical cross-section flows; avoid duplicating section-level assertions.
- **Extracted modules** (utils, hooks): focused unit tests with explicit mocks; use `beforeEach` to reset module caches where applicable.
