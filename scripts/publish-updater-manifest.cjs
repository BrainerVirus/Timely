#!/usr/bin/env node

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function optionalEnv(name, fallback) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

function hasEnv(name) {
  const value = process.env[name];
  return Boolean(value && value.trim());
}

async function githubJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function ensureBranchExists({ owner, repo, branch, headers }) {
  const refUrl = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`;
  const currentRef = await fetch(refUrl, { headers });

  if (currentRef.ok) {
    return;
  }

  if (currentRef.status !== 404) {
    throw new Error(`Failed to query updater branch: ${currentRef.status} ${await currentRef.text()}`);
  }

  const repository = await githubJson(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  const defaultBranch = repository.default_branch;
  if (!defaultBranch) {
    throw new Error("Could not determine repository default branch");
  }

  const defaultRef = await githubJson(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
    { headers },
  );
  const sha = defaultRef?.object?.sha;
  if (!sha) {
    throw new Error(`Could not determine HEAD for default branch '${defaultBranch}'`);
  }

  await githubJson(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ref: `refs/heads/${branch}`,
      sha,
    }),
  });
}

async function downloadReleaseManifest({ owner, repo, releaseId, assetName, headers }) {
  const assets = await githubJson(
    `https://api.github.com/repos/${owner}/${repo}/releases/${releaseId}/assets?per_page=100`,
    { headers },
  );
  const asset = assets.find((candidate) => candidate.name === assetName);

  if (!asset) {
    const availableNames = assets.map((candidate) => candidate.name).join(", ");
    throw new Error(
      `Could not find release asset '${assetName}' on release ${releaseId}. Available assets: ${availableNames || "(none)"}`,
    );
  }

  const manifestResponse = await fetch(asset.url, {
    headers: {
      ...headers,
      Accept: "application/octet-stream",
    },
  });

  if (!manifestResponse.ok) {
    throw new Error(
      `Failed to download release asset '${assetName}': ${manifestResponse.status} ${await manifestResponse.text()}`,
    );
  }

  return manifestResponse.text();
}

async function main() {
  const channel = requireEnv("UPDATER_CHANNEL");
  const repository = requireEnv("GITHUB_REPOSITORY");
  const releaseId = requireEnv("GITHUB_RELEASE_ID");
  const token = requireEnv("GITHUB_TOKEN");
  const branch = optionalEnv("UPDATER_MANIFEST_BRANCH", "updater-manifests");
  const assetName = optionalEnv("UPDATER_ASSET_NAME", "latest.json");
  const dryRun = hasEnv("UPDATER_DRY_RUN");

  if (channel !== "stable" && channel !== "unstable") {
    throw new Error(`Unsupported updater channel: ${channel}`);
  }

  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY: ${repository}`);
  }

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "timely-updater-manifest-publisher",
  };

  const manifest = await downloadReleaseManifest({
    owner,
    repo,
    releaseId,
    assetName,
    headers,
  });
  JSON.parse(manifest);
  const targetPath = `${channel}/latest.json`;
  const baseUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${targetPath}`;

  if (dryRun) {
    process.stdout.write(
      `${JSON.stringify(
        {
          dryRun: true,
          repository,
          releaseId,
          assetName,
          branch,
          targetPath,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  await ensureBranchExists({ owner, repo, branch, headers });

  let sha;
  const current = await fetch(`${baseUrl}?ref=${branch}`, { headers });
  if (current.ok) {
    const payload = await current.json();
    sha = payload.sha;
  } else if (current.status !== 404) {
    throw new Error(`Failed to query updater manifest: ${current.status} ${await current.text()}`);
  }

  const response = await fetch(baseUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: `chore(release): publish ${channel} updater manifest`,
      content: Buffer.from(manifest, "utf8").toString("base64"),
      branch,
      sha,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to publish updater manifest: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  const downloadUrl = payload?.content?.download_url;
  if (downloadUrl) {
    process.stdout.write(`${downloadUrl}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
