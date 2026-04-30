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

export type WeekdayScheduleDay = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

export interface WeekdaySchedule {
  day: WeekdayScheduleDay;
  enabled: boolean;
  shiftStart: string;
  shiftEnd: string;
  lunchMinutes: number;
}

export interface ScheduleSnapshot {
  hoursPerDay: number;
  shiftStart?: string;
  shiftEnd?: string;
  lunchMinutes?: number;
  workdays: string;
  timezone: string;
  weekStart?: string;
  weekdaySchedules: WeekdaySchedule[];
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

export interface StreakDaySnapshot {
  date: string;
  state: "counted" | "broken" | "idle" | "skipped";
  isToday: boolean;
}

export interface StreakSnapshot {
  currentDays: number;
  window: StreakDaySnapshot[];
}

export interface AssignedIssueSnapshot {
  provider: string;
  issueId: string;
  providerIssueRef: string;
  key: string;
  title: string;
  state: string;
  statusLabel?: string;
  workflowStatus: "todo" | "doing" | "blocked" | "done" | "other";
  updatedAt?: string;
  webUrl?: string;
  labels: string[];
  milestoneTitle?: string;
  iterationGitlabId?: string;
  iterationGroupId?: string;
  iterationCadenceId?: string;
  iterationCadenceTitle?: string;
  iterationTitle?: string;
  /** GitLab iteration start (YYYY-MM-DD) when sync provides it. */
  iterationStartDate?: string;
  /** GitLab iteration due/end (YYYY-MM-DD) when sync provides it. */
  iterationDueDate?: string;
  startDate?: string;
  dueDate?: string;
}

export interface IssueRouteReference {
  provider: string;
  issueId: string;
}

export interface IssueReference extends IssueRouteReference {
  providerIssueRef: string;
}

export interface IssueActor {
  name: string;
  username?: string;
  avatarUrl?: string;
}

export interface IssueMetadataOption {
  id: string;
  label: string;
  color?: string;
  /** GitLab iteration cadence title (e.g. WEB), when known from catalog or API. */
  badge?: string;
}

export interface IssueStatusOption extends IssueMetadataOption {
  icon?: string;
}

export interface IssueMetadataCapability {
  enabled: boolean;
  reason?: string;
  options: IssueMetadataOption[];
}

export interface IssueComposerCapabilities {
  enabled: boolean;
  modes: Array<"write" | "preview">;
  supportsQuickActions: boolean;
}

export interface IssueTimeTrackingCapabilities {
  enabled: boolean;
  supportsQuickActions: boolean;
}

export interface IssueDetailsCapabilities {
  status: IssueMetadataCapability;
  labels: IssueMetadataCapability;
  iteration: IssueMetadataCapability;
  milestone: IssueMetadataCapability;
  composer: IssueComposerCapabilities;
  timeTracking: IssueTimeTrackingCapabilities;
}

export interface IssueActivityItem {
  id: string;
  type: "comment" | "system" | "time_spent";
  body: string;
  createdAt: string;
  updatedAt?: string;
  system: boolean;
  author?: IssueActor;
}

export interface IssueIterationDetails {
  id: string;
  label: string;
  startDate?: string;
  dueDate?: string;
  webUrl?: string;
}

export interface IssueRelatedItem {
  reference: IssueRouteReference;
  key: string;
  title: string;
  relationLabel: string;
  state: string;
  webUrl?: string;
  labels: IssueMetadataOption[];
}

export interface IssueMetadataField {
  id: string;
  label: string;
  value: string;
}

export interface IssueDetailsSnapshot {
  reference: IssueReference;
  key: string;
  title: string;
  state: string;
  author?: IssueActor;
  createdAt?: string;
  updatedAt?: string;
  webUrl?: string;
  totalTimeSpent?: string;
  description?: string;
  status?: IssueStatusOption;
  statusOptions?: IssueStatusOption[];
  projectName?: string;
  issueType?: string;
  priority?: string;
  startDate?: string;
  dueDate?: string;
  estimate?: string;
  weight?: number;
  participants?: IssueActor[];
  labels: IssueMetadataOption[];
  milestoneTitle?: string;
  milestone?: IssueMetadataOption;
  iteration?: IssueIterationDetails;
  parentItem?: IssueRelatedItem;
  linkedItems?: IssueRelatedItem[];
  childItems?: IssueRelatedItem[];
  metadataFields?: IssueMetadataField[];
  activity: IssueActivityItem[];
  activityHasNextPage?: boolean;
  activityNextPage?: number;
  /** Authenticated GitLab username from `GET /api/v4/user` when details are loaded from the API. */
  viewerUsername?: string;
  /** GitLab `ETag` from the issue REST resource for conditional revalidation. */
  issueEtag?: string | null;
  capabilities: IssueDetailsCapabilities;
}

export interface LoadIssueDetailsInput {
  provider: string;
  issueId: string;
  ifNoneMatch?: string | null;
}

export type LoadIssueDetailsResponse =
  | { kind: "full"; snapshot: IssueDetailsSnapshot }
  | {
      kind: "issueNotModified";
      issueEtag?: string | null;
      activity: IssueActivityItem[];
      activityHasNextPage?: boolean;
      activityNextPage?: number | null;
    };

export type AssignedIssuesStatusFilter = "all" | "opened" | "todo" | "doing" | "blocked" | "done";

export interface AssignedIssuesPeriodInput {
  start: string;
  end: string;
}

export interface AssignedIssuesQueryInput {
  cursor?: string;
  page: number;
  pageSize: number;
  status: AssignedIssuesStatusFilter;
  provider?: string;
  year?: string;
  iterationId?: string;
  search?: string;
}

export interface AssignedIssueSuggestion {
  value: string;
  label: string;
}

export interface AssignedIssuesIterationOption {
  id: string;
  label: string;
  badge?: string;
  searchText: string;
  year?: string;
  startDate?: string;
  dueDate?: string;
  isCurrent: boolean;
  issueCount: number;
}

export interface AssignedIssuesPage {
  items: AssignedIssueSnapshot[];
  hasNextPage?: boolean;
  endCursor?: string;
  suggestions: AssignedIssueSuggestion[];
  years: string[];
  iterationOptions: AssignedIssuesIterationOption[];
  catalogState: "ready" | "partial" | "error";
  catalogMessage?: string;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface BootstrapPayload {
  appName: string;
  phase: string;
  demoMode: boolean;
  lastSyncedAt: string | null;
  profile: ProfileSnapshot;
  streak: StreakSnapshot;
  providerStatus: ProviderStatus[];
  schedule: ScheduleSnapshot;
  today: DayOverview;
  week: DayOverview[];
  month: MonthSnapshot;
  auditFlags: AuditFlag[];
  quests: Quest[];
  assignedIssues: AssignedIssueSnapshot[];
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

export type ProviderKey = "gitlab" | "youtrack";

export interface ProviderConnectionInput {
  provider: ProviderKey;
  host: string;
  authMode: string;
  preferredScope: string;
  displayName?: string;
  clientId?: string;
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
export function findPrimaryConnection(
  connections: ProviderConnection[],
): ProviderConnection | undefined {
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
  assignedIssuesSynced: number;
}

export interface LogIssueTimeInput {
  reference: IssueReference;
  timeSpent: string;
  spentAt?: string;
  summary?: string;
}

export interface CreateIssueCommentInput {
  reference: IssueReference;
  body: string;
}

export interface UpdateIssueCommentInput {
  reference: IssueReference;
  noteId: string;
  body: string;
}

export interface DeleteIssueCommentInput {
  reference: IssueReference;
  noteId: string;
}

export interface DeleteIssueInput {
  reference: IssueReference;
}

export interface LoadIssueActivityPageInput {
  reference: IssueReference;
  page: number;
}

export interface IssueActivityPage {
  items: IssueActivityItem[];
  hasNextPage: boolean;
  nextPage?: number;
}

export interface UpdateIssueMetadataInput {
  reference: IssueReference;
  state?: string;
  labels?: string[];
  milestoneId?: string | null;
  iterationId?: string | null;
  description?: string;
}

export interface AppUpdateInfo {
  currentVersion: string;
  version: string;
  channel: AppUpdateChannel;
  date?: string;
  body?: string;
}

export type AppUpdateDownloadEvent =
  | { event: "Started"; data: { contentLength?: number } }
  | { event: "Progress"; data: { chunkLength: number } }
  | { event: "Finished" };

export type SyncState =
  | { status: "idle"; log: string[] }
  | { status: "syncing"; log: string[] }
  | { status: "done"; result: SyncResult; log: string[] }
  | { status: "error"; error: string; log: string[] };

export interface ScheduleInput {
  weekdaySchedules: WeekdaySchedule[];
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

export type WorklogMode = "day" | "week" | "period" | "month" | "range";

export type MotionPreference = "system" | "reduced" | "full";

export type AppUpdateChannel = "stable" | "unstable";

export type HolidayCountryMode = "auto" | "manual";

export type SupportedLocale = "en" | "es" | "pt";

export type LanguagePreference = "auto" | SupportedLocale;

export type IssueCodeTheme =
  | "timely-night"
  | "dark-pro"
  | "dracula"
  | "solarized-dark"
  | "solarized-light";

/** Per-threshold toggles for end-of-shift desktop reminders (minutes before shift end). */
export interface NotificationThresholdToggles {
  minutes45: boolean;
  minutes30: boolean;
  minutes15: boolean;
  minutes5: boolean;
}

export interface DiagnosticLogEntry {
  id: number;
  timestamp: string;
  dayKey: string;
  level: "info" | "warn" | "error";
  feature: string;
  source: string;
  event: string;
  platform: string;
  message: string;
}

export interface NotificationDeliveryProfile {
  platform: string;
  productName: string;
  identifier: string;
  linuxDesktopEntry: string;
  timeoutMs: number;
  windowsAppIdActive: boolean;
}

export interface AppPreferences {
  themeMode: "system" | "light" | "dark";
  /** @deprecated Motion is system-managed; kept for compatibility with persisted preferences. */
  motionPreference: MotionPreference;
  language: LanguagePreference;
  updateChannel: AppUpdateChannel;
  lastInstalledVersion?: string;
  lastSeenReleaseHighlightsVersion?: string;
  holidayCountryMode: HolidayCountryMode;
  holidayCountryCode?: string;
  timeFormat: TimeFormat;
  issueCodeTheme: IssueCodeTheme;
  autoSyncEnabled: boolean;
  /** Interval in minutes (15, 30, 60, 120, 240) */
  autoSyncIntervalMinutes: number;
  trayEnabled: boolean;
  closeToTray: boolean;
  onboardingCompleted: boolean;
  /** Master switch for native workday reminder notifications. */
  notificationsEnabled: boolean;
  notificationThresholds: NotificationThresholdToggles;
  /** True after we have attempted the OS-level notification permission flow once. */
  notificationPermissionRequested?: boolean;
}

export interface GamificationQuestSummary {
  questKey: string;
  title: string;
  description: string;
  rewardLabel: string;
  targetValue: number;
  progressValue: number;
  cadence: "daily" | "weekly" | "achievement";
  category: "focus" | "consistency" | "milestone";
  isActive: boolean;
  isClaimed: boolean;
}

export type CompanionMood =
  | "calm"
  | "curious"
  | "focused"
  | "happy"
  | "excited"
  | "cozy"
  | "playful"
  | "tired"
  | "drained";

export interface ActivateQuestInput {
  questKey: string;
}

export interface ClaimQuestRewardInput {
  questKey: string;
}

export interface PurchaseRewardInput {
  rewardKey: string;
}

export interface EquipRewardInput {
  rewardKey: string;
}

export interface UnequipRewardInput {
  rewardKey: string;
}

export interface RewardCatalogItem {
  rewardKey: string;
  rewardName: string;
  rewardType: string;
  accessorySlot: "headwear" | "eyewear" | "neckwear" | "charm" | "environment" | "companion";
  companionVariant?: "aurora" | "arctic" | "kitsune";
  environmentSceneKey?: "starlit-camp" | "sunlit-studio" | "rainy-retreat";
  themeTag?: "focus" | "craft" | "recovery";
  costTokens: number;
  owned: boolean;
  equipped: boolean;
  unlocked?: boolean;
  unlockHint?: string;
  unlockHintKey?: string;
  featured: boolean;
  rarity: "common" | "rare" | "epic";
  storeSection: "featured" | "companions" | "accessories";
}

export interface PlaySnapshot {
  profile: ProfileSnapshot;
  streak: StreakSnapshot;
  quests: GamificationQuestSummary[];
  tokens: number;
  equippedCompanionMood: CompanionMood;
  storeCatalog: RewardCatalogItem[];
  inventory: RewardInventoryItem[];
}

export interface RewardInventoryItem {
  rewardKey: string;
  rewardName: string;
  rewardType: string;
  accessorySlot: "headwear" | "eyewear" | "neckwear" | "charm" | "environment" | "companion";
  environmentSceneKey?: "starlit-camp" | "sunlit-studio" | "rainy-retreat";
  themeTag?: "focus" | "craft" | "recovery";
  costTokens: number;
  owned: boolean;
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
