import Accessibility from "lucide-react/dist/esm/icons/accessibility.js";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days.js";
import Clock from "lucide-react/dist/esm/icons/clock.js";
import Coffee from "lucide-react/dist/esm/icons/coffee.js";
import Database from "lucide-react/dist/esm/icons/database.js";
import Download from "lucide-react/dist/esm/icons/download.js";
import Globe from "lucide-react/dist/esm/icons/globe.js";
import Info from "lucide-react/dist/esm/icons/info.js";
import Laptop from "lucide-react/dist/esm/icons/laptop.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import MessageCircleMore from "lucide-react/dist/esm/icons/message-circle-more.js";
import MonitorDown from "lucide-react/dist/esm/icons/monitor-down.js";
import Moon from "lucide-react/dist/esm/icons/moon.js";
import Palette from "lucide-react/dist/esm/icons/palette.js";
import Plug from "lucide-react/dist/esm/icons/plug.js";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import Repeat from "lucide-react/dist/esm/icons/repeat.js";
import ScrollText from "lucide-react/dist/esm/icons/scroll-text.js";
import Sun from "lucide-react/dist/esm/icons/sun.js";
import Timer from "lucide-react/dist/esm/icons/timer.js";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useReducer, useState } from "react";
import { toast } from "sonner";
import { AboutDialog } from "@/features/settings/components/about-dialog";
import { AccordionItem } from "@/shared/components/Accordion/Accordion";
import { Button } from "@/shared/components/Button/Button";
import { Input } from "@/shared/components/Input/Input";
import { Label } from "@/shared/components/Label/Label";
import { SearchCombobox } from "@/shared/components/SearchCombobox/SearchCombobox";
import { TimeInput } from "@/shared/components/TimeInput/TimeInput";
import {
  createInitialScheduleFormState,
  formatNetHours,
  getEffectiveWeekStart,
  getOrderedWorkdays,
  scheduleFormReducer,
  WEEK_START_OPTIONS,
  type WeekStartPreference,
} from "@/core/preferences/schedule-form";
import { ScheduleSaveButton } from "@/core/preferences/schedule-preferences-card";
import { GitLabAuthPanel } from "@/core/providers/gitlab-auth-panel";
import { HolidayPreferencesPanel } from "@/features/settings/holiday-preferences-panel";
import { applyTheme, normalizeTheme, type Theme } from "@/shared/hooks/use-theme/use-theme";
import { staggerContainer, staggerItem } from "@/shared/utils/animations";
import { buildInfo } from "@/core/runtime/build-info";
import { getChoiceButtonClassName, getSegmentedControlClassName } from "@/shared/utils/control-styles";
import { useI18n } from "@/core/runtime/i18n";
import { useMotionSettings } from "@/core/runtime/motion";
import { getAppPreferencesCached, saveAppPreferencesCached } from "@/core/runtime/preferences-cache";
import { syncStartupPrefsWithPreferences, writeStartupPrefs } from "@/core/runtime/startup-prefs";
import { loadHolidayCountries } from "@/core/runtime/tauri";
import {
  cn,
  getCountryCodeForTimezone,
  getSupportedTimezones,
  getWeekStartsOnIndex,
  normalizeHolidayCountryMode,
  resolveHolidayCountryCode,
} from "@/shared/utils/utils";
import { useAppStore } from "@/core/stores/app-store";
import { findPrimaryConnection, isConnectionActive } from "@/shared/types/dashboard";

import type { WeekdayCode } from "@/shared/utils/utils";
import type {
  AppPreferences,
  AppUpdateChannel,
  AppUpdateDownloadEvent,
  AppUpdateInfo,
  AuthLaunchPlan,
  BootstrapPayload,
  GitLabConnectionInput,
  GitLabUserInfo,
  HolidayCountryOption,
  OAuthCallbackResolution,
  ProviderConnection,
  ScheduleInput,
  SyncState,
  TimeFormat,
  MotionPreference,
} from "@/shared/types/dashboard";

const SYNC_INTERVAL_OPTIONS = [15, 30, 60, 120, 240] as const;

const THEME_OPTIONS: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: "system", label: "System", icon: Laptop },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const TIME_FORMAT_OPTIONS: Array<{ value: TimeFormat; label: string }> = [
  { value: "hm", label: "Hours & minutes" },
  { value: "decimal", label: "Decimal" },
];

const MOTION_PREFERENCE_OPTIONS = [
  "system",
  "reduced",
  "full",
] as const satisfies readonly MotionPreference[];

const LANGUAGE_OPTIONS = ["auto", "en", "es", "pt"] as const;
const UPDATE_CHANNEL_OPTIONS = [
  "stable",
  "unstable",
] as const satisfies readonly AppUpdateChannel[];

interface SettingsPageProps {
  payload: BootstrapPayload;
  connections: ProviderConnection[];
  syncState: SyncState;
  onStartSync: () => Promise<void>;
  onCheckForUpdates: (channel: AppUpdateChannel) => Promise<AppUpdateInfo | null>;
  onInstallUpdate: (
    channel: AppUpdateChannel,
    onEvent?: (event: AppUpdateDownloadEvent) => void,
  ) => Promise<void>;
  onRestartToUpdate: () => Promise<void>;
  onSaveConnection: (input: GitLabConnectionInput) => Promise<ProviderConnection>;
  onSavePat: (host: string, token: string) => Promise<ProviderConnection>;
  onBeginOAuth: (input: GitLabConnectionInput) => Promise<AuthLaunchPlan>;
  onResolveCallback: (sessionId: string, callbackUrl: string) => Promise<OAuthCallbackResolution>;
  onValidateToken?: (host: string) => Promise<GitLabUserInfo>;
  onListenOAuthEvents?: (
    onSuccess: (payload: OAuthCallbackResolution) => void,
    onError: (message: string) => void,
  ) => Promise<() => void>;
  onUpdateSchedule?: (input: ScheduleInput) => Promise<void>;
  onRefreshBootstrap?: () => Promise<void>;
  onResetAllData: () => Promise<void>;
}

interface ConnectionSectionProps {
  connectionSummary: string;
  isConnected: boolean;
  connections: ProviderConnection[];
  onSaveConnection: (input: GitLabConnectionInput) => Promise<ProviderConnection>;
  onSavePat: (host: string, token: string) => Promise<ProviderConnection>;
  onBeginOAuth: (input: GitLabConnectionInput) => Promise<AuthLaunchPlan>;
  onResolveCallback: (sessionId: string, callbackUrl: string) => Promise<OAuthCallbackResolution>;
  onValidateToken?: (host: string) => Promise<GitLabUserInfo>;
  onListenOAuthEvents?: (
    onSuccess: (payload: OAuthCallbackResolution) => void,
    onError: (message: string) => void,
  ) => Promise<() => void>;
}

