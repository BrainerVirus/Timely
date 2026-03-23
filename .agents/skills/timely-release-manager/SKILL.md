---
name: timely-release-manager
description: "Use this whenever the user asks to prepare, verify, or publish a Timely release or prerelease, bump versions, generate GitHub release notes, validate updater channels, or update localized in-app What's New notes. Trigger on release, prerelease, beta, tag, changelog, updater manifest, gh release, publish, cut release, and ship build requests."
---

# Timely Release Manager

Orchestrates Timely's release and prerelease workflow: version sync, localized highlights, updater channel validation, quality gates, commit, and GitHub publish.

## Reference files

Load these as needed — they contain the detail; this file is the map.

| File | Load when |
|------|-----------|
| `references/workflow.md` | Starting any release task — contains the full 9-step procedure |
| `references/version-files.md` | Bumping versions — exact files, fields, and lock-refresh commands |
| `references/notes-templates.md` | Writing GitHub release notes — prerelease and stable templates |
| `references/highlights-localization.md` | Writing `es`/`pt` in-app highlights copy |

## Release invariants

Enforce these on every release, regardless of type:

1. Version is synchronized across all 5 files (see `version-files.md`).
2. Highlights key = bare version string with no `v` prefix.
3. Highlights include all three locales: `en`, `es`, `pt`.
4. Locale copy is adapted, not literally translated (see `highlights-localization.md`).
5. Updater channel matches release type: prerelease → `unstable`, stable → `stable`.
6. All quality gates pass before commit or publish.

## Input defaults

When the user doesn't specify:

- `release_type`: infer from version suffix (`-beta`, `-rc`, no suffix = stable)
- `publish_now`: `false` unless the user explicitly asks to publish
- Notes style: match the last two same-type releases (`gh release list --limit 10`)

## Workflow summary

Read `references/workflow.md` for the full procedure. The 9 steps at a glance:

1. Inspect current state (git + recent releases)
2. Validate updater channel and highlights wiring
3. Bump version across all 5 files
4. Add/update localized in-app highlights
5. Update version-sensitive tests
6. Run quality gates (fmt / lint / test for JS + Rust)
7. Commit with `chore(release): prep v<version>`
8. Publish via `gh release create` (only when explicitly requested)
9. Post-publish verification

## Key source files

```
package.json                              version + prerelease dev scripts
package-lock.json                         auto-regenerated via npm install --package-lock-only
src-tauri/Cargo.toml                      Rust package version
src-tauri/Cargo.lock                      auto-regenerated via cargo check
src-tauri/tauri.conf.json                 Tauri bundle version
src/lib/release-highlights.ts            in-app What's New content (all locales)
src/app/App.tsx                           reads highlights at ~line 421
src/app/App.test.tsx                      contains hardcoded version strings to update
src-tauri/src/commands/updates.rs        updater endpoint constants
src-tauri/src/services/preferences.rs   default_update_channel() logic
```
