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
  shortLabel: string;
  dateLabel: string;
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
  syncWindow: string;
  mode: string;
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
  clientId?: string;
  hasToken: boolean;
  state: "live" | "beta" | "planned";
  authMode: string;
  preferredScope: string;
  statusNote: string;
  oauthReady: boolean;
  isPrimary: boolean;
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

export interface SyncState {
  syncing: boolean;
  result: SyncResult | null;
  error: string | null;
  log: string[];
}

export interface ScheduleInput {
  shiftStart?: string;
  shiftEnd?: string;
  lunchMinutes?: number;
  workdays: string[];
  timezone: string;
}
