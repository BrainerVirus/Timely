export type DayStatus =
  | "empty"
  | "under_target"
  | "on_track"
  | "met_target"
  | "over_target"
  | "non_workday";

export interface IssueBreakdown {
  key: string;
  title: string;
  hours: number;
  tone: "emerald" | "amber" | "cyan" | "rose" | "violet";
}

export interface DayOverview {
  date: string;
  shortLabel: string;
  dateLabel: string;
  isToday: boolean;
  holidayName?: string;
  loggedHours: number;
  targetHours: number;
  focusHours: number;
  overflowHours: number;
  status: DayStatus;
  topIssues: IssueBreakdown[];
}

export interface ProviderStatus {
  name: string;
  state: "live" | "beta" | "planned";
  host: string;
  authMode: string;
  note: string;
}

export interface Quest {
  title: string;
  progress: number;
  total: number;
  reward: string;
}

export interface AuditFlag {
  title: string;
  severity: "high" | "medium" | "low";
  detail: string;
}

export interface ScheduleSnapshot {
  hoursPerDay: number;
  shiftStart?: string;
  shiftEnd?: string;
  lunchMinutes?: number;
  workdays: string;
  timezone: string;
  weekStart?: string;
}

export interface MonthSnapshot {
  loggedHours: number;
  targetHours: number;
  consistencyScore: number;
  cleanDays: number;
  overflowDays: number;
}

export interface ProfileSnapshot {
  alias: string;
  level: number;
  xp: number;
  streakDays: number;
  companion: string;
}

export interface BootstrapPayload {
  appName: string;
  phase: string;
  demoMode: boolean;
  profile: ProfileSnapshot;
  providerStatus: ProviderStatus[];
  schedule: ScheduleSnapshot;
  today: DayOverview;
  week: DayOverview[];
  month: MonthSnapshot;
  auditFlags: AuditFlag[];
  quests: Quest[];
}

export interface ProviderConnection {
  id: number;
  provider: string;
  displayName: string;
  host: string;
  username?: string;
  clientId?: string;
  hasToken: boolean;
  state: "live" | "beta" | "planned";
  authMode: string;
  preferredScope: string;
  statusNote: string;
  oauthReady: boolean;
  isPrimary: boolean;
}

/** Whether a single connection has usable credentials (PAT or OAuth). */
export function isConnectionActive(c: ProviderConnection): boolean {
  return c.hasToken || Boolean(c.clientId);
}

/** Whether any connection in the array has usable credentials. */
export function hasActiveConnection(connections: ProviderConnection[]): boolean {
  return connections.some(isConnectionActive);
}

/** Find the primary connection (or first available). */
export function findPrimaryConnection(connections: ProviderConnection[]): ProviderConnection | undefined {
  return connections.find((c) => c.isPrimary) ?? connections[0];
}

export interface GitLabConnectionInput {
  host: string;
  authMode: string;
  preferredScope: string;
  displayName?: string;
  clientId?: string;
}

export interface AuthLaunchPlan {
  provider: string;
  sessionId: string;
  authorizeUrl: string;
  redirectStrategy: string;
  message: string;
  scope: string;
  state: string;
  callbackScheme: string;
}

export interface OAuthCallbackPayload {
  sessionId: string;
  callbackUrl: string;
}

export interface OAuthCallbackResolution {
  provider: string;
  host: string;
  code: string;
  state: string;
  redirectUri: string;
  codeVerifier: string;
  sessionId: string;
}

export interface GitLabUserInfo {
  username: string;
  name: string;
  avatarUrl?: string;
}

export interface SyncResult {
  projectsSynced: number;
  entriesSynced: number;
  issuesSynced: number;
}

export type SyncState =
  | { status: "idle"; log: string[] }
  | { status: "syncing"; log: string[] }
  | { status: "done"; result: SyncResult; log: string[] }
  | { status: "error"; error: string; log: string[] };

export interface ScheduleInput {
  shiftStart?: string;
  shiftEnd?: string;
  lunchMinutes?: number;
  workdays: string[];
  timezone: string;
  weekStart?: string;
}

export interface ScheduleRule {
  ruleType: string;
  ruleValue: string;
}

export interface SetupState {
  currentStep: "welcome" | "provider" | "schedule" | "sync" | "done";
  isComplete: boolean;
  completedSteps: Array<"welcome" | "provider" | "schedule" | "sync" | "done">;
}

export type TimeFormat = "hm" | "decimal";

export type HolidayCountryMode = "auto" | "manual";

export interface AppPreferences {
  themeMode: "system" | "light" | "dark";
  language: string;
  holidayCountryMode: HolidayCountryMode;
  holidayCountryCode?: string;
  timeFormat: TimeFormat;
  autoSyncEnabled: boolean;
  /** Interval in minutes (15, 30, 60, 120, 240) */
  autoSyncIntervalMinutes: number;
}

export interface GamificationQuestSummary {
  questKey: string;
  title: string;
  description: string;
  rewardLabel: string;
  targetValue: number;
  progressValue: number;
}

export interface PlaySnapshot {
  profile: ProfileSnapshot;
  quests: GamificationQuestSummary[];
  tokens: number;
  equippedCompanionMood: string;
  inventory: RewardInventoryItem[];
}

export interface RewardInventoryItem {
  rewardKey: string;
  rewardName: string;
  rewardType: string;
  costTokens: number;
  equipped: boolean;
}

export interface HolidayCountryOption {
  code: string;
  label: string;
}

export interface HolidayListItem {
  date: string;
  name: string;
}

export interface HolidayYearData {
  countryCode: string;
  year: number;
  holidays: HolidayListItem[];
}

export interface WorklogQueryInput {
  mode: "day" | "week" | "month" | "range";
  anchorDate: string;
  endDate?: string;
}

export interface WorklogRangeMeta {
  startDate: string;
  endDate: string;
  label: string;
}

export interface WorklogSnapshot {
  mode: "day" | "week" | "month" | "range";
  range: WorklogRangeMeta;
  selectedDay: DayOverview;
  days: DayOverview[];
  month: MonthSnapshot;
  auditFlags: AuditFlag[];
}
