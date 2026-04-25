import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "../../..");
const srcRoot = path.join(projectRoot, "src");

const allowedTopLevelDirs = new Set([
  "app",
  "bones",
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

function walk(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    results.push(fullPath);

    if (entry.isDirectory()) {
      results.push(...walk(fullPath));
    }
  }

  return results;
}

function getRelativePath(fullPath: string) {
  return path.relative(projectRoot, fullPath).replaceAll(path.sep, "/");
}

describe("frontend architecture", () => {
  it("uses only the approved src top-level directories", () => {
    const topLevelDirs = readdirSync(srcRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    expect(topLevelDirs).toEqual([...allowedTopLevelDirs].sort());
  });

  it("does not keep index barrels or public directories inside src", () => {
    const allEntries = walk(srcRoot);
    const violations = allEntries
      .map(getRelativePath)
      .filter(
        (entry) =>
          entry.endsWith("/index.ts") ||
          entry.endsWith("/index.tsx") ||
          entry.includes("/public/") ||
          entry.endsWith("/public"),
      )
      .sort();

    expect(violations).toEqual([]);
  });

  it("uses only approved first-level scoped folders inside features and domains", () => {
    const scopedRoots = [path.join(srcRoot, "features"), path.join(srcRoot, "domains")];
    const violations: string[] = [];

    for (const scopedRoot of scopedRoots) {
      if (!statSync(scopedRoot, { throwIfNoEntry: false })?.isDirectory()) {
        continue;
      }

      const modules = readdirSync(scopedRoot, { withFileTypes: true }).filter((entry) =>
        entry.isDirectory(),
      );

      for (const module of modules) {
        const modulePath = path.join(scopedRoot, module.name);
        const children = readdirSync(modulePath, { withFileTypes: true }).filter((entry) =>
          entry.isDirectory(),
        );

        for (const child of children) {
          if (!allowedScopedDirs.has(child.name)) {
            violations.push(getRelativePath(path.join(modulePath, child.name)));
          }
        }
      }
    }

    expect(violations.sort()).toEqual([]);
  });
});
