---
name: frontend-architecture
description: Use when moving frontend files, creating React modules, refactoring UI, or deciding whether code belongs in app, domains, features, or shared.
---

# Frontend Architecture

Keep the frontend readable by enforcing structure, direct imports, and small files.

## Non-Negotiable Rules

- Never create `public/`, `index.ts`, or `index.tsx` anywhere under `src/`.
- Never create `components/` or `utils/` as first-level folders inside `src/features/*` or `src/domains/*`.
- Use only these first-level folders inside features/domains: `screens`, `sections`, `ui`, `hooks`, `state`, `services`, `lib`, `types`, `internal`.
- `shared` is only for generic code. If code knows about GitLab, schedule logic, worklog, settings, or another business concept, it does not belong in `shared`.
- Cross-feature reusable domain code belongs in `src/domains/*`.
- Route containers, app shell, global providers, desktop integration, and Zustand access belong in `src/app/*`.
- Prefer props over store access. Route/layout/bootstrap code may read `useAppStore`; feature and domain UI should receive data through props.
- Use direct file imports only.
- Colocate tests with the source file using `Thing.tsx` and `Thing.test.tsx`.

## Placement Guide

- `src/app/*`: router, layouts, boot flow, providers, desktop bridge, overlays, state.
- `src/domains/*`: reusable domain modules shared by multiple features or routes.
- `src/features/*`: user-facing flows that are owned by one feature.
- `src/shared/ui/*`: generic UI primitives.
- `src/shared/lib/*`: generic pure helpers.
- `src/shared/testing/*`: shared test-only helpers and fixtures.

## Size Discipline

- Split `screens/*.tsx` before they exceed 300 lines.
- Split `ui/*.tsx` before they exceed 220 lines.
- Split `hooks`, `state`, `services`, and `lib` files before they exceed 250 lines.
- Use `internal/` folders for private parts of a single unit when a file is getting crowded.

## Import Boundaries

- `shared` must not import from `app`, `domains`, or `features`.
- `domains` must not import from `features`.
- `features` must not import from other features.
- `internal/*` may only be imported by the owning unit.

## Workflow

1. Decide whether the code is app-level, domain-level, feature-level, or shared.
2. Put it in the smallest folder scope that still matches its reuse boundary.
3. Add or move the colocated test with the file.
4. Run `npm run lint` and `npm run build`.
