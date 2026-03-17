# Timely

Local-first desktop time tracker that syncs with GitLab. Built with Tauri v2 (Rust) + React 19 (TypeScript). All data is stored locally in SQLite — the app is **read-only** and never writes time entries back to GitLab.

## Features

- **Dashboard** — Today / Week / Month views with logged hours, targets, and audit trail
- **Worklog** — Day, week, and month breakdowns with per-issue time entries
- **GitLab sync** — OAuth PKCE and PAT authentication; pulls projects, issues, and time entries
- **Auto-sync** — Configurable background polling (15 min – 4 h) with manual override
- **System tray** — Compact tray panel with progress ring and remaining hours display
- **Schedule** — Configurable shift hours, lunch break, workdays, and timezone
- **Holidays** — Country + region holiday calendar integrated into targets
- **Appearance** — System / light / dark theme; hours-and-minutes or decimal time format

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TanStack Router, Zustand, Tailwind CSS v4, Motion, Radix UI, Sonner |
| Backend | Tauri v2, Rust, rusqlite (SQLite), reqwest, tokio |
| Tooling | Vite 8, Vitest, oxlint, oxfmt, cargo clippy |

## Getting started

### Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) 20.19+ or 22.12+
- Tauri v2 system dependencies for your OS — see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/)

### Development

```bash
npm install
npm run tauri:dev        # Full app (Rust + Vite hot-reload on :1420)
npm run dev              # Frontend only with mock data (no Rust required)
```

### Tests & lint

```bash
npm run test             # Vitest
npm run lint             # oxlint (TypeScript)
npm run lint:rs          # cargo clippy (Rust)
npm run fmt              # oxfmt + cargo fmt
```

### Build

```bash
npm run tauri:build      # Production binary + installer
```

## Project structure

```
src/
  app/            TanStack Router, AppShell, route components
  features/       Vertical slices: home, worklog, settings, setup, tray, …
  components/ui/  Design system primitives (shadcn-style, CVA variants)
  stores/         Single Zustand store (discriminated union lifecycle)
  lib/tauri.ts    IPC bridge — all invoke() calls with mock fallbacks
  types/          Shared TypeScript interfaces (dashboard.ts)
  styles/         OKLCH design tokens (globals.css)

src-tauri/src/
  commands/       Thin Tauri command handlers
  services/       Business logic (sync, auth, preferences, worklog)
  db/             SQLite schema, migrations, queries
  domain/         Rust models (camelCase serde for frontend compat)
  providers/      GitLab API client
```

## License

MIT
