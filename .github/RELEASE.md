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
5. The workflow will also publish a channel-specific updater manifest to the `updater-manifests` branch:
   - stable releases update `stable/latest.json`
   - prereleases update `unstable/latest.json`
6. The manifest publisher downloads the `latest.json` release asset from the published GitHub Release instead of assuming a local build path, so CI stays aligned with `tauri-action` output.

## Create a release

### Option A: GitHub UI

1. Open repository on GitHub.
2. Go to `Releases`.
3. Click `Draft a new release`.
4. Create a new tag (for example `v0.1.0`).
5. Add title and release notes.
6. Click `Publish release`.

### Option B: GitHub CLI

```bash
gh release create v0.1.0 --generate-notes
```

## Notes about enforcement

- With direct pushes to `main`, checks cannot block the push before code lands.
- Checks still run immediately after push and are required for release builds.
- If you later want pre-merge enforcement, use PRs with branch protection rules.

## Updater channels

- Timely now supports two updater channels in Settings:
  - `stable`
  - `unstable`
- The selected channel is stored locally in app preferences.
- The updater never falls back silently between channels.
- Stable releases must be published as normal GitHub releases.
- Unstable releases must be published as GitHub prereleases.

## Required release secrets

The updater signing key must be configured in GitHub Actions secrets:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (optional if your key has no password)

Do not commit the private key. Only the public key belongs in `src-tauri/tauri.conf.json`.

### How to create the signing key

Generate the updater keypair once on your machine:

```bash
npm run tauri signer generate -- -w ~/.tauri/timely-updater.key
```

That creates:

- private key: `~/.tauri/timely-updater.key`
- public key: `~/.tauri/timely-updater.key.pub`

The public key is the one already embedded in `src-tauri/tauri.conf.json`.

### Where to put the secrets so CI can use them

Do not put the private key anywhere in the repo.

In GitHub:

1. Open the repository.
2. Go to `Settings` -> `Secrets and variables` -> `Actions`.
3. Add a new repository secret named `TAURI_SIGNING_PRIVATE_KEY`.
4. Paste either:
   - the full private key file contents, or
   - an absolute path on the runner only if you manage your own self-hosted runner.

For GitHub-hosted runners, use the full private key contents.

5. If the key has a password, add another repository secret named `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
6. If the key has no password, you can leave `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` unset.

The workflow already reads those secrets via:

- `secrets.TAURI_SIGNING_PRIVATE_KEY`
- `secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

so once the secrets are added in GitHub Actions settings, CI will pick them up automatically on release builds.

### Updater JSON note

The workflow uses `tauri-apps/tauri-action@v0`, whose supported input is `includeUpdaterJson`, not `uploadUpdaterJson`.

### Optional dry run for the manifest publisher

You can sanity-check the manifest publishing script without writing to GitHub:

```bash
UPDATER_DRY_RUN=1 \
GITHUB_TOKEN=placeholder \
GITHUB_REPOSITORY=OWNER/REPO \
GITHUB_RELEASE_ID=123456789 \
UPDATER_CHANNEL=stable \
node scripts/publish-updater-manifest.cjs
```

That mode still fetches the release asset and validates the JSON, but stops before creating or updating `updater-manifests`.
