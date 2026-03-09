# Release Process

This repository uses CI for quality checks on every `main` push and PR, and only builds installers when a GitHub Release is published.

## Current CI behavior

Workflow: `.github/workflows/ci-release.yml`

- On `push` to `main`: runs `lint`, `test`, and Rust lint (`clippy`)
- On `pull_request` to `main`: runs the same quality checks
- On `release` (`published`):
  - runs quality checks
  - if checks pass, builds installers for:
    - macOS
    - Windows
    - Linux
  - uploads artifacts to the GitHub Release

## Maintainer flow (direct pushes to `main`)

1. Push changes to `main`.
2. Wait for CI quality checks to pass.
3. When ready to ship, create and publish a release tag.
4. GitHub Actions will build and attach installers automatically.

## Create a release

### Option A: GitHub UI

1. Open repository on GitHub.
2. Go to `Releases`.
3. Click `Draft a new release`.
4. Create a new tag (for example `v0.2.0`).
5. Add title and release notes.
6. Click `Publish release`.

### Option B: GitHub CLI

```bash
gh release create v0.2.0 --generate-notes
```

## Notes about enforcement

- With direct pushes to `main`, checks cannot block the push before code lands.
- Checks still run immediately after push and are required for release builds.
- If you later want pre-merge enforcement, use PRs with branch protection rules.