interface ScheduleSectionProps {
  scheduleSummary: string;
  shiftStart: string;
  shiftEnd: string;
  lunchMinutes: string;
  netHours: string;
  timezone: string;
  timezoneOptions: Array<{ value: string; label: string; badge?: string }>;
  weekStart: WeekStartPreference;
  orderedWorkdays: WeekdayCode[];
  workdays: string[];
  schedulePhase: "idle" | "saving" | "saved";
  timeFormat: TimeFormat;
  onSetShiftStart: (value: string) => void;
  onSetShiftEnd: (value: string) => void;
  onSetLunchMinutes: (value: string) => void;
  onSetTimezone: (value: string) => void;
  onSetWeekStart: (value: WeekStartPreference) => void;
  onToggleWorkday: (day: WeekdayCode) => void;
  onChangeTimeFormat: (format: TimeFormat) => void;
  onSaveSchedule?: () => void;
}

interface CalendarSectionProps {
  holidaySummary: string;
  timezone: string;
  calendarWeekStartsOn: 0 | 1 | 5 | 6;
  preferences: AppPreferences;
  resolvedHolidayCountryCode: string | undefined;
  countries: HolidayCountryOption[];
  onSavePreferences: (nextPreferences: AppPreferences) => Promise<void>;
}

interface AppearanceSectionProps {
  themeSummary: string;
  theme: Theme;
  onChangeTheme: (theme: Theme) => void;
}

interface WindowBehaviorSectionProps {
  traySummary: string;
  trayEnabled: boolean;
  closeToTray: boolean;
  onToggleTrayEnabled: () => void;
  onSetCloseToTray: (enabled: boolean) => void;
}

interface AccessibilitySectionProps {
  accessibilitySummary: string;
  currentLanguage: AppPreferences["language"];
  formatLanguageLabel: (value: (typeof LANGUAGE_OPTIONS)[number]) => string;
  motionPreference: MotionPreference;
  onChangeLanguage: (language: AppPreferences["language"]) => void;
  onChangeMotionPreference: (preference: MotionPreference) => void;
}

interface SyncSectionProps {
  syncSummary: string;
  syncState: SyncState;
  syncing: boolean;
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  formatSyncIntervalLabel: (minutes: number) => string;
  onStartSync: () => void;
  onToggleAutoSync: () => void;
  onSetAutoSyncInterval: (minutes: number) => void;
  onOpenLog: () => void;
}

interface AboutSectionProps {
  appVersion: string;
  onOpenAbout: () => void;
}

interface UpdatesSectionProps {
  updatesSummary: string;
  installedVersion: string;
  releaseChannelLabel: string;
  selectedChannel: AppUpdateChannel;
  status: UpdateSectionState;
  onChangeChannel: (channel: AppUpdateChannel) => void;
  onCheckForUpdates: () => void;
  onInstallUpdate: () => void;
  onRestartToUpdate: () => void;
}

interface DataManagementSectionProps {
  onResetAllData: () => void;
}

type UpdateSectionState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "upToDate" }
  | { status: "available"; update: AppUpdateInfo }
  | {
      status: "installing";
      update: AppUpdateInfo;
      downloadedBytes: number;
      totalBytes?: number;
    }
  | { status: "readyToRestart"; update: AppUpdateInfo }
  | { status: "error"; message: string };

function parseUpdateDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatByteProgress(downloadedBytes: number, totalBytes?: number): string {
  const formatter = new Intl.NumberFormat(undefined, {
    style: "unit",
    unit: "megabyte",
    unitDisplay: "narrow",
    maximumFractionDigits: 1,
  });
  const downloadedLabel = formatter.format(downloadedBytes / 1024 / 1024);

  if (!totalBytes || totalBytes <= 0) {
    return downloadedLabel;
  }

  return `${downloadedLabel} / ${formatter.format(totalBytes / 1024 / 1024)}`;
}

function resolveNextAutoHolidayPreferences(
  preferences: AppPreferences,
  timezone: string,
): AppPreferences | null {
  if (normalizeHolidayCountryMode(preferences.holidayCountryMode) !== "auto") {
    return null;
  }

  const detectedCountryCode = getCountryCodeForTimezone(timezone);
  if (!detectedCountryCode || detectedCountryCode === preferences.holidayCountryCode) {
    return null;
  }

  return {
    ...preferences,
    holidayCountryMode: "auto",
    holidayCountryCode: detectedCountryCode,
  };
}

function ConnectionSection({
  connectionSummary,
  isConnected,
  connections,
  onSaveConnection,
  onSavePat,
  onBeginOAuth,
  onResolveCallback,
  onValidateToken,
  onListenOAuthEvents,
}: Readonly<ConnectionSectionProps>) {
  const { t } = useI18n();

  return (
    <m.div variants={staggerItem} data-onboarding="connection-section">
      <AccordionItem
        title={t("settings.connection")}
        icon={Plug}
        summary={connectionSummary}
        summaryClassName={isConnected ? "text-success" : undefined}
        defaultOpen={!isConnected}
      >
        <GitLabAuthPanel
          connections={connections}
          onSaveConnection={onSaveConnection}
          onSavePat={onSavePat}
          onBeginOAuth={onBeginOAuth}
          onResolveCallback={onResolveCallback}
          onValidateToken={onValidateToken}
          onListenOAuthEvents={onListenOAuthEvents}
        />
      </AccordionItem>
    </m.div>
  );
}

