import CalendarDays from "lucide-react/dist/esm/icons/calendar-days.js";
import Clock from "lucide-react/dist/esm/icons/clock.js";
import Coffee from "lucide-react/dist/esm/icons/coffee.js";
import Database from "lucide-react/dist/esm/icons/database.js";
import Globe from "lucide-react/dist/esm/icons/globe.js";
import Laptop from "lucide-react/dist/esm/icons/laptop.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import Moon from "lucide-react/dist/esm/icons/moon.js";
import Search from "lucide-react/dist/esm/icons/search.js";
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
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GitLabAuthPanel } from "@/features/providers/gitlab-auth-panel";
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
import { type Theme, useTheme } from "@/hooks/use-theme";
import {
  loadAppPreferences,
  loadHolidayCountries,
  loadHolidayPreview,
  loadHolidayRegions,
  saveAppPreferences,
} from "@/lib/tauri";
import { cn, getSupportedTimezones, getWeekStartForTimezone } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { useAppStore } from "@/stores/app-store";

import type {
  AppPreferences,
  AuthLaunchPlan,
  BootstrapPayload,
  GitLabConnectionInput,
  GitLabUserInfo,
  HolidayCountryOption,
  HolidayPreviewItem,
  HolidayRegionOption,
  OAuthCallbackResolution,
  ProviderConnection,
  ScheduleInput,
  SyncState,
  TimeFormat,
} from "@/types/dashboard";
import { findPrimaryConnection, isConnectionActive } from "@/types/dashboard";

const SYNC_INTERVAL_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 240, label: "4 hours" },
];

