import { getAutoTimezone } from "@/shared/utils/utils";

import type { BootstrapPayload } from "@/shared/types/dashboard";

/**
 * Empty-state mock payload used in tests (and browser dev mode outside Tauri).
 * Mirrors what the backend returns on a fresh DB with no provider accounts.
 */
export const mockBootstrap: BootstrapPayload = {
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
    weekdaySchedules: [
      { day: "Sun", enabled: false, shiftStart: "09:00", shiftEnd: "18:00", lunchMinutes: 60 },
      { day: "Mon", enabled: true, shiftStart: "09:00", shiftEnd: "18:00", lunchMinutes: 60 },
      { day: "Tue", enabled: true, shiftStart: "09:00", shiftEnd: "18:00", lunchMinutes: 60 },
      { day: "Wed", enabled: true, shiftStart: "09:00", shiftEnd: "18:00", lunchMinutes: 60 },
      { day: "Thu", enabled: true, shiftStart: "09:00", shiftEnd: "18:00", lunchMinutes: 60 },
      { day: "Fri", enabled: true, shiftStart: "09:00", shiftEnd: "18:00", lunchMinutes: 60 },
      { day: "Sat", enabled: false, shiftStart: "09:00", shiftEnd: "18:00", lunchMinutes: 60 },
    ],
  },
  today: {
    date: "2026-03-07",
    shortLabel: "Sat",
    dateLabel: "Sat 07",
    isToday: true,
    holidayName: undefined,
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