function ScheduleSection({
  scheduleSummary,
  shiftStart,
  shiftEnd,
  lunchMinutes,
  netHours,
  timezone,
  timezoneOptions,
  weekStart,
  orderedWorkdays,
  workdays,
  schedulePhase,
  timeFormat,
  onSetShiftStart,
  onSetShiftEnd,
  onSetLunchMinutes,
  onSetTimezone,
  onSetWeekStart,
  onToggleWorkday,
  onChangeTimeFormat,
  onSaveSchedule,
}: Readonly<ScheduleSectionProps>) {
  const { formatWeekdayFromCode, t } = useI18n();

  return (
    <m.div variants={staggerItem}>
      <AccordionItem title={t("settings.schedule")} icon={Timer} summary={scheduleSummary}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-36 space-y-1.5">
              <Label htmlFor="shift-start" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {t("settings.shiftStart")}
              </Label>
              <TimeInput
                id="shift-start"
                aria-label={t("settings.shiftStart")}
                value={shiftStart}
                onChange={onSetShiftStart}
              />
            </div>

            <div className="w-36 space-y-1.5">
              <Label htmlFor="shift-end" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {t("settings.shiftEnd")}
              </Label>
              <TimeInput
                id="shift-end"
                aria-label={t("settings.shiftEnd")}
                value={shiftEnd}
                onChange={onSetShiftEnd}
              />
            </div>

            <div className="w-36 space-y-1.5">
              <Label htmlFor="lunch-minutes" className="flex items-center gap-1.5">
                <Coffee className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="whitespace-nowrap">{t("settings.lunchBreak")}</span>
              </Label>
              <Input
                id="lunch-minutes"
                type="number"
                step="5"
                min="0"
                max="180"
                value={lunchMinutes}
                onChange={(event) => onSetLunchMinutes(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground">{t("settings.netHoursPerDay")}</Label>
              <div className="flex h-10 items-center rounded-xl border-2 border-primary/20 bg-primary/5 px-4">
                <span className="font-display text-sm font-bold text-primary tabular-nums">
                  {t("settings.hoursPerDaySummary", { hours: netHours })}
                </span>
              </div>
            </div>
          </div>

          <div className="w-fit max-w-full space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              {t("settings.timezone")}
            </Label>
            <SearchCombobox
              value={timezone}
              options={timezoneOptions}
              searchPlaceholder={t("common.searchTimezone")}
              onChange={onSetTimezone}
              className="max-w-120 min-w-72"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("settings.firstDayOfWeek")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {WEEK_START_OPTIONS.map((option) => {
                const active = weekStart === option;
                const labelMap: Record<Exclude<WeekStartPreference, "auto">, WeekdayCode> = {
                  sunday: "Sun",
                  monday: "Mon",
                  friday: "Fri",
                  saturday: "Sat",
                };
                const label =
                  option === "auto" ? t("common.auto") : formatWeekdayFromCode(labelMap[option]);

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onSetWeekStart(option)}
                    className={getSegmentedControlClassName(
                      active,
                      "px-4 text-xs uppercase tracking-[0.14em]",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("settings.workdays")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {orderedWorkdays.map((day) => {
                const active = workdays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => onToggleWorkday(day)}
                    className={getSegmentedControlClassName(active, "min-w-14 text-xs")}
                  >
                    {formatWeekdayFromCode(day)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("settings.timeFormat")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {TIME_FORMAT_OPTIONS.map((option) => {
                const active = timeFormat === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChangeTimeFormat(option.value)}
                    className={getChoiceButtonClassName(active, "justify-start text-left")}
                  >
                    <span className="text-sm font-bold">
                      {option.value === "hm"
                        ? t("settings.hoursAndMinutes")
                        : t("settings.decimal")}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{t("settings.durationHint")}</p>
          </div>

          {onSaveSchedule ? (
            <ScheduleSaveButton phase={schedulePhase} onClick={onSaveSchedule} />
          ) : null}
        </div>
      </AccordionItem>
    </m.div>
  );
}

function CalendarSection({
  holidaySummary,
  timezone,
  calendarWeekStartsOn,
  preferences,
  resolvedHolidayCountryCode,
  countries,
  onSavePreferences,
}: Readonly<CalendarSectionProps>) {
  const { t } = useI18n();

  return (
    <m.div variants={staggerItem}>
      <AccordionItem
        title={t("settings.calendarAndHolidays")}
        icon={CalendarDays}
        summary={holidaySummary}
      >
        <HolidayPreferencesPanel
          timezone={timezone}
          weekStartsOn={calendarWeekStartsOn}
          preferences={{
            ...preferences,
            holidayCountryMode: normalizeHolidayCountryMode(preferences.holidayCountryMode),
            holidayCountryCode: resolvedHolidayCountryCode,
          }}
          countries={countries}
          onSavePreferences={onSavePreferences}
        />
      </AccordionItem>
    </m.div>
  );
}

function AppearanceSection({
  themeSummary,
  theme,
  onChangeTheme,
}: Readonly<AppearanceSectionProps>) {
  const { t } = useI18n();

  function getThemeLabel(themeValue: Theme): string {
    if (themeValue === "system") {
      return t("settings.system");
    }
    if (themeValue === "light") {
      return t("settings.light");
    }
    return t("settings.dark");
  }

  return (
    <m.div variants={staggerItem}>
      <AccordionItem title={t("settings.appearance")} icon={Palette} summary={themeSummary}>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>{t("settings.theme")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = theme === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChangeTheme(option.value)}
                    className={getChoiceButtonClassName(active, "gap-2")}
                  >
                    <Icon className="h-4 w-4" />
                    {getThemeLabel(option.value)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </AccordionItem>
    </m.div>
  );
}

function WindowBehaviorSection({
  traySummary,
  trayEnabled,
  closeToTray,
  onToggleTrayEnabled,
  onSetCloseToTray,
}: Readonly<WindowBehaviorSectionProps>) {
  const { t } = useI18n();

  return (
    <m.div variants={staggerItem}>
      <AccordionItem title={t("settings.windowBehavior")} icon={MonitorDown} summary={traySummary}>
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{t("settings.showTrayIcon")}</p>
              <p className="text-xs text-muted-foreground">
                {t("settings.showTrayIconDescription")}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={trayEnabled}
              aria-label={t("settings.showTrayIcon")}
              onClick={onToggleTrayEnabled}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors",
                trayEnabled ? "border-primary/30 bg-primary" : "border-border-subtle bg-field",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                  trayEnabled ? "translate-x-5.5" : "translate-x-0.5",
                )}
              />
            </button>
          </div>

          <div className="space-y-2">
            <Label>{t("settings.closeButtonAction")}</Label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onSetCloseToTray(true)}
                disabled={!trayEnabled}
                className={getChoiceButtonClassName(
                  trayEnabled && closeToTray,
                  "justify-start text-left disabled:pointer-events-none disabled:opacity-50",
                )}
              >
                <span className="text-sm font-bold">{t("settings.closeActionMinimizeToTray")}</span>
              </button>
              <button
                type="button"
                onClick={() => onSetCloseToTray(false)}
                className={getChoiceButtonClassName(!closeToTray, "justify-start text-left")}
              >
                <span className="text-sm font-bold">{t("settings.closeActionQuit")}</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("settings.closeButtonActionDescription")}
            </p>
          </div>
        </div>
      </AccordionItem>
    </m.div>
  );
}

function getMotionPreferenceLabel(
  preference: MotionPreference,
  t: ReturnType<typeof useI18n>["t"],
): string {
  if (preference === "system") {
    return t("settings.motionSystem");
  }
  if (preference === "reduced") {
    return t("settings.motionReduced");
  }
  return t("settings.motionFull");
}

function AccessibilitySection({
  accessibilitySummary,
  currentLanguage,
  formatLanguageLabel,
  motionPreference,
  onChangeLanguage,
  onChangeMotionPreference,
}: Readonly<AccessibilitySectionProps>) {
  const { t } = useI18n();

  return (
    <m.div variants={staggerItem}>
      <AccordionItem
        title={t("settings.accessibility")}
        icon={Accessibility}
        summary={accessibilitySummary}
      >
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>{t("common.language")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGE_OPTIONS.map((option) => {
                const active = currentLanguage === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onChangeLanguage(option)}
                    className={getChoiceButtonClassName(active, "justify-start text-left")}
                  >
                    <span className="text-sm font-bold">{formatLanguageLabel(option)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("settings.motionPreference")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {MOTION_PREFERENCE_OPTIONS.map((option) => {
                const active = motionPreference === option;
                const label = getMotionPreferenceLabel(option, t);

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onChangeMotionPreference(option)}
                    className={getChoiceButtonClassName(active, "justify-start text-left")}
                  >
                    <span className="text-sm font-bold">{label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("settings.motionPreferenceDescription")}
            </p>
          </div>
        </div>
      </AccordionItem>
    </m.div>
  );
}

function SyncSection({
  syncSummary,
  syncState,
  syncing,
  autoSyncEnabled,
  autoSyncIntervalMinutes,
  formatSyncIntervalLabel,
  onStartSync,
  onToggleAutoSync,
  onSetAutoSyncInterval,
  onOpenLog,
}: Readonly<SyncSectionProps>) {
  const { t } = useI18n();
  const { allowDecorativeAnimation } = useMotionSettings();
  const intervalControls = (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground">{t("settings.syncInterval")}</p>
      <div className="flex flex-wrap gap-1.5">
        {SYNC_INTERVAL_OPTIONS.map((minutes) => {
          const active = autoSyncIntervalMinutes === minutes;
          return (
            <button
              key={minutes}
              type="button"
              onClick={() => onSetAutoSyncInterval(minutes)}
              className={getSegmentedControlClassName(active, "min-w-20 text-xs")}
            >
              {formatSyncIntervalLabel(minutes)}
            </button>
          );
        })}
      </div>
    </div>
  );

  const showIntervalControls = allowDecorativeAnimation ? false : autoSyncEnabled;

  let renderedIntervalControls: React.ReactNode;
  if (allowDecorativeAnimation) {
    renderedIntervalControls = (
      <AnimatePresence initial={false}>
        {autoSyncEnabled && (
          <m.div
            key="interval-chips"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {intervalControls}
          </m.div>
        )}
      </AnimatePresence>
    );
  } else if (showIntervalControls) {
    renderedIntervalControls = intervalControls;
  } else {
    renderedIntervalControls = null;
  }

  return (
    <m.div variants={staggerItem}>
      <AccordionItem title={t("settings.sync")} icon={Repeat} summary={syncSummary}>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{t("settings.syncNow")}</p>
              <p className="text-xs text-muted-foreground">
                {syncState.status === "done"
                  ? t("settings.lastSyncEntries", { count: syncState.result.entriesSynced })
                  : t("settings.pullLatest")}
              </p>
            </div>
            <Button onClick={onStartSync} disabled={syncing}>
              {syncing ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              )}
              {syncing ? t("common.syncing") : t("settings.syncNow")}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{t("settings.autoSync")}</p>
                <p className="text-xs text-muted-foreground">{t("settings.autoSyncDescription")}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoSyncEnabled}
                aria-label={t("settings.autoSync")}
                onClick={onToggleAutoSync}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors",
                  autoSyncEnabled
                    ? "border-primary/30 bg-primary"
                    : "border-border-subtle bg-field",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                    autoSyncEnabled ? "translate-x-5.5" : "translate-x-0.5",
                  )}
                />
              </button>
            </div>

            {renderedIntervalControls}
          </div>

          {syncState.log.length > 0 && !syncing ? (
            <div className="border-t-2 border-border pt-3">
              <Button variant="ghost" onClick={onOpenLog}>
                <ScrollText className="mr-1.5 h-3.5 w-3.5" />
                {t("common.viewLog")}
              </Button>
            </div>
          ) : null}
        </div>
      </AccordionItem>
    </m.div>
  );
}

function AboutSection({ appVersion, onOpenAbout }: Readonly<AboutSectionProps>) {
  const { t } = useI18n();

  return (
    <m.div variants={staggerItem}>
      <AccordionItem title={t("settings.aboutSectionTitle")} icon={Info} summary={`v${appVersion}`}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("settings.aboutSectionDescription")}</p>
          <Button variant="ghost" onClick={onOpenAbout}>
            <MessageCircleMore className="mr-1.5 h-3.5 w-3.5" />
            {t("settings.viewAppDetails")}
          </Button>
        </div>
      </AccordionItem>
    </m.div>
  );
}

function UpdatesSection({
  updatesSummary,
  installedVersion,
  releaseChannelLabel,
  selectedChannel,
  status,
  onChangeChannel,
  onCheckForUpdates,
  onInstallUpdate,
  onRestartToUpdate,
}: Readonly<UpdatesSectionProps>) {
  const { formatDateLong, t } = useI18n();
  const update =
    status.status === "available" ||
    status.status === "installing" ||
    status.status === "readyToRestart"
      ? status.update
      : null;
  const publishedDate = parseUpdateDate(update?.date);
  const progressLabel =
    status.status === "installing"
      ? formatByteProgress(status.downloadedBytes, status.totalBytes)
      : null;
  const progressPercent =
    status.status === "installing" && status.totalBytes && status.totalBytes > 0
      ? Math.min(100, (status.downloadedBytes / status.totalBytes) * 100)
      : null;

  return (
    <m.div variants={staggerItem}>
      <AccordionItem title={t("settings.updates")} icon={Download} summary={updatesSummary}>
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-border-subtle bg-field p-4 shadow-clay-inset">
            <p className="font-display text-sm font-semibold text-foreground">
              {t("settings.updatesOverviewTitle")}
            </p>

            <div className="mt-4 space-y-3 border-t-2 border-border-subtle pt-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-foreground">
                  {t("settings.updatesInstalledVersion")}
                </p>
                <p className="shrink-0 text-right font-display text-base font-semibold text-foreground">
                  v{installedVersion}
                </p>
              </div>

              <div className="border-t-2 border-border-subtle" />

              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-foreground">
                  {t("settings.updatesReleaseChannel")}
                </p>
                <p className="max-w-44 shrink-0 text-right font-display text-base font-semibold text-foreground">
                  {releaseChannelLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("settings.updatesDescription")}</p>

            <div className="space-y-1.5">
              <Label>{t("settings.updatesChannel")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {UPDATE_CHANNEL_OPTIONS.map((option) => {
                  const active = selectedChannel === option;
                  const label =
                    option === "stable"
                      ? t("settings.updatesChannelStable")
                      : t("settings.updatesChannelUnstable");

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onChangeChannel(option)}
                      className={getChoiceButtonClassName(active, "justify-start text-left")}
                    >
                      <span className="text-sm font-bold">{label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">{t("settings.updatesChannelHint")}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(status.status === "idle" ||
                status.status === "checking" ||
                status.status === "upToDate" ||
                status.status === "error") && (
                <Button onClick={onCheckForUpdates} disabled={status.status === "checking"}>
                  <RefreshCw
                    className={cn(
                      "mr-1.5 h-3.5 w-3.5",
                      status.status === "checking" && "animate-spin",
                    )}
                  />
                  {status.status === "checking"
                    ? t("settings.updatesChecking")
                    : t("settings.updatesCheck")}
                </Button>
              )}

              {status.status === "available" && (
                <Button onClick={onInstallUpdate}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  {t("settings.updatesInstall")}
                </Button>
              )}

              {status.status === "installing" && (
                <Button disabled>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  {t("settings.updatesInstalling")}
                </Button>
              )}

              {status.status === "readyToRestart" && (
                <Button onClick={onRestartToUpdate}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  {t("settings.updatesRestart")}
                </Button>
              )}
            </div>

            {status.status === "installing" ? (
              <div className="space-y-2 rounded-xl border-2 border-primary/20 bg-primary/8 p-3">
                <div className="h-2 overflow-hidden rounded-full border border-primary/20 bg-white/55">
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${progressPercent ?? 18}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {progressLabel
                    ? t("settings.updatesDownloadProgress", { progress: progressLabel })
                    : t("settings.updatesUnknownProgress")}
                </p>
              </div>
            ) : null}

            {publishedDate ? (
              <p className="text-xs text-muted-foreground">
                {t("settings.updatesPublishedOn", { date: formatDateLong(publishedDate) })}
              </p>
            ) : null}

            {update?.body ? (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">
                  {t("settings.updatesReleaseNotes")}
                </p>
                <p className="text-sm whitespace-pre-wrap text-foreground/90">{update.body}</p>
              </div>
            ) : null}
          </div>
        </div>
      </AccordionItem>
    </m.div>
  );
}

function DataManagementSection({ onResetAllData }: Readonly<DataManagementSectionProps>) {
  const { t } = useI18n();

  return (
    <m.div variants={staggerItem}>
      <AccordionItem title={t("settings.dataManagement")} icon={Database} variant="destructive">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("settings.resetDataDescription")}</p>
          <Button variant="destructive" onClick={onResetAllData}>
            {t("settings.resetAllData")}
          </Button>
        </div>
      </AccordionItem>
    </m.div>
  );
}

interface SummaryLabelsInput {
  preferences: AppPreferences;
  updateSectionState: UpdateSectionState;
  workdays: string[];
  netHours: string;
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  isConnected: boolean;
  primary: ProviderConnection | undefined;
  timezone: string;
  formatWeekdayFromCode: (code: WeekdayCode) => string;
  formatLanguageLabel: (value: (typeof LANGUAGE_OPTIONS)[number]) => string;
  formatSyncIntervalLabel: (minutes: number) => string;
  t: ReturnType<typeof useI18n>["t"];
}

function computeSummaryLabels(input: SummaryLabelsInput): Record<string, string> {
  const {
    preferences,
    updateSectionState,
    workdays,
    netHours,
    autoSyncEnabled,
    autoSyncIntervalMinutes,
    isConnected,
    primary,
    timezone,
    formatWeekdayFromCode,
    formatLanguageLabel,
    formatSyncIntervalLabel,
    t,
  } = input;
  const getThemeLabel = (themeMode: Theme): string => {
    if (themeMode === "system") {
      return t("settings.system");
    }
    if (themeMode === "light") {
      return t("settings.light");
    }
    return t("settings.dark");
  };

  const connectionSummary = isConnected
    ? t("settings.connectedTo", { host: primary?.host ?? "GitLab" })
    : t("settings.notConnected");
  const scheduleSummary = `${workdays
    .map((day) => formatWeekdayFromCode(day as WeekdayCode))
    .join(", ")}, ${t("settings.hoursPerDaySummary", { hours: netHours })}`;
  const resolvedHolidayCountryCode = resolveHolidayCountryCode(
    preferences.holidayCountryMode,
    preferences.holidayCountryCode,
    timezone,
  );
  const holidaySummary = resolvedHolidayCountryCode ?? t("common.notSet");
  const themeLabel = getThemeLabel(preferences.themeMode);
  const themeSummary = t("settings.themeSummary", { theme: themeLabel });
  const motionPreferenceLabel = getMotionPreferenceLabel(preferences.motionPreference, t);
  const accessibilitySummary = t("settings.accessibilitySummary", {
    language: formatLanguageLabel(preferences.language),
    mode: motionPreferenceLabel,
  });
  const trayBehaviorSummary = preferences.closeToTray
    ? t("settings.traySummaryCloseToTray")
    : t("settings.traySummaryKeepTray");
  const traySummary = preferences.trayEnabled
    ? trayBehaviorSummary
    : t("settings.traySummaryDisabled");
  const syncSummary = autoSyncEnabled
    ? t("settings.everyInterval", {
        interval: formatSyncIntervalLabel(autoSyncIntervalMinutes),
      })
    : t("settings.manualOnly");
  const releaseChannelLabel = buildInfo.isPrerelease
    ? t("settings.updatesBuildChannelUnstable")
    : t("settings.updatesBuildChannelStable");
  const selectedUpdateChannelLabel =
    preferences.updateChannel === "stable"
      ? t("settings.updatesChannelStable")
      : t("settings.updatesChannelUnstable");

  let updatesSummary: string;
  if (updateSectionState.status === "available") {
    updatesSummary = t("settings.updatesAvailableShort", {
      version: updateSectionState.update.version,
    });
  } else if (updateSectionState.status === "readyToRestart") {
    updatesSummary = t("settings.updatesReadyShort");
  } else {
    updatesSummary = t("settings.updatesSummary", { channel: selectedUpdateChannelLabel });
  }

  return {
    connectionSummary,
    scheduleSummary,
    holidaySummary,
    themeSummary,
    accessibilitySummary,
    traySummary,
    syncSummary,
    releaseChannelLabel,
    updatesSummary,
  };
}

function useSettingsPageController({
  payload,
  connections,
  syncState,
  onCheckForUpdates,
  onInstallUpdate,
  onRestartToUpdate,
  onRefreshBootstrap,
  onUpdateSchedule,
}: Pick<
  SettingsPageProps,
  | "payload"
  | "connections"
  | "syncState"
  | "onCheckForUpdates"
  | "onInstallUpdate"
  | "onRestartToUpdate"
  | "onRefreshBootstrap"
  | "onUpdateSchedule"
>) {
  const {
    formatLanguageLabel,
    formatTimezoneOffset,
    formatWeekdayFromCode,
    setLanguagePreference,
    t,
  } = useI18n();
  const { timeFormat, setTimeFormat, autoSyncEnabled, autoSyncIntervalMinutes } = useAppStore();

  const [countries, setCountries] = useState<HolidayCountryOption[]>([]);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [updateSectionState, setUpdateSectionState] = useState<UpdateSectionState>({
    status: "idle",
  });
  const [preferences, setPreferences] = useState<AppPreferences>({
    themeMode: "system",
    language: "auto",
    updateChannel: buildInfo.defaultUpdateChannel,
    lastInstalledVersion: undefined,
    lastSeenReleaseHighlightsVersion: undefined,
    holidayCountryMode: "auto",
    holidayCountryCode: getCountryCodeForTimezone(payload.schedule.timezone),
    motionPreference: "system",
    timeFormat: "hm",
    autoSyncEnabled: false,
    autoSyncIntervalMinutes: 30,
    trayEnabled: true,
    closeToTray: true,
    onboardingCompleted: false,
  });

  const [scheduleForm, dispatchScheduleForm] = useReducer(
    scheduleFormReducer,
    payload,
    createInitialScheduleFormState,
  );
  const { shiftStart, shiftEnd, lunchMinutes, workdays, timezone, weekStart, schedulePhase } =
    scheduleForm;

  const netHours = formatNetHours(shiftStart, shiftEnd, lunchMinutes);
  const resolvedWeekStart = getEffectiveWeekStart(weekStart, timezone);
  const calendarWeekStartsOn = getWeekStartsOnIndex(weekStart, timezone);
  const orderedWorkdays = getOrderedWorkdays(weekStart, timezone);
  const [timezoneOptions] = useState(() =>
    getSupportedTimezones(timezone).map((tz) => {
      const city = tz.split("/").pop()?.replaceAll("_", " ") ?? tz;
      const offset = formatTimezoneOffset(tz);

      return {
        value: tz,
        label: `(${offset}) ${city}`,
        badge: tz.split("/")[0],
      };
    }),
  );

  const primary = findPrimaryConnection(connections);
  const isConnected = primary != null && isConnectionActive(primary);
  const syncing = syncState.status === "syncing";

  useEffect(() => {
    void getAppPreferencesCached()
      .then((loadedPreferences) => {
        setPreferences(loadedPreferences);
        syncStartupPrefsWithPreferences(loadedPreferences);
      })
      .catch(() => {
        // best effort, use defaults
      });

    void loadHolidayCountries()
      .then(setCountries)
      .catch(() => {
        // fallback to empty options
      });
  }, []);

  useEffect(() => {
    if (schedulePhase !== "saved") {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "idle" });
    }, 1600);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [schedulePhase]);

  async function handleTimeFormatChange(format: TimeFormat) {
    setTimeFormat(format);
    const updated = { ...preferences, timeFormat: format };
    setPreferences(updated);

    try {
      await saveAppPreferencesCached(updated);
    } catch {
      // best effort - store already updated
    }
  }

  async function handleLanguageChange(language: AppPreferences["language"]) {
    const updated = { ...preferences, language };
    setPreferences(updated);
    setLanguagePreference(language);

    try {
      const persisted = await saveAppPreferencesCached(updated);
      setPreferences(persisted);
    } catch {
      // best effort; reload will restore persisted value later
    }
  }

  async function handleSavePreferences(nextPreferences: AppPreferences) {
    try {
      const persisted = await saveAppPreferencesCached(nextPreferences);
      setPreferences(persisted);
    } catch (error) {
      toast.error(t("settings.failedHolidayPreferences"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
        duration: 5000,
      });
      throw error;
    }
  }

  async function handleThemeChange(nextTheme: Theme) {
    const updated = { ...preferences, themeMode: nextTheme };
    setPreferences(updated);
    applyTheme(nextTheme);

    try {
      const persisted = await saveAppPreferencesCached(updated);
      setPreferences(persisted);
      syncStartupPrefsWithPreferences(persisted);
      applyTheme(normalizeTheme(persisted.themeMode));
    } catch {
      // best effort; keep the current session theme applied
    }
  }

  async function handleTrayEnabledChange(enabled: boolean) {
    const updated = {
      ...preferences,
      trayEnabled: enabled,
      closeToTray: enabled ? preferences.closeToTray : false,
    };
    setPreferences(updated);

    try {
      const persisted = await saveAppPreferencesCached(updated);
      setPreferences(persisted);
    } catch {
      // best effort; reload will restore persisted value later
    }
  }

  async function handleCloseToTrayChange(enabled: boolean) {
    const updated = {
      ...preferences,
      trayEnabled: enabled ? true : preferences.trayEnabled,
      closeToTray: enabled,
    };
    setPreferences(updated);

    try {
      const persisted = await saveAppPreferencesCached(updated);
      setPreferences(persisted);
    } catch {
      // best effort; reload will restore persisted value later
    }
  }

  async function handleUpdateChannelChange(channel: AppUpdateChannel) {
    const previous = preferences;
    const updated = { ...preferences, updateChannel: channel };
    setPreferences(updated);
    setUpdateSectionState({ status: "idle" });

    try {
      const persisted = await saveAppPreferencesCached(updated);
      setPreferences(persisted);
    } catch (error) {
      setPreferences(previous);
      toast.error(t("settings.updatesChannelSaveFailed"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
        duration: 5000,
      });
    }
  }

  async function handleCheckForUpdates() {
    setUpdateSectionState({ status: "checking" });
    toast.info(t("settings.updatesChecking"), {
      description: t("settings.updatesToastChecking"),
      duration: 2500,
    });

    try {
      const update = await onCheckForUpdates(preferences.updateChannel);

      if (!update) {
        setUpdateSectionState({ status: "upToDate" });
        toast.success(t("settings.updatesUpToDate"), {
          description: t("settings.updatesNoUpdate"),
          duration: 3500,
        });
        return;
      }

      setUpdateSectionState({ status: "available", update });
      toast.success(t("settings.updatesAvailable", { version: update.version }), {
        description: t("settings.updatesAvailableDescription"),
        duration: 4000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("settings.tryAgain");
      setUpdateSectionState({
        status: "error",
        message,
      });
      toast.error(t("settings.updatesCheckFailed"), {
        description: message,
        duration: 5000,
      });
    }
  }

  async function handleInstallUpdate() {
    const currentState = updateSectionState;
    if (currentState.status !== "available") {
      return;
    }

    let downloadedBytes = 0;
    let totalBytes: number | undefined;

    setUpdateSectionState({
      status: "installing",
      update: currentState.update,
      downloadedBytes: 0,
      totalBytes: undefined,
    });

    try {
      await onInstallUpdate(preferences.updateChannel, (event) => {
        if (event.event === "Started") {
          totalBytes = event.data.contentLength;
          setUpdateSectionState({
            status: "installing",
            update: currentState.update,
            downloadedBytes,
            totalBytes,
          });
          toast.info(t("settings.updatesInstalling"), {
            description: t("settings.updatesToastInstalling"),
            duration: 2500,
          });
          return;
        }

        if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          setUpdateSectionState({
            status: "installing",
            update: currentState.update,
            downloadedBytes,
            totalBytes,
          });
          return;
        }

        setUpdateSectionState({
          status: "readyToRestart",
          update: currentState.update,
        });
        toast.success(t("settings.updatesReady", { version: currentState.update.version }), {
          description: t("settings.updatesReadyDescription"),
          duration: 5000,
        });
      });

      setUpdateSectionState({
        status: "readyToRestart",
        update: currentState.update,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("settings.tryAgain");
      setUpdateSectionState({
        status: "error",
        message,
      });
      toast.error(t("settings.updatesInstallFailed"), {
        description: message,
        duration: 5000,
      });
    }
  }

  async function handleRestartToUpdate() {
    try {
      toast.info(t("settings.updatesRestart"), {
        description: t("settings.updatesToastRestarting"),
        duration: 2500,
      });
      await onRestartToUpdate();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("settings.tryAgain");
      setUpdateSectionState({
        status: "error",
        message,
      });
      toast.error(t("settings.updatesRestartFailed"), {
        description: message,
        duration: 5000,
      });
    }
  }

  async function handleSaveSchedule() {
    if (!onUpdateSchedule) {
      return;
    }

    const lunchMinutesValue = Number.parseInt(lunchMinutes) || 0;
    const nextAutoHolidayPreferences = resolveNextAutoHolidayPreferences(preferences, timezone);

    dispatchScheduleForm({ type: "setSchedulePhase", phase: "saving" });

    try {
      await onUpdateSchedule({
        shiftStart,
        shiftEnd,
        lunchMinutes: lunchMinutesValue,
        workdays,
        timezone,
        weekStart: resolvedWeekStart,
      });
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "saved" });

      if (onRefreshBootstrap) {
        await onRefreshBootstrap();
      }
    } catch (error) {
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "idle" });
      toast.error(t("settings.failedSchedule"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
        duration: 6000,
      });
      return;
    }

    if (nextAutoHolidayPreferences) {
      void handleSavePreferences(nextAutoHolidayPreferences).catch(() => {});
    }
  }

  function handleToggleAutoSync() {
    void useAppStore.getState().setAutoSyncPrefs(!autoSyncEnabled, autoSyncIntervalMinutes);
  }

  function handleSetAutoSyncInterval(minutes: number) {
    void useAppStore.getState().setAutoSyncPrefs(autoSyncEnabled, minutes);
  }

  const formatSyncIntervalLabel = (minutes: number) =>
    minutes >= 60 && minutes % 60 === 0
      ? t("settings.intervalHours", { count: minutes / 60 })
      : t("settings.intervalMinutes", { count: minutes });

  const summaryLabels = computeSummaryLabels({
    preferences,
    updateSectionState,
    workdays,
    netHours,
    autoSyncEnabled,
    autoSyncIntervalMinutes,
    isConnected,
    primary,
    timezone,
    formatWeekdayFromCode,
    formatLanguageLabel,
    formatSyncIntervalLabel,
    t,
  });

  return {
    aboutOpen,
    setAboutOpen,
    preferences,
    countries,
    timezone,
    calendarWeekStartsOn,
    resolvedHolidayCountryCode: resolveHolidayCountryCode(
      preferences.holidayCountryMode,
      preferences.holidayCountryCode,
      timezone,
    ),
    shiftStart,
    shiftEnd,
    lunchMinutes,
    workdays,
    weekStart,
    schedulePhase,
    netHours,
    orderedWorkdays,
    timezoneOptions,
    theme: preferences.themeMode,
    setTheme: handleThemeChange,
    timeFormat,
    autoSyncEnabled,
    autoSyncIntervalMinutes,
    isConnected,
    syncing,
    connectionSummary: summaryLabels.connectionSummary,
    scheduleSummary: summaryLabels.scheduleSummary,
    holidaySummary: summaryLabels.holidaySummary,
    themeSummary: summaryLabels.themeSummary,
    accessibilitySummary: summaryLabels.accessibilitySummary,
    traySummary: summaryLabels.traySummary,
    syncSummary: summaryLabels.syncSummary,
    updatesSummary: summaryLabels.updatesSummary,
    releaseChannelLabel: summaryLabels.releaseChannelLabel,
    updateSectionState,
    formatLanguageLabel,
    formatSyncIntervalLabel,
    handleTimeFormatChange,
    handleMotionPreferenceChange: async (motionPreference: MotionPreference) => {
      const updated = { ...preferences, motionPreference };
      setPreferences(updated);
      writeStartupPrefs({ motionPreference });

      try {
        const persisted = await saveAppPreferencesCached(updated);
        setPreferences(persisted);
        syncStartupPrefsWithPreferences(persisted);
        await useAppStore.getState().setMotionPreference(persisted.motionPreference);
      } catch {
        void useAppStore.getState().setMotionPreference(motionPreference);
      }
    },
    handleLanguageChange,
    handleSavePreferences,
    handleTrayEnabledChange,
    handleCloseToTrayChange,
    handleUpdateChannelChange,
    handleCheckForUpdates,
    handleInstallUpdate,
    handleRestartToUpdate,
    handleSaveSchedule,
    handleToggleAutoSync,
    handleSetAutoSyncInterval,
    dispatchScheduleForm,
  };
}

export function SettingsPage({
  payload,
  connections,
  syncState,
  onStartSync,
  onCheckForUpdates,
  onInstallUpdate,
  onRestartToUpdate,
  onSaveConnection,
  onSavePat,
  onBeginOAuth,
  onResolveCallback,
  onValidateToken,
  onListenOAuthEvents,
  onUpdateSchedule,
  onRefreshBootstrap,
  onResetAllData,
}: Readonly<SettingsPageProps>) {
  const { allowDecorativeAnimation } = useMotionSettings();
  const controller = useSettingsPageController({
    payload,
    connections,
    syncState,
    onCheckForUpdates,
    onInstallUpdate,
    onRestartToUpdate,
    onRefreshBootstrap,
    onUpdateSchedule,
  });

  return (
    <m.div
      variants={staggerContainer}
      initial={allowDecorativeAnimation ? "initial" : false}
      animate="animate"
      className="space-y-3"
    >
      <ConnectionSection
        connectionSummary={controller.connectionSummary}
        isConnected={controller.isConnected}
        connections={connections}
        onSaveConnection={onSaveConnection}
        onSavePat={onSavePat}
        onBeginOAuth={onBeginOAuth}
        onResolveCallback={onResolveCallback}
        onValidateToken={onValidateToken}
        onListenOAuthEvents={onListenOAuthEvents}
      />

      <ScheduleSection
        scheduleSummary={controller.scheduleSummary}
        shiftStart={controller.shiftStart}
        shiftEnd={controller.shiftEnd}
        lunchMinutes={controller.lunchMinutes}
        netHours={controller.netHours}
        timezone={controller.timezone}
        timezoneOptions={controller.timezoneOptions}
        weekStart={controller.weekStart}
        orderedWorkdays={controller.orderedWorkdays}
        workdays={controller.workdays}
        schedulePhase={controller.schedulePhase}
        timeFormat={controller.timeFormat}
        onSetShiftStart={(value) =>
          controller.dispatchScheduleForm({ type: "setShiftStart", value })
        }
        onSetShiftEnd={(value) => controller.dispatchScheduleForm({ type: "setShiftEnd", value })}
        onSetLunchMinutes={(value) =>
          controller.dispatchScheduleForm({ type: "setLunchMinutes", value })
        }
        onSetTimezone={(value) => controller.dispatchScheduleForm({ type: "setTimezone", value })}
        onSetWeekStart={(value) => controller.dispatchScheduleForm({ type: "setWeekStart", value })}
        onToggleWorkday={(day) => controller.dispatchScheduleForm({ type: "toggleWorkday", day })}
        onChangeTimeFormat={(format) => void controller.handleTimeFormatChange(format)}
        onSaveSchedule={onUpdateSchedule ? () => void controller.handleSaveSchedule() : undefined}
      />

      <CalendarSection
        holidaySummary={controller.holidaySummary}
        timezone={controller.timezone}
        calendarWeekStartsOn={controller.calendarWeekStartsOn}
        preferences={controller.preferences}
        resolvedHolidayCountryCode={controller.resolvedHolidayCountryCode}
        countries={controller.countries}
        onSavePreferences={controller.handleSavePreferences}
      />

      <AppearanceSection
        themeSummary={controller.themeSummary}
        theme={controller.theme}
        onChangeTheme={controller.setTheme}
      />

      <AccessibilitySection
        accessibilitySummary={controller.accessibilitySummary}
        currentLanguage={controller.preferences.language}
        formatLanguageLabel={controller.formatLanguageLabel}
        motionPreference={controller.preferences.motionPreference}
        onChangeLanguage={(language) => void controller.handleLanguageChange(language)}
        onChangeMotionPreference={(preference) =>
          void controller.handleMotionPreferenceChange(preference)
        }
      />

      <WindowBehaviorSection
        traySummary={controller.traySummary}
        trayEnabled={controller.preferences.trayEnabled}
        closeToTray={controller.preferences.closeToTray}
        onToggleTrayEnabled={() =>
          void controller.handleTrayEnabledChange(!controller.preferences.trayEnabled)
        }
        onSetCloseToTray={(enabled) => void controller.handleCloseToTrayChange(enabled)}
      />

      <SyncSection
        syncSummary={controller.syncSummary}
        syncState={syncState}
        syncing={controller.syncing}
        autoSyncEnabled={controller.autoSyncEnabled}
        autoSyncIntervalMinutes={controller.autoSyncIntervalMinutes}
        formatSyncIntervalLabel={controller.formatSyncIntervalLabel}
        onStartSync={() => void onStartSync()}
        onToggleAutoSync={controller.handleToggleAutoSync}
        onSetAutoSyncInterval={controller.handleSetAutoSyncInterval}
        onOpenLog={() => useAppStore.getState().setSyncLogOpen(true)}
      />

      <UpdatesSection
        updatesSummary={controller.updatesSummary}
        installedVersion={buildInfo.appVersion}
        releaseChannelLabel={controller.releaseChannelLabel}
        selectedChannel={controller.preferences.updateChannel}
        status={controller.updateSectionState}
        onChangeChannel={(channel) => void controller.handleUpdateChannelChange(channel)}
        onCheckForUpdates={() => void controller.handleCheckForUpdates()}
        onInstallUpdate={() => void controller.handleInstallUpdate()}
        onRestartToUpdate={() => void controller.handleRestartToUpdate()}
      />

      <AboutSection
        appVersion={buildInfo.appVersion}
        onOpenAbout={() => controller.setAboutOpen(true)}
      />

      <DataManagementSection onResetAllData={() => void onResetAllData()} />

      <AboutDialog open={controller.aboutOpen} onOpenChange={controller.setAboutOpen} />
    </m.div>
  );
}
