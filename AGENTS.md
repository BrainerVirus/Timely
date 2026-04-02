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
src/app/            →  App shell, router, layouts, providers, desktop bridge, boot flow, overlays, store access
src/domains/        →  Cross-feature domain modules (schedule, gitlab-connection, future reusable business modules)
src/features/       →  User-facing vertical slices (home, worklog, settings, setup, play, onboarding, tray)
src/shared/ui/      →  Generic design-system primitives only
src/shared/lib/     →  Generic pure helpers and style helpers only
src/shared/types/   →  Shared cross-cutting TypeScript interfaces
src/shared/testing/ →  Shared test-only fixtures and helpers
src/styles/         →  OKLCH theme tokens (globals.css)
src/test/fixtures/  →  Test-only mocks that are not shared runtime code
```

First-level folders inside `src/features/*` and `src/domains/*` are restricted to:
`screens`, `sections`, `ui`, `hooks`, `state`, `services`, `lib`, `types`, `internal`.

Forbidden under `src/`:
- `public/`
- `index.ts`
- `index.tsx`
- first-level `components/` or `utils/` folders inside features/domains

IPC bridge: `src/app/desktop/TauriService/tauri.ts` — all invoke calls, runtime guards, explicit errors.

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
4. TypeScript wrapper in `src/app/desktop/TauriService/tauri.ts` with `isTauri()` guard + explicit runtime errors for core data flows
5. Types in `src/shared/types/dashboard.ts` and `src-tauri/src/domain/models.rs`

## Runtime Data Policy

- `src/app/desktop/TauriService/tauri.ts` is the only shared IPC bridge for desktop-backed data.
- Core runtime data flows must never return mock, sample, or bootstrap-derived fallback payloads when a real load fails.
- Outside Tauri, core desktop commands should fail explicitly so the UI can render controlled `loading | ready | error` states.
- Test fixtures and mocks are allowed in tests only. Demo/sample payloads must stay in explicit test-only or demo-only paths, never in shared runtime code.
- Optional desktop-only helpers may be best-effort only when the feature is non-critical and the behavior is clearly documented.

## Conventions

**TypeScript**
- `@/` path alias maps to `src/`
- **File naming** (enforced by `unicorn/filename-case`): PascalCase for React component folders and files (`Button/Button.tsx`, `HomePage.tsx`); kebab-case for utilities and services (`control-styles.ts`, `use-format-hours.ts`)
- Lucide icons: direct ESM imports (`lucide-react/dist/esm/icons/clock.js`), never barrel imports
- Class composition: always use `cn()` from `@/shared/lib/utils`
- State: discriminated unions (`loading | ready | error`), never separate boolean flags
- Props over store access: only `src/app/*` route/layout/bootstrap code reads from `useAppStore`
- Prefer `src/domains/*` over `src/shared/*` when code is reusable but domain-specific
- Direct file imports only; never import folders or `index.ts`
- Colocate tests with the source unit using `Thing.tsx` + `Thing.test.tsx`
- Types stay close to ownership; only truly shared contracts belong in `src/shared/types/dashboard.ts`
- Handle runtime failures with explicit UI states or typed errors; never substitute fake data for failed desktop loads

**Rust**
- All models: `#[serde(rename_all = "camelCase")]`
- Errors: extend `AppError` in `error.rs` (thiserror + Serialize), no ad-hoc error types
- DB: parameterized queries only, additive migrations (`CREATE TABLE IF NOT EXISTS` + `ensure_column`)
- Blocking: use `run_blocking_with_timeout` from `services/shared.rs`

**Formatting:** oxfmt (100 chars, double quotes, trailing commas, 2-space indent, Tailwind sort) / rustfmt (100 chars, 4 spaces, field init shorthand, try shorthand)

**Commits:** conventional (`feat`, `fix`, `refactor`, `chore`), imperative mood, scope when relevant

**Changelog:** `CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) exactly. Only these section types: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`. No custom sections (e.g. `Tooling`). Each bullet describes the change in user-facing terms; avoid internal labels (e.g. "Phase 6") that add no meaning. Build and tooling changes belong under `Changed`.

**Release notes (GitHub + in-app highlights):** No internal labels. Ban: "Phase N", "refactor(s)", "readonly", "globalThis", "code-split", "boundary violation", "AGENTS.md", "FRONTEND_ARCHITECTURE". Every bullet must answer "What does the user see or experience?" Spanish and Portuguese must have first-class localization: zero English words (no scrollbar, setup, tray, build, release, updater, etc.); use proper equivalents. Run the failsafe checklist in `.agents/skills/timely-release-manager/references/notes-templates.md` before publishing.

**Localization (es/pt):** First-class support, not translation. When adding or editing Spanish (`es`) or Portuguese (`pt`) strings — in `src/app/providers/I18nService/i18n.tsx`, `src/app/bootstrap/ReleaseHighlights/release-highlights.ts`, or any user-facing copy — follow these rules. Load `.agents/skills/timely-release-manager/references/highlights-localization.md` for full guidance.

- **No English words in es/pt.** Ban loanwords: scrollbar, shell, setup, tray, build, release, updater, upgrade, workflow, App, tests. Use equivalents: `barra de desplazamiento` / `barra de rolagem`, `interfaz` / `interface`, `configuración` / `configuração`, `bandeja del sistema` / `bandeja do sistema`, `versión` / `versão`, `actualizador` / `atualizador`, `actualización` / `atualização`.
- **Adapt, don't translate.** Each locale reads as if written by a native speaker. Rephrase structure and idiom; never produce English with words swapped.
- **Product names:** "Timely" and "Worklog" stay; use "Registro de trabajo" / "Registro de trabalho" when a full localized phrase fits better.
- **pt = Brazilian Portuguese:** Prefer "você", "registro", "atualização"; avoid European Portuguese norms unless specified.
