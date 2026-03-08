import CalendarDays from "lucide-react/dist/esm/icons/calendar-days.js";
import Clock from "lucide-react/dist/esm/icons/clock.js";
import Coffee from "lucide-react/dist/esm/icons/coffee.js";
import Globe from "lucide-react/dist/esm/icons/globe.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import Moon from "lucide-react/dist/esm/icons/moon.js";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import Sun from "lucide-react/dist/esm/icons/sun.js";
import Laptop from "lucide-react/dist/esm/icons/laptop.js";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useReducer, useState } from "react";
import { AccordionItem } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ALL_WORKDAYS,
  createInitialScheduleFormState,
  formatNetHours,
  scheduleFormReducer,
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
import { cn } from "@/lib/utils";

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
} from "@/types/dashboard";

const THEME_OPTIONS: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: "system", label: "System", icon: Laptop },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
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
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [countries, setCountries] = useState<HolidayCountryOption[]>([]);
  const [preferences, setPreferences] = useState<AppPreferences>({
    themeMode: theme,
    language: "en",
    holidayCountryCode: "CL",
    holidayRegionCode: "RM",
  });
  const [regions, setRegions] = useState<HolidayRegionOption[]>([]);
  const [holidayPreview, setHolidayPreview] = useState<HolidayPreviewItem[]>([]);

  const [scheduleForm, dispatchScheduleForm] = useReducer(
    scheduleFormReducer,
    payload,
    createInitialScheduleFormState,
  );
  const { shiftStart, shiftEnd, lunchMinutes, workdays, schedulePhase } = scheduleForm;
  const netHours = formatNetHours(shiftStart, shiftEnd, lunchMinutes);

  const primary = connections.find((c) => c.isPrimary) ?? connections[0];
  const isConnected = Boolean(primary && (primary.hasToken || primary.clientId));
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
      });
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "saved" });
      if (onRefreshBootstrap) {
        await onRefreshBootstrap();
      }
    } catch {
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "idle" });
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

  const themeSummary = `Theme: ${theme.charAt(0).toUpperCase()}${theme.slice(1)}`;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-2">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Connection                                                      */}
      {/* ------------------------------------------------------------------ */}
      <AccordionItem
        title="Connection"
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

        {connections.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Sync</p>
                <p className="text-xs text-muted-foreground">
                  {syncState.status === "done"
                    ? `Last sync: ${syncState.result.entriesSynced} entries`
                    : "Refresh provider data"}
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
          </div>
        )}
      </AccordionItem>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Schedule                                                        */}
      {/* ------------------------------------------------------------------ */}
      <AccordionItem title="Schedule" summary={scheduleSummary}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
              <Label htmlFor="lunch-minutes" className="flex items-center gap-1.5">
                <Coffee className="h-3.5 w-3.5 text-muted-foreground" />
                Lunch break (min)
              </Label>
              <Input
                id="lunch-minutes"
                type="number"
                step="5"
                min="0"
                max="180"
                value={lunchMinutes}
                onChange={(e) =>
                  dispatchScheduleForm({ type: "setLunchMinutes", value: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                Timezone
              </Label>
              <Input value={timezone} disabled />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Net hours/day</Label>
              <p className="flex h-9 items-center text-sm font-medium text-foreground">
                {netHours}h
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Workdays</Label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_WORKDAYS.map((day) => {
                const active = workdays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => dispatchScheduleForm({ type: "toggleWorkday", day })}
                    className={cn(
                      "cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground hover:text-foreground",
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

      {/* ------------------------------------------------------------------ */}
      {/* 3. Calendar & Holidays                                             */}
      {/* ------------------------------------------------------------------ */}
      <AccordionItem title="Calendar & Holidays" summary={holidaySummary}>
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
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

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl border border-border bg-muted/20 p-3">
              <Calendar
                mode="single"
                selected={new Date()}
                month={new Date()}
                className="border-0 bg-transparent p-0"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Upcoming public holidays
              </div>

              <AnimatePresence initial={false}>
                <div className="grid gap-2">
                  {holidayPreview.map((holiday) => (
                    <m.div
                      key={`${holiday.date}-${holiday.name}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="rounded-xl border border-border bg-muted/30 p-3"
                    >
                      <p className="text-sm font-medium text-foreground">{holiday.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{holiday.date}</p>
                    </m.div>
                  ))}
                </div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </AccordionItem>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Appearance                                                      */}
      {/* ------------------------------------------------------------------ */}
      <AccordionItem title="Appearance" summary={themeSummary}>
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
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </AccordionItem>

      {/* ------------------------------------------------------------------ */}
      {/* 5. Auto-Sync                                                       */}
      {/* ------------------------------------------------------------------ */}
      <AccordionItem title="Auto-Sync" summary="Manual only">
        <p className="text-sm text-muted-foreground">
          Auto-sync will poll GitLab at a configurable interval. Coming soon.
        </p>
      </AccordionItem>

      {/* ------------------------------------------------------------------ */}
      {/* 6. Data Management                                                 */}
      {/* ------------------------------------------------------------------ */}
      <AccordionItem title="Data Management" variant="destructive">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Reset all local data including connections, time entries, and settings.
          </p>
          <Button variant="destructive" size="sm" onClick={() => void onResetAllData()}>
            Reset all data
          </Button>
        </div>
      </AccordionItem>
    </div>
  );
}
