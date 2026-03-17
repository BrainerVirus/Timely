import CalendarDays from "lucide-react/dist/esm/icons/calendar-days.js";
import Clock from "lucide-react/dist/esm/icons/clock.js";
import Coffee from "lucide-react/dist/esm/icons/coffee.js";
import Database from "lucide-react/dist/esm/icons/database.js";
import Globe from "lucide-react/dist/esm/icons/globe.js";
import Laptop from "lucide-react/dist/esm/icons/laptop.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
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
import { AccordionItem } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchCombobox } from "@/components/ui/search-combobox";
import { TimeInput } from "@/components/ui/time-input";
import {
  createInitialScheduleFormState,
  formatNetHours,
  getEffectiveWeekStart,
  getOrderedWorkdays,
  scheduleFormReducer,
  WEEK_START_OPTIONS,
  type WeekStartPreference,
} from "@/features/preferences/schedule-form";
import { ScheduleSaveButton } from "@/features/preferences/schedule-preferences-card";
import { GitLabAuthPanel } from "@/features/providers/gitlab-auth-panel";
import { HolidayPreferencesPanel } from "@/features/settings/holiday-preferences-panel";
import { type Theme, useTheme } from "@/hooks/use-theme";
import { staggerContainer, staggerItem } from "@/lib/animations";
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
  const model = useSettingsPageModel({
    connections,
    onRefreshBootstrap,
    onUpdateSchedule,
    payload,
    syncState,
  });

  const {
    autoSyncEnabled,
    autoSyncIntervalMinutes,
    calendarWeekStartsOn,
    connectionSummary,
    countries,
    formatLanguageLabel,
    formatSyncIntervalLabel,
    formatWeekdayFromCode,
    handleLanguageChange,
    handleSavePreferences,
    handleSaveSchedule,
    handleTimeFormatChange,
    holidaySummary,
    isConnected,
    languageSummary,
    lunchMinutes,
    netHours,
    orderedWorkdays,
    preferences,
    resolvedHolidayCountryCode,
    schedulePhase,
    scheduleSummary,
    setTheme,
    shiftEnd,
    shiftStart,
    syncing,
    t,
    theme,
    themeSummary,
    timeFormat,
    timezone,
    timezoneOptions,
    weekStart,
    workdays,
  } = model;

  return (
    <m.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
      <ConnectionSettingsSection
        connectionSummary={connectionSummary}
        connections={connections}
        isConnected={isConnected}
        onBeginOAuth={onBeginOAuth}
        onListenOAuthEvents={onListenOAuthEvents}
        onResolveCallback={onResolveCallback}
        onSaveConnection={onSaveConnection}
        onSavePat={onSavePat}
        onValidateToken={onValidateToken}
        t={t}
      />

      <ScheduleSettingsSection
        formatWeekdayFromCode={formatWeekdayFromCode}
        netHours={netHours}
        onLunchMinutesChange={model.onLunchMinutesChange}
        onSaveSchedule={onUpdateSchedule ? () => void handleSaveSchedule() : undefined}
        onShiftEndChange={model.onShiftEndChange}
        onShiftStartChange={model.onShiftStartChange}
        onTimezoneChange={model.onTimezoneChange}
        onToggleWorkday={model.onToggleWorkday}
        onWeekStartChange={model.onWeekStartChange}
        orderedWorkdays={orderedWorkdays}
        schedulePhase={schedulePhase}
        scheduleSummary={scheduleSummary}
        shiftEnd={shiftEnd}
        shiftStart={shiftStart}
        lunchMinutes={lunchMinutes}
        t={t}
        timezone={timezone}
        timezoneOptions={timezoneOptions}
        weekStart={weekStart}
        workdays={workdays}
      />

      <CalendarSettingsSection
        calendarWeekStartsOn={calendarWeekStartsOn}
        countries={countries}
        holidaySummary={holidaySummary}
        onSavePreferences={handleSavePreferences}
        preferences={{
          ...preferences,
          holidayCountryMode: normalizeHolidayCountryMode(preferences.holidayCountryMode),
          holidayCountryCode: resolvedHolidayCountryCode,
        }}
        t={t}
        timezone={timezone}
      />

      <AppearanceSettingsSection
        formatLanguageLabel={formatLanguageLabel}
        handleLanguageChange={handleLanguageChange}
        handleTimeFormatChange={handleTimeFormatChange}
        languageSummary={languageSummary}
        preferences={preferences}
        setTheme={setTheme}
        t={t}
        theme={theme}
        themeSummary={themeSummary}
        timeFormat={timeFormat}
      />

      <SyncSettingsSection
        autoSyncEnabled={autoSyncEnabled}
        autoSyncIntervalMinutes={autoSyncIntervalMinutes}
        formatSyncIntervalLabel={formatSyncIntervalLabel}
        onStartSync={onStartSync}
        syncState={syncState}
        syncing={syncing}
        t={t}
      />

      <DataManagementSection onResetAllData={onResetAllData} t={t} />
    </m.div>
  );
}

