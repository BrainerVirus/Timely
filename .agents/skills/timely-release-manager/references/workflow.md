# Timely Release Workflow

Detailed step-by-step procedure for all release types (prerelease and stable).

## Step 1 — Inspect current state

```bash
git status
gh release list --limit 10
```

For notes style and recent wording, view the last two relevant releases:

```bash
gh release view <tag> --json name,tagName,body,isPrerelease,publishedAt
```

## Step 2 — Validate updater and highlights wiring

**Updater channel** (`src-tauri/src/commands/updates.rs`):
- Confirm `STABLE_UPDATE_ENDPOINT` and `UNSTABLE_UPDATE_ENDPOINT` are wired correctly.
- Prerelease must point to the `unstable` channel; stable must point to `stable`.
- Default channel logic lives in `src-tauri/src/services/preferences.rs` via `default_update_channel()` — reads `TIMELY_PRERELEASE` env var.

**Highlights lookup** (`src/lib/release-highlights.ts` + `src/app/App.tsx`):
- The lookup at `src/app/App.tsx` ~line 421 calls `getReleaseHighlights(buildInfo.appVersion, locale)`.
- Confirm the key for the new version (no `v` prefix) will be found after adding the entry.

Goal: the in-app What's New dialog will appear exactly once after upgrade, in the correct language.

## Step 3 — Bump version

Update the three hand-edited version files:

- `package.json` — `version` field + `dev:prerelease` / `tauri:dev:prerelease` scripts if relevant
- `src-tauri/Cargo.toml` — `version` field
- `src-tauri/tauri.conf.json` — `version` field

Then refresh the two generated lock files:

```bash
npm install --package-lock-only   # updates package-lock.json
cd src-tauri && cargo check       # updates Cargo.lock
```

See `references/version-files.md` for the full inventory of exactly which lines to change.

## Step 4 — Add localized in-app highlights

Add a new entry in `src/lib/release-highlights.ts` keyed by the bare version string (no `v`):

```ts
"1.2.3": {
  en: { title, badge, intro, bullets: ["...", "...", "..."], accent },
  es: { title, badge, intro, bullets: ["...", "...", "..."], accent },
  pt: { title, badge, intro, bullets: ["...", "...", "..."], accent },
},
```

Read `references/highlights-localization.md` for locale writing guidance.

## Step 5 — Update version-sensitive tests

Search for hardcoded version strings:

```bash
rg "<previous-version>" src/app/App.test.tsx
```

Update any expectations for release highlights titles and version labels to the new version.

## Step 6 — Run quality gates

```bash
npm run fmt:check
npm run lint && npm run lint:rs
npm run test && npm run test:rs
```

If format check fails, auto-fix and re-run:

```bash
npm run fmt
npm run lint && npm run lint:rs
npm run test && npm run test:rs
```

All gates must be green before committing or publishing.

## Step 7 — Commit release prep

Stage all release-prep files in one commit (unless the user requests split commits):

```bash
git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/Cargo.lock \
  src-tauri/tauri.conf.json src/lib/release-highlights.ts src/app/App.test.tsx
git commit -m "chore(release): prep v<version>"
```

## Step 8 — Publish (only when explicitly requested)

**Prerelease:**

```bash
git push origin main
gh release create v<version> --target main --title "v<version>" --prerelease --notes "..."
```

**Stable:**

```bash
git push origin main
gh release create v<version> --target main --title "v<version>" --notes "..."
```

For notes content, follow the templates in `references/notes-templates.md`.

## Step 9 — Post-publish verification

```bash
gh release view v<version> --json url,tagName,isPrerelease,publishedAt
```

Confirm:
- `tagName` matches the intended version
- `isPrerelease` matches release type (true for beta/rc, false for stable)
- `url` is valid and accessible

## Final response checklist

Always report back:
- Files changed (list them)
- Quality gate results (lint / test / fmt)
- Commit hash (if committed)
- Release URL and metadata (if published)
- Any follow-up action needed (if publish was skipped)
