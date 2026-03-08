import type { BootstrapPayload } from "@/types/dashboard";

/**
 * Empty-state mock payload used in browser dev mode (outside Tauri).
 * Mirrors what the backend returns on a fresh DB with no provider accounts.
 */
export const mockBootstrap: BootstrapPayload = {
  appName: "Pulseboard",
  phase: "Fresh workspace",
  demoMode: true,
  profile: {
    alias: "Pilot",
    level: 1,
    xp: 0,
    streakDays: 0,
    companion: "Aurora fox",
  },
  providerStatus: [],
  schedule: {
    hoursPerDay: 8,
    workdays: "Mon - Tue - Wed - Thu - Fri",
    timezone: "UTC",
  },
  today: {
    shortLabel: "Sat",
    dateLabel: "Sat 07",
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
