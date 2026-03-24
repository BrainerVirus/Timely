# Timely

Local-first desktop time tracker syncing with GitLab. Tauri v2 (Rust) + React 19 (TypeScript). SQLite for storage. Read-only — never writes time entries back to GitLab.

## Stack

- **Frontend:** React 19, TanStack Router (memory history), Zustand, Tailwind CSS v4 (OKLCH tokens), CVA, Motion, Radix UI, Lucide icons, Sonner, driver.js
- **Backend:** Tauri v2, rusqlite (bundled SQLite), reqwest, chrono, serde, tokio, tiny-skia, thiserror
- **Tooling:** Vite 8, Vitest + testing-library, oxlint + oxfmt, cargo test + cargo clippy + cargo fmt

## Commands

```bash
npm run tauri:dev         # Full dev (Rust + Vite on port 1420)
npm run dev               # Frontend shell only; Tauri-backed data requires `npm run tauri:dev`
npm run test              # Vitest
npm run test:rs           # cargo test
npm run lint && npm run lint:rs   # oxlint + clippy
npm run fmt               # oxfmt + cargo fmt
```

## Architecture

```
src/core/           →  Application kernel (app shell, store, services, layouts)
src/core/app/       →  TanStack Router setup (memory history, lazy routes, view transitions)
src/core/layout/    →  Shell layouts (MainLayout, SetupLayout, TrayLayout)
src/core/services/  →  Tauri IPC, i18n, motion, preferences, boot timing, etc.
src/core/stores/    →  Single Zustand store, discriminated unions for lifecycle/sync state
src/shared/         →  Design system primitives, hooks, utils, types (no domain logic)
src/shared/components/  →  UI components (Button, Input, Dialog, etc.)
src/shared/types/   →  All TypeScript interfaces (dashboard.ts)
src/features/       →  Vertical slices by domain (home, worklog, settings, setup, play, onboarding, tray)
src/styles/         →  OKLCH theme tokens (globals.css)
src/test/fixtures/  →  Test-only mocks (mockBootstrap, etc.)
```

IPC bridge: `src/core/services/TauriService/tauri.ts` — all invoke calls, runtime guards, explicit errors.

```
src-tauri/src/commands/   →  Thin Tauri command handlers (delegate to services)
src-tauri/src/services/   →  Business logic (sync, auth, dashboard, worklog)
src-tauri/src/db/         →  SQLite queries, schema, migrations
src-tauri/src/domain/     →  Rust models (serde camelCase for frontend compat)
src-tauri/src/providers/  →  GitLab API client
src-tauri/src/support/    →  Utilities (holidays, time, url)
```

The app uses split entrypoints: `app.html` + `src/entry/app-entry/app-entry.tsx` for main UI and `tray.html` + `src/entry/tray-entrypoint/tray-entrypoint.tsx` for the compact tray panel.

## Adding a new Tauri command

1. Service function in `src-tauri/src/services/`
2. Command wrapper in `src-tauri/src/commands/` (thin — just calls the service)
3. Register in `generate_handler![]` in `lib.rs`
4. TypeScript wrapper in `src/core/services/TauriService/tauri.ts` with `isTauri()` guard + explicit runtime errors for core data flows
5. Types in `src/shared/types/dashboard.ts` and `src-tauri/src/domain/models.rs`

## Runtime Data Policy

- `src/core/services/TauriService/tauri.ts` is the only shared IPC bridge for desktop-backed data.
- Core runtime data flows must never return mock, sample, or bootstrap-derived fallback payloads when a real load fails.
- Outside Tauri, core desktop commands should fail explicitly so the UI can render controlled `loading | ready | error` states.
- Test fixtures and mocks are allowed in tests only. Demo/sample payloads must stay in explicit test-only or demo-only paths, never in shared runtime code.
- Optional desktop-only helpers may be best-effort only when the feature is non-critical and the behavior is clearly documented.

## Conventions

**TypeScript**
- `@/` path alias maps to `src/`
- **File naming** (enforced by `unicorn/filename-case`): PascalCase for React component folders and files (`Button/Button.tsx`, `HomePage.tsx`); kebab-case for utilities and services (`control-styles.ts`, `use-format-hours.ts`)
- Lucide icons: direct ESM imports (`lucide-react/dist/esm/icons/clock.js`), never barrel imports
- Class composition: always use `cn()` from `@/shared/utils/utils` (clsx + tailwind-merge)
- State: discriminated unions (`loading | ready | error`), never separate boolean flags
- Props over store access: only route-level components read from `useAppStore`
- Types centralized in `src/shared/types/dashboard.ts`
- Handle runtime failures with explicit UI states or typed errors; never substitute fake data for failed desktop loads

**Rust**
- All models: `#[serde(rename_all = "camelCase")]`
- Errors: extend `AppError` in `error.rs` (thiserror + Serialize), no ad-hoc error types
- DB: parameterized queries only, additive migrations (`CREATE TABLE IF NOT EXISTS` + `ensure_column`)
- Blocking: use `run_blocking_with_timeout` from `services/shared.rs`

**Formatting:** oxfmt (100 chars, double quotes, trailing commas, 2-space indent, Tailwind sort) / rustfmt (100 chars, 4 spaces, field init shorthand, try shorthand)

**Commits:** conventional (`feat`, `fix`, `refactor`, `chore`), imperative mood, scope when relevant
