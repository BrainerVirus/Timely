import { getAutoTimezone } from "@/shared/utils/utils";

import type {
  BootstrapPayload,
  MotionPreference,
  ProviderConnection,
  SetupState,
  TimeFormat,
} from "@/shared/types/dashboard";

export interface StartupAppSnapshot {
  version: 1;
  payload: BootstrapPayload;
  connections: ProviderConnection[];
  setupState: SetupState;
  timeFormat: TimeFormat;
  motionPreference: MotionPreference;
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  onboardingCompleted: boolean;
}

export interface StartupAppSnapshotReadResult {
  snapshot: StartupAppSnapshot;
  hasCachedSnapshot: boolean;
}

export const STARTUP_APP_SNAPSHOT_STORAGE_KEY = "timely-startup-app-snapshot";

const STARTUP_APP_SNAPSHOT_VERSION = 1 as const;

function canUseLocalStorage(): boolean {
  return globalThis.window !== undefined && globalThis.localStorage !== undefined;
}

function normalizeSetupState(setupState: SetupState): SetupState {
  if (!setupState.isComplete) {
    return {
      currentStep: "welcome",
      isComplete: false,
      completedSteps: [],
    };
  }

  return setupState;
}

export function createDefaultStartupPayload(): BootstrapPayload {
  return {
    appName: "Timely",
    phase: "Fresh workspace",
    demoMode: true,
    lastSyncedAt: null,
    profile: {
      alias: "Pilot",
      level: 1,
      xp: 0,
      streakDays: 0,
      companion: "Aurora fox",
    },
    streak: {
      currentDays: 0,
      window: [],
    },
    providerStatus: [],
    schedule: {
      hoursPerDay: 8,
      workdays: "Mon - Tue - Wed - Thu - Fri",
      timezone: getAutoTimezone(),
      weekStart: "monday",
    },
    today: {
      date: "",
      shortLabel: "",
      dateLabel: "Today",
      isToday: true,
      loggedHours: 0,
      targetHours: 0,
      focusHours: 0,
      overflowHours: 0,
      status: "empty",
      topIssues: [],
    },
    week: [],
    month: {
      loggedHours: 0,
      targetHours: 0,
      consistencyScore: 0,
      cleanDays: 0,
      overflowDays: 0,
    },
    auditFlags: [],
    quests: [],
  };
}

export function createDefaultStartupAppSnapshot(): StartupAppSnapshot {
  return {
    version: STARTUP_APP_SNAPSHOT_VERSION,
    payload: createDefaultStartupPayload(),
    connections: [],
    setupState: {
      currentStep: "welcome",
      isComplete: false,
      completedSteps: [],
    },
    timeFormat: "hm",
    motionPreference: "system",
    autoSyncEnabled: true,
    autoSyncIntervalMinutes: 30,
    onboardingCompleted: false,
  };
}

function isValidSetupState(value: unknown): value is SetupState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const setupState = value as SetupState;
  return (
    typeof setupState.currentStep === "string" &&
    typeof setupState.isComplete === "boolean" &&
    Array.isArray(setupState.completedSteps)
  );
}

function isValidBootstrapPayload(value: unknown): value is BootstrapPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as BootstrapPayload;
  return (
    typeof payload.appName === "string" &&
    typeof payload.phase === "string" &&
    payload.profile != null &&
    payload.schedule != null &&
    payload.today != null &&
    Array.isArray(payload.week) &&
    payload.month != null &&
    Array.isArray(payload.auditFlags) &&
    Array.isArray(payload.quests)
  );
}

function isValidStartupAppSnapshot(value: unknown): value is StartupAppSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as StartupAppSnapshot;

  return (
    snapshot.version === STARTUP_APP_SNAPSHOT_VERSION &&
    isValidBootstrapPayload(snapshot.payload) &&
    Array.isArray(snapshot.connections) &&
    isValidSetupState(snapshot.setupState) &&
    (snapshot.timeFormat === "hm" || snapshot.timeFormat === "decimal") &&
    (snapshot.motionPreference === "system" ||
      snapshot.motionPreference === "reduced" ||
      snapshot.motionPreference === "full") &&
    typeof snapshot.autoSyncEnabled === "boolean" &&
    typeof snapshot.autoSyncIntervalMinutes === "number" &&
    typeof snapshot.onboardingCompleted === "boolean"
  );
}

export function readStartupAppSnapshot(): StartupAppSnapshotReadResult {
  if (!canUseLocalStorage()) {
    return { snapshot: createDefaultStartupAppSnapshot(), hasCachedSnapshot: false };
  }

  try {
    const raw = globalThis.localStorage.getItem(STARTUP_APP_SNAPSHOT_STORAGE_KEY);
    if (!raw) {
      return { snapshot: createDefaultStartupAppSnapshot(), hasCachedSnapshot: false };
    }

    const parsed = JSON.parse(raw);
    if (!isValidStartupAppSnapshot(parsed)) {
      return { snapshot: createDefaultStartupAppSnapshot(), hasCachedSnapshot: false };
    }

    return {
      snapshot: {
        ...parsed,
        setupState: normalizeSetupState(parsed.setupState),
      },
      hasCachedSnapshot: true,
    };
  } catch {
    return { snapshot: createDefaultStartupAppSnapshot(), hasCachedSnapshot: false };
  }
}

export function writeStartupAppSnapshot(snapshot: StartupAppSnapshot): void {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    globalThis.localStorage.setItem(
      STARTUP_APP_SNAPSHOT_STORAGE_KEY,
      JSON.stringify({
        ...snapshot,
        setupState: normalizeSetupState(snapshot.setupState),
      }),
    );
  } catch {
    // best effort only
  }
}

export function clearStartupAppSnapshot(): void {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    globalThis.localStorage.removeItem(STARTUP_APP_SNAPSHOT_STORAGE_KEY);
  } catch {
    // best effort only
  }
}