function useSettingsPageModel({
  connections,
  onRefreshBootstrap,
  onUpdateSchedule,
  payload,
  syncState,
}: Pick<
  SettingsPageProps,
  "connections" | "onRefreshBootstrap" | "onUpdateSchedule" | "payload" | "syncState"
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
  const [preferences, setPreferences] = useState<AppPreferences>({
    themeMode: theme,
    language: "auto",
    holidayCountryMode: "auto",
    holidayCountryCode: getCountryCodeForTimezone(payload.schedule.timezone),
    timeFormat: "hm",
    autoSyncEnabled: true,
    autoSyncIntervalMinutes: 30,
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

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  useEffect(() => {
    void loadAppPreferences()
      .then((nextPreferences) => {
        setPreferences(nextPreferences);
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

    const timeoutId = window.setTimeout(() => {
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "idle" });
    }, 1600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [schedulePhase]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleTimeFormatChange(format: TimeFormat) {
    setTimeFormat(format);
    const updated = { ...preferences, timeFormat: format };
    setPreferences(updated);
    try {
      await saveAppPreferences(updated);
    } catch {
      // best effort — store already updated
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
    } catch (err) {
      toast.error(t("settings.failedHolidayPreferences"), {
        description: err instanceof Error ? err.message : t("settings.tryAgain"),
        duration: 5000,
      });
      throw err;
    }
  }

  async function handleSaveSchedule() {
    if (!onUpdateSchedule) return;

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
    } catch (err) {
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "idle" });
      toast.error(t("settings.failedSchedule"), {
        description: err instanceof Error ? err.message : t("settings.tryAgain"),
        duration: 6000,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------

  const connectionSummary = isConnected
    ? t("settings.connectedTo", { host: primary?.host ?? "GitLab" })
    : t("settings.notConnected");

  const scheduleSummary = `${workdays
    .map((day) =>
      formatWeekdayFromCode(day as "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat"),
    )
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

  return {
    autoSyncEnabled,
    autoSyncIntervalMinutes,
    calendarWeekStartsOn,
    connectionSummary,
    countries,
    formatLanguageLabel,
    formatSyncIntervalLabel,
    formatWeekdayFromCode,
    handleLanguageChange,
    handleSavePreferences,
    handleSaveSchedule,
    handleTimeFormatChange,
    holidaySummary,
    isConnected,
    languageSummary,
    lunchMinutes,
    netHours,
    onLunchMinutesChange: (value: string) =>
      dispatchScheduleForm({ type: "setLunchMinutes", value }),
    onShiftEndChange: (value: string) => dispatchScheduleForm({ type: "setShiftEnd", value }),
    onShiftStartChange: (value: string) => dispatchScheduleForm({ type: "setShiftStart", value }),
    onTimezoneChange: (value: string) => dispatchScheduleForm({ type: "setTimezone", value }),
    onToggleWorkday: (day: string) => dispatchScheduleForm({ type: "toggleWorkday", day }),
    onWeekStartChange: (value: WeekStartPreference) =>
      dispatchScheduleForm({ type: "setWeekStart", value }),
    orderedWorkdays,
    preferences,
    resolvedHolidayCountryCode,
    schedulePhase,
    scheduleSummary,
    setTheme,
    shiftEnd,
    shiftStart,
    syncing,
    t,
    theme,
    themeSummary,
    timeFormat,
    timezone,
    timezoneOptions,
    weekStart,
    workdays,
  };
}

function ConnectionSettingsSection({
  connectionSummary,
  connections,
  isConnected,
  onBeginOAuth,
  onListenOAuthEvents,
  onResolveCallback,
  onSaveConnection,
  onSavePat,
  onValidateToken,
  t,
}: {
  connectionSummary: string;
  connections: ProviderConnection[];
  isConnected: boolean;
  onBeginOAuth: (input: GitLabConnectionInput) => Promise<AuthLaunchPlan>;
  onListenOAuthEvents?: (
    onSuccess: (payload: OAuthCallbackResolution) => void,
    onError: (message: string) => void,
  ) => Promise<() => void>;
  onResolveCallback: (sessionId: string, callbackUrl: string) => Promise<OAuthCallbackResolution>;
  onSaveConnection: (input: GitLabConnectionInput) => Promise<ProviderConnection>;
  onSavePat: (host: string, token: string) => Promise<ProviderConnection>;
  onValidateToken?: (host: string) => Promise<GitLabUserInfo>;
  t: ReturnType<typeof useI18n>["t"];
}) {
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

function ScheduleSettingsSection({
  formatWeekdayFromCode,
  lunchMinutes,
  netHours,
  onLunchMinutesChange,
  onSaveSchedule,
  onShiftEndChange,
  onShiftStartChange,
  onTimezoneChange,
  onToggleWorkday,
  onWeekStartChange,
  orderedWorkdays,
  schedulePhase,
  scheduleSummary,
  shiftEnd,
  shiftStart,
  t,
  timezone,
  timezoneOptions,
  weekStart,
  workdays,
}: {
  formatWeekdayFromCode: ReturnType<typeof useI18n>["formatWeekdayFromCode"];
  lunchMinutes: string;
  netHours: string;
  onLunchMinutesChange: (value: string) => void;
  onSaveSchedule?: () => void;
  onShiftEndChange: (value: string) => void;
  onShiftStartChange: (value: string) => void;
  onTimezoneChange: (value: string) => void;
  onToggleWorkday: (day: string) => void;
  onWeekStartChange: (value: WeekStartPreference) => void;
  orderedWorkdays: ReturnType<typeof getOrderedWorkdays>;
  schedulePhase: "idle" | "saving" | "saved";
  scheduleSummary: string;
  shiftEnd: string;
  shiftStart: string;
  t: ReturnType<typeof useI18n>["t"];
  timezone: string;
  timezoneOptions: Array<{ value: string; label: string; badge: string }>;
  weekStart: WeekStartPreference;
  workdays: string[];
}) {
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
                onChange={onShiftStartChange}
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
                onChange={onShiftEndChange}
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
                onChange={(event) => onLunchMinutesChange(event.target.value)}
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
              onChange={onTimezoneChange}
              className="max-w-[30rem] min-w-72"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("settings.firstDayOfWeek")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {WEEK_START_OPTIONS.map((option) => {
                const active = weekStart === option;
                const labelMap: Record<Exclude<WeekStartPreference, "auto">, string> = {
                  sunday: "Sun",
                  monday: "Mon",
                  friday: "Fri",
                  saturday: "Sat",
                };
                const label =
                  option === "auto"
                    ? t("common.auto")
                    : formatWeekdayFromCode(labelMap[option] as WeekdayCode);

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onWeekStartChange(option as WeekStartPreference)}
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
                    {formatWeekdayFromCode(day as WeekdayCode)}
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

function CalendarSettingsSection({
  calendarWeekStartsOn,
  countries,
  holidaySummary,
  onSavePreferences,
  preferences,
  t,
  timezone,
}: {
  calendarWeekStartsOn: 0 | 1 | 5 | 6;
  countries: HolidayCountryOption[];
  holidaySummary: string;
  onSavePreferences: (nextPreferences: AppPreferences) => Promise<void>;
  preferences: AppPreferences;
  t: ReturnType<typeof useI18n>["t"];
  timezone: string;
}) {
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
          preferences={preferences}
          countries={countries}
          onSavePreferences={onSavePreferences}
        />
      </AccordionItem>
    </m.div>
  );
}

function AppearanceSettingsSection({
  formatLanguageLabel,
  handleLanguageChange,
  handleTimeFormatChange,
  languageSummary,
  preferences,
  setTheme,
  t,
  theme,
  themeSummary,
  timeFormat,
}: {
  formatLanguageLabel: ReturnType<typeof useI18n>["formatLanguageLabel"];
  handleLanguageChange: (language: AppPreferences["language"]) => Promise<void>;
  handleTimeFormatChange: (format: TimeFormat) => Promise<void>;
  languageSummary: string;
  preferences: AppPreferences;
  setTheme: (theme: Theme) => void;
  t: ReturnType<typeof useI18n>["t"];
  theme: Theme;
  themeSummary: string;
  timeFormat: TimeFormat;
}) {
  return (
    <m.div variants={staggerItem}>
      <AccordionItem title={t("settings.appearance")} icon={Palette} summary={themeSummary}>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>{t("common.language")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGE_OPTIONS.map((option) => {
                const active = preferences.language === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => void handleLanguageChange(option)}
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
                    onClick={() => setTheme(option.value)}
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
                    onClick={() => void handleTimeFormatChange(option.value)}
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
        </div>
      </AccordionItem>
    </m.div>
  );
}

function SyncSettingsSection({
  autoSyncEnabled,
  autoSyncIntervalMinutes,
  formatSyncIntervalLabel,
  onStartSync,
  syncState,
  syncing,
  t,
}: {
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  formatSyncIntervalLabel: (minutes: number) => string;
  onStartSync: () => Promise<void>;
  syncState: SyncState;
  syncing: boolean;
  t: ReturnType<typeof useI18n>["t"];
}) {
  return (
    <m.div variants={staggerItem}>
      <AccordionItem
        title={t("settings.sync")}
        icon={Repeat}
        summary={
          autoSyncEnabled
            ? t("settings.everyInterval", {
                interval: formatSyncIntervalLabel(autoSyncIntervalMinutes),
              })
            : t("settings.manualOnly")
        }
      >
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
            <Button onClick={() => void onStartSync()} disabled={syncing}>
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
                onClick={() =>
                  void useAppStore
                    .getState()
                    .setAutoSyncPrefs(!autoSyncEnabled, autoSyncIntervalMinutes)
                }
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
              {autoSyncEnabled ? (
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
                            onClick={() =>
                              void useAppStore.getState().setAutoSyncPrefs(autoSyncEnabled, minutes)
                            }
                            className={getSegmentedControlClassName(active, "min-w-20 text-xs")}
                          >
                            {formatSyncIntervalLabel(minutes)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </m.div>
              ) : null}
            </AnimatePresence>
          </div>

          {syncState.log.length > 0 && !syncing ? (
            <div className="border-t-2 border-border pt-3">
              <Button variant="ghost" onClick={() => useAppStore.getState().setSyncLogOpen(true)}>
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

function DataManagementSection({
  onResetAllData,
  t,
}: {
  onResetAllData: () => Promise<void>;
  t: ReturnType<typeof useI18n>["t"];
}) {
  return (
    <m.div variants={staggerItem}>
      <AccordionItem title={t("settings.dataManagement")} icon={Database} variant="destructive">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("settings.resetDataDescription")}</p>
          <Button variant="destructive" onClick={() => void onResetAllData()}>
            {t("settings.resetAllData")}
          </Button>
        </div>
      </AccordionItem>
    </m.div>
  );
}
