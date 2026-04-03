#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, "src");

const allowedTopLevelDirs = new Set([
  "app",
  "domains",
  "entry",
  "features",
  "shared",
  "styles",
  "test",
]);

const allowedScopedDirs = new Set([
  "hooks",
  "internal",
  "lib",
  "screens",
  "sections",
  "services",
  "state",
  "types",
  "ui",
]);

const maxLinesByBucket = new Map([
  ["screens", 300],
  ["ui", 220],
  ["hooks", 250],
  ["state", 250],
  ["services", 250],
  ["lib", 250],
]);

const lineLimitAllowlist = new Set([
  "src/app/providers/I18nService/i18n.tsx",
  "src/app/root/App/App.tsx",
  "src/app/state/AppStore/app-store.ts",
  "src/domains/gitlab-connection/ui/GitLabAuthPanel/GitLabAuthPanel.tsx",
  "src/domains/gitlab-connection/ui/ProviderSyncCard/ProviderSyncCard.tsx",
  "src/domains/schedule/ui/ScheduleWorkspace/ScheduleWorkspaceCanvas.tsx",
  "src/domains/schedule/ui/WeekdayScheduleEditor/WeekdayScheduleEditor.tsx",
  "src/features/home/screens/HomePage/HomePage.tsx",
  "src/features/onboarding/screens/OnboardingFlow/OnboardingFlow.tsx",
  "src/shared/lib/timezone-country-map/timezone-country-map.ts",
  "src/shared/ui/Calendar/Calendar.tsx",
  "src/shared/ui/FoxMascot/FoxMascot.tsx",
]);

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    results.push(fullPath);

    if (entry.isDirectory()) {
      results.push(...walk(fullPath));
    }
  }

  return results;
}

