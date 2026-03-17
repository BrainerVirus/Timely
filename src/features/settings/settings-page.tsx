import CalendarDays from "lucide-react/dist/esm/icons/calendar-days.js";
import Clock from "lucide-react/dist/esm/icons/clock.js";
import Coffee from "lucide-react/dist/esm/icons/coffee.js";
import Database from "lucide-react/dist/esm/icons/database.js";
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
import { AboutDialog } from "@/components/shared/about-dialog";
import { AccordionItem } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchCombobox } from "@/components/ui/search-combobox";
import { TimeInput } from "@/components/ui/time-input";
import { ScheduleSaveButton } from "@/features/preferences/schedule-preferences-card";
import {
  createInitialScheduleFormState,
  formatNetHours,
  getEffectiveWeekStart,
  getOrderedWorkdays,
  scheduleFormReducer,
  WEEK_START_OPTIONS,
  type WeekStartPreference,
} from "@/features/preferences/schedule-form";
import { GitLabAuthPanel } from "@/features/providers/gitlab-auth-panel";
import { HolidayPreferencesPanel } from "@/features/settings/holiday-preferences-panel";
import { type Theme, useTheme } from "@/hooks/use-theme";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { buildInfo } from "@/lib/build-info";
import { getChoiceButtonClassName, getSegmentedControlClassName } from "@/lib/control-styles";
import { useI18n } from "@/lib/i18n";
import { loadAppPreferences, loadHolidayCountries, saveAppPreferences } from "@/lib/tauri";
import {
  cn,
  getCountryCodeForTimezone,
  getSupportedTimezones,
  getWeekStartsOnIndex,
  normalizeHolidayCountryMode,
  resolveHolidayCountryCode,
} from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { findPrimaryConnection, isConnectionActive } from "@/types/dashboard";

import type { WeekdayCode } from "@/lib/utils";
import type {
  AppPreferences,
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
} from "@/types/dashboard";

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

const LANGUAGE_OPTIONS = ["auto", "en", "es", "pt"] as const;

interface SettingsPageProps {
  payload: BootstrapPayload;
  connections: ProviderConnection[];
  syncState: SyncState;
  onStartSync: () => Promise<void>;
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
  onSetShiftStart: (value: string) => void;
  onSetShiftEnd: (value: string) => void;
  onSetLunchMinutes: (value: string) => void;
  onSetTimezone: (value: string) => void;
  onSetWeekStart: (value: WeekStartPreference) => void;
  onToggleWorkday: (day: WeekdayCode) => void;
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
  languageSummary: string;
  theme: Theme;
  timeFormat: TimeFormat;
  currentLanguage: AppPreferences["language"];
  formatLanguageLabel: (value: (typeof LANGUAGE_OPTIONS)[number]) => string;
  onChangeLanguage: (language: AppPreferences["language"]) => void;
  onChangeTheme: (theme: Theme) => void;
  onChangeTimeFormat: (format: TimeFormat) => void;
}

interface WindowBehaviorSectionProps {
  traySummary: string;
  trayEnabled: boolean;
  closeToTray: boolean;
  onToggleTrayEnabled: () => void;
  onSetCloseToTray: (enabled: boolean) => void;
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

interface DataManagementSectionProps {
  onResetAllData: () => void;
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
    <m.div variants={staggerItem}>
      <AccordionItem
        title={t("settings.connection")}
        icon={Plug}
        summary={connectionSummary}
        summaryClassName={isConnected ? "text-success" : undefined}
        defaultOpen={!isConnected}
      >
        <div data-onboarding="connection-section">
          <GitLabAuthPanel
            connections={connections}
            onSaveConnection={onSaveConnection}
            onSavePat={onSavePat}
            onBeginOAuth={onBeginOAuth}
            onResolveCallback={onResolveCallback}
            onValidateToken={onValidateToken}
            onListenOAuthEvents={onListenOAuthEvents}
          />
        </div>
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
  onSetShiftStart,
  onSetShiftEnd,
  onSetLunchMinutes,
  onSetTimezone,
  onSetWeekStart,
  onToggleWorkday,
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
              className="max-w-[30rem] min-w-72"
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
                  option === "auto"
                    ? t("common.auto")
                    : formatWeekdayFromCode(labelMap[option]);

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
  languageSummary,
  theme,
  timeFormat,
  currentLanguage,
  formatLanguageLabel,
  onChangeLanguage,
  onChangeTheme,
  onChangeTimeFormat,
}: Readonly<AppearanceSectionProps>) {
  const { t } = useI18n();

  return (
    <m.div variants={staggerItem}>
      <AccordionItem title={t("settings.appearance")} icon={Palette} summary={themeSummary}>
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
            <p className="text-xs text-muted-foreground">{languageSummary}</p>
          </div>

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
                    {option.value === "system"
                      ? t("settings.system")
                      : option.value === "light"
                        ? t("settings.light")
                        : t("settings.dark")}
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
                      {option.value === "hm" ? t("settings.hoursAndMinutes") : t("settings.decimal")}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{t("settings.durationHint")}</p>
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
              <p className="text-xs text-muted-foreground">{t("settings.showTrayIconDescription")}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={trayEnabled}
              aria-label={t("settings.showTrayIcon")}
              onClick={onToggleTrayEnabled}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors",
                trayEnabled
                  ? "border-primary/30 bg-primary"
                  : "border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)]",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                  trayEnabled ? "translate-x-[22px]" : "translate-x-[2px]",
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
            <p className="text-xs text-muted-foreground">{t("settings.closeButtonActionDescription")}</p>
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
                    : "border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)]",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                    autoSyncEnabled ? "translate-x-[22px]" : "translate-x-[2px]",
                  )}
                />
              </button>
            </div>

            <AnimatePresence initial={false}>
              {autoSyncEnabled && (
                <m.div
                  key="interval-chips"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {t("settings.syncInterval")}
                    </p>
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
                </m.div>
              )}
            </AnimatePresence>
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

