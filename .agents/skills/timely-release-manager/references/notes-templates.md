# Release Notes Templates

Templates for GitHub release notes, matching the tone and structure of Timely's existing betas.

## Prerelease notes template

```md
## <Ordinal> prerelease
<One-sentence focus of this beta — what the main theme or biggest change is>

## What's new in this beta
- <bullet>
- <bullet>
- <bullet>

## What's improved in this beta
- <bullet>
- <bullet>

## Notable fixes
- <bullet>
- <bullet>

## Localized in-app update notes
- Updated in-app What's New content for English, Spanish, and Portuguese.
- Localization is adapted for each language, not literal translation.

## Beta notes
- This is a GitHub prerelease and publishes updater metadata to the `unstable` channel.
- Windows prerelease installers use NSIS for semver prerelease compatibility.
```

**Ordinal guidance:** "First prerelease", "Second prerelease", "Third prerelease", etc.

**Section usage notes:**
- "What's new in this beta" — always include; 3–5 bullets
- "What's improved in this beta" — include when there are meaningful UX/performance improvements (e.g., beta.3+); omit for lean betas
- "Notable fixes" — include when there are meaningful bug fixes; omit if none

## Stable release notes template

```md
## <Version> release
<One-sentence focus>

## Highlights
- <bullet>
- <bullet>
- <bullet>

## Improvements
- <2–5 bullets>

## Fixes
- <2–5 bullets>

## Upgrade notes
- This release publishes updater metadata to the `stable` channel.
- In-app What's New content is available in English, Spanish, and Portuguese.
```

## Tone guidelines

- Write notes from the user's perspective — focus on what they experience, not internal implementation details.
- Use active present tense: "Adds…", "Improves…", "Fixes…" (not "Added", "We added").
- Be specific: prefer "Sync now completes up to 3× faster for large worklog ranges" over "Improved sync performance".
- Avoid hedging language ("should", "might", "may help").
- Keep bullets to one sentence each. If a fix needs more context, add a brief parenthetical.

## Styling notes

Use the two-bullet closing block verbatim in all prereleases — it sets expectations for beta users about the updater channel and installer format. Do not rephrase it per-release.