function readTopLevelDirectories() {
  return fs
    .readdirSync(srcRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function getScopedViolations(scopedRoot) {
  if (!fs.existsSync(scopedRoot)) {
    return [];
  }

  const modules = fs.readdirSync(scopedRoot, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory(),
  );
  const violations = [];

  for (const module of modules) {
    const modulePath = path.join(scopedRoot, module.name);
    const children = fs.readdirSync(modulePath, { withFileTypes: true }).filter((entry) =>
      entry.isDirectory(),
    );

    for (const child of children) {
      if (!allowedScopedDirs.has(child.name)) {
        violations.push(toPosix(path.relative(projectRoot, path.join(modulePath, child.name))));
      }
    }
  }

  return violations.sort();
}

function validateLeafTests(allEntries) {
  const violations = [];
  const sourceFiles = allEntries.filter((entry) => /\.(ts|tsx)$/.test(entry));
  const testAllowlist = new Set([
    "src/app/providers/I18nService/i18n.tsx",
    "src/domains/schedule/ui/ScheduleEditorFields/ScheduleDayStatusToggle.tsx",
    "src/domains/schedule/ui/ScheduleEditorFields/ScheduleLunchField.tsx",
    "src/domains/schedule/ui/ScheduleEditorFields/ScheduleNetHoursField.tsx",
    "src/domains/schedule/ui/ScheduleEditorFields/ScheduleTimeField.tsx",
    "src/domains/schedule/ui/ScheduleWorkspace/ScheduleTickLine.tsx",
    "src/domains/schedule/ui/ScheduleWorkspace/ScheduleWorkspaceCanvas.tsx",
    "src/domains/schedule/ui/ScheduleWorkspace/ScheduleWorkspaceEditor.tsx",
    "src/features/settings/sections/SettingsAboutSection/SettingsAboutSection.tsx",
    "src/features/settings/sections/SettingsAccessibilitySection/SettingsAccessibilitySection.tsx",
    "src/features/settings/sections/SettingsAppearanceSection/SettingsAppearanceSection.tsx",
    "src/features/settings/sections/SettingsCalendarSection/SettingsCalendarSection.tsx",
    "src/features/settings/sections/SettingsConnectionSection/SettingsConnectionSection.tsx",
    "src/features/settings/sections/SettingsDataManagementSection/SettingsDataManagementSection.tsx",
    "src/features/settings/sections/SettingsNotificationsSection/SettingsNotificationsSection.tsx",
    "src/features/settings/sections/SettingsSyncSection/SettingsSyncSection.tsx",
    "src/features/settings/sections/SettingsUpdatesSection/SettingsUpdatesSection.tsx",
    "src/features/settings/sections/SettingsWindowBehaviorSection/SettingsWindowBehaviorSection.tsx",
    "src/shared/types/dashboard.ts",
    "src/shared/types/lucide-direct-imports.d.ts",
    "src/vite-env.d.ts",
  ]);

  for (const filePath of sourceFiles) {
    const relativePath = toPosix(path.relative(projectRoot, filePath));
    if (
      relativePath.endsWith(".test.ts") ||
      relativePath.endsWith(".test.tsx") ||
      relativePath.endsWith(".d.ts") ||
      relativePath.includes("/test/") ||
      relativePath.includes("/testing/")
    ) {
      continue;
    }

    const scope = relativePath.split("/")[1];
    if (!["app", "domains", "features", "shared"].includes(scope)) {
      continue;
    }

    if (!relativePath.endsWith(".tsx") || testAllowlist.has(relativePath)) {
      continue;
    }

    const extension = path.extname(filePath);
    const testPath = filePath.replace(extension, `.test${extension}`);
    if (!fs.existsSync(testPath)) {
      violations.push(relativePath);
    }
  }

  return violations;
}

function validateLineLimits(allEntries) {
  const violations = [];

  for (const filePath of allEntries) {
    if (!/\.(ts|tsx)$/.test(filePath)) {
      continue;
    }

    const relativePath = toPosix(path.relative(projectRoot, filePath));
    if (relativePath.includes(".test.")) {
      continue;
    }
    if (lineLimitAllowlist.has(relativePath)) {
      continue;
    }

    const bucket = relativePath.split("/").find((segment) => maxLinesByBucket.has(segment));
    const maxLines = maxLinesByBucket.get(bucket);
    if (maxLines == null) {
      continue;
    }

    const lineCount = fs.readFileSync(filePath, "utf8").split("\n").length;
    if (lineCount > maxLines) {
      violations.push(`${relativePath} (${lineCount} > ${maxLines})`);
    }
  }

  return violations.sort();
}

function main() {
  const allEntries = walk(srcRoot);
  const topLevelDirs = readTopLevelDirectories();
  const violations = [];

  if (JSON.stringify(topLevelDirs) !== JSON.stringify([...allowedTopLevelDirs].sort())) {
    violations.push(
      `Unexpected src directories: ${topLevelDirs.join(", ")} (expected ${[...allowedTopLevelDirs]
        .sort()
        .join(", ")})`,
    );
  }

  const pathViolations = allEntries
    .map((entry) => toPosix(path.relative(projectRoot, entry)))
    .filter(
      (entry) =>
        entry.endsWith("/index.ts") ||
        entry.endsWith("/index.tsx") ||
        entry.includes("/public/") ||
        entry.endsWith("/public"),
    )
    .sort();

  for (const violation of pathViolations) {
    violations.push(`Forbidden public/barrel path: ${violation}`);
  }

  for (const violation of getScopedViolations(path.join(srcRoot, "features"))) {
    violations.push(`Forbidden feature subdirectory: ${violation}`);
  }

  for (const violation of getScopedViolations(path.join(srcRoot, "domains"))) {
    violations.push(`Forbidden domain subdirectory: ${violation}`);
  }

  for (const violation of validateLeafTests(allEntries)) {
    violations.push(`Missing colocated test: ${violation}`);
  }

  for (const violation of validateLineLimits(allEntries)) {
    violations.push(`File exceeds architecture line limit: ${violation}`);
  }

  if (violations.length > 0) {
    console.error("Frontend architecture check failed:\n");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log("Frontend architecture check passed.");
}

main();