function useSettingsPageController({
  payload,
  connections,
  syncState,
  onRefreshBootstrap,
  onUpdateSchedule,
}: Pick<
  SettingsPageProps,
  "payload" | "connections" | "syncState" | "onRefreshBootstrap" | "onUpdateSchedule"
>) {
  const {
    formatLanguageLabel,
    formatTimezoneOffset,
    formatWeekdayFromCode,
    setLanguagePreference,
    t,
  } = useI18n();
  const { theme, setTheme } = useTheme();
  const { timeFormat, setTimeFormat, autoSyncEnabled, autoSyncIntervalMinutes } = useAppStore();

  const [countries, setCountries] = useState<HolidayCountryOption[]>([]);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [preferences, setPreferences] = useState<AppPreferences>({
    themeMode: theme,
    language: "auto",
    holidayCountryMode: "auto",
    holidayCountryCode: getCountryCodeForTimezone(payload.schedule.timezone),
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
  const orderedWorkdays = getOrderedWorkdays(weekStart, timezone) as WeekdayCode[];
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
    void loadAppPreferences()
      .then(setPreferences)
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

    const timeoutId = window.setTimeout(() => {
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "idle" });
    }, 1600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [schedulePhase]);

  async function handleTimeFormatChange(format: TimeFormat) {
    setTimeFormat(format);
    const updated = { ...preferences, timeFormat: format };
    setPreferences(updated);

    try {
      await saveAppPreferences(updated);
    } catch {
      // best effort - store already updated
    }
  }

  async function handleLanguageChange(language: AppPreferences["language"]) {
    const updated = { ...preferences, language };
    setPreferences(updated);
    setLanguagePreference(language);

    try {
      const persisted = await saveAppPreferences(updated);
      setPreferences(persisted);
    } catch {
      // best effort; reload will restore persisted value later
    }
  }

  async function handleSavePreferences(nextPreferences: AppPreferences) {
    try {
      const persisted = await saveAppPreferences(nextPreferences);
      setPreferences(persisted);
    } catch (error) {
      toast.error(t("settings.failedHolidayPreferences"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
        duration: 5000,
      });
      throw error;
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
      const persisted = await saveAppPreferences(updated);
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
      const persisted = await saveAppPreferences(updated);
      setPreferences(persisted);
    } catch {
      // best effort; reload will restore persisted value later
    }
  }

  async function handleSaveSchedule() {
    if (!onUpdateSchedule) {
      return;
    }

    dispatchScheduleForm({ type: "setSchedulePhase", phase: "saving" });

    try {
      await onUpdateSchedule({
        shiftStart,
        shiftEnd,
        lunchMinutes: Number.parseInt(lunchMinutes) || 0,
        workdays,
        timezone,
        weekStart: resolvedWeekStart,
      });
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "saved" });

      if (onRefreshBootstrap) {
        await onRefreshBootstrap();
      }

      if (normalizeHolidayCountryMode(preferences.holidayCountryMode) === "auto") {
        const detectedCountryCode = getCountryCodeForTimezone(timezone);

        if (detectedCountryCode && detectedCountryCode !== preferences.holidayCountryCode) {
          await handleSavePreferences({
            ...preferences,
            holidayCountryMode: "auto",
            holidayCountryCode: detectedCountryCode,
          });
        }
      }
    } catch (error) {
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "idle" });
      toast.error(t("settings.failedSchedule"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
        duration: 6000,
      });
    }
  }

  function handleToggleAutoSync() {
    void useAppStore.getState().setAutoSyncPrefs(!autoSyncEnabled, autoSyncIntervalMinutes);
  }

  function handleSetAutoSyncInterval(minutes: number) {
    void useAppStore.getState().setAutoSyncPrefs(autoSyncEnabled, minutes);
  }

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
  const timeFormatLabel =
    timeFormat === "hm" ? t("settings.hoursAndMinutes") : t("settings.decimal");
  const formatSyncIntervalLabel = (minutes: number) =>
    minutes >= 60 && minutes % 60 === 0
      ? t("settings.intervalHours", { count: minutes / 60 })
      : t("settings.intervalMinutes", { count: minutes });
  const themeLabel =
    theme === "system"
      ? t("settings.system")
      : theme === "light"
        ? t("settings.light")
        : t("settings.dark");
  const themeSummary = t("settings.themeSummary", {
    theme: themeLabel,
    timeFormat: timeFormatLabel,
  });
  const languageSummary = t("settings.languageSummary", {
    language: formatLanguageLabel(preferences.language),
  });
  const traySummary = preferences.trayEnabled
    ? preferences.closeToTray
      ? t("settings.traySummaryCloseToTray")
      : t("settings.traySummaryKeepTray")
    : t("settings.traySummaryDisabled");
  const syncSummary = autoSyncEnabled
    ? t("settings.everyInterval", {
        interval: formatSyncIntervalLabel(autoSyncIntervalMinutes),
      })
    : t("settings.manualOnly");

  return {
    aboutOpen,
    setAboutOpen,
    preferences,
    countries,
    timezone,
    calendarWeekStartsOn,
    resolvedHolidayCountryCode,
    shiftStart,
    shiftEnd,
    lunchMinutes,
    workdays,
    weekStart,
    schedulePhase,
    netHours,
    orderedWorkdays,
    timezoneOptions,
    theme,
    setTheme,
    timeFormat,
    autoSyncEnabled,
    autoSyncIntervalMinutes,
    isConnected,
    syncing,
    connectionSummary,
    scheduleSummary,
    holidaySummary,
    themeSummary,
    languageSummary,
    traySummary,
    syncSummary,
    formatLanguageLabel,
    formatSyncIntervalLabel,
    handleTimeFormatChange,
    handleLanguageChange,
    handleSavePreferences,
    handleTrayEnabledChange,
    handleCloseToTrayChange,
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
  onSaveConnection,
  onSavePat,
  onBeginOAuth,
  onResolveCallback,
  onValidateToken,
  onListenOAuthEvents,
  onUpdateSchedule,
  onRefreshBootstrap,
  onResetAllData,
}: SettingsPageProps) {
  const controller = useSettingsPageController({
    payload,
    connections,
    syncState,
    onRefreshBootstrap,
    onUpdateSchedule,
  });

  return (
    <m.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
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
        onSetShiftStart={(value) => controller.dispatchScheduleForm({ type: "setShiftStart", value })}
        onSetShiftEnd={(value) => controller.dispatchScheduleForm({ type: "setShiftEnd", value })}
        onSetLunchMinutes={(value) =>
          controller.dispatchScheduleForm({ type: "setLunchMinutes", value })
        }
        onSetTimezone={(value) => controller.dispatchScheduleForm({ type: "setTimezone", value })}
        onSetWeekStart={(value) => controller.dispatchScheduleForm({ type: "setWeekStart", value })}
        onToggleWorkday={(day) => controller.dispatchScheduleForm({ type: "toggleWorkday", day })}
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
        languageSummary={controller.languageSummary}
        theme={controller.theme}
        timeFormat={controller.timeFormat}
        currentLanguage={controller.preferences.language}
        formatLanguageLabel={controller.formatLanguageLabel}
        onChangeLanguage={(language) => void controller.handleLanguageChange(language)}
        onChangeTheme={controller.setTheme}
        onChangeTimeFormat={(format) => void controller.handleTimeFormatChange(format)}
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

      <AboutSection
        appVersion={buildInfo.appVersion}
        onOpenAbout={() => controller.setAboutOpen(true)}
      />

      <DataManagementSection onResetAllData={() => void onResetAllData()} />

      <AboutDialog open={controller.aboutOpen} onOpenChange={controller.setAboutOpen} />
    </m.div>
  );
}
