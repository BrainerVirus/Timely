import packageJson from "../../package.json";

import type { AppUpdateChannel } from "@/types/dashboard";

export type AppLogLevel = "off" | "error" | "info" | "debug";

function isNonEmptyString(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/, "");
}

function parseFeatureFlag(value: string | undefined): boolean | null {
  if (!isNonEmptyString(value)) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on", "enabled"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off", "disabled"].includes(normalized)) {
    return false;
  }

  return null;
}

function resolveFeatureFlag(value: string | undefined, fallback: boolean): boolean {
  return parseFeatureFlag(value) ?? fallback;
}

function parseLogLevel(value: string | undefined): AppLogLevel | null {
  if (!isNonEmptyString(value)) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "off") return "off";
  if (normalized === "error") return "error";
  if (normalized === "info") return "info";
  if (normalized === "debug") return "debug";
  return null;
}

export function isPrereleaseVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+-[0-9A-Za-z][0-9A-Za-z.-]*$/.test(version);
}

const appVersion = normalizeVersion(
  isNonEmptyString(import.meta.env.VITE_APP_VERSION)
    ? import.meta.env.VITE_APP_VERSION
    : packageJson.version,
);
const prerelease = isPrereleaseVersion(appVersion);
const defaultUpdateChannel: AppUpdateChannel = prerelease ? "unstable" : "stable";
const defaultLogLevel: AppLogLevel = import.meta.env.DEV ? "info" : "off";

export const buildInfo = {
  appVersion,
  isPrerelease: prerelease,
  defaultUpdateChannel,
  logLevel: parseLogLevel(import.meta.env.VITE_LOG_LEVEL) ?? defaultLogLevel,
  playEnabled: resolveFeatureFlag(
    import.meta.env.VITE_FEATURE_PLAY,
    import.meta.env.DEV || prerelease,
  ),
  onboardingTourEnabled: resolveFeatureFlag(
    import.meta.env.VITE_FEATURE_ONBOARDING_TOUR,
    import.meta.env.DEV || prerelease,
  ),
  prereleaseLabel: prerelease ? appVersion : null,
};
