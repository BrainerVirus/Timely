# Pulseboard

Local-first desktop time tracker syncing with GitLab. Tauri v2 (Rust) + React 19 (TypeScript). SQLite for storage. Read-only — never writes time entries back to GitLab.

## Stack

- **Frontend:** React 19, TanStack Router (memory history), Zustand, Tailwind CSS v4 (OKLCH tokens), CVA, Motion, Radix UI, Lucide icons, Sonner, driver.js
- **Backend:** Tauri v2, rusqlite (bundled SQLite), reqwest, chrono, serde, tokio, tiny-skia, thiserror
- **Tooling:** Vite 6, Vitest + testing-library, oxlint + oxfmt, cargo clippy + cargo fmt

## Commands

```bash
npm run tauri:dev         # Full dev (Rust + Vite on port 1420)
npm run dev               # Frontend only (mock data, no Rust)
npm run test              # Vitest
npm run lint && npm run lint:rs   # oxlint + clippy
npm run fmt               # oxfmt + cargo fmt
```

## Architecture

```
src/lib/tauri.ts    →  IPC bridge (all invoke calls, mock fallbacks for browser dev)
src/stores/         →  Single Zustand store, discriminated unions for lifecycle/sync state
src/app/            →  TanStack Router setup (memory history, lazy routes, view transitions)
src/components/ui/  →  Design system primitives (shadcn-style, CVA variants)
src/components/shared/ → Domain components (issue-card, metric-card, etc.)
src/features/       →  Vertical slices by domain (dashboard, worklog, setup, tray, etc.)
src/types/          →  All TypeScript interfaces (dashboard.ts)
src/styles/         →  OKLCH theme tokens (globals.css)

src-tauri/src/commands/   →  Thin Tauri command handlers (delegate to services)
src-tauri/src/services/   →  Business logic (sync, auth, dashboard, worklog)
src-tauri/src/db/         →  SQLite queries, schema, migrations
src-tauri/src/domain/     →  Rust models (serde camelCase for frontend compat)
src-tauri/src/providers/  →  GitLab API client
src-tauri/src/support/    →  Utilities (holidays, time, url)
```

`main.tsx` checks `?view=tray` to decide between the full app or the compact tray panel — both share one Vite bundle.

## Adding a new Tauri command

1. Service function in `src-tauri/src/services/`
2. Command wrapper in `src-tauri/src/commands/` (thin — just calls the service)
3. Register in `generate_handler![]` in `lib.rs`
4. TypeScript wrapper in `src/lib/tauri.ts` with `isTauri()` guard + mock fallback
5. Types in `src/types/dashboard.ts` and `src-tauri/src/domain/models.rs`

## Conventions

**TypeScript**
- `@/` path alias maps to `src/`
- Lucide icons: direct ESM imports (`lucide-react/dist/esm/icons/clock.js`), never barrel imports
- Class composition: always use `cn()` from `@/lib/utils` (clsx + tailwind-merge)
- State: discriminated unions (`loading | ready | error`), never separate boolean flags
- Props over store access: only route-level components read from `useAppStore`
- Types centralized in `src/types/dashboard.ts`

**Rust**
- All models: `#[serde(rename_all = "camelCase")]`
- Errors: extend `AppError` in `error.rs` (thiserror + Serialize), no ad-hoc error types
- DB: parameterized queries only, additive migrations (`CREATE TABLE IF NOT EXISTS` + `ensure_column`)
- Blocking: use `run_blocking_with_timeout` from `services/shared.rs`

**Formatting:** oxfmt (100 chars, double quotes, trailing commas, 2-space indent, Tailwind sort) / rustfmt (100 chars, 4 spaces, field init shorthand, try shorthand)

**Commits:** conventional (`feat`, `fix`, `refactor`, `chore`), imperative mood, scope when relevant