const THEME_OPTIONS: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: "system", label: "System", icon: Laptop },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const TIME_FORMAT_OPTIONS: Array<{ value: TimeFormat; label: string }> = [
  { value: "hm", label: "Hours & minutes" },
  { value: "decimal", label: "Decimal" },
];

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
  const { theme, setTheme } = useTheme();
  const { timeFormat, setTimeFormat, autoSyncEnabled, autoSyncIntervalMinutes } = useAppStore();

  const [countries, setCountries] = useState<HolidayCountryOption[]>([]);
  const [preferences, setPreferences] = useState<AppPreferences>({
    themeMode: theme,
    language: "en",
    holidayCountryCode: "CL",
    holidayRegionCode: "RM",
    timeFormat: "hm",
    autoSyncEnabled: false,
    autoSyncIntervalMinutes: 30,
  });
  const [regions, setRegions] = useState<HolidayRegionOption[]>([]);
  const [holidayPreview, setHolidayPreview] = useState<HolidayPreviewItem[]>([]);

  const [scheduleForm, dispatchScheduleForm] = useReducer(
    scheduleFormReducer,
    payload,
    createInitialScheduleFormState,
  );
  const { shiftStart, shiftEnd, lunchMinutes, workdays, timezone, weekStart, schedulePhase } = scheduleForm;
  const [timezoneQuery, setTimezoneQuery] = useState("");
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const netHours = formatNetHours(shiftStart, shiftEnd, lunchMinutes);
  const resolvedWeekStart = getEffectiveWeekStart(weekStart, timezone);
  const orderedWorkdays = getOrderedWorkdays(weekStart, timezone);
  const timezones = useState(() => getSupportedTimezones(timezone))[0];
  const filteredTimezones = timezoneQuery
    ? timezones.filter((value: string) => value.toLowerCase().includes(timezoneQuery.toLowerCase()))
    : timezones;

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

    void loadHolidayCountries().then(setCountries).catch(() => {
      // fallback to empty options
    });
  }, []);

  useEffect(() => {
    void loadHolidayRegions(preferences.holidayCountryCode)
      .then(setRegions)
      .catch(() => {
        setRegions([]);
      });

    void loadHolidayPreview(preferences.holidayCountryCode, preferences.holidayRegionCode)
      .then(setHolidayPreview)
      .catch(() => {
        setHolidayPreview([]);
      });
  }, [preferences.holidayCountryCode, preferences.holidayRegionCode]);

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
    } catch (err) {
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "idle" });
      toast.error("Failed to save schedule", {
        description: err instanceof Error ? err.message : "Please try again.",
        duration: 6000,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------

  const connectionSummary = isConnected
    ? `Connected to ${primary?.host ?? "GitLab"}`
    : "Not connected";

  const scheduleSummary = `${workdays.join(", ")}, ${netHours}h/day`;
  const holidaySummary = preferences.holidayCountryCode
    ? `${preferences.holidayCountryCode}${preferences.holidayRegionCode ? ` / ${preferences.holidayRegionCode}` : ""}`
    : "Not set";

  const timeFormatLabel = timeFormat === "hm" ? "Hours & minutes" : "Decimal";
  const themeSummary = `Theme: ${theme.charAt(0).toUpperCase()}${theme.slice(1)} · Time: ${timeFormatLabel}`;

  const syncSummary = autoSyncEnabled
    ? `Every ${SYNC_INTERVAL_OPTIONS.find((o) => o.value === autoSyncIntervalMinutes)?.label ?? `${autoSyncIntervalMinutes} min`}`
    : "Manual only";

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <m.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-3"
    >
      {/* ------------------------------------------------------------------ */}
      {/* 1. Connection                                                      */}
      {/* ------------------------------------------------------------------ */}
      <m.div variants={staggerItem}>
        <AccordionItem
          title="Connection"
          icon={Plug}
          summary={connectionSummary}
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

      {/* ------------------------------------------------------------------ */}
      {/* 2. Schedule                                                        */}
      {/* ------------------------------------------------------------------ */}
      <m.div variants={staggerItem}>
        <AccordionItem title="Schedule" icon={Timer} summary={scheduleSummary}>
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-36 space-y-1.5">
                <Label htmlFor="shift-start" className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  Shift start
                </Label>
                <Input
                  id="shift-start"
                  type="time"
                  value={shiftStart}
                  onChange={(e) => dispatchScheduleForm({ type: "setShiftStart", value: e.target.value })}
                />
              </div>
              <div className="w-36 space-y-1.5">
                <Label htmlFor="shift-end" className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  Shift end
                </Label>
                <Input
                  id="shift-end"
                  type="time"
                  value={shiftEnd}
                  onChange={(e) => dispatchScheduleForm({ type: "setShiftEnd", value: e.target.value })}
                />
              </div>
              <div className="w-28 space-y-1.5">
                <Label htmlFor="lunch-minutes" className="flex items-center gap-1.5">
                  <Coffee className="h-3.5 w-3.5 text-muted-foreground" />
                  Lunch break
                </Label>
                <Input
                  id="lunch-minutes"
                  type="number"
                  step="5"
                  min="0"
                  max="180"
                  value={lunchMinutes}
                  onChange={(e) => dispatchScheduleForm({ type: "setLunchMinutes", value: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Net hours/day</Label>
                <div className="flex h-10 items-center rounded-xl border-2 border-primary/20 bg-primary/5 px-4">
                  <span className="font-display text-sm font-bold tabular-nums text-primary">{netHours}h</span>
                </div>
              </div>
            </div>

            <div className="w-fit max-w-full space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                Timezone
              </Label>
              <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-10 min-w-72 max-w-[30rem] items-center justify-between gap-3 rounded-xl border-2 border-border bg-muted px-3 py-2 text-left text-sm text-foreground shadow-[var(--shadow-clay-inset)] transition outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                  >
                    <span className="truncate">{timezone}</span>
                    <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-3rem)] overflow-hidden border-border bg-card p-0 text-card-foreground shadow-[var(--shadow-clay)]"
                >
                  <div className="border-b border-border/70 p-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={timezoneQuery}
                        onChange={(event) => setTimezoneQuery(event.target.value)}
                        placeholder="Search timezone"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <ScrollArea className="h-72">
                    <div className="grid gap-1 bg-card p-2">
                      {filteredTimezones.map((option: string) => {
                        const active = option === timezone;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              dispatchScheduleForm({ type: "setTimezone", value: option });
                              setTimezoneOpen(false);
                              setTimezoneQuery("");
                            }}
                            className={cn(
                              "flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-all",
                              active
                                ? "bg-primary/12 text-foreground shadow-[var(--shadow-clay-inset)]"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                          >
                            <span className="truncate">{option}</span>
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                              {option.split("/")[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>First day of week</Label>
              <div className="flex flex-wrap gap-1.5">
                {WEEK_START_OPTIONS.map((option) => {
                  const active = weekStart === option;
                  const autoLabel = getWeekStartForTimezone(timezone);
                  const labelMap: Record<Exclude<WeekStartPreference, "auto">, string> = {
                    sunday: "Sun",
                    monday: "Mon",
                    friday: "Fri",
                    saturday: "Sat",
                  };
                  const label = option === "auto" ? `Auto (${labelMap[autoLabel]})` : labelMap[option];

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => dispatchScheduleForm({ type: "setWeekStart", value: option as WeekStartPreference })}
                      className={cn(
                        "cursor-pointer rounded-xl border-2 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] transition-all",
                        active
                          ? "border-primary/30 bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--color-border)] active:translate-y-[1px] active:shadow-none"
                          : "border-border bg-muted text-muted-foreground shadow-[var(--shadow-clay-inset)] hover:text-foreground",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Workdays</Label>
              <div className="flex flex-wrap gap-1.5">
                {orderedWorkdays.map((day) => {
                  const active = workdays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => dispatchScheduleForm({ type: "toggleWorkday", day })}
                      className={cn(
                        "cursor-pointer rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition-all",
                        active
                          ? "border-primary/30 bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--color-border)] active:translate-y-[1px] active:shadow-none"
                          : "border-border bg-muted text-muted-foreground shadow-[var(--shadow-clay-inset)] hover:text-foreground",
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {onUpdateSchedule ? (
              <ScheduleSaveButton phase={schedulePhase} onClick={() => void handleSaveSchedule()} />
            ) : null}
          </div>
        </AccordionItem>
      </m.div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Calendar & Holidays                                             */}
      {/* ------------------------------------------------------------------ */}
      <m.div variants={staggerItem}>
        <AccordionItem title="Calendar & Holidays" icon={CalendarDays} summary={holidaySummary}>
          <div className="space-y-5">
            <div className="grid gap-4 @md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Select
                  value={preferences.holidayCountryCode ?? "CL"}
                  onValueChange={(value) => {
                    const next = {
                      ...preferences,
                      holidayCountryCode: value,
                      holidayRegionCode: undefined,
                    };
                    setPreferences(next);
                    void saveAppPreferences(next);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {countries.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Region</Label>
                <Select
                  value={preferences.holidayRegionCode ?? "all"}
                  onValueChange={(value) => {
                    const next = {
                      ...preferences,
                      holidayRegionCode: value === "all" ? undefined : value,
                    };
                    setPreferences(next);
                    void saveAppPreferences(next);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All regions</SelectItem>
                      {regions.map((region) => (
                        <SelectItem key={region.code} value={region.code}>
                          {region.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 @lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-2xl border-2 border-border bg-muted/20 p-3 shadow-[var(--shadow-clay)]">
                <Calendar
                  mode="single"
                  selected={new Date()}
                  month={new Date()}
                  className="border-0 bg-transparent p-0"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Upcoming holidays
                </div>

                <div className="grid gap-2">
                  <AnimatePresence initial={false}>
                    {holidayPreview.map((holiday) => (
                      <m.div
                        key={`${holiday.date}-${holiday.name}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="rounded-xl border-2 border-border bg-muted/30 p-3 shadow-[1px_1px_0_0_var(--color-border)]"
                      >
                        <p className="text-sm font-semibold text-foreground">{holiday.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{holiday.date}</p>
                      </m.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </AccordionItem>
      </m.div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Appearance                                                      */}
      {/* ------------------------------------------------------------------ */}
      <m.div variants={staggerItem}>
        <AccordionItem title="Appearance" icon={Palette} summary={themeSummary}>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label>Theme</Label>
              <div className="flex flex-wrap gap-1.5">
                {THEME_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = theme === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTheme(opt.value)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition-all",
                        active
                          ? "border-primary/30 bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--color-border)] active:translate-y-[1px] active:shadow-none"
                          : "border-border bg-muted text-muted-foreground shadow-[var(--shadow-clay-inset)] hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Time format</Label>
              <div className="flex flex-wrap gap-1.5">
                {TIME_FORMAT_OPTIONS.map((opt) => {
                  const active = timeFormat === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleTimeFormatChange(opt.value)}
                      className={cn(
                        "flex cursor-pointer flex-col items-start rounded-xl border-2 px-4 py-2.5 text-left transition-all",
                        active
                          ? "border-primary/30 bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--color-border)] active:translate-y-[1px] active:shadow-none"
                          : "border-border bg-muted text-muted-foreground shadow-[var(--shadow-clay-inset)] hover:text-foreground",
                      )}
                    >
                      <span className="text-sm font-bold">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Controls how durations are shown across the entire app.
              </p>
            </div>
          </div>
        </AccordionItem>
      </m.div>

      {/* ------------------------------------------------------------------ */}
      {/* 5. Sync                                                            */}
      {/* ------------------------------------------------------------------ */}
      <m.div variants={staggerItem}>
        <AccordionItem title="Sync" icon={Repeat} summary={syncSummary}>
          <div className="space-y-4">
            {/* Manual sync row */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Sync now</p>
                <p className="text-xs text-muted-foreground">
                  {syncState.status === "done"
                    ? `Last sync: ${syncState.result.entriesSynced} entries synced`
                    : "Pull the latest data from GitLab"}
                </p>
              </div>
              <Button onClick={() => void onStartSync()} disabled={syncing} size="sm">
                {syncing ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                )}
                {syncing ? "Syncing..." : "Sync now"}
              </Button>
            </div>

            {/* Auto-sync row */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Auto-sync</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically pull data from GitLab in the background
                  </p>
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
                    autoSyncEnabled ? "border-primary/30 bg-primary" : "border-border bg-muted",
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
                      <p className="text-xs font-semibold text-muted-foreground">Sync interval</p>
                      <div className="flex flex-wrap gap-1.5">
                        {SYNC_INTERVAL_OPTIONS.map((opt) => {
                          const active = autoSyncIntervalMinutes === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                void useAppStore
                                  .getState()
                                  .setAutoSyncPrefs(autoSyncEnabled, opt.value)
                              }
                              className={cn(
                                "cursor-pointer rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition-all",
                                active
                                  ? "border-primary/30 bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--color-border)] active:translate-y-[1px] active:shadow-none"
                                  : "border-border bg-muted text-muted-foreground shadow-[var(--shadow-clay-inset)] hover:text-foreground",
                              )}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            {/* View log — shared footer, only when a log exists */}
            {syncState.log.length > 0 && !syncing && (
              <div className="border-t-2 border-border pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => useAppStore.getState().setSyncLogOpen(true)}
                >
                  <ScrollText className="mr-1.5 h-3.5 w-3.5" />
                  View sync log
                </Button>
              </div>
            )}
          </div>
        </AccordionItem>
      </m.div>

      {/* ------------------------------------------------------------------ */}
      {/* 6. Data Management                                                 */}
      {/* ------------------------------------------------------------------ */}
      <m.div variants={staggerItem}>
        <AccordionItem title="Data Management" icon={Database} variant="destructive">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Reset all local data including connections, time entries, and settings.
            </p>
            <Button variant="destructive" size="sm" onClick={() => void onResetAllData()}>
              Reset all data
            </Button>
          </div>
        </AccordionItem>
      </m.div>
    </m.div>
  );
}
